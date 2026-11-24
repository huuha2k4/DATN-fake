"""Optimized and measurable implementation for AI 3 balance/spending forecasts."""

from __future__ import annotations

import calendar
import logging
import math
import os
import threading
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, Tuple

import numpy as np
import pandas as pd
from prophet import Prophet
from sqlalchemy import case, func

from analytics_runtime import KeyedLocks, TTLCache, Timings
from database import Account, SessionLocal, Transaction, resolve_user_id


LOGGER = logging.getLogger("finora.analytics")
_CACHE = TTLCache(max_entries=256)
_TRAINING_LOCKS = KeyedLocks()
_FIT_SEMAPHORE = threading.BoundedSemaphore(int(os.getenv("FORECAST_MAX_CONCURRENT_FITS", "1")))
_MAX_HISTORY_DAYS = int(os.getenv("FORECAST_MAX_HISTORY_DAYS", "730"))
_MIN_PROPHET_DAYS = int(os.getenv("FORECAST_MIN_PROPHET_DAYS", "28"))


def _money(value: Any) -> float:
    return float(Decimal(str(value or 0)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def _data_version(db, user_id: str) -> Tuple[Any, ...]:
    signed_amount = case(
        (Transaction.type == "INCOME", Transaction.amount),
        (Transaction.type == "EXPENSE", -Transaction.amount),
        else_=0,
    )
    tx_version = (
        db.query(
            func.count(Transaction.id),
            func.max(Transaction.occurred_at),
            func.min(Transaction.occurred_at),
            func.max(Transaction.updated_at),
            func.sum(Transaction.version),
            func.sum(Transaction.amount),
            func.sum(signed_amount),
        )
        .filter(Transaction.user_id == user_id, Transaction.deleted_at.is_(None))
        .one()
    )
    account_version = (
        db.query(func.count(Account.id), func.sum(Account.balance))
        .filter(Account.user_id == user_id)
        .one()
    )
    return tuple(str(value) for value in (*tx_version, *account_version))


def _local_date_expression(db):
    if db.bind.dialect.name == "postgresql":
        return func.date(func.timezone("Asia/Ho_Chi_Minh", Transaction.occurred_at))
    return func.date(Transaction.occurred_at, "+7 hours")


def _load_daily_cashflow(db, user_id: str) -> Tuple[pd.DataFrame, Decimal]:
    cutoff = datetime.utcnow() - timedelta(days=_MAX_HISTORY_DAYS)
    local_day = _local_date_expression(db)
    rows = (
        db.query(
            local_day.label("day"),
            func.sum(case((Transaction.type == "INCOME", Transaction.amount), else_=0)).label("inflow"),
            func.sum(case((Transaction.type == "EXPENSE", Transaction.amount), else_=0)).label("outflow"),
        )
        .filter(
            Transaction.user_id == user_id,
            Transaction.deleted_at.is_(None),
            Transaction.type.in_(("INCOME", "EXPENSE")),
            # Matches the existing (user_id, occurred_date DESC, id DESC) index.
            Transaction.occurred_date >= cutoff.date(),
        )
        .group_by(local_day)
        .order_by(local_day.asc())
        .all()
    )
    balance = Decimal(str(
        db.query(func.coalesce(func.sum(Account.balance), 0))
        .filter(Account.user_id == user_id)
        .scalar() or 0
    ))
    if not rows:
        return pd.DataFrame(columns=["ds", "inflow", "outflow", "net", "balance"]), balance

    frame = pd.DataFrame.from_records(rows, columns=["ds", "inflow", "outflow"])
    frame["ds"] = pd.to_datetime(frame["ds"])
    for column in ("inflow", "outflow"):
        frame[column] = pd.to_numeric(frame[column], errors="coerce").fillna(0.0)
    frame = (
        frame.set_index("ds")
        .reindex(pd.date_range(frame["ds"].min(), frame["ds"].max(), freq="D"), fill_value=0.0)
        .rename_axis("ds")
        .reset_index()
    )
    frame["net"] = frame["inflow"] - frame["outflow"]
    initial_balance = float(balance) - float(frame["net"].sum())
    frame["balance"] = initial_balance + frame["net"].cumsum()
    return frame, balance


def get_daily_cashflow(user_id: str = "test_user_01") -> pd.DataFrame:
    timings = Timings("AI3.cashflow")
    db = SessionLocal()
    try:
        with timings.measure("db_query"):
            resolved = resolve_user_id(user_id, db)
            frame, _ = _load_daily_cashflow(db, resolved)
        timings.log(rows=len(frame))
        return frame
    finally:
        db.close()


def _history_points(frame: pd.DataFrame) -> list[Dict[str, Any]]:
    return [
        {
            "date": row.ds.strftime("%Y-%m-%d"),
            "actual_balance": _money(row.balance),
            "outflow": _money(row.outflow),
        }
        for row in frame.itertuples(index=False)
    ]


def _end_of_month_item(points: list[Dict[str, Any]], today: date) -> Dict[str, Any]:
    last_day = calendar.monthrange(today.year, today.month)[1]
    target = f"{today.year}-{today.month:02d}-{last_day:02d}"
    return next((point for point in points if point["date"] == target), points[-1])


def _limited_data_result(frame: pd.DataFrame, balance: Decimal, horizon_days: int, today: date) -> Dict[str, Any]:
    enough_observations = len(frame) >= 2 and bool((frame["inflow"] + frame["outflow"]).gt(0).sum() >= 2)
    daily_net = float(frame["net"].mean()) if enough_observations else 0.0
    daily_std = float(frame["net"].std(ddof=1)) if enough_observations and len(frame) > 2 else 0.0
    points = []
    for offset in range(1, horizon_days + 1):
        estimate = float(balance) + daily_net * offset
        uncertainty = 1.28 * daily_std * math.sqrt(offset)
        points.append({
            "date": (today + timedelta(days=offset)).isoformat(),
            "predicted_balance": _money(estimate),
            "lower_bound": _money(estimate - uncertainty),
            "upper_bound": _money(estimate + uncertainty),
        })
    end_item = _end_of_month_item(points, today)
    basis = "trung bình dòng tiền quan sát được" if enough_observations else "số dư hiện tại, do chưa có đủ dòng tiền quan sát"
    return {
        "status": "LIMITED_DATA" if enough_observations else "INSUFFICIENT_DATA",
        "message": f"Chưa đủ {_MIN_PROPHET_DAYS} ngày để chạy Prophet; dùng baseline dựa trên {basis}.",
        "algorithm": "Observed Mean Net Cashflow Baseline" if enough_observations else "Current Balance Baseline",
        "current_balance": _money(balance),
        "projected_end_of_month_balance": end_item["predicted_balance"],
        "projected_range": {"lower": end_item["lower_bound"], "upper": end_item["upper_bound"]},
        "trend": "LIMITED_DATA",
        "summary": f"Ước tính có căn cứ dữ liệu hiện có đến {end_item['date']}; cần thêm lịch sử để tăng độ tin cậy.",
        "historical_days": len(frame),
        "horizon_days": horizon_days,
        "historical_points": _history_points(frame)[-30:],
        "forecast_points": points,
        # Legacy aliases retained for the old embedded UI.
        "historical_data": _history_points(frame)[-30:],
        "future_forecast": points,
    }


def forecast_balance(user_id: str = "test_user_01", horizon_days: int = 30) -> Dict[str, Any]:
    horizon_days = max(1, min(int(horizon_days), 365))
    timings = Timings("AI3")
    db = SessionLocal()
    try:
        with timings.measure("db_version"):
            resolved = resolve_user_id(user_id, db)
            version = _data_version(db, resolved)
        key = ("balance", resolved, horizon_days, version)
        cached = _CACHE.get(key)
        if cached is not None:
            timings.log(cache="hit")
            return cached

        with _TRAINING_LOCKS.acquire((resolved, horizon_days)):
            cached = _CACHE.get(key)
            if cached is not None:
                timings.log(cache="hit_after_wait")
                return cached
            with timings.measure("db_query"):
                frame, balance = _load_daily_cashflow(db, resolved)
            today = date.today()
            if len(frame) < _MIN_PROPHET_DAYS:
                with timings.measure("baseline"):
                    result = _limited_data_result(frame, balance, horizon_days, today)
                _CACHE.set(key, result)
                timings.log(cache="miss", rows=len(frame))
                return result

            training = frame.loc[:, ["ds", "balance"]].rename(columns={"balance": "y"})
            with timings.measure("model_init"):
                model = Prophet(
                    daily_seasonality=False,
                    weekly_seasonality=True,
                    yearly_seasonality=len(frame) >= 730,
                    interval_width=0.80,
                )
            with timings.measure("model_fit"):
                with _FIT_SEMAPHORE:
                    model.fit(training)
            future_dates = pd.DataFrame({
                "ds": pd.date_range(pd.Timestamp(today) + pd.Timedelta(days=1), periods=horizon_days, freq="D")
            })
            with timings.measure("predict"):
                forecast = model.predict(future_dates)
                today_prediction = model.predict(pd.DataFrame({"ds": [pd.Timestamp(today)]})).iloc[0]
            offset = float(balance) - float(today_prediction["yhat"])
            points = [
                {
                    "date": row.ds.strftime("%Y-%m-%d"),
                    "predicted_balance": _money(row.yhat + offset),
                    "lower_bound": _money(row.yhat_lower + offset),
                    "upper_bound": _money(row.yhat_upper + offset),
                }
                for row in forecast.itertuples(index=False)
            ]
            end_item = _end_of_month_item(points, today)
            change = end_item["predicted_balance"] - float(balance)
            trend = "TĂNG" if change > 0 else ("GIẢM" if change < 0 else "ỔN ĐỊNH")
            history = _history_points(frame)[-30:]
            result = {
                "status": "success",
                "algorithm": "Facebook Prophet (Time-Series)",
                "user_id": resolved,
                "historical_days": len(frame),
                "horizon_days": horizon_days,
                "current_balance": _money(balance),
                "projected_end_of_month_balance": end_item["predicted_balance"],
                "projected_range": {"lower": end_item["lower_bound"], "upper": end_item["upper_bound"]},
                "trend": trend,
                "summary": f"Dự báo số dư đến {end_item['date']}: {end_item['predicted_balance']:,.0f} VND.",
                "historical_points": history,
                "forecast_points": points,
            }
            with timings.measure("cache_store"):
                _CACHE.set(key, result)
            timings.log(cache="miss", rows=len(frame))
            return result
    finally:
        db.close()


def forecast_spending(user_id: str = "test_user_01", horizon_days: int = 30) -> Dict[str, Any]:
    horizon_days = max(1, min(int(horizon_days), 365))
    frame = get_daily_cashflow(user_id)
    if len(frame) < 2:
        return {"status": "INSUFFICIENT_DATA", "message": "Chưa đủ dữ liệu chi tiêu để dự báo."}
    observed_days = max(1, len(frame))
    daily_spend = float(frame["outflow"].sum()) / observed_days
    return {
        "status": "success" if len(frame) >= _MIN_PROPHET_DAYS else "LIMITED_DATA",
        "algorithm": "Observed Daily Average",
        "avg_daily_spend": _money(daily_spend),
        "projected_total_spend": _money(daily_spend * horizon_days),
        "horizon_days": horizon_days,
        "summary": f"Baseline từ {observed_days} ngày lịch sử quan sát được.",
    }


def evaluate_forecast_models(frame: pd.DataFrame, test_days: int = 14,
                             include_prophet: bool = True) -> Dict[str, Dict[str, float]]:
    """Holdout backtest used by the benchmark suite; no model is auto-selected."""
    series = frame["balance"].astype(float).to_numpy()
    test_days = min(test_days, max(1, len(series) // 3))
    if len(series) < 8 or test_days < 2:
        return {}
    train, actual = series[:-test_days], series[-test_days:]
    predictions = {
        "naive": np.repeat(train[-1], test_days),
        "moving_average_7": np.repeat(np.mean(train[-min(7, len(train)):]), test_days),
    }
    if len(train) >= 7:
        predictions["seasonal_naive_7"] = np.resize(train[-7:], test_days)
    metrics: Dict[str, Dict[str, float]] = {}
    denominator = float(np.abs(actual).sum())
    for name, predicted in predictions.items():
        errors = actual - predicted
        metrics[name] = {
            "mae": float(np.mean(np.abs(errors))),
            "rmse": float(np.sqrt(np.mean(np.square(errors)))),
            "wape": float(np.abs(errors).sum() / denominator) if denominator else 0.0,
        }
    if include_prophet:
        train_frame = frame.iloc[:-test_days].loc[:, ["ds", "balance"]].rename(columns={"balance": "y"})
        model = Prophet(daily_seasonality=False, weekly_seasonality=True,
                        yearly_seasonality=len(train_frame) >= 730, interval_width=0.80)
        with _FIT_SEMAPHORE:
            model.fit(train_frame)
        predicted_frame = model.predict(frame.iloc[-test_days:].loc[:, ["ds"]])
        predicted = predicted_frame["yhat"].to_numpy(dtype=float)
        errors = actual - predicted
        metrics["prophet"] = {
            "mae": float(np.mean(np.abs(errors))),
            "rmse": float(np.sqrt(np.mean(np.square(errors)))),
            "wape": float(np.abs(errors).sum() / denominator) if denominator else 0.0,
            "interval_coverage": float(np.mean(
                (actual >= predicted_frame["yhat_lower"].to_numpy(dtype=float))
                & (actual <= predicted_frame["yhat_upper"].to_numpy(dtype=float))
            )),
        }
    return metrics


def evaluate_baselines(frame: pd.DataFrame, test_days: int = 14) -> Dict[str, Dict[str, float]]:
    return evaluate_forecast_models(frame, test_days=test_days, include_prophet=False)

