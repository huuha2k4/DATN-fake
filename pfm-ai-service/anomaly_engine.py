"""User-scoped, cached AI 4 anomaly detection without synthetic training data."""
from __future__ import annotations

import logging
import os
import threading
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import numpy as np
from sklearn.ensemble import IsolationForest
from sqlalchemy import func

from analytics_runtime import KeyedLocks, TTLCache, Timings
from database import Category, SessionLocal, Transaction, resolve_user_id

VN_TZ = timezone(timedelta(hours=7))
LOGGER = logging.getLogger("finora.analytics")
_MODEL_CACHE = TTLCache(max_entries=128, copy_values=False)
_RESULT_CACHE = TTLCache(max_entries=128)
_LOCKS = KeyedLocks()
_FIT_SEMAPHORE = threading.BoundedSemaphore(int(os.getenv("ANOMALY_MAX_CONCURRENT_FITS", "1")))
MIN_TRAINING_ROWS = 30


def _local(dt: Optional[datetime]) -> datetime:
    if dt is None:
        return datetime.now(VN_TZ)
    return (dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt).astimezone(VN_TZ)


def _version(db, user_id: str) -> tuple[str, ...]:
    row = db.query(func.count(Transaction.id), func.max(Transaction.occurred_at),
                   func.max(Transaction.updated_at), func.sum(Transaction.version),
                   func.sum(Transaction.amount)).filter(
        Transaction.user_id == user_id, Transaction.type == "EXPENSE", Transaction.deleted_at.is_(None)
    ).one()
    return tuple(str(value) for value in row)


def _load_rows(db, user_id: str):
    return db.query(
        Transaction.id, Transaction.amount, Transaction.category_id, Transaction.occurred_at,
        Transaction.description_raw, Transaction.note, Category.name.label("category_name"),
    ).outerjoin(Category, Transaction.category_id == Category.id).filter(
        Transaction.user_id == user_id, Transaction.type == "EXPENSE", Transaction.deleted_at.is_(None)
    ).order_by(Transaction.occurred_date.desc(), Transaction.id.desc()).all()


def _statistics(rows):
    amounts = np.asarray([float(row.amount) for row in rows], dtype=float)
    global_median = float(np.median(amounts)) if len(amounts) else 0.0
    grouped: Dict[str, list[float]] = {}
    for row in rows:
        grouped.setdefault(str(row.category_id), []).append(float(row.amount))
    medians = {key: float(np.median(values)) for key, values in grouped.items()}
    mads = {key: float(np.median(np.abs(np.asarray(values) - medians[key]))) for key, values in grouped.items()}
    return global_median, medians, mads


def _features(rows, global_median: float, medians: Dict[str, float]) -> np.ndarray:
    features = []
    for row in rows:
        dt = _local(row.occurred_at)
        median = medians.get(str(row.category_id), global_median) or global_median or 1.0
        features.append([
            np.log1p(float(row.amount)),
            np.sin(2 * np.pi * dt.hour / 24), np.cos(2 * np.pi * dt.hour / 24),
            np.sin(2 * np.pi * dt.weekday() / 7), np.cos(2 * np.pi * dt.weekday() / 7),
            np.log1p(float(row.amount) / max(median, 1.0)),
        ])
    return np.asarray(features, dtype=float)


