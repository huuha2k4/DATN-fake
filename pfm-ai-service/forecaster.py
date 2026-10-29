import os
from datetime import datetime, date, timedelta
from typing import Dict, Any, List
import pandas as pd
import numpy as np
from prophet import Prophet
from sqlalchemy import func
from database import SessionLocal, Transaction, Account, Category, Budget, BudgetItem, Goal
from typing import Dict, Any, List, Optional

import sys
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Tắt các log thừa của cmdstanpy/prophet
import logging
logging.getLogger("cmdstanpy").setLevel(logging.WARNING)
logging.getLogger("prophet").setLevel(logging.WARNING)

def get_daily_cashflow(user_id: str = "test_user_01") -> pd.DataFrame:
    """
    Trích xuất chuỗi thời gian dòng tiền hàng ngày từ database:
    - Ngày (ds)
    - Thu nhập (inflow)
    - Chi tiêu (outflow)
    - Số dư luỹ kế cuối ngày (balance)
    """
    try:
        from seed_forecast_data import sync_up_to_today
        sync_up_to_today()
    except Exception:
        pass

    db = SessionLocal()
    try:
        # Lấy tất cả giao dịch được sắp xếp theo thời gian
        txs = (
            db.query(Transaction)
            .filter(Transaction.user_id == user_id)
            .order_by(Transaction.occurred_at.asc())
            .all()
        )

        if not txs:
            return pd.DataFrame()

        # Tổng hợp theo từng ngày
        daily_records: Dict[str, Dict[str, float]] = {}
        for t in txs:
            d_str = t.occurred_at.strftime("%Y-%m-%d")
            if d_str not in daily_records:
                daily_records[d_str] = {"inflow": 0.0, "outflow": 0.0}
            
            if t.type == "INCOME":
                daily_records[d_str]["inflow"] += t.amount
            elif t.type == "EXPENSE":
                daily_records[d_str]["outflow"] += t.amount

        # Lấy số dư hiện tại của user để lùi về tính số dư lịch sử
        accounts = db.query(Account).filter(Account.user_id == user_id).all()
        current_total_balance = sum(a.current_balance for a in accounts)

        # Chuyển thành DataFrame có đầy đủ tất cả các ngày liên tục
        dates = sorted(daily_records.keys())
        full_date_range = pd.date_range(start=dates[0], end=dates[-1], freq="D")
        
        rows = []
        for dt in full_date_range:
            d_str = dt.strftime("%Y-%m-%d")
            rec = daily_records.get(d_str, {"inflow": 0.0, "outflow": 0.0})
            rows.append({
                "ds": dt,
                "inflow": rec["inflow"],
                "outflow": rec["outflow"],
                "net": rec["inflow"] - rec["outflow"]
            })

        df = pd.DataFrame(rows)
        # Tính luỹ kế số dư theo thời gian
        total_net = df["net"].sum()
        initial_balance = current_total_balance - total_net
        df["balance"] = initial_balance + df["net"].cumsum()

        return df
    finally:
        db.close()

