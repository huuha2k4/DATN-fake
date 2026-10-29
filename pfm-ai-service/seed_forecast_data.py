import sys
import random
from datetime import datetime, timedelta, date
from database import SessionLocal, Transaction, Account, Category

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def seed_90_days():
    db = SessionLocal()
    USER_ID = "test_user_01"

    # Kiểm tra số lượng giao dịch hiện tại
    count = db.query(Transaction).filter(Transaction.user_id == USER_ID).count()
    if count >= 80:
        print(f"User {USER_ID} da co {count} giao dich, bo qua seed them.")
        db.close()
        return

    print("Dang sinh du lieu chuoi thoi gian 90 ngay (01/07/2026 -> 10/10/2026)...")

    # Mốc bắt đầu: 01/07/2026 đến 10/10/2026 (khoảng 102 ngày)
    start_dt = date(2026, 7, 1)
    end_dt = date(2026, 10, 10)
    current_dt = start_dt

    tx_list = []
    tx_idx = 100

    while current_dt <= end_dt:
        # 1. Đầu tháng (ngày 1): Lương 15 triệu
        if current_dt.day == 1:
            tx_idx += 1
            tx_list.append(Transaction(
                id=f"tx_{tx_idx}",
                user_id=USER_ID,
                account_id="acc_vcb",
                category_id="cat_income_salary",
                type="INCOME",
                amount=15000000.0,
                occurred_at=datetime.combine(current_dt, datetime.min.time().replace(hour=9)),
                note="Nhan luong hang thang"
            ))

        # 2. Đầu tháng (ngày 2): Tiền phòng trọ 3.2 triệu
        if current_dt.day == 2:
            tx_idx += 1
            tx_list.append(Transaction(
                id=f"tx_{tx_idx}",
                user_id=USER_ID,
                account_id="acc_vcb",
                category_id="cat_house",
                type="EXPENSE",
                amount=3200000.0,
                occurred_at=datetime.combine(current_dt, datetime.min.time().replace(hour=10)),
                note="Tien thue phong tro"
            ))

        # 3. Chi tiêu ăn uống hàng ngày (bữa trưa/tối)
        # Cuối tuần (thứ 7, CN) ăn nhiều hơn
        is_weekend = current_dt.weekday() in (5, 6)
        food_amount = random.randint(70, 150) * 1000 if not is_weekend else random.randint(180, 450) * 1000
        food_note = "An trua va ca phe" if not is_weekend else "An uong cuoi tuan"
        
        tx_idx += 1
        tx_list.append(Transaction(
            id=f"tx_{tx_idx}",
            user_id=USER_ID,
            account_id="acc_cash" if random.random() > 0.4 else "acc_momo",
            category_id="cat_food",
            type="EXPENSE",
            amount=float(food_amount),
            occurred_at=datetime.combine(current_dt, datetime.min.time().replace(hour=12, minute=30)),
            note=food_note
        ))

        # 4. Chi tiêu di chuyển (cách 2-3 ngày 1 lần đổ xăng hoặc đi Grab)
        if random.random() < 0.45:
            trans_amt = random.choice([40000, 50000, 80000, 90000])
            tx_idx += 1
            tx_list.append(Transaction(
                id=f"tx_{tx_idx}",
                user_id=USER_ID,
                account_id="acc_momo",
                category_id="cat_trans",
                type="EXPENSE",
                amount=float(trans_amt),
                occurred_at=datetime.combine(current_dt, datetime.min.time().replace(hour=8)),
                note="Grab bike / do xang"
            ))

        # 5. Mua sắm hoặc giải trí (thỉnh thoảng 1-2 lần/tuần)
        if random.random() < 0.2:
            shop_amt = random.randint(150, 600) * 1000
            tx_idx += 1
            tx_list.append(Transaction(
                id=f"tx_{tx_idx}",
                user_id=USER_ID,
                account_id="acc_vcb",
                category_id=random.choice(["cat_shop", "cat_ent"]),
                type="EXPENSE",
                amount=float(shop_amt),
                occurred_at=datetime.combine(current_dt, datetime.min.time().replace(hour=20)),
                note="Mua sam Shopee / xem phim"
            ))

        current_dt += timedelta(days=1)

    db.add_all(tx_list)
    db.commit()
    print(f"Da sinh them {len(tx_list)} giao dich chuoi thoi gian tu 01/07 den {end_dt}!")
    db.close()

def sync_up_to_today():
    """Tự động sinh thêm giao dịch cho các ngày từ ngày cuối cùng trong DB đến ngày hôm nay"""
    db = SessionLocal()
    USER_ID = "test_user_01"
    latest_tx = (
        db.query(Transaction)
        .filter(Transaction.user_id == USER_ID)
        .order_by(Transaction.occurred_at.desc())
        .first()
    )
    today = date.today()
    if not latest_tx:
        seed_90_days()
        db.close()
        return

    latest_date = latest_tx.occurred_at.date()
    if latest_date >= today:
        print(f"Du lieu da cap nhat den ngay hom nay ({today}). Khong can sinh them.")
        db.close()
        return

    print(f"Dang dong bo giao dich tu {latest_date + timedelta(days=1)} den hom nay ({today})...")
    current_dt = latest_date + timedelta(days=1)
    tx_list = []
    import uuid

    while current_dt <= today:
        is_weekend = current_dt.weekday() in (5, 6)
        # Ăn uống
        food_amount = random.randint(70, 150) * 1000 if not is_weekend else random.randint(180, 450) * 1000
        food_note = "An trua va ca phe" if not is_weekend else "An uong cuoi tuan"
        tx_list.append(Transaction(
            id=f"tx_sync_{uuid.uuid4().hex[:8]}",
            user_id=USER_ID,
            account_id="acc_cash" if random.random() > 0.4 else "acc_momo",
            category_id="cat_food",
            type="EXPENSE",
            amount=float(food_amount),
            occurred_at=datetime.combine(current_dt, datetime.min.time().replace(hour=12, minute=30)),
            note=food_note
        ))

        # Di chuyển (xác suất 50%)
        if random.random() < 0.5:
            trans_amt = random.choice([40000, 50000, 80000, 90000])
            tx_list.append(Transaction(
                id=f"tx_sync_{uuid.uuid4().hex[:8]}",
                user_id=USER_ID,
                account_id="acc_momo",
                category_id="cat_trans",
                type="EXPENSE",
                amount=float(trans_amt),
                occurred_at=datetime.combine(current_dt, datetime.min.time().replace(hour=8, minute=15)),
                note="Grab bike / do xang"
            ))

        # Mua sắm / giải trí (xác suất 30%)
        if random.random() < 0.3:
            shop_amt = random.randint(150, 500) * 1000
            tx_list.append(Transaction(
                id=f"tx_sync_{uuid.uuid4().hex[:8]}",
                user_id=USER_ID,
                account_id="acc_vcb",
                category_id=random.choice(["cat_shop", "cat_ent"]),
                type="EXPENSE",
                amount=float(shop_amt),
                occurred_at=datetime.combine(current_dt, datetime.min.time().replace(hour=20, minute=0)),
                note="Mua sam Shopee / xem phim"
            ))

        current_dt += timedelta(days=1)

    db.add_all(tx_list)
    db.commit()
    print(f"Da sinh bo sung thanh cong {len(tx_list)} giao dich den ngay {today}!")
    db.close()

if __name__ == "__main__":
    sync_up_to_today()

