"""
AI 2: Phân tích hành vi chi tiêu (Spending Behavior Profiling)
Module phân tích lịch sử giao dịch để nhận diện thói quen, chỉ số hành vi,
đánh giá theo quy tắc 50/30/20 và phân cụm hình mẫu tài chính (Financial Persona).
"""

import sys
from datetime import datetime, date
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from sqlalchemy import func
from database import SessionLocal, Transaction, Category, Account

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Định nghĩa các hình mẫu tài chính mẫu (Prototypical Archetypes)
# Vector đặc trưng chuẩn hoá: [savings_norm, dining_ratio, wants_ratio, eom_surge_ratio, night_ratio]
PERSONA_ARCHETYPES = {
    "NGUOI_TIET_KIEM": {
        "title": "Người Tiết Kiệm & Kỷ Luật",
        "tagline": "Ưu tiên tích lũy dự phòng, chi tiêu có kế hoạch chặt chẽ.",
        "icon": "🛡️",
        "color": "#10b981", # Emerald Green
        "centroid": np.array([0.85, 0.20, 0.15, 0.90, 0.02]),
        "description": "Bạn có ý thức quản lý tài chính xuất sắc, duy trì tỷ lệ tích lũy cao và ít khi bị cám dỗ mua sắm ngoài kế hoạch."
    },
    "TIN_DO_AM_THUC": {
        "title": "Tín Đồ Ẩm Thực",
        "tagline": "Dành tình yêu và phần lớn ngân sách cho ăn uống, cà phê.",
        "icon": "🍜",
        "color": "#f59e0b", # Amber Orange
        "centroid": np.array([0.30, 0.45, 0.25, 1.10, 0.05]),
        "description": "Khoản chi lớn nhất của bạn luôn gắn liền với ẩm thực, nhà hàng hoặc hội họp bạn bè."
    },
    "VUNG_TAY_QUA_TRAN": {
        "title": "Người Chi Tiêu Ngẫu Hứng",
        "tagline": "Dễ bị cám dỗ bởi mua sắm ngẫu hứng, tích lũy thấp.",
        "icon": "🛍️",
        "color": "#ef4444", # Crimson Red
        "centroid": np.array([0.05, 0.30, 0.50, 1.45, 0.12]),
        "description": "Bạn thường xuyên vượt kế hoạch chi tiêu cho các sở thích nhất thời và gặp khó khăn trong việc duy trì quỹ tiết kiệm."
    },
    "CHI_TIEU_CUOI_THANG": {
        "title": "Bùng Nổ Chi Tiêu Cuối Tháng",
        "tagline": "Chi tiêu có xu hướng dồn dập vào 7-10 ngày cuối tháng.",
        "icon": "📅",
        "color": "#8b5cf6", # Purple
        "centroid": np.array([0.25, 0.30, 0.30, 1.60, 0.04]),
        "description": "Bạn có thói quen thong thả đầu tháng nhưng lại phát sinh nhiều khoản chi đột biến vào những ngày cận cuối tháng."
    },
    "NGUOI_CAN_BANG": {
        "title": "Người Chi Tiêu Cân Bằng",
        "tagline": "Biết cân đối hài hòa giữa nhu cầu thiết yếu và hưởng thụ.",
        "icon": "⚖️",
        "color": "#38bdf8", # Sky Blue
        "centroid": np.array([0.50, 0.28, 0.25, 1.00, 0.03]),
        "description": "Bạn giữ được sự cân đối tương đối tốt giữa nhu cầu sống thiết yếu, một chút giải trí và duy trì mức tiết kiệm an toàn."
    }
}