def forecast_balance(user_id: str = "test_user_01", horizon_days: int = 30) -> Dict[str, Any]:
    """
    Dự báo số dư tài khoản trong N ngày tới bằng Facebook Prophet.
    Trả về dữ liệu lịch sử + dữ liệu dự báo tương lai và các chỉ số thống kê.
    """
    df = get_daily_cashflow(user_id=user_id)
    if df.empty or len(df) < 14:
        return {
            "status": "error",
            "message": "Chưa đủ dữ liệu để dự báo (cần tối thiểu 14 ngày giao dịch)."
        }

    # Chuẩn bị dữ liệu cho Prophet: ds (ngày) và y (số dư)
    prophet_df = pd.DataFrame({
        "ds": df["ds"],
        "y": df["balance"]
    })

    # Khởi tạo mô hình Prophet
    model = Prophet(
        daily_seasonality=False,
        weekly_seasonality=True,
        yearly_seasonality=False,
        interval_width=0.80 # Khoảng tin cậy 80%
    )
    model.fit(prophet_df)

    # Sinh khung thời gian tương lai
    future = model.make_future_dataframe(periods=horizon_days, freq="D")
    forecast = model.predict(future)

    # Tách dữ liệu quá khứ và dự báo tương lai
    last_historical_date = df["ds"].max()
    historical_data = []
    for _, row in df.iterrows():
        historical_data.append({
            "date": row["ds"].strftime("%Y-%m-%d"),
            "actual_balance": round(float(row["balance"]), 0),
            "outflow": round(float(row["outflow"]), 0)
        })

    future_forecast = []
    future_rows = forecast[forecast["ds"] > last_historical_date]
    for _, row in future_rows.iterrows():
        future_forecast.append({
            "date": row["ds"].strftime("%Y-%m-%d"),
            "predicted_balance": round(float(row["yhat"]), 0),
            "lower_bound": round(float(row["yhat_lower"]), 0),
            "upper_bound": round(float(row["yhat_upper"]), 0)
        })

    # Số dư dự báo tại cuối tháng của chu kỳ hiện tại (hoặc ngày cuối của horizon)
    last_dt = pd.to_datetime(last_historical_date)
    import calendar
    _, last_day = calendar.monthrange(last_dt.year, last_dt.month)
    end_of_month_date = f"{last_dt.year}-{last_dt.month:02d}-{last_day:02d}"
    end_of_month_item = next(
        (item for item in future_forecast if item["date"] == end_of_month_date),
        future_forecast[-1]
    )

    current_balance = float(df["balance"].iloc[-1])
    predicted_end_balance = end_of_month_item["predicted_balance"]
    change = predicted_end_balance - current_balance

    trend = "TĂNG" if change > 0 else ("GIẢM" if change < 0 else "ỔN ĐỊNH")

    return {
        "status": "success",
        "algorithm": "Facebook Prophet (Time-Series)",
        "user_id": user_id,
        "historical_days": len(df),
        "horizon_days": horizon_days,
        "current_balance": round(current_balance, 0),
        "projected_end_of_month_balance": predicted_end_balance,
        "projected_range": {
            "lower": end_of_month_item["lower_bound"],
            "upper": end_of_month_item["upper_bound"]
        },
        "trend": trend,
        "summary": (
            f"Dự báo số dư đến ngày {end_of_month_item['date']}: {predicted_end_balance:,.0f} VND "
            f"(dao động trong khoảng {end_of_month_item['lower_bound']:,.0f} - {end_of_month_item['upper_bound']:,.0f} VND). "
            f"Xu hướng: {trend} so với số dư hiện tại."
        ),
        "historical_points": historical_data[-30:], # 30 ngày gần nhất
        "forecast_points": future_forecast
    }

def forecast_spending(user_id: str = "test_user_01", horizon_days: int = 30) -> Dict[str, Any]:
    """
    Dự báo tổng mức chi tiêu trung bình mỗi ngày trong N ngày tới.
    """
    df = get_daily_cashflow(user_id=user_id)
    if df.empty or len(df) < 14:
        return {"status": "error", "message": "Chưa đủ dữ liệu."}

    # Bỏ qua những ngày đột biến trả tiền trọ khi tính chi tiêu sinh hoạt hàng ngày
    spend_df = pd.DataFrame({
        "ds": df["ds"],
        "y": df["outflow"]
    })

    model = Prophet(
        daily_seasonality=False,
        weekly_seasonality=True,
        yearly_seasonality=False,
        interval_width=0.80
    )
    model.fit(spend_df)

    future = model.make_future_dataframe(periods=horizon_days, freq="D")
    forecast = model.predict(future)

    last_historical_date = df["ds"].max()
    future_rows = forecast[forecast["ds"] > last_historical_date]
    avg_daily_spend = max(0.0, float(future_rows["yhat"].mean()))
    projected_total = avg_daily_spend * horizon_days

    return {
        "status": "success",
        "avg_daily_spend": round(avg_daily_spend, 0),
        "projected_total_spend": round(projected_total, 0),
        "horizon_days": horizon_days,
        "summary": (
            f"Dự báo mức chi tiêu trung bình khoảng {avg_daily_spend:,.0f} VND/ngày. "
            f"Tổng chi tiêu dự kiến trong {horizon_days} ngày tới là {projected_total:,.0f} VND."
        )
    }

