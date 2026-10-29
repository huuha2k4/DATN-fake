from datetime import datetime, date
from typing import Optional
from sqlalchemy import func, extract
from langchain_core.tools import tool
from database import SessionLocal, Account, Transaction, Category, Budget, BudgetItem

@tool
def get_account_balances(user_id: str = "test_user_01") -> str:
    """
    Tra cứu số dư hiện tại của tất cả các ví/tài khoản (tiền mặt, ngân hàng, ví điện tử)
    và tổng tài sản hiện có của người dùng.
    """
    db = SessionLocal()
    try:
        accounts = db.query(Account).filter(Account.user_id == user_id).all()
        if not accounts:
            return "Không tìm thấy tài khoản nào của người dùng."
        
        result = ["Danh sách tài khoản và số dư:"]
        total = 0.0
        for acc in accounts:
            result.append(f"- {acc.name} ({acc.type}): {acc.current_balance:,.0f} {acc.currency_code}")
            total += acc.current_balance
        result.append(f"=> Tổng tài sản hiện có: {total:,.0f} VND")
        return "\n".join(result)
    finally:
        db.close()

@tool
def get_spending_by_category(month: int, year: int, user_id: str = "test_user_01") -> str:
    """
    Thống kê tổng chi tiêu và chi tiết theo từng danh mục (Ăn uống, Mua sắm, v.v.)
    trong một tháng và năm cụ thể. Dùng để trả lời câu hỏi: 'Tháng trước tôi tiêu nhiều nhất vào đâu?'
    hoặc 'Tháng này đã tiêu bao nhiêu tiền?'.
    """
    db = SessionLocal()
    try:
        query = (
            db.query(
                Category.name,
                func.sum(Transaction.amount).label("total_amount")
            )
            .join(Transaction, Transaction.category_id == Category.id)
            .filter(
                Transaction.user_id == user_id,
                Transaction.type == "EXPENSE",
                extract("month", Transaction.occurred_at) == month,
                extract("year", Transaction.occurred_at) == year
            )
            .group_by(Category.name)
            .order_by(func.sum(Transaction.amount).desc())
            .all()
        )

        if not query:
            return f"Không có dữ liệu chi tiêu trong tháng {month}/{year}."

        total_expense = sum(row.total_amount for row in query)
        lines = [f"Báo cáo chi tiêu tháng {month}/{year} (Tổng chi: {total_expense:,.0f} VND):"]
        for row in query:
            pct = (row.total_amount / total_expense) * 100 if total_expense > 0 else 0
            lines.append(f"- {row.name}: {row.total_amount:,.0f} VND ({pct:.1f}%)")
        return "\n".join(lines)
    finally:
        db.close()

@tool
def get_budget_status(month: Optional[int] = None, year: Optional[int] = None, user_id: str = "test_user_01") -> str:
    """
    Kiểm tra tình hình ngân sách, hạn mức và số tiền còn lại có thể chi trong tháng.
    Dùng khi người dùng hỏi: 'Tôi còn bao nhiêu tiền có thể chi trong tháng này?' hoặc
    'Ngân sách ăn uống còn bao nhiêu?'.
    """
    today = date.today()
    if month is None:
        month = today.month
    if year is None:
        year = today.year

    db = SessionLocal()
    try:
        budget = (
            db.query(Budget)
            .filter(
                Budget.user_id == user_id,
                extract("month", Budget.start_date) == month,
                extract("year", Budget.start_date) == year
            )
            .first()
        )

        if not budget:
            return f"Bạn chưa thiết lập ngân sách cho tháng {month}/{year}."

        lines = [
            f"Tình hình ngân sách: {budget.name}",
            f"Tổng hạn mức: {budget.total_limit:,.0f} VND"
        ]

        total_spent = 0.0
        for item in budget.items:
            cat_name = item.category.name if item.category else "Chung"
            remaining = item.limit_amount - item.spent_amount
            status = "CẢNH BÁO VƯỢT" if remaining < 0 else "OK"
            lines.append(
                f"- {cat_name}: Đã chi {item.spent_amount:,.0f} / Hạn mức {item.limit_amount:,.0f} VND (Còn lại: {remaining:,.0f} VND) [{status}]"
            )
            total_spent += item.spent_amount

        total_remaining = budget.total_limit - total_spent
        lines.append(f"=> Tổng đã chi: {total_spent:,.0f} VND. Tổng ngân sách còn lại có thể chi: {total_remaining:,.0f} VND.")
        return "\n".join(lines)
    finally:
        db.close()

