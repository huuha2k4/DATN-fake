import os
import sys
import uuid
import random
from datetime import datetime, date, timedelta, time, timezone

sys.stdout.reconfigure(encoding='utf-8')
from dotenv import load_dotenv

load_dotenv()

from database import SessionLocal
from sqlalchemy import text

USER_ID = "b5f7482d-74a0-4582-8fa2-9c586211a583" # Đào Ngọc Huy
TECHCOMBANK_ID = "9e37b48f-67da-4ab6-8daa-4b8c7b91a5f9"
MOMO_ID = "6ff168b0-25ff-463f-8aba-c5e515107efb"

CAT_SALARY = "d149b310-14d9-4756-a43c-3b8fb1ab2ecc"
CAT_FOOD = "ef86f943-77d1-4a42-b6bb-1ccc8d97ec6a"
CAT_TRANSPORT = "87afc996-457d-4272-9b5f-14852f867ff9"
CAT_HOUSING = "42c96889-fe24-4e44-9baf-90a5098ab79f"
CAT_SHOPPING = "084a0f8c-445a-4299-984b-d155367f1d30"
CAT_UTILITIES = "dca02b01-c30c-4a34-b342-89dd7886c34d"
CAT_ENTERTAINMENT = "6dbc1155-7e87-41e3-af7f-e4efb939978b"
CAT_HEALTH = "c48ec970-cea2-4041-9365-02472b018eb5"

