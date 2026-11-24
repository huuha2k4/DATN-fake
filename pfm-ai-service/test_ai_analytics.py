import os
import tempfile
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path


TEST_DB = Path(tempfile.gettempdir()) / f"finora-ai-{uuid.uuid4().hex}.sqlite"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB.as_posix()}"
os.environ["GEMINI_API_KEY"] = ""
os.environ["MPLCONFIGDIR"] = tempfile.gettempdir()

import pytest

from database import Account, Base, Category, SessionLocal, Transaction, engine
from behavior_profiler import profiler
from forecaster import forecast_balance
from anomaly_detector import detector
from recommender import recommender
from behavior_engine import _local as behavior_local
from forecast_engine import _limited_data_result
import pandas as pd
from decimal import Decimal
from datetime import date


@pytest.fixture(scope="module", autouse=True)
def database_fixture():
    Base.metadata.create_all(engine)
    yield
    engine.dispose()
    TEST_DB.unlink(missing_ok=True)


def seed_user(expense_count=60, include_income=True, span_days=60):
    user_id, account_id = str(uuid.uuid4()), str(uuid.uuid4())
    food_id, needs_id = str(uuid.uuid4()), str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        db.add_all([
            Account(id=account_id, user_id=user_id, name="Main", balance=9_000_000, currency_code="VND"),
            Category(id=food_id, name="Ăn uống", kind="EXPENSE", is_essential=False),
            Category(id=needs_id, name="Nhà ở", kind="EXPENSE", is_essential=True),
        ])
        if include_income:
            for day in (59, 39, 19):
                db.add(Transaction(id=str(uuid.uuid4()), user_id=user_id, account_id=account_id,
                                   type="INCOME", amount=5_000_000, occurred_at=now - timedelta(days=day)))
        for index in range(expense_count):
            day = int(index * max(1, span_days - 1) / max(1, expense_count - 1))
            db.add(Transaction(
                id=str(uuid.uuid4()), user_id=user_id, account_id=account_id,
                category_id=food_id if index % 3 else needs_id, type="EXPENSE",
                amount=70_000 + (index % 7) * 10_000,
                occurred_at=now - timedelta(days=day, hours=index % 17),
            ))
        # Neither internal transfer nor soft-deleted data may affect analytics.
        db.add(Transaction(id=str(uuid.uuid4()), user_id=user_id, account_id=account_id,
                           type="TRANSFER", amount=50_000_000, occurred_at=now - timedelta(days=2)))
        db.add(Transaction(id=str(uuid.uuid4()), user_id=user_id, account_id=account_id,
                           category_id=food_id, type="EXPENSE", amount=90_000_000,
                           occurred_at=now - timedelta(days=1), deleted_at=now))
        db.commit()
    return user_id, account_id, food_id


def test_behavior_uses_real_non_transfer_non_deleted_data():
    user_id, _, _ = seed_user()
    result = profiler.analyze_user(user_id)
    assert result["status"] == "SUCCESS"
    assert result["summary"]["total_income"] == 15_000_000
    assert result["summary"]["total_expense"] < 10_000_000
    assert result["persona"]["code"] in {
        "NGUOI_TIET_KIEM", "TIN_DO_AM_THUC", "VUNG_TAY_QUA_TRAN",
        "CHI_TIEU_CUOI_THANG", "NGUOI_CAN_BANG",
    }
    assert result == profiler.analyze_user(user_id)
    assert all(0 <= score <= 100 for score in result["radar_scores"].values())


def test_behavior_handles_zero_income_and_insufficient_samples():
    zero_income, _, _ = seed_user(expense_count=12, include_income=False, span_days=20)
    result = profiler.analyze_user(zero_income)
    assert result["status"] == "SUCCESS"
    assert result["summary"]["savings_rate"] is None
    assert result["rule_50_30_20"]["needs_pct"] is None

    too_small, _, _ = seed_user(expense_count=1, include_income=False, span_days=1)
    result = profiler.analyze_user(too_small)
    assert result["status"] == "INSUFFICIENT_DATA"
    assert result["persona"]["code"] == "INSUFFICIENT_DATA"


def test_no_transactions_returns_explicit_insufficient_data():
    user_id, account_id = str(uuid.uuid4()), str(uuid.uuid4())
    with SessionLocal() as db:
        db.add(Account(id=account_id, user_id=user_id, name="Empty", balance=123_456))
        db.commit()
    behavior = profiler.analyze_user(user_id)
    forecast = forecast_balance(user_id, 3)
    assert behavior["status"] == "INSUFFICIENT_DATA"
    assert forecast["status"] == "INSUFFICIENT_DATA"
    assert forecast["current_balance"] == 123_456


def test_vietnam_timezone_and_leap_year_end_of_month():
    utc_late = datetime(2028, 2, 29, 17, 30, tzinfo=timezone.utc)
    local = behavior_local(utc_late)
    assert (local.year, local.month, local.day, local.hour) == (2028, 3, 1, 0)
    empty = pd.DataFrame(columns=["ds", "inflow", "outflow", "net", "balance"])
    result = _limited_data_result(empty, Decimal("1000000"), 3, date(2028, 2, 28))
    assert result["forecast_points"][0]["date"] == "2028-02-29"
    assert result["projected_end_of_month_balance"] == 1_000_000


def test_forecast_cache_and_account_balance_invalidation():
    user_id, account_id, _ = seed_user()
    first = forecast_balance(user_id, 15)
    second = forecast_balance(user_id, 15)
    assert first == second
    assert len(first["forecast_points"]) == 15
    assert first["current_balance"] == 9_000_000

    with SessionLocal() as db:
        db.query(Account).filter(Account.id == account_id).update({Account.balance: 10_000_000})
        db.commit()
    refreshed = forecast_balance(user_id, 15)
    assert refreshed["current_balance"] == 10_000_000


def test_forecast_concurrent_requests_are_consistent():
    user_id, _, _ = seed_user()
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda _: forecast_balance(user_id, 7), range(4)))
    assert all(result == results[0] for result in results)


def test_anomaly_requires_real_history_and_night_is_not_enough():
    user_id, _, food_id = seed_user()
    assert detector.fit_user(user_id) is True
    night = detector.inspect_transaction(100_000, food_id, datetime.now(timezone.utc).replace(hour=19), user_id=user_id)
    assert night["is_anomaly"] is False
    huge = detector.inspect_transaction(20_000_000, food_id, user_id=user_id)
    assert huge["is_anomaly"] is True
    assert "gian lận" in huge["explanation"]

    too_small, _, small_food = seed_user(expense_count=5, include_income=False, span_days=10)
    limited = detector.inspect_transaction(5_000_000, small_food, user_id=too_small)
    assert limited["status"] == "INSUFFICIENT_DATA"
    assert limited["is_anomaly"] is False


def test_recommender_is_deterministic_and_does_not_call_llm(monkeypatch):
    user_id, _, _ = seed_user()
    monkeypatch.setattr("recommender.get_llm", lambda: (_ for _ in ()).throw(AssertionError("LLM called")))
    result = recommender.generate_recommendations(user_id)
    assert result["status"] == "SUCCESS"
    assert result["recommendations_count"] == len(result["recommendations"])
    identities = [(item["type"], item["category"]) for item in result["recommendations"]]
    assert len(identities) == len(set(identities))
    assert all(item["impact_monthly_vnd"] >= 0 for item in result["recommendations"])