@tool
def get_recent_transactions(limit: int = 5, user_id: str = "test_user_01") -> str:
    """
    Lấy danh sách các giao dịch thu/chi gần đây nhất của người dùng.
    Dùng khi người dùng hỏi: 'Gần đây tôi tiêu những gì?', 'Liệt kê các giao dịch mới nhất'.
    """
    db = SessionLocal()
    try:
        txs = (
            db.query(Transaction)
            .filter(Transaction.user_id == user_id)
            .order_by(Transaction.occurred_at.desc())
            .limit(limit)
            .all()
        )

        if not txs:
            return "Chưa có giao dịch nào gần đây."

        lines = [f"{len(txs)} giao dịch gần đây nhất:"]
        for tx in txs:
            cat_name = tx.category.name if tx.category else "Không có danh mục"
            sign = "+" if tx.type == "INCOME" else "-"
            lines.append(
                f"- [{tx.occurred_at.strftime('%d/%m/%Y')}] {tx.note or cat_name}: {sign}{tx.amount:,.0f} VND ({cat_name})"
            )
        return "\n".join(lines)
    finally:
        db.close()

@tool
def search_transactions(
    keyword: Optional[str] = None,
    category_name: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    transaction_type: Optional[str] = None,
    limit: int = 10,
    user_id: str = "test_user_01"
) -> str:
    """
    Tìm kiếm và lọc chi tiết các giao dịch theo nhiều tiêu chí linh hoạt:
    - keyword: từ khóa xuất hiện trong ghi chú (ví dụ: 'Grab', 'Highlands', 'tiền trọ', 'Haidilao', 'bàn phím', 'Uniqlo', 'xăng'...).
    - category_name: tên danh mục ('Ăn uống', 'Di chuyển', 'Nhà ở', 'Mua sắm', 'Giải trí', 'Lương'...).
    - min_amount: số tiền tối thiểu (ví dụ: tìm các khoản trên 500.000đ thì min_amount=500000).
    - max_amount: số tiền tối đa.
    - start_date: ngày bắt đầu định dạng YYYY-MM-DD (ví dụ '2026-09-01').
    - end_date: ngày kết thúc định dạng YYYY-MM-DD (ví dụ '2026-09-30').
    - transaction_type: loại giao dịch ('EXPENSE' là chi tiêu, 'INCOME' là thu nhập).
    - limit: số lượng kết quả tối đa (mặc định 10).
    Dùng khi người dùng hỏi các câu hỏi chi tiết như: 'Tìm các khoản chi trên 500k', 'Tôi đã đi Grab bao nhiêu lần?', 'Tháng trước tôi mua sắm những món gì?'.
    """
    db = SessionLocal()
    try:
        q = db.query(Transaction).filter(Transaction.user_id == user_id)

        if keyword:
            q = q.filter(Transaction.note.ilike(f"%{keyword}%"))

        if category_name:
            q = q.join(Category).filter(Category.name.ilike(f"%{category_name}%"))

        if min_amount is not None:
            q = q.filter(Transaction.amount >= min_amount)

        if max_amount is not None:
            q = q.filter(Transaction.amount <= max_amount)

        if start_date:
            try:
                s_dt = datetime.strptime(start_date, "%Y-%m-%d")
                q = q.filter(Transaction.occurred_at >= s_dt)
            except ValueError:
                pass

        if end_date:
            try:
                e_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
                q = q.filter(Transaction.occurred_at <= e_dt)
            except ValueError:
                pass

        if transaction_type:
            q = q.filter(Transaction.type == transaction_type.upper())

        txs = q.order_by(Transaction.occurred_at.desc()).limit(limit).all()

        if not txs:
            return "Không tìm thấy giao dịch nào phù hợp với điều kiện tìm kiếm."

        total_found = sum(t.amount for t in txs)
        lines = [f"Tìm thấy {len(txs)} giao dịch phù hợp (Tổng tiền: {total_found:,.0f} VND):"]
        for t in txs:
            cname = t.category.name if t.category else "Chưa phân loại"
            sign = "+" if t.type == "INCOME" else "-"
            lines.append(
                f"- [{t.occurred_at.strftime('%d/%m/%Y')}] {t.note or cname}: {sign}{t.amount:,.0f} VND (Danh mục: {cname})"
            )
        return "\n".join(lines)
    finally:
        db.close()

