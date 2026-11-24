"""Measured, deterministic AI 2 behavior profiling implementation."""

from __future__ import annotations

import calendar
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict

import numpy as np
from sqlalchemy import func

from analytics_runtime import TTLCache, Timings
from database import Category, SessionLocal, Transaction, resolve_user_id


VN_TZ = timezone(timedelta(hours=7))
_CACHE = TTLCache(max_entries=256)
LOGGER = logging.getLogger("finora.analytics")

PERSONAS = {
    "NGUOI_TIET_KIEM": ("Người Tiết Kiệm & Kỷ Luật", "Ưu tiên tích lũy và chi tiêu có kế hoạch.", "🛡️", "#10b981", [0.85, 0.20, 0.15, 0.45, 0.02]),
    "TIN_DO_AM_THUC": ("Tín Đồ Ẩm Thực", "Dành tỷ trọng đáng kể cho ăn uống.", "🍜", "#f59e0b", [0.30, 0.45, 0.25, 0.55, 0.05]),
    "VUNG_TAY_QUA_TRAN": ("Người Chi Tiêu Ngẫu Hứng", "Chi không thiết yếu cao so với thu nhập.", "🛍️", "#ef4444", [0.05, 0.30, 0.50, 0.72, 0.12]),
    "CHI_TIEU_CUOI_THANG": ("Bùng Nổ Chi Tiêu Cuối Tháng", "Chi tiêu tập trung vào những ngày cuối tháng.", "📅", "#8b5cf6", [0.25, 0.30, 0.30, 0.80, 0.04]),
    "NGUOI_CAN_BANG": ("Người Chi Tiêu Cân Bằng", "Phân bổ tương đối cân đối giữa các nhu cầu.", "⚖️", "#38bdf8", [0.50, 0.28, 0.25, 0.50, 0.03]),
}


def _local(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc).astimezone(VN_TZ)
    return dt.astimezone(VN_TZ)


def _version(db, user_id: str) -> tuple[str, ...]:
    row = (
        db.query(
            func.count(Transaction.id),
            func.max(Transaction.occurred_at),
            func.min(Transaction.occurred_at),
            func.max(Transaction.updated_at),
            func.sum(Transaction.version),
            func.sum(Transaction.amount),
        )
        .filter(Transaction.user_id == user_id, Transaction.deleted_at.is_(None))
        .one()
    )
    return tuple(str(value) for value in row)


def _insufficient(user_id: str, tx_count: int, income: Decimal, expense: Decimal, reason: str) -> Dict[str, Any]:
    net = income - expense
    rate = float(net / income * 100) if income > 0 else None
    return {
        "status": "INSUFFICIENT_DATA",
        "user_id": user_id,
        "message": reason,
        "persona": {
            "code": "INSUFFICIENT_DATA", "title": "Chưa đủ dữ liệu",
            "tagline": reason, "icon": "📊", "color": "#94a3b8",
            "description": reason, "affinity_score": 0.0,
        },
        "summary": {
            "total_income": float(income), "total_expense": float(expense),
            "net_savings": float(net), "savings_rate": round(rate, 1) if rate is not None else None,
            "savings_label": "Chưa đủ dữ liệu",
        },
        "rule_50_30_20": {
            "needs_spent": 0.0, "needs_pct": 0.0, "wants_spent": 0.0,
            "wants_pct": 0.0, "savings_spent": 0.0, "savings_pct": 0.0,
            "standard": "Chưa đủ dữ liệu để đánh giá 50/30/20.",
        },
        "dining_analysis": {"dining_amount": 0.0, "dining_percentage": 0.0, "is_heavy": False},
        "temporal_patterns": {
            "eom_surge_ratio": 0.0, "has_eom_spike": False,
            "weekend_percentage": 0.0, "night_transactions": 0, "night_percentage": 0.0,
        },
        "top_categories": [],
        "radar_scores": {"savings_discipline": 0, "needs_control": 0,
                         "lifestyle_moderation": 0, "temporal_stability": 0,
                         "food_moderation": 0},
        "metrics": {"transaction_count": tx_count, "data_sufficient": False},
        "findings": [reason],
    }