def forecast_category_spending(user_id: str = "test_user_01", category_name: str = "Ăn uống") -> Dict[str, Any]:
    """
    Dự báo tổng chi tiêu cho một danh mục cụ thể đến cuối tháng hiện tại.
    Đồng thời đối chiếu với hạn mức ngân sách để đưa ra cảnh báo sớm.
    Hoàn toàn tự động tính toán theo mốc thời gian thực tế.
    """
    db = SessionLocal()
    try:
        # Tìm danh mục
        cat = db.query(Category).filter(Category.name.ilike(f"%{category_name}%")).first()
        if not cat:
            return {"status": "error", "message": f"Không tìm thấy danh mục '{category_name}'."}

        # Xác định mốc thời gian thực tế của tháng hiện tại
        today = date.today()
        import calendar
        _, total_days_in_month = calendar.monthrange(today.year, today.month)
        
        first_day_of_month = datetime(today.year, today.month, 1, 0, 0, 0)
        end_of_today = datetime(today.year, today.month, today.day, 23, 59, 59)

        days_passed = today.day
        days_remaining = max(0, total_days_in_month - days_passed)

        # Tính tổng chi tiêu đã phát sinh từ đầu tháng đến hết ngày hôm nay
        current_spent = (
            db.query(func.sum(Transaction.amount))
            .filter(
                Transaction.user_id == user_id,
                Transaction.category_id == cat.id,
                Transaction.type == "EXPENSE",
                Transaction.occurred_at >= first_day_of_month,
                Transaction.occurred_at <= end_of_today
            )
            .scalar() or 0.0
        )

        # Tốc độ chi tiêu trung bình/ngày trong các ngày đã qua của tháng
        daily_rate = current_spent / max(days_passed, 1)
        projected_additional = daily_rate * days_remaining
        projected_total_month = current_spent + projected_additional

        # Đối chiếu với ngân sách đang áp dụng cho tháng này
        budget_item = (
            db.query(BudgetItem)
            .join(Budget)
            .filter(
                Budget.user_id == user_id,
                BudgetItem.category_id == cat.id,
                Budget.start_date <= today,
                Budget.end_date >= today
            )
            .first()
        )

        budget_limit = budget_item.limit_amount if budget_item else None
        risk_level = "AN TOÀN"
        if budget_limit:
            if projected_total_month > budget_limit:
                risk_level = "NGUY CƠ VƯỢT NGÂN SÁCH"
            elif projected_total_month > budget_limit * 0.85:
                risk_level = "CẢNH BÁO SÁT NGƯỠNG"

        summary = (
            f"Danh mục '{cat.name}': Đến ngày {today.day}/{today.month} bạn đã chi {current_spent:,.0f} VND "
            f"(trung bình {daily_rate:,.0f} VND/ngày qua {days_passed} ngày). "
            f"Dự kiến đến hết tháng {today.month} (còn {days_remaining} ngày) sẽ chi khoảng {projected_total_month:,.0f} VND."
        )
        if budget_limit:
            diff = budget_limit - projected_total_month
            summary += f" Hạn mức ngân sách là {budget_limit:,.0f} VND. Tình trạng: [{risk_level}] (Dự kiến chênh lệch: {diff:,.0f} VND)."

        return {
            "status": "success",
            "category_name": cat.name,
            "days_passed": days_passed,
            "days_remaining": days_remaining,
            "current_spent": current_spent,
            "current_spent_10d": current_spent, # Tương thích ngược
            "daily_rate": round(daily_rate, 0),
            "projected_total_month": round(projected_total_month, 0),
            "budget_limit": budget_limit,
            "risk_level": risk_level,
            "summary": summary
        }
    finally:
        db.close()