@tool
def compare_monthly_spending(
    month1: int,
    year1: int,
    month2: int,
    year2: int,
    user_id: str = "test_user_01"
) -> str:
    """
    So sánh tổng chi tiêu và chi tiết từng danh mục giữa hai tháng bất kỳ.
    Dùng khi người dùng hỏi: 'So sánh chi tiêu tháng này với tháng trước',
    'Tháng 10 tôi tiêu nhiều hơn hay ít hơn tháng 9?'.
    """
    db = SessionLocal()
    try:
        def get_month_data(m: int, y: int):
            rows = (
                db.query(Category.name, func.sum(Transaction.amount).label("total"))
                .join(Transaction, Transaction.category_id == Category.id)
                .filter(
                    Transaction.user_id == user_id,
                    Transaction.type == "EXPENSE",
                    extract("month", Transaction.occurred_at) == m,
                    extract("year", Transaction.occurred_at) == y
                )
                .group_by(Category.name)
                .all()
            )
            data = {r.name: r.total for r in rows}
            return data, sum(data.values())

        data1, total1 = get_month_data(month1, year1)
        data2, total2 = get_month_data(month2, year2)

        diff_total = total2 - total1
        direction = "tăng" if diff_total > 0 else "giảm"

        lines = [
            f"So sánh chi tiêu tháng {month1}/{year1} và tháng {month2}/{year2}:",
            f"- Tổng chi tháng {month1}/{year1}: {total1:,.0f} VND",
            f"- Tổng chi tháng {month2}/{year2}: {total2:,.0f} VND",
            f"=> Tháng {month2}/{year2} đã {direction} {abs(diff_total):,.0f} VND so với tháng {month1}/{year1}.",
            "\nChi tiết biến động theo danh mục:"
        ]

        all_cats = set(data1.keys()).union(set(data2.keys()))
        for cat in sorted(all_cats):
            c1 = data1.get(cat, 0.0)
            c2 = data2.get(cat, 0.0)
            c_diff = c2 - c1
            c_dir = "tăng" if c_diff > 0 else "giảm"
            lines.append(f"- {cat}: {c1:,.0f} -> {c2:,.0f} VND ({c_dir} {abs(c_diff):,.0f} VND)")

        return "\n".join(lines)
    finally:
        db.close()

@tool
def get_balance_forecast(horizon_days: int = 30, user_id: str = "test_user_01") -> str:
    """
    Dự báo số dư tài khoản đến cuối tháng (hoặc N ngày tới) bằng mô hình chuỗi thời gian (Facebook Prophet).
    Dùng khi người dùng hỏi: 'Nếu giữ mức chi tiêu hiện tại thì cuối tháng còn bao nhiêu tiền?',
    'Dự báo số dư tài khoản của tôi?', 'Tôi có bị thâm hụt tiền vào cuối tháng không?'.
    """
    from forecaster import forecast_balance
    res = forecast_balance(user_id=user_id, horizon_days=horizon_days)
    if res.get("status") == "error":
        return res.get("message", "Không thể dự báo do thiếu dữ liệu.")
    
    return (
        f"Kết quả dự báo tài chính (Thuật toán: {res['algorithm']}):\n"
        f"- Số dư hiện tại: {res['current_balance']:,.0f} VND\n"
        f"- Dự báo số dư cuối tháng: {res['projected_end_of_month_balance']:,.0f} VND "
        f"(Khoảng tin cậy 80%: {res['projected_range']['lower']:,.0f} - {res['projected_range']['upper']:,.0f} VND)\n"
        f"- Xu hướng: {res['trend']} so với hiện tại.\n"
        f"=> Đánh giá: {res['summary']}"
    )

