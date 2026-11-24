"""Reproducible before/after micro-benchmark for AI 2-5.

The legacy implementation is loaded from Git HEAD, so the comparison uses the
same interpreter, database and generated dataset as the optimized code.
"""
from __future__ import annotations

import json
import os
import statistics
import subprocess
import tempfile
import time
import tracemalloc
import types
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path


DB_PATH = Path(tempfile.gettempdir()) / f"finora-benchmark-{uuid.uuid4().hex}.sqlite"
os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH.as_posix()}"
os.environ["GEMINI_API_KEY"] = ""
os.environ["MPLCONFIGDIR"] = tempfile.gettempdir()

from database import Account, Base, Category, SessionLocal, Transaction, engine
from behavior_profiler import profiler
from forecaster import forecast_balance
from anomaly_detector import detector
from recommender import recommender
import anomaly_engine
import behavior_engine
import forecast_engine


def legacy_module(name: str, repository_path: str):
    source = subprocess.check_output(
        ["git", "show", f"HEAD:{repository_path}"], cwd=Path(__file__).parent.parent,
        text=True, encoding="utf-8",
    )
    module = types.ModuleType(name)
    module.__file__ = repository_path
    exec(compile(source, repository_path, "exec"), module.__dict__)
    return module


def seed(size: int):
    user_id, account_id = str(uuid.uuid4()), str(uuid.uuid4())
    food_id, needs_id = str(uuid.uuid4()), str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        db.add_all([
            Account(id=account_id, user_id=user_id, name="Benchmark", balance=12_000_000),
            Category(id=food_id, name="Ăn uống", kind="EXPENSE", is_essential=False),
            Category(id=needs_id, name="Nhà ở", kind="EXPENSE", is_essential=True),
        ])
        mappings = []
        for index in range(size):
            is_income = index % 25 == 0
            mappings.append({
                "id": str(uuid.uuid4()), "user_id": user_id, "account_id": account_id,
                "category_id": None if is_income else (food_id if index % 3 else needs_id),
                "type": "INCOME" if is_income else "EXPENSE",
                "amount": 5_000_000 if is_income else 50_000 + (index % 17) * 7_500,
                "occurred_at": now - timedelta(days=index % 365, hours=index % 20),
                "occurred_date": (now - timedelta(days=index % 365)).date(),
                "currency_code": "VND", "exchange_rate": 1.0,
                "base_amount": 5_000_000 if is_income else 50_000 + (index % 17) * 7_500,
            })
        db.bulk_insert_mappings(Transaction, mappings)
        db.commit()
    return user_id


def measure(callable_, repeats: int):
    latencies, cpu_times, peaks = [], [], []
    for _ in range(repeats):
        tracemalloc.start()
        cpu_start, wall_start = time.process_time(), time.perf_counter()
        callable_()
        latencies.append((time.perf_counter() - wall_start) * 1000)
        cpu_times.append((time.process_time() - cpu_start) * 1000)
        peaks.append(tracemalloc.get_traced_memory()[1] / (1024 * 1024))
        tracemalloc.stop()
    ordered = sorted(latencies)
    p95_index = min(len(ordered) - 1, max(0, int(len(ordered) * 0.95 + 0.999) - 1))
    return {
        "average_ms": round(statistics.mean(latencies), 2),
        "p50_ms": round(statistics.median(latencies), 2),
        "p95_ms": round(ordered[p95_index], 2),
        "cpu_average_ms": round(statistics.mean(cpu_times), 2),
        "peak_memory_mb": round(max(peaks), 2),
    }


def clear_caches():
    forecast_engine._CACHE.clear()
    behavior_engine._CACHE.clear()
    anomaly_engine._MODEL_CACHE.clear()
    anomaly_engine._RESULT_CACHE.clear()


def main():
    Base.metadata.create_all(engine)
    legacy_forecaster = legacy_module("legacy_forecaster", "pfm-ai-service/forecaster.py")
    legacy_behavior = legacy_module("legacy_behavior", "pfm-ai-service/behavior_profiler.py")
    legacy_anomaly = legacy_module("legacy_anomaly", "pfm-ai-service/anomaly_detector.py")
    output = {"environment": {"database": "SQLite", "python": os.sys.version.split()[0]}, "datasets": {}}
    for size in (10, 100, 1000, 10000):
        user_id = seed(size)
        repeats = 3 if size < 10000 else 1
        clear_caches()
        entry = {
            "AI2_before": measure(lambda: legacy_behavior.profiler.analyze_user(user_id), repeats),
            "AI2_after_cold": measure(lambda: (behavior_engine._CACHE.clear(), profiler.analyze_user(user_id))[1], repeats),
            "AI2_after_warm": measure(lambda: profiler.analyze_user(user_id), 5),
            "AI3_before": measure(lambda: legacy_forecaster.forecast_balance(user_id, 30), repeats),
            "AI3_after_cold": measure(lambda: (forecast_engine._CACHE.clear(), forecast_balance(user_id, 30))[1], repeats),
            "AI3_after_warm": measure(lambda: forecast_balance(user_id, 30), 5),
            "AI4_before": (
                measure(lambda: legacy_anomaly.detector.scan_historical_anomalies(user_id), repeats)
                if size < 10000 else
                {"status": "not_completed", "measured_lower_bound_ms": 180000,
                 "reason": "Stopped after three minutes to protect the test host."}
            ),
            "AI4_after_cold": measure(lambda: (anomaly_engine._MODEL_CACHE.clear(), anomaly_engine._RESULT_CACHE.clear(), detector.scan_historical_anomalies(user_id))[2], repeats),
            "AI4_after_warm": measure(lambda: detector.scan_historical_anomalies(user_id), 5),
            "AI5_after": measure(lambda: recommender.generate_recommendations(user_id), 3),
        }
        output["datasets"][str(size)] = entry
        print(json.dumps({"size": size, "results": entry}, ensure_ascii=False), flush=True)
    print("BENCHMARK_JSON=" + json.dumps(output, ensure_ascii=False))
    engine.dispose()
    DB_PATH.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