class AnomalyDetector:
    def __init__(self, contamination: float = 0.03):
        self.contamination = min(max(float(contamination), 0.001), 0.10)
        self._last_user_id: Optional[str] = None

    def _model_bundle(self, user_id: str):
        timings, db = Timings("AI4.fit"), SessionLocal()
        try:
            resolved = resolve_user_id(user_id, db)
            version = _version(db, resolved)
            key = (resolved, version, self.contamination)
            cached = _MODEL_CACHE.get(key)
            if cached is not None:
                self._last_user_id = resolved
                timings.log(cache="hit")
                return cached
            with _LOCKS.acquire(resolved):
                cached = _MODEL_CACHE.get(key)
                if cached is not None:
                    return cached
                with timings.measure("db_query"):
                    rows = _load_rows(db, resolved)
                if len(rows) < MIN_TRAINING_ROWS:
                    bundle = {"status": "INSUFFICIENT_DATA", "rows": rows, "version": version, "user_id": resolved}
                else:
                    global_median, medians, mads = _statistics(rows)
                    matrix = _features(rows, global_median, medians)
                    model = IsolationForest(contamination=self.contamination, random_state=42, n_estimators=100, n_jobs=1)
                    with timings.measure("model_fit"):
                        with _FIT_SEMAPHORE:
                            model.fit(matrix)
                    bundle = {"status": "SUCCESS", "model": model, "rows": rows, "version": version, "user_id": resolved, "global_median": global_median, "medians": medians, "mads": mads}
                _MODEL_CACHE.set(key, bundle)
                self._last_user_id = resolved
                timings.log(cache="miss", rows=len(rows))
                return bundle
        finally:
            db.close()

    def fit_user(self, user_id: str = "test_user_01") -> bool:
        return self._model_bundle(user_id)["status"] == "SUCCESS"

    def inspect_transaction(self, amount: float, category_id: Optional[str] = None,
                            occurred_at: Optional[datetime] = None, note: Optional[str] = None,
                            user_id: Optional[str] = None) -> Dict[str, Any]:
        bundle = self._model_bundle(user_id or self._last_user_id or "test_user_01")
        if bundle["status"] != "SUCCESS":
            return {"status": "INSUFFICIENT_DATA", "is_anomaly": False, "severity": "INSUFFICIENT_DATA", "anomaly_score": None, "amount": amount, "explanation": f"Cần ít nhất {MIN_TRAINING_ROWS} khoản chi thực tế để đánh giá bất thường."}
        class Candidate: pass
        candidate = Candidate()
        candidate.amount, candidate.category_id, candidate.occurred_at = amount, category_id, occurred_at or datetime.now(timezone.utc)
        matrix = _features([candidate], bundle["global_median"], bundle["medians"])
        score = float(bundle["model"].decision_function(matrix)[0])
        prediction = int(bundle["model"].predict(matrix)[0])
        median = bundle["medians"].get(str(category_id), bundle["global_median"]) or 1.0
        mad = bundle["mads"].get(str(category_id), 0.0)
        ratio = float(amount) / max(median, 1.0)
        robust_z = 0.6745 * abs(float(amount) - median) / mad if mad > 0 else 0.0
        statistical_outlier = ratio >= 3.0 or robust_z >= 3.5
        extreme_outlier = ratio >= 6.0 or robust_z >= 6.0
        is_anomaly = statistical_outlier and (prediction == -1 or extreme_outlier)
        severity = "HIGH" if is_anomaly and (ratio >= 6.0 or robust_z >= 6.0) else ("MEDIUM" if is_anomaly else "NORMAL")
        local_dt = _local(candidate.occurred_at)
        evidence = f"Số tiền gấp {ratio:.1f} lần trung vị danh mục. " if is_anomaly else "Chưa có đủ bằng chứng để đánh dấu bất thường. "
        explanation = evidence + f"Thời điểm {local_dt.hour:02d}:{local_dt.minute:02d} không tự nó đồng nghĩa với gian lận."
        return {"status": "SUCCESS", "is_anomaly": is_anomaly, "severity": severity, "anomaly_score": round(score, 4), "amount": amount, "category_median": round(median), "ratio_to_median": round(ratio, 2), "explanation": explanation}

    def scan_historical_anomalies(self, user_id: str = "test_user_01") -> list[Dict[str, Any]]:
        timings = Timings("AI4.scan")
        bundle = self._model_bundle(user_id)
        if bundle["status"] != "SUCCESS":
            timings.log(cache="insufficient", rows=len(bundle["rows"]))
            return []
        key = (bundle["user_id"], bundle["version"], self.contamination)
        cached = _RESULT_CACHE.get(key)
        if cached is not None:
            timings.log(cache="hit")
            return cached
        rows = bundle["rows"]
        with timings.measure("inference"):
            matrix = _features(rows, bundle["global_median"], bundle["medians"])
            scores, predictions = bundle["model"].decision_function(matrix), bundle["model"].predict(matrix)
        anomalies = []
        for row, score, prediction in zip(rows, scores, predictions):
            median = bundle["medians"].get(str(row.category_id), bundle["global_median"]) or 1.0
            mad = bundle["mads"].get(str(row.category_id), 0.0)
            ratio = float(row.amount) / max(median, 1.0)
            robust_z = 0.6745 * abs(float(row.amount) - median) / mad if mad > 0 else 0.0
            if prediction != -1 or (ratio < 3.0 and robust_z < 3.5): continue
            severity = "HIGH" if ratio >= 6.0 or robust_z >= 6.0 else "MEDIUM"
            anomalies.append({"transaction_id": row.id, "date": _local(row.occurred_at).strftime("%d/%m/%Y %H:%M"), "amount": float(row.amount), "category": row.category_name or "Chung", "note": row.description_raw or row.note, "severity": severity, "anomaly_score": round(float(score), 4), "explanation": f"Số tiền gấp {ratio:.1f} lần trung vị lịch sử; đây là bất thường thống kê, không phải kết luận gian lận."})
        _RESULT_CACHE.set(key, anomalies)
        timings.log(cache="miss", rows=len(rows), anomalies=len(anomalies))
        return anomalies


detector = AnomalyDetector()