@tool
def get_category_spending_forecast(category_name: str = "Ăn uống", user_id: str = "test_user_01") -> str:
    """
    Dự báo tổng chi tiêu cho một danh mục cụ thể (ví dụ 'Ăn uống', 'Mua sắm', 'Di chuyển') đến cuối tháng,
    đồng thời đối chiếu với hạn mức ngân sách để cảnh báo xem có nguy cơ vượt ngân sách hay không.
    Dùng khi người dùng hỏi: 'Dự kiến tháng này tiền ăn uống hết bao nhiêu?',
    'Tôi có bị vượt ngân sách ăn uống tháng này không?'.
    """
    from forecaster import forecast_category_spending
    res = forecast_category_spending(user_id=user_id, category_name=category_name)
    if res.get("status") == "error":
        return res.get("message", "Lỗi dự báo.")
    return res["summary"]

@tool
def get_goal_completion_forecast(goal_name: Optional[str] = None, user_id: str = "test_user_01") -> str:
    """
    Ước lượng thời gian và dự đoán khi nào người dùng sẽ đạt được mục tiêu tài chính
    (ví dụ: 'Mua laptop mới', 'Quỹ dự phòng khẩn cấp') dựa trên tốc độ tiết kiệm hàng tháng.
    Dùng khi người dùng hỏi: 'Bao lâu nữa tôi mua được laptop?',
    'Dự đoán thời gian hoàn thành mục tiêu tài chính?', 'Khi nào đạt được mục tiêu?'.
    """
    from forecaster import forecast_goal_completion
    res = forecast_goal_completion(user_id=user_id, goal_name=goal_name)
    if res.get("status") == "error":
        return res.get("message", "Lỗi dự báo mục tiêu.")
    return res["summary"]

@tool
def check_unusual_spending(user_id: str = "test_user_01") -> str:
    """
    Quét và phát hiện các giao dịch chi tiêu bất thường (tiền đột biến quá cao, giao dịch đêm khuya)
    bằng mô hình Machine Learning Isolation Forest (AI 4).
    Dùng khi người dùng hỏi: 'Gần đây tôi có giao dịch nào bất thường không?',
    'Có khoản chi tiêu nào đáng ngờ không?', 'Kiểm tra giao dịch bất thường'.
    """
    from anomaly_detector import detector
    anomalies = detector.scan_historical_anomalies(user_id=user_id)
    if not anomalies:
        return "Hệ thống không phát hiện giao dịch bất thường nào. Tất cả các khoản chi tiêu đều phù hợp với thói quen của bạn."

    lines = [f"Phát hiện {len(anomalies)} giao dịch có dấu hiệu bất thường (Thuật toán: Isolation Forest):"]
    for a in anomalies[:5]:
        lines.append(f"- [{a['date']}] {a['note'] or a['category']}: {a['amount']:,.0f} VND [{a['severity']}] -> {a['explanation']}")
    return "\n".join(lines)