class BehaviorProfiler:
    """
    Công cụ phân tích hành vi và hồ sơ chi tiêu của người dùng.
    """

    def analyze_user(self, user_id: str = "test_user_01") -> Dict[str, Any]:
        db = SessionLocal()
        try:
            # 1. Truy vấn toàn bộ giao dịch của người dùng
            txs = (
                db.query(Transaction)
                .filter(Transaction.user_id == user_id)
                .order_by(Transaction.occurred_at.asc())
                .all()
            )

            if len(txs) < 5:
                return {
                    "status": "COLD_START",
                    "message": "Người dùng chưa có đủ giao dịch (tối thiểu 5) để phân tích hành vi chuẩn xác.",
                    "persona": PERSONA_ARCHETYPES["NGUOI_CAN_BANG"],
                    "metrics": {},
                    "findings": ["Tài khoản mới, cần thêm giao dịch để AI nhận diện thói quen."]
                }

            # Lấy thông tin danh mục
            categories = {c.id: c for c in db.query(Category).all()}

            # Chuyển đổi sang DataFrame để tính toán tốc độ cao
            records = []
            for t in txs:
                cat = categories.get(t.category_id)
                cat_name = cat.name if cat else "Khác"
                is_essential = cat.is_essential if cat else False
                records.append({
                    "id": t.id,
                    "type": t.type,
                    "amount": t.amount,
                    "occurred_at": t.occurred_at,
                    "category_id": t.category_id,
                    "category_name": cat_name,
                    "is_essential": is_essential,
                    "hour": t.occurred_at.hour,
                    "day": t.occurred_at.day,
                    "day_of_week": t.occurred_at.weekday(), # 0: Thứ 2, ..., 5: T7, 6: CN
                })
            df = pd.DataFrame(records)

            income_df = df[df["type"] == "INCOME"]
            expense_df = df[df["type"] == "EXPENSE"]

            total_income = float(income_df["amount"].sum())
            total_expense = float(expense_df["amount"].sum())
            net_savings = total_income - total_expense

            if total_expense <= 0:
                total_expense = 1.0  # Tránh chia cho 0

            # 2. Tỷ lệ tiết kiệm (Savings Rate)
            savings_rate = (net_savings / total_income * 100.0) if total_income > 0 else 0.0
            savings_norm = max(0.0, min(1.0, (savings_rate + 10.0) / 50.0)) # Chuẩn hoá 0 -> 1

            if savings_rate < 0:
                savings_label = "Thâm hụt (Chi vượt thu)"
            elif savings_rate < 12:
                savings_label = "Mức tiết kiệm thấp"
            elif savings_rate < 25:
                savings_label = "Mức tiết kiệm trung bình"
            else:
                savings_label = "Mức tiết kiệm tốt"

            # 3. Phân bổ theo quy tắc 50/30/20 (Needs vs. Wants vs. Savings)
            needs_spent = float(expense_df[expense_df["is_essential"] == True]["amount"].sum())
            wants_spent = float(expense_df[expense_df["is_essential"] == False]["amount"].sum())

            needs_ratio = needs_spent / total_expense
            wants_ratio = wants_spent / total_expense

            rule_50_30_20 = {
                "needs_pct": round(needs_ratio * 100, 1),
                "wants_pct": round(wants_ratio * 100, 1),
                "savings_pct": round(max(0, savings_rate), 1),
                "standard": "50% Thiết yếu - 30% Hưởng thụ - 20% Tiết kiệm"
            }

            # 4. Cơ cấu theo danh mục & Tỷ lệ Ăn uống
            cat_summary = (
                expense_df.groupby("category_name")["amount"]
                .sum()
                .sort_values(ascending=False)
            )
            top_categories = []
            food_spent = 0.0
            for name, amt in cat_summary.items():
                pct = round((amt / total_expense) * 100, 1)
                top_categories.append({"category": name, "amount": float(amt), "percentage": pct})
                if "ăn uống" in name.lower() or "food" in name.lower():
                    food_spent += amt

            dining_ratio = food_spent / total_expense
            dining_pct = round(dining_ratio * 100, 1)

            # 5. Phân tích thời gian:
            # 5.1. Bùng nổ chi tiêu cuối tháng (End-of-Month Surge)
            # So sánh chi tiêu trung bình/ngày của 7 ngày cuối tháng (ngày >= 24) vs các ngày còn lại
            eom_df = expense_df[expense_df["day"] >= 24]
            rest_df = expense_df[expense_df["day"] < 24]

            # Đếm số ngày có giao dịch thực tế
            eom_days = max(1, len(eom_df["occurred_at"].dt.date.unique()))
            rest_days = max(1, len(rest_df["occurred_at"].dt.date.unique()))

            eom_daily_avg = float(eom_df["amount"].sum() / eom_days) if len(eom_df) > 0 else 0.0
            rest_daily_avg = float(rest_df["amount"].sum() / rest_days) if len(rest_df) > 0 else 1.0

            eom_surge_ratio = eom_daily_avg / max(rest_daily_avg, 1.0)

            # 5.2. Thói quen tiêu tiền cuối tuần (Weekend Bias)
            weekend_df = expense_df[expense_df["day_of_week"].isin([5, 6])]
            weekday_df = expense_df[~expense_df["day_of_week"].isin([5, 6])]
            weekend_total = float(weekend_df["amount"].sum())
            weekend_ratio = weekend_total / total_expense

            # 5.3. Thói quen tiêu tiền ban đêm (Night Spending: 22h -> 5h sáng)
            night_df = expense_df[(expense_df["hour"] >= 22) | (expense_df["hour"] <= 5)]
            night_total = float(night_df["amount"].sum())
            night_ratio = night_total / total_expense
            night_tx_count = len(night_df)

            # 6. Phân cụm Persona bằng Khoảng cách Euclidean trong không gian đặc trưng
            user_vector = np.array([
                savings_norm,
                dining_ratio,
                wants_ratio,
                min(2.0, eom_surge_ratio),
                night_ratio
            ])

            # Tính khoảng cách đến các centroid của Persona
            closest_persona_key = "NGUOI_CAN_BANG"
            min_dist = float("inf")
            persona_scores = {}

            for p_key, p_val in PERSONA_ARCHETYPES.items():
                centroid = p_val["centroid"]
                dist = np.linalg.norm(user_vector - centroid)
                similarity = round(float(1.0 / (1.0 + dist) * 100), 1)
                persona_scores[p_key] = similarity
                if dist < min_dist:
                    min_dist = dist
                    closest_persona_key = p_key

            # Heuristic override nếu thỏa mãn điều kiện đặc thù rõ nét
            if dining_ratio >= 0.36:
                closest_persona_key = "TIN_DO_AM_THUC"
            elif savings_rate < 10 and wants_ratio > 0.40:
                closest_persona_key = "VUNG_TAY_QUA_TRAN"
            elif eom_surge_ratio >= 1.35 and dining_ratio < 0.35:
                closest_persona_key = "CHI_TIEU_CUOI_THANG"
            elif savings_rate >= 25 and wants_ratio <= 0.22:
                closest_persona_key = "NGUOI_TIET_KIEM"

            matched_persona = PERSONA_ARCHETYPES[closest_persona_key]

            # 7. Thang điểm Radar Chart (0 - 100) cho giao diện hiển thị
            radar_scores = {
                "savings_discipline": min(100, max(10, int(savings_norm * 100))), # Kỷ luật tích lũy
                "needs_control": min(100, max(10, int(100 - abs(needs_ratio - 0.50) * 120))), # Cân đối thiết yếu (gần 50% là tối ưu)
                "lifestyle_moderation": min(100, max(10, int((1.0 - wants_ratio) * 100))), # Tiết chế hưởng thụ
                "temporal_stability": min(100, max(10, int(100 - max(0, eom_surge_ratio - 1.0) * 60 - night_ratio * 150))), # Ổn định thời gian
                "food_moderation": min(100, max(10, int(100 - max(0, dining_ratio - 0.25) * 150))) # Cân đối ăn uống
            }

            # 8. Sinh các phát hiện hành vi thực tế (Trùng khớp ví dụ trong đề cương đồ án)
            findings = []
            
            # Tiêu chí 1: Ăn uống
            if dining_pct >= 30.0:
                findings.append(f"Chi tiêu nhiều vào ăn uống: chiếm {dining_pct}% tổng chi tiêu cá nhân.")
            else:
                findings.append(f"Chi tiêu ăn uống hợp lý: chiếm {dining_pct}% tổng ngân sách.")

            # Tiêu chí 2: Mức tiết kiệm
            if savings_rate < 12.0:
                findings.append(f"Mức tiết kiệm thấp: hiện chỉ giữ lại được {round(savings_rate, 1)}% tổng thu nhập hàng tháng.")
            else:
                findings.append(f"Tỷ lệ tiết kiệm khả quan: đạt {round(savings_rate, 1)}% tổng thu nhập.")

            # Tiêu chí 3: Chi tiêu cuối tháng
            if eom_surge_ratio >= 1.25:
                surge_pct = round((eom_surge_ratio - 1.0) * 100, 1)
                findings.append(f"Thường phát sinh chi tiêu vào cuối tháng: cao hơn {surge_pct}% so với mức bình quân các ngày trước đó.")

            # Tiêu chí 4: Thói quen cuối tuần & ban đêm
            if weekend_ratio >= 0.38:
                findings.append(f"Có xu hướng chi mạnh tay vào cuối tuần: chiếm {round(weekend_ratio * 100, 1)}% tổng số tiền đã tiêu.")
            if night_tx_count >= 3:
                findings.append(f"Có thói quen giao dịch ban đêm (22h - 5h): ghi nhận {night_tx_count} giao dịch ({round(night_ratio * 100, 1)}% giá trị).")

            return {
                "status": "SUCCESS",
                "user_id": user_id,
                "persona": {
                    "code": closest_persona_key,
                    "title": matched_persona["title"],
                    "tagline": matched_persona["tagline"],
                    "icon": matched_persona["icon"],
                    "color": matched_persona["color"],
                    "description": matched_persona["description"],
                    "affinity_score": persona_scores.get(closest_persona_key, 85.0)
                },
                "summary": {
                    "total_income": total_income,
                    "total_expense": total_expense,
                    "net_savings": net_savings,
                    "savings_rate": round(savings_rate, 1),
                    "savings_label": savings_label
                },
                "rule_50_30_20": rule_50_30_20,
                "dining_analysis": {
                    "dining_amount": float(food_spent),
                    "dining_percentage": dining_pct,
                    "is_heavy": dining_ratio >= 0.35
                },
                "temporal_patterns": {
                    "eom_surge_ratio": round(eom_surge_ratio, 2),
                    "has_eom_spike": eom_surge_ratio >= 1.25,
                    "weekend_percentage": round(weekend_ratio * 100, 1),
                    "night_transactions": night_tx_count,
                    "night_percentage": round(night_ratio * 100, 1)
                },
                "top_categories": top_categories[:5],
                "radar_scores": radar_scores,
                "findings": findings
            }

        except Exception as e:
            return {
                "status": "ERROR",
                "error": str(e),
                "findings": [f"Lỗi khi trích xuất hồ sơ hành vi: {str(e)}"]
            }
        finally:
            db.close()

# Singleton instance
profiler = BehaviorProfiler()

if __name__ == "__main__":
    import json
    res = profiler.analyze_user("test_user_01")
    print(json.dumps(res, ensure_ascii=False, indent=2))
