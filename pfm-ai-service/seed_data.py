from datetime import datetime, date
from database import init_db, SessionLocal, Category, Account, Transaction, Budget, BudgetItem, Goal

import sys

# Đảm bảo in tiếng Việt trên console Windows không bị lỗi encoding
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def seed():
    init_db()
    db = SessionLocal()
    USER_ID = "test_user_01"

    # Kiểm tra nếu đã có dữ liệu thì không seed lại
    if db.query(Category).first():
        print("Database da co du lieu category, kiem tra va bo sung Goal neu thieu...")
        if not db.query(Goal).first():
            goals = [
                Goal(id="g_01", user_id=USER_ID, name="Mua laptop mới", target_amount=20000000.0, current_amount=6500000.0, target_date=date(2026, 12, 31), status="ACTIVE"),
                Goal(id="g_02", user_id=USER_ID, name="Quỹ dự phòng khẩn cấp", target_amount=30000000.0, current_amount=12000000.0, target_date=date(2027, 6, 30), status="ACTIVE")
            ]
            db.add_all(goals)
            db.commit()
            print("Da bo sung 2 muc tieu tai chinh (Goals) vao database!")
        db.close()

        # Đồng bộ chuỗi thời gian tới hôm nay
        from seed_forecast_data import sync_up_to_today
        sync_up_to_today()
        return

    print("Dang nap du lieu mau (Seed Data)...")

    # 1. Danh mục
    categories = [
        Category(id="cat_food", name="Ăn uống", kind="EXPENSE", is_essential=True),
        Category(id="cat_trans", name="Di chuyển", kind="EXPENSE", is_essential=True),
        Category(id="cat_house", name="Nhà ở", kind="EXPENSE", is_essential=True),
        Category(id="cat_shop", name="Mua sắm", kind="EXPENSE", is_essential=False),
        Category(id="cat_ent", name="Giải trí", kind="EXPENSE", is_essential=False),
        Category(id="cat_income_salary", name="Lương", kind="INCOME", is_essential=True),
        Category(id="cat_income_bonus", name="Thưởng", kind="INCOME", is_essential=False),
    ]
    db.add_all(categories)

    # 2. Tài khoản
    accounts = [
        Account(id="acc_vcb", user_id=USER_ID, name="Vietcombank", type="BANK", current_balance=18500000.0),
        Account(id="acc_cash", user_id=USER_ID, name="Ví tiền mặt", type="CASH", current_balance=2400000.0),
        Account(id="acc_momo", user_id=USER_ID, name="Ví MoMo", type="E_WALLET", current_balance=1200000.0),
    ]
    db.add_all(accounts)

    # 3. Giao dịch tháng 9 và tháng 10/2026
    transactions = [
        # --- THÁNG 9/2026 ---
        Transaction(id="tx_01", user_id=USER_ID, account_id="acc_vcb", category_id="cat_income_salary", type="INCOME", amount=15000000.0, occurred_at=datetime(2026, 9, 1, 9, 0), note="Nhận lương tháng 8"),
        Transaction(id="tx_02", user_id=USER_ID, account_id="acc_vcb", category_id="cat_house", type="EXPENSE", amount=3200000.0, occurred_at=datetime(2026, 9, 2, 10, 0), note="Thanh toán tiền phòng trọ tháng 9"),
        Transaction(id="tx_03", user_id=USER_ID, account_id="acc_cash", category_id="cat_food", type="EXPENSE", amount=65000.0, occurred_at=datetime(2026, 9, 5, 8, 30), note="Highlands Coffee với bạn"),
        Transaction(id="tx_04", user_id=USER_ID, account_id="acc_momo", category_id="cat_trans", type="EXPENSE", amount=45000.0, occurred_at=datetime(2026, 9, 7, 7, 45), note="Grab bike đi học"),
        Transaction(id="tx_05", user_id=USER_ID, account_id="acc_vcb", category_id="cat_shop", type="EXPENSE", amount=450000.0, occurred_at=datetime(2026, 9, 12, 19, 0), note="Mua áo thun Uniqlo"),
        Transaction(id="tx_06", user_id=USER_ID, account_id="acc_vcb", category_id="cat_food", type="EXPENSE", amount=580000.0, occurred_at=datetime(2026, 9, 15, 18, 30), note="Ăn lẩu Haidilao cuối tuần"),
        Transaction(id="tx_07", user_id=USER_ID, account_id="acc_cash", category_id="cat_trans", type="EXPENSE", amount=90000.0, occurred_at=datetime(2026, 9, 18, 11, 0), note="Đổ xăng xe máy"),
        Transaction(id="tx_08", user_id=USER_ID, account_id="acc_momo", category_id="cat_ent", type="EXPENSE", amount=190000.0, occurred_at=datetime(2026, 9, 22, 20, 0), note="Xem phim CGV"),
        Transaction(id="tx_09", user_id=USER_ID, account_id="acc_vcb", category_id="cat_food", type="EXPENSE", amount=420000.0, occurred_at=datetime(2026, 9, 26, 17, 0), note="Đi siêu thị Winmart mua thực phẩm"),
        
        # --- THÁNG 10/2026 ---
        Transaction(id="tx_10", user_id=USER_ID, account_id="acc_vcb", category_id="cat_income_salary", type="INCOME", amount=15000000.0, occurred_at=datetime(2026, 10, 1, 9, 0), note="Nhận lương tháng 9"),
        Transaction(id="tx_11", user_id=USER_ID, account_id="acc_vcb", category_id="cat_house", type="EXPENSE", amount=3200000.0, occurred_at=datetime(2026, 10, 2, 10, 0), note="Tiền phòng trọ tháng 10"),
        Transaction(id="tx_12", user_id=USER_ID, account_id="acc_cash", category_id="cat_food", type="EXPENSE", amount=55000.0, occurred_at=datetime(2026, 10, 3, 8, 15), note="Cà phê sáng Highlands"),
        Transaction(id="tx_13", user_id=USER_ID, account_id="acc_momo", category_id="cat_trans", type="EXPENSE", amount=50000.0, occurred_at=datetime(2026, 10, 4, 7, 30), note="Grab bike đi làm"),
        Transaction(id="tx_14", user_id=USER_ID, account_id="acc_vcb", category_id="cat_shop", type="EXPENSE", amount=850000.0, occurred_at=datetime(2026, 10, 5, 21, 0), note="Mua bàn phím cơ mới"),
        Transaction(id="tx_15", user_id=USER_ID, account_id="acc_cash", category_id="cat_food", type="EXPENSE", amount=620000.0, occurred_at=datetime(2026, 10, 6, 19, 30), note="Ăn tối Pizza 4Ps"),
        Transaction(id="tx_16", user_id=USER_ID, account_id="acc_cash", category_id="cat_trans", type="EXPENSE", amount=85000.0, occurred_at=datetime(2026, 10, 7, 12, 0), note="Đổ xăng"),
        Transaction(id="tx_17", user_id=USER_ID, account_id="acc_cash", category_id="cat_food", type="EXPENSE", amount=75000.0, occurred_at=datetime(2026, 10, 8, 15, 0), note="Trà sữa Phúc Long"),
        Transaction(id="tx_18", user_id=USER_ID, account_id="acc_cash", category_id="cat_food", type="EXPENSE", amount=50000.0, occurred_at=datetime(2026, 10, 9, 12, 0), note="Ăn trưa cơm tấm"),
        Transaction(id="tx_19", user_id=USER_ID, account_id="acc_momo", category_id="cat_ent", type="EXPENSE", amount=120000.0, occurred_at=datetime(2026, 10, 10, 20, 0), note="Vé xem phim"),
    ]
    db.add_all(transactions)

    # 4. Ngân sách tháng 10/2026
    budget = Budget(
        id="bg_2026_10",
        user_id=USER_ID,
        name="Ngân sách tháng 10/2026",
        start_date=date(2026, 10, 1),
        end_date=date(2026, 10, 31),
        total_limit=10000000.0
    )
    db.add(budget)

    # Chi tiết hạn mức từng danh mục
    budget_items = [
        BudgetItem(id="bi_01", budget_id="bg_2026_10", category_id="cat_food", limit_amount=4000000.0, spent_amount=800000.0),
        BudgetItem(id="bi_02", budget_id="bg_2026_10", category_id="cat_house", limit_amount=3500000.0, spent_amount=3200000.0),
        BudgetItem(id="bi_03", budget_id="bg_2026_10", category_id="cat_trans", limit_amount=1000000.0, spent_amount=135000.0),
        BudgetItem(id="bi_04", budget_id="bg_2026_10", category_id="cat_shop", limit_amount=1000000.0, spent_amount=850000.0),
        BudgetItem(id="bi_05", budget_id="bg_2026_10", category_id="cat_ent", limit_amount=500000.0, spent_amount=120000.0),
    ]
    db.add_all(budget_items)

    # 5. Mục tiêu tài chính (Goals)
    goals = [
        Goal(id="g_01", user_id=USER_ID, name="Mua laptop mới", target_amount=20000000.0, current_amount=6500000.0, target_date=date(2026, 12, 31), status="ACTIVE"),
        Goal(id="g_02", user_id=USER_ID, name="Quỹ dự phòng khẩn cấp", target_amount=30000000.0, current_amount=12000000.0, target_date=date(2027, 6, 30), status="ACTIVE")
    ]
    db.add_all(goals)

    db.commit()
    print("Seed du lieu co ban thanh cong vao pfm.db!")
    db.close()

    # Tự động nạp thêm chuỗi thời gian 90 ngày cho mô hình Prophet & đồng bộ tới hôm nay
    from seed_forecast_data import seed_90_days, sync_up_to_today
    seed_90_days()
    sync_up_to_today()

if __name__ == "__main__":
    seed()