@tool
def get_spending_behavior_profile(user_id: str = "test_user_01") -> str:
    """
    Phân tích hồ sơ hành vi chi tiêu (AI 2: Spending Behavior Profiling),
    đánh giá thói quen tài chính, tỷ lệ tiết kiệm, quy tắc 50/30/20,
    chi tiêu ăn uống, xu hướng bùng nổ cuối tháng, và hình mẫu tài chính (Persona).
    Dùng khi người dùng hỏi: 'Phân tích thói quen chi tiêu của tôi',
    'Tôi có phải người tiết kiệm không?', 'Hồ sơ tài chính của tôi thế nào?',
    'Thói quen chi tiêu của tôi có gì đặc biệt?'.
    """
    from behavior_profiler import profiler
    res = profiler.analyze_user(user_id=user_id)
    if res.get("status") != "SUCCESS":
        return res.get("message", "Chưa đủ dữ liệu để phân tích hồ sơ hành vi.")

    persona = res["persona"]
    summary = res["summary"]
    r50 = res["rule_50_30_20"]
    dining = res["dining_analysis"]
    eom = res["temporal_patterns"]
    findings = res.get("findings", [])

    lines = [
        f"📊 HỒ SƠ HÀNH VI TÀI CHÍNH (AI 2 Profiling):",
        f"- Hình mẫu tài chính (Persona): {persona['icon']} {persona['title']} ({persona['tagline']})",
        f"- Mô tả: {persona['description']}",
        f"- Tỷ lệ tiết kiệm: {summary['savings_rate']}% ({summary['savings_label']})",
        f"- Quy tắc 50/30/20: Thiết yếu {r50['needs_pct']}% | Hưởng thụ {r50['wants_pct']}% | Tích lũy {r50['savings_pct']}%",
        f"- Chi tiêu ăn uống: {dining['dining_percentage']}% tổng ngân sách ({dining['dining_amount']:,.0f} VND)",
        f"- Xu hướng cuối tháng: {'Bùng nổ chi tiêu cuối tháng' if eom['has_eom_spike'] else 'Ổn định, không bị dồn chi tiêu cuối tháng'}",
        "\n💡 Các phát hiện nổi bật:"
    ]
    for f in findings:
        lines.append(f"  • {f}")
    return "\n".join(lines)

@tool
def get_financial_recommendations(user_id: str = "test_user_01") -> str:
    """
    Đưa ra các gợi ý và tư vấn tài chính cá nhân hóa (AI 5: Financial Recommendations).
    Bao gồm: đề xuất cắt giảm chi tiêu ăn uống ~15%, tăng tích lũy, xây dựng quỹ khẩn cấp,
    điều chỉnh hạn mức ngân sách và kiểm soát thói quen tiêu tiền.
    Dùng khi người dùng hỏi: 'Tôi nên cắt giảm khoản chi nào?', 'Cho tôi lời khuyên tài chính',
    'Làm thế nào để tiết kiệm nhiều hơn?', 'Gợi ý tài chính cho tôi', 'Kế hoạch tiết kiệm phù hợp'.
    """
    from recommender import recommender
    res = recommender.generate_recommendations(user_id=user_id)
    if res.get("status") != "SUCCESS":
        return res.get("message", "Chưa đủ dữ liệu để sinh khuyến nghị tài chính.")

    recs = res.get("recommendations", [])
    lines = [
        f"💡 TƯ VẤN & GỢI Ý TÀI CHÍNH CÁ NHÂN HÓA (AI 5):",
        f"- Điểm sức khỏe tài chính: {res['health_score']}/100 ({res['health_rating']})",
        f"- Tiềm năng tiết kiệm thêm: +{res['total_monthly_potential_savings']:,.0f} VND/tháng",
        f"- Đánh giá tổng quan: {res['overall_advice']}",
        f"\n🎯 Danh sách khuyến nghị hành động cụ thể:"
    ]
    for i, r in enumerate(recs, 1):
        lines.append(f"{i}. {r['icon']} [{r['priority']}] {r['title']}")
        lines.append(f"   • Tác động: {r['summary']}")
        lines.append(f"   • Giải thích: {r['explanation']}")
        lines.append(f"   • Hành động đề xuất:")
        for act in r.get("action_steps", []):
            lines.append(f"     - {act}")
        lines.append("")
    return "\n".join(lines)

ALL_TOOLS = [
    get_account_balances,
    get_spending_by_category,
    get_budget_status,
    get_recent_transactions,
    search_transactions,
    compare_monthly_spending,
    get_balance_forecast,
    get_category_spending_forecast,
    get_goal_completion_forecast,
    check_unusual_spending,
    get_spending_behavior_profile,
    get_financial_recommendations
]