def forecast_goal_completion(user_id: str = "test_user_01", goal_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Ước lượng thời gian và khả năng hoàn thành mục tiêu tài chính
    dựa trên thặng dư thu - chi trung bình mỗi tháng từ lịch sử giao dịch thực tế.
    """
    db = SessionLocal()
    try:
        # Lấy danh sách mục tiêu
        q = db.query(Goal).filter(Goal.user_id == user_id, Goal.status == "ACTIVE")
        if goal_name:
            q = q.filter(Goal.name.ilike(f"%{goal_name}%"))
        goals = q.all()

        if not goals:
            return {"status": "error", "message": "Không tìm thấy mục tiêu tài chính nào đang kích hoạt."}

        # Tính thặng dư tiết kiệm trung bình mỗi tháng từ toàn bộ lịch sử thu - chi
        total_inflow = (
            db.query(func.sum(Transaction.amount))
            .filter(Transaction.user_id == user_id, Transaction.type == "INCOME")
            .scalar() or 0.0
        )
        total_outflow = (
            db.query(func.sum(Transaction.amount))
            .filter(Transaction.user_id == user_id, Transaction.type == "EXPENSE")
            .scalar() or 0.0
        )

        first_tx = (
            db.query(Transaction.occurred_at)
            .filter(Transaction.user_id == user_id)
            .order_by(Transaction.occurred_at.asc())
            .first()
        )
        if first_tx:
            days_span = max(30, (datetime.now() - first_tx[0]).days)
            months_span = max(1.0, days_span / 30.4)
        else:
            months_span = 1.0

        net_saving_calc = (total_inflow - total_outflow) / months_span
        monthly_saving_rate = max(1000000.0, float(net_saving_calc)) # Tối thiểu 1 triệu để ước tính khả thi

        today = date.today()
        goal_results = []
        for g in goals:
            gap = max(0.0, g.target_amount - g.current_amount)
            if gap == 0:
                months_needed = 0.0
                est_date_str = "Đã hoàn thành"
            else:
                months_needed = gap / monthly_saving_rate
                days_needed = int(months_needed * 30.4)
                est_date = today + timedelta(days=days_needed)
                est_date_str = est_date.strftime("%m/%Y")

            goal_results.append({
                "goal_id": g.id,
                "name": g.name,
                "target_amount": g.target_amount,
                "current_amount": g.current_amount,
                "progress_pct": round((g.current_amount / g.target_amount) * 100, 1),
                "remaining_amount": gap,
                "months_needed": round(months_needed, 1),
                "estimated_completion_month": est_date_str
            })

        first_goal = goal_results[0]
        summary = (
            f"Với khả năng tiết kiệm hiện tại (~{monthly_saving_rate:,.0f} VND/tháng), "
            f"mục tiêu '{first_goal['name']}' (còn thiếu {first_goal['remaining_amount']:,.0f} VND) "
            f"dự kiến sẽ hoàn thành sau khoảng {first_goal['months_needed']} tháng nữa (khoảng tháng {first_goal['estimated_completion_month']})."
        )

        return {
            "status": "success",
            "estimated_monthly_saving": round(monthly_saving_rate, 0),
            "goals": goal_results,
            "summary": summary
        }
    finally:
        db.close()

if __name__ == "__main__":
    res = forecast_balance("test_user_01", 21)
    print(res["summary"])
    print(forecast_category_spending("test_user_01", "Ăn uống")["summary"])
    print(forecast_goal_completion("test_user_01")["summary"])