class BehaviorProfiler:
    def analyze_user(self, user_id: str = "test_user_01") -> Dict[str, Any]:
        timings = Timings("AI2")
        db = SessionLocal()
        try:
            with timings.measure("db_version"):
                resolved = resolve_user_id(user_id, db)
                version = _version(db, resolved)
            key = (resolved, version)
            cached = _CACHE.get(key)
            if cached is not None:
                timings.log(cache="hit")
                return cached

            with timings.measure("db_query"):
                rows = (
                    db.query(
                        Transaction.type,
                        Transaction.amount,
                        Transaction.occurred_at,
                        Transaction.category_id,
                        Category.name,
                        Category.is_essential,
                    )
                    .outerjoin(Category, Transaction.category_id == Category.id)
                    .filter(
                        Transaction.user_id == resolved,
                        Transaction.deleted_at.is_(None),
                        Transaction.type.in_(("INCOME", "EXPENSE")),
                    )
                    .all()
                )
            income = sum((Decimal(str(row.amount)) for row in rows if row.type == "INCOME"), Decimal("0"))
            expenses = [row for row in rows if row.type == "EXPENSE"]
            expense = sum((Decimal(str(row.amount)) for row in expenses), Decimal("0"))
            if len(rows) < 10 or len(expenses) < 5:
                result = _insufficient(resolved, len(rows), income, expense, "Cần ít nhất 10 giao dịch hợp lệ, gồm 5 khoản chi, để phân tích hành vi.")
                _CACHE.set(key, result)
                timings.log(cache="miss", rows=len(rows))
                return result

            local_dates = [_local(row.occurred_at) for row in rows]
            span_days = (max(local_dates).date() - min(local_dates).date()).days + 1
            if span_days < 14:
                result = _insufficient(resolved, len(rows), income, expense, "Dữ liệu cần trải trên ít nhất 14 ngày để tránh kết luận từ mẫu quá ngắn.")
                _CACHE.set(key, result)
                timings.log(cache="miss", rows=len(rows))
                return result

            with timings.measure("feature_engineering"):
                net = income - expense
                savings_rate = float(net / income * 100) if income > 0 else None
                by_category: Dict[str, Decimal] = {}
                needs = Decimal("0")
                wants = Decimal("0")
                food = Decimal("0")
                weekend = Decimal("0")
                night = Decimal("0")
                night_count = 0
                eom = Decimal("0")
                rest = Decimal("0")
                for row in expenses:
                    amount = Decimal(str(row.amount))
                    name = row.name or "Khác"
                    by_category[name] = by_category.get(name, Decimal("0")) + amount
                    if bool(row.is_essential): needs += amount
                    else: wants += amount
                    normalized_name = name.casefold()
                    if "ăn uống" in normalized_name or "food" in normalized_name: food += amount
                    local_dt = _local(row.occurred_at)
                    if local_dt.weekday() >= 5: weekend += amount
                    if local_dt.hour >= 22 or local_dt.hour <= 5:
                        night += amount
                        night_count += 1
                    last_day = calendar.monthrange(local_dt.year, local_dt.month)[1]
                    if local_dt.day > last_day - 7: eom += amount
                    else: rest += amount

                start, end = min(local_dates).date(), max(local_dates).date()
                eom_days = rest_days = 0
                cursor = start
                while cursor <= end:
                    last_day = calendar.monthrange(cursor.year, cursor.month)[1]
                    if cursor.day > last_day - 7: eom_days += 1
                    else: rest_days += 1
                    cursor += timedelta(days=1)
                eom_average = float(eom) / max(1, eom_days)
                rest_average = float(rest) / max(1, rest_days)
                eom_ratio = eom_average / rest_average if rest_average > 0 else (1.0 if eom_average == 0 else 2.0)
                expense_float = float(expense)
                needs_income_ratio = float(needs / income) if income > 0 else 0.0
                wants_income_ratio = float(wants / income) if income > 0 else 0.0
                dining_ratio = float(food / expense) if expense > 0 else 0.0
                weekend_ratio = float(weekend / expense) if expense > 0 else 0.0
                night_ratio = float(night / expense) if expense > 0 else 0.0
                savings_norm = float(np.clip(((savings_rate if savings_rate is not None else -20.0) + 20.0) / 60.0, 0, 1))
                vector = np.array([savings_norm, dining_ratio, min(wants_income_ratio, 1.0), min(eom_ratio / 2.0, 1.0), night_ratio])
                distances = {code: float(np.linalg.norm(vector - np.array(data[4]))) for code, data in PERSONAS.items()}
                code = min(distances, key=distances.get)
                if dining_ratio >= 0.36: code = "TIN_DO_AM_THUC"
                elif savings_rate is not None and savings_rate < 10 and wants_income_ratio > 0.40: code = "VUNG_TAY_QUA_TRAN"
                elif eom_ratio >= 1.35 and span_days >= 28: code = "CHI_TIEU_CUOI_THANG"
                elif savings_rate is not None and savings_rate >= 25 and wants_income_ratio <= 0.22: code = "NGUOI_TIET_KIEM"
                title, tagline, icon, color, _ = PERSONAS[code]
                affinity = max(0.0, 100.0 * (1.0 - distances[code] / np.sqrt(5.0)))

                if savings_rate is None: savings_label = "Chưa có thu nhập hợp lệ"
                elif savings_rate < 0: savings_label = "Chi vượt thu"
                elif savings_rate < 12: savings_label = "Mức tiết kiệm thấp"
                elif savings_rate < 25: savings_label = "Mức tiết kiệm trung bình"
                else: savings_label = "Mức tiết kiệm tốt"
                top_categories = [
                    {"category": name, "amount": float(amount), "percentage": round(float(amount / expense * 100), 1)}
                    for name, amount in sorted(by_category.items(), key=lambda item: item[1], reverse=True)[:5]
                ] if expense > 0 else []
                findings = []
                if dining_ratio >= 0.30: findings.append(f"Ăn uống chiếm {dining_ratio * 100:.1f}% tổng chi tiêu quan sát được.")
                if savings_rate is None: findings.append("Chưa có thu nhập hợp lệ nên không thể kết luận tỷ lệ tiết kiệm.")
                elif savings_rate < 12: findings.append(f"Tỷ lệ tiết kiệm quan sát được là {savings_rate:.1f}%.")
                if eom_ratio >= 1.25 and span_days >= 28: findings.append(f"Mức chi/ngày trong 7 ngày cuối tháng cao gấp {eom_ratio:.2f} lần các ngày còn lại.")
                if weekend_ratio >= 0.38: findings.append(f"Cuối tuần chiếm {weekend_ratio * 100:.1f}% tổng chi tiêu.")
                if night_count >= 3: findings.append(f"Ghi nhận {night_count} giao dịch ban đêm; đây chỉ là mô tả thời điểm, không phải đánh giá tiêu cực.")

                result = {
                    "status": "SUCCESS", "user_id": resolved,
                    "persona": {"code": code, "title": title, "tagline": tagline, "icon": icon, "color": color, "description": tagline, "affinity_score": round(affinity, 1)},
                    "summary": {"total_income": float(income), "total_expense": expense_float, "net_savings": float(net), "savings_rate": round(savings_rate, 1) if savings_rate is not None else None, "savings_label": savings_label},
                    "rule_50_30_20": {
                        "needs_spent": float(needs), "needs_pct": round(needs_income_ratio * 100, 1) if income > 0 else None,
                        "wants_spent": float(wants), "wants_pct": round(wants_income_ratio * 100, 1) if income > 0 else None,
                        "savings_spent": float(max(net, Decimal("0"))), "savings_pct": round(max(savings_rate, 0), 1) if savings_rate is not None else None,
                        "standard": "Mốc tham khảo 50/30/20, không phải yêu cầu bắt buộc.",
                    },
                    "dining_analysis": {"dining_amount": float(food), "dining_percentage": round(dining_ratio * 100, 1), "is_heavy": dining_ratio >= 0.35},
                    "temporal_patterns": {"eom_surge_ratio": round(eom_ratio, 2), "has_eom_spike": eom_ratio >= 1.25 and span_days >= 28, "weekend_percentage": round(weekend_ratio * 100, 1), "night_transactions": night_count, "night_percentage": round(night_ratio * 100, 1)},
                    "top_categories": top_categories,
                    "radar_scores": {
                        "savings_discipline": round(100 * savings_norm),
                        "needs_control": round(100 * (1 - min(abs(needs_income_ratio - 0.5), 0.5) / 0.5)) if income > 0 else 0,
                        "lifestyle_moderation": round(100 * (1 - min(wants_income_ratio, 1))),
                        "temporal_stability": round(100 * (1 - min(abs(eom_ratio - 1) / 1.5, 1))),
                        "food_moderation": round(100 * (1 - min(dining_ratio, 1))),
                    },
                    "metrics": {"transaction_count": len(rows), "expense_count": len(expenses), "observation_days": span_days},
                    "findings": findings,
                }
            _CACHE.set(key, result)
            timings.log(cache="miss", rows=len(rows))
            return result
        except Exception as exc:
            LOGGER.exception("[AI2] analysis failed")
            return {"status": "ERROR", "message": "Không thể phân tích hồ sơ hành vi.", "findings": [], "error_type": type(exc).__name__}
        finally:
            db.close()


profiler = BehaviorProfiler()