def run_seed():
    db = SessionLocal()
    vn_tz = timezone(timedelta(hours=7))
    utc_tz = timezone.utc
    
    print(f"=== ĐANG DỌN DẸP DỮ LIỆU CŨ CHO USER {USER_ID} ===")
    db.execute(text("DELETE FROM core.transactions WHERE user_id = :uid"), {"uid": USER_ID})
    db.commit()
    print("-> Đã xóa sạch giao dịch cũ thành công.")

    transactions = []

    def add_tx(acc_id, cat_id, tx_type, amount, dt_vn, note):
        dt_utc = dt_vn.astimezone(utc_tz)
        tx_id = str(uuid.uuid4())
        transactions.append({
            "id": tx_id,
            "user_id": USER_ID,
            "account_id": acc_id,
            "to_account_id": None,
            "category_id": cat_id,
            "type": tx_type,
            "amount": float(amount),
            "currency_code": "VND",
            "exchange_rate": 1.0,
            "is_rate_estimated": False,
            "base_amount": float(amount),
            "fee_amount": 0.0,
            "base_fee": 0.0,
            "occurred_at": dt_utc,
            "occurred_date": dt_vn.date(),
            "note": note,
            "description_raw": note,
            "source": "MANUAL",
            "is_excluded_from_report": False,
            "category_status": "CONFIRMED",
            "created_at": dt_utc,
            "updated_at": dt_utc,
            "version": 0
        })

    # Mốc thời gian: 92 ngày từ 01/08/2026 đến 31/10/2026
    start_date = date(2026, 8, 1)
    end_date = date(2026, 10, 31)

    # 1. Thu nhập cố định (Lương) ngày mùng 5 hàng tháng: 16.500.000 VND
    for m in [8, 9, 10]:
        salary_dt = datetime(2026, m, 5, 9, 15, 0, tzinfo=vn_tz)
        add_tx(TECHCOMBANK_ID, CAT_SALARY, "INCOME", 16500000, salary_dt, f"Công ty CP FinTech thanh toán lương tháng {m}/2026")

        # Nạp tiền vào MoMo để tiêu vặt ngày 6 và ngày 20 hàng tháng: 3.500.000 x 2 = 7.000.000 VND
        momo_topup_dt1 = datetime(2026, m, 6, 10, 0, 0, tzinfo=vn_tz)
        add_tx(MOMO_ID, CAT_SALARY, "INCOME", 3500000, momo_topup_dt1, f"Chuyển tiền sinh hoạt vào ví MoMo (đợt 1 tháng {m})")

        momo_topup_dt2 = datetime(2026, m, 20, 10, 0, 0, tzinfo=vn_tz)
        add_tx(MOMO_ID, CAT_SALARY, "INCOME", 3000000, momo_topup_dt2, f"Chuyển tiền sinh hoạt vào ví MoMo (đợt 2 tháng {m})")

    # 2. Chi phí cố định hàng tháng (Nhà ở, Điện nước)
    for m in [8, 9, 10]:
        # Tiền thuê căn hộ: 3.200.000 VND ngày mùng 7
        rent_dt = datetime(2026, m, 7, 14, 30, 0, tzinfo=vn_tz)
        add_tx(TECHCOMBANK_ID, CAT_HOUSING, "EXPENSE", 3200000, rent_dt, f"Thanh toán tiền thuê nhà tháng {m}/2026")

        # Tiền điện nước, internet: ~750.000 VND ngày 12
        util_amt = 720000 + (m * 25000)
        util_dt = datetime(2026, m, 12, 19, 10, 0, tzinfo=vn_tz)
        add_tx(TECHCOMBANK_ID, CAT_UTILITIES, "EXPENSE", util_amt, util_dt, f"Tiền điện nước & Internet VNPT tháng {m}/2026")

    # 3. Chi phí sinh hoạt hàng ngày (Ăn uống, Di chuyển, Tiêu vặt) từ 01/08/2026 đến 31/10/2026
    current_curr = start_date
    random.seed(42)

    food_notes_lunch = [
        "Cơm tấm sườn bì chả trưa",
        "Bún chả Hà Nội trưa",
        "Cơm văn phòng Highlands",
        "Phở bò tái lăn buổi trưa",
        "Bún đậu mắm tôm cùng đồng nghiệp",
        "Cơm rang dưa bò",
        "Bánh mì chảo & sữa đậu"
    ]
    food_notes_cafe = [
        "Cà phê muối chú Long",
        "Trà đào cam sả Highlands",
        "Cà phê sữa đá Phúc Long",
        "The Coffee House làm việc buổi chiều",
        "Trà sữa GongCha",
        "Bạc xỉu sáng"
    ]
    food_notes_dinner_weekend = [
        "Ăn lẩu Manwah với nhóm bạn",
        "Buffet nướng Gogi House cuối tuần",
        "Pizza 4P's liên hoan cuối tuần",
        "Hải sản tươi sống cuối tuần",
        "Ăn đồ nướng vỉa hè cùng bạn bè"
    ]

    while current_curr <= end_date:
        d_val = current_curr.day
        weekday = current_curr.weekday() # 0: Mon, ..., 5: Sat, 6: Sun

        # Bữa trưa hàng ngày (MoMo)
        lunch_cost = random.randint(45, 75) * 1000
        lunch_time = datetime(current_curr.year, current_curr.month, current_curr.day, 12, random.randint(10, 45), tzinfo=vn_tz)
        add_tx(MOMO_ID, CAT_FOOD, "EXPENSE", lunch_cost, lunch_time, random.choice(food_notes_lunch))

        # Cà phê sáng/chiều (khoảng 70% các ngày)
        if random.random() < 0.70:
            cafe_cost = random.randint(30, 55) * 1000
            cafe_time = datetime(current_curr.year, current_curr.month, current_curr.day, random.choice([8, 14, 15]), random.randint(5, 55), tzinfo=vn_tz)
            add_tx(MOMO_ID, CAT_FOOD, "EXPENSE", cafe_cost, cafe_time, random.choice(food_notes_cafe))

        # Đi lại (Grab / Đổ xăng) cách 2-3 ngày 1 lần
        if d_val % 3 == 0:
            trans_cost = random.randint(40, 85) * 1000
            trans_time = datetime(current_curr.year, current_curr.month, current_curr.day, 8, 30, tzinfo=vn_tz)
            trans_note = "Grab bike đi làm" if trans_cost < 60000 else "Đổ xăng xe máy Petrolimex"
            add_tx(MOMO_ID, CAT_TRANSPORT, "EXPENSE", trans_cost, trans_time, trans_note)

        # Cuối tuần: Ăn tối sang hơn hoặc Giải trí
        if weekday in [5, 6]:
            if random.random() < 0.65:
                dinner_cost = random.randint(180, 320) * 1000
                dinner_time = datetime(current_curr.year, current_curr.month, current_curr.day, 19, random.randint(15, 45), tzinfo=vn_tz)
                add_tx(MOMO_ID, CAT_FOOD, "EXPENSE", dinner_cost, dinner_time, random.choice(food_notes_dinner_weekend))

            if random.random() < 0.40:
                movie_cost = random.randint(120, 240) * 1000
                movie_time = datetime(current_curr.year, current_curr.month, current_curr.day, 21, 0, tzinfo=vn_tz)
                add_tx(MOMO_ID, CAT_ENTERTAINMENT, "EXPENSE", movie_cost, movie_time, "Vé xem phim CGV Cinemas & bỏng nước")

        # Mua sắm định kỳ (quần áo, đồ gia dụng nhỏ) vào giữa tháng
        if d_val in [14, 25]:
            shop_cost = random.randint(250, 480) * 1000
            shop_time = datetime(current_curr.year, current_curr.month, current_curr.day, 20, 15, tzinfo=vn_tz)
            add_tx(TECHCOMBANK_ID, CAT_SHOPPING, "EXPENSE", shop_cost, shop_time, "Mua đồ dùng cá nhân & Shopee gia dụng")

        current_curr += timedelta(days=1)

    # 4. Giao dịch BẤT THƯỜNG CỐ Ý ĐỂ TEST ISOLATION FOREST & ANOMALY DETECTOR:
    # Bất thường 1: Mua sắm công nghệ lớn vào 18/10/2026: 4.850.000 VND (Gấp >12 lần trung bình danh mục Shopping)
    anom1_dt = datetime(2026, 10, 18, 15, 30, 0, tzinfo=vn_tz)
    add_tx(
        TECHCOMBANK_ID, 
        CAT_SHOPPING, 
        "EXPENSE", 
        4850000, 
        anom1_dt, 
        "Mua màn hình Dell UltraSharp 27 inch 4K đồ họa tại CellphoneS"
    )

    # Bất thường 2: Chi tiêu bar đêm muộn lúc 02:35 sáng vào 24/10/2026: 1.450.000 VND (Gấp 6 lần giải trí thông thường + giờ khuya)
    anom2_dt = datetime(2026, 10, 24, 2, 35, 0, tzinfo=vn_tz)
    add_tx(
        MOMO_ID, 
        CAT_ENTERTAINMENT, 
        "EXPENSE", 
        1450000, 
        anom2_dt, 
        "Rooftop Bar Nightclub - Chi tiêu giải trí đêm khuya với bạn bè"
    )

    print(f"-> Tổng số giao dịch chuẩn bị nạp: {len(transactions)}")

    # Thực hiện insert vào PostgreSQL
    insert_sql = text("""
        INSERT INTO core.transactions (
            id, user_id, account_id, to_account_id, category_id,
            type, amount, currency_code, exchange_rate, is_rate_estimated,
            base_amount, fee_amount, base_fee, occurred_at, occurred_date,
            note, description_raw, source, is_excluded_from_report,
            category_status, created_at, updated_at, version
        ) VALUES (
            :id, :user_id, :account_id, :to_account_id, :category_id,
            :type, :amount, :currency_code, :exchange_rate, :is_rate_estimated,
            :base_amount, :fee_amount, :base_fee, :occurred_at, :occurred_date,
            :note, :description_raw, :source, :is_excluded_from_report,
            :category_status, :created_at, :updated_at, :version
        )
    """)

    for tx in transactions:
        db.execute(insert_sql, tx)
    db.commit()
    print("-> Đã ghi 100% giao dịch vào core.transactions thành công!")

    # 5. Cập nhật số dư thực tế trong core.accounts để khớp logic
    # Tính số dư Techcombank
    tcb_income = db.execute(text("SELECT COALESCE(SUM(amount), 0) FROM core.transactions WHERE account_id = :acc AND type = 'INCOME'"), {"acc": TECHCOMBANK_ID}).scalar()
    tcb_expense = db.execute(text("SELECT COALESCE(SUM(amount), 0) FROM core.transactions WHERE account_id = :acc AND type = 'EXPENSE'"), {"acc": TECHCOMBANK_ID}).scalar()
    tcb_balance = 5000000.0 + float(tcb_income) - float(tcb_expense)

    # Tính số dư MoMo
    momo_income = db.execute(text("SELECT COALESCE(SUM(amount), 0) FROM core.transactions WHERE account_id = :acc AND type = 'INCOME'"), {"acc": MOMO_ID}).scalar()
    momo_expense = db.execute(text("SELECT COALESCE(SUM(amount), 0) FROM core.transactions WHERE account_id = :acc AND type = 'EXPENSE'"), {"acc": MOMO_ID}).scalar()
    momo_balance = 500000.0 + float(momo_income) - float(momo_expense)

    db.execute(text("UPDATE core.accounts SET balance = :bal WHERE id = :acc"), {"bal": tcb_balance, "acc": TECHCOMBANK_ID})
    db.execute(text("UPDATE core.accounts SET balance = :bal WHERE id = :acc"), {"bal": momo_balance, "acc": MOMO_ID})
    db.commit()

    print(f"-> Cập nhật Techcombank ({TECHCOMBANK_ID}): {tcb_balance:,.0f} VND")
    print(f"-> Cập nhật MoMo ({MOMO_ID}): {momo_balance:,.0f} VND")
    print(f"-> Tổng tài sản: {tcb_balance + momo_balance:,.0f} VND")

    # 6. Đồng bộ liên kết Budget Item Ăn uống để đối chiếu với Ngân sách
    db.execute(text("""
        UPDATE core.budget_items 
        SET category_id = :cat_food 
        WHERE category_id = '22222222-2222-2222-2222-222222222221'
    """), {"cat_food": CAT_FOOD})
    db.commit()
    print("-> Đã đồng bộ liên kết Budget Item Ăn uống thành công.")

    db.close()
    print("=== HOÀN TẤT NẠP DỮ LIỆU LỊCH SỬ 90 NGÀY ===")

if __name__ == "__main__":
    run_seed()
