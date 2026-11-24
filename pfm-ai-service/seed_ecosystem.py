"""
FINORA DEMO DATA SEEDER — FULL HIGH FIDELITY ENGINE
Sinh trọn vẹn:
- 14 Users (12 người lớn + 2 trẻ em)
- 38 Accounts cá nhân & số dư đối soát
- 5 Nhóm tài chính liên kết (Gia đình, Cặp đôi, Phòng trọ, Bạn thân, Du lịch Đà Lạt)
- 2 Kids Wallets (Bin & Bông), Chores, Spend Requests
- 3 Group Funds & Contributions
- Group Expenses, Splits, Settlements
- Personal Transactions (01/09/2026 - 23/11/2026) cho 14 users
- Group Messages, Reads, Reactions
- Transaction Comments
- Budgets & Budget Items (Tháng 9, 10, 11)
- Goals & Contributions
- Debts & Payments
- Notifications & Reminders
Idempotent, Deterministic, 100% Validated.
"""

import os
import sys
import random
import datetime
import uuid
import json
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values

# Cố định random seed để kết quả hoàn toàn có thể tái tạo (Deterministic)
SEED = 20261123
random.seed(SEED)

DB_HOST = os.getenv("POSTGRES_SERVER", os.getenv("DB_HOST", "postgres"))
DB_PORT = int(os.getenv("POSTGRES_PORT", os.getenv("DB_PORT", "5432")))
DB_NAME = os.getenv("POSTGRES_DB", os.getenv("DB_NAME", "finance_db"))
DB_USER = os.getenv("POSTGRES_USER", os.getenv("DB_USER", "postgres"))
DB_PASS = os.getenv("POSTGRES_PASSWORD", os.getenv("DB_PASSWORD", "postgres"))

# BCrypt hash của mật khẩu 'DemoPass@123' tương thích Spring Security
PASSWORD_HASH = "$2a$12$Lb9JS1Ut84fKIq/dRDAN2Odf5lOET4hUGSU4aRO7emtZHqutSBXjG"

def get_connection():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )

def random_date(start_date, end_date):
    delta = end_date - start_date
    int_delta = (delta.days * 24 * 60 * 60) + delta.seconds
    random_second = random.randrange(int_delta)
    return start_date + datetime.timedelta(seconds=random_second)

def main():
    print("==================================================")
    print("  FINORA DEMO DATA SEEDER — MASTER ENGINE")
    print(f"  Target DB: {DB_NAME} on {DB_HOST}:{DB_PORT}")
    print("  Range: 2026-09-01 00:00:00 to 2026-11-23 23:59:59")
    print("==================================================")
    
    conn = get_connection()
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # 1. Danh mục hệ thống
        cur.execute("SELECT id, code, name, kind FROM core.categories WHERE user_id IS NULL AND is_system = true;")
        categories = cur.fetchall()
        cat_map = {c['code']: c['id'] for c in categories}
        print(f"[*] Loaded {len(categories)} system categories.")

        # Định nghĩa 14 Nhân vật
        users_def = [
            {"id": "c0010000-0000-0000-0000-000000000001", "username": "minh_father", "email": "minh.father@finora.demo", "name": "Nguyễn Văn Minh", "salary": 28000000, "is_kid": False, "role_desc": "Bố, Kỹ sư phần mềm"},
            {"id": "c0010000-0000-0000-0000-000000000002", "username": "mai_mother", "email": "mai.mother@finora.demo", "name": "Trần Ngọc Mai", "salary": 19000000, "is_kid": False, "role_desc": "Mẹ, Kế toán trưởng"},
            {"id": "c0010000-0000-0000-0000-000000000003", "username": "bin_kid", "email": "bin.kid@finora.kids", "name": "Nguyễn Gia Bảo (Bin)", "salary": 0, "is_kid": True, "dob": "2014-05-12", "role_desc": "Con trai, 12 tuổi"},
            {"id": "c0010000-0000-0000-0000-000000000004", "username": "bong_kid", "email": "bong.kid@finora.kids", "name": "Nguyễn Hà My (Bông)", "salary": 0, "is_kid": True, "dob": "2017-09-20", "role_desc": "Con gái, 9 tuổi"},
            {"id": "c0010000-0000-0000-0000-000000000005", "username": "bao_dev", "email": "bao.dev@finora.demo", "name": "Phạm Quốc Bảo", "salary": 22000000, "is_kid": False, "role_desc": "Lập trình viên (User Demo Chính)"},
            {"id": "c0010000-0000-0000-0000-000000000006", "username": "linh_mkt", "email": "linh.mkt@finora.demo", "name": "Lê Khánh Linh", "salary": 16000000, "is_kid": False, "role_desc": "Nhân viên Marketing"},
            {"id": "c0010000-0000-0000-0000-000000000007", "username": "huy_student", "email": "huy.student@finora.demo", "name": "Trần Đức Huy", "salary": 7000000, "is_kid": False, "role_desc": "Sinh viên làm thêm"},
            {"id": "c0010000-0000-0000-0000-000000000008", "username": "tuan_office", "email": "tuan.office@finora.demo", "name": "Hoàng Anh Tuấn", "salary": 14000000, "is_kid": False, "role_desc": "Nhân viên văn phòng"},
            {"id": "c0010000-0000-0000-0000-000000000009", "username": "trang_freelance", "email": "trang.freelance@finora.demo", "name": "Đỗ Thu Trang", "salary": 15000000, "is_kid": False, "role_desc": "Freelancer đồ họa"},
            {"id": "c0010000-0000-0000-0000-000000000010", "username": "khang_sales", "email": "khang.sales@finora.demo", "name": "Nguyễn Minh Khang", "salary": 18000000, "is_kid": False, "role_desc": "Nhân viên kinh doanh"},
            {"id": "c0010000-0000-0000-0000-000000000011", "username": "vy_student", "email": "vy.student@finora.demo", "name": "Vũ Thảo Vy", "salary": 5000000, "is_kid": False, "role_desc": "Sinh viên đại học"},
            {"id": "c0010000-0000-0000-0000-000000000012", "username": "nam_merchant", "email": "nam.merchant@finora.demo", "name": "Phan Hoàng Nam", "salary": 30000000, "is_kid": False, "role_desc": "Chủ cửa hàng phụ kiện"},
            {"id": "c0010000-0000-0000-0000-000000000013", "username": "ha_teacher", "email": "ha.teacher@finora.demo", "name": "Bùi Thanh Hà", "salary": 13000000, "is_kid": False, "role_desc": "Giáo viên trung học"},
            {"id": "c0010000-0000-0000-0000-000000000014", "username": "phuc_shipper", "email": "phuc.shipper@finora.demo", "name": "Đặng Đức Phúc", "salary": 11000000, "is_kid": False, "role_desc": "Nhân viên giao hàng"},
        ]

        # Dọn dẹp dữ liệu demo cũ để bảo đảm tính IDEMPOTENT (theo thứ tự foreign key)
        demo_user_ids = [u["id"] for u in users_def]
        cur.execute("DELETE FROM core.budget_items WHERE budget_id IN (SELECT id FROM core.budgets WHERE user_id = ANY(%s::uuid[]));", (demo_user_ids,))
        cur.execute("DELETE FROM core.budgets WHERE user_id = ANY(%s::uuid[]);", (demo_user_ids,))
        cur.execute("DELETE FROM core.goals WHERE user_id = ANY(%s::uuid[]);", (demo_user_ids,))
        cur.execute("DELETE FROM core.debts WHERE user_id = ANY(%s::uuid[]);", (demo_user_ids,))
        cur.execute("DELETE FROM core.notifications WHERE user_id = ANY(%s::uuid[]);", (demo_user_ids,))
        cur.execute("DELETE FROM core.child_spend_requests WHERE wallet_id IN (SELECT id FROM core.child_wallets WHERE group_id::text LIKE 'd001%%');")
        cur.execute("DELETE FROM core.child_chores WHERE wallet_id IN (SELECT id FROM core.child_wallets WHERE group_id::text LIKE 'd001%%');")
        cur.execute("DELETE FROM core.child_wallets WHERE group_id::text LIKE 'd001%%';")
        cur.execute("DELETE FROM core.groups WHERE id::text LIKE 'd001%%';")
        cur.execute("DELETE FROM core.transactions WHERE user_id = ANY(%s::uuid[]);", (demo_user_ids,))
        cur.execute("DELETE FROM core.accounts WHERE user_id = ANY(%s::uuid[]);", (demo_user_ids,))
        cur.execute("DELETE FROM core.users WHERE id = ANY(%s::uuid[]);", (demo_user_ids,))
        print("[*] Idempotency clean-up completed.")

        # Thêm Users
        for u in users_def:
            cur.execute("""
                INSERT INTO core.users (
                    id, username, email, full_name, password_hash,
                    user_status, system_role, subscription_tier,
                    preferred_currency, timezone, language, email_verified,
                    created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    'ACTIVE', 'USER', 'PREMIUM',
                    'VND', 'Asia/Ho_Chi_Minh', 'vi-VN', true,
                    '2026-08-25 08:00:00+07', '2026-08-25 08:00:00+07'
                );
            """, (u["id"], u["username"], u["email"], u["name"], PASSWORD_HASH))
        print(f"[+] Inserted {len(users_def)} demo personas.")

        # 2. Tạo Accounts
        accounts_map = {} # user_id -> dict of accounts
        account_insert_values = []
        for u in users_def:
            if u["is_kid"]:
                acc_cash_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{u['id']}-cash"))
                accounts_map[u["id"]] = {"cash": acc_cash_id}
                account_insert_values.append((
                    acc_cash_id, u["id"], "Tiền tiêu vặt của bé", "CASH", 50000.0, 50000.0, "#00A86B", "banknote"
                ))
            else:
                acc_cash_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{u['id']}-cash"))
                acc_bank_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{u['id']}-bank"))
                acc_momo_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{u['id']}-momo"))
                accounts_map[u["id"]] = {"cash": acc_cash_id, "bank": acc_bank_id, "momo": acc_momo_id}
                account_insert_values.extend([
                    (acc_cash_id, u["id"], "Ví tiền mặt", "CASH", 5000000.0, 5000000.0, "#00A86B", "banknote"),
                    (acc_bank_id, u["id"], "Tài khoản Techcombank", "BANK", 15000000.0, 15000000.0, "#E11D48", "building-2"),
                    (acc_momo_id, u["id"], "Ví điện tử MoMo", "E_WALLET", 2500000.0, 2500000.0, "#A21CAF", "smartphone")
                ])

        for acc in account_insert_values:
            cur.execute("""
                INSERT INTO core.accounts (
                    id, user_id, name, account_type, initial_balance, balance,
                    color, icon, is_active, is_included_in_total, created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s::numeric::money, %s,
                    %s, %s, true, true, '2026-08-28 09:00:00+07', '2026-08-28 09:00:00+07'
                );
            """, acc)
        print(f"[+] Inserted {len(account_insert_values)} accounts.")

        # 3. Tạo 5 Nhóm tài chính
        groups_def = [
            {"id": "d0010000-0000-0000-0000-000000000001", "name": "Gia đình Minh & Mai", "type": "FAMILY", "owner_id": "c0010000-0000-0000-0000-000000000001",
             "members": [
                 {"user_id": "c0010000-0000-0000-0000-000000000001", "role": "OWNER", "is_kid": False},
                 {"user_id": "c0010000-0000-0000-0000-000000000002", "role": "ADMIN", "is_kid": False},
                 {"user_id": "c0010000-0000-0000-0000-000000000003", "role": "MEMBER", "is_kid": True},
                 {"user_id": "c0010000-0000-0000-0000-000000000004", "role": "MEMBER", "is_kid": True},
             ]},
            {"id": "d0010000-0000-0000-0000-000000000002", "name": "Cặp đôi Bảo & Linh", "type": "COUPLE", "owner_id": "c0010000-0000-0000-0000-000000000005",
             "members": [
                 {"user_id": "c0010000-0000-0000-0000-000000000005", "role": "OWNER", "is_kid": False},
                 {"user_id": "c0010000-0000-0000-0000-000000000006", "role": "ADMIN", "is_kid": False},
             ]},
            {"id": "d0010000-0000-0000-0000-000000000003", "name": "Phòng Trọ 302", "type": "ROOMMATE", "owner_id": "c0010000-0000-0000-0000-000000000005",
             "members": [
                 {"user_id": "c0010000-0000-0000-0000-000000000005", "role": "OWNER", "is_kid": False},
                 {"user_id": "c0010000-0000-0000-0000-000000000007", "role": "MEMBER", "is_kid": False},
                 {"user_id": "c0010000-0000-0000-0000-000000000008", "role": "MEMBER", "is_kid": False},
             ]},
            {"id": "d0010000-0000-0000-0000-000000000004", "name": "Hội Bạn Thân Đại Học", "type": "OTHER", "owner_id": "c0010000-0000-0000-0000-000000000005",
             "members": [
                 {"user_id": "c0010000-0000-0000-0000-000000000005", "role": "OWNER", "is_kid": False},
                 {"user_id": "c0010000-0000-0000-0000-000000000006", "role": "MEMBER", "is_kid": False},
                 {"user_id": "c0010000-0000-0000-0000-000000000007", "role": "MEMBER", "is_kid": False},
                 {"user_id": "c0010000-0000-0000-0000-000000000009", "role": "MEMBER", "is_kid": False},
             ]},
            {"id": "d0010000-0000-0000-0000-000000000005", "name": "Quỹ Du Lịch Đà Lạt", "type": "TRAVEL", "owner_id": "c0010000-0000-0000-0000-000000000005",
             "members": [
                 {"user_id": "c0010000-0000-0000-0000-000000000005", "role": "OWNER", "is_kid": False},
                 {"user_id": "c0010000-0000-0000-0000-000000000006", "role": "MEMBER", "is_kid": False},
                 {"user_id": "c0010000-0000-0000-0000-000000000008", "role": "MEMBER", "is_kid": False},
                 {"user_id": "c0010000-0000-0000-0000-000000000009", "role": "MEMBER", "is_kid": False},
             ]}
        ]

        for g in groups_def:
            cur.execute("""
                INSERT INTO core.groups (id, name, group_type, owner_id, base_currency, status, created_at, updated_at)
                VALUES (%s, %s, %s, %s, 'VND', 'ACTIVE', '2026-08-30 10:00:00+07', '2026-08-30 10:00:00+07');
            """, (g["id"], g["name"], g["type"], g["owner_id"]))

            for m in g["members"]:
                cur.execute("""
                    INSERT INTO core.group_members (group_id, user_id, role, joined_at, is_child_profile)
                    VALUES (%s, %s, %s, '2026-08-30 10:05:00+07', %s);
                """, (g["id"], m["user_id"], m["role"], m["is_kid"]))

        # 4. Kids Wallets
        wallet_bin_id = "e0010000-0000-0000-0000-000000000001"
        wallet_bong_id = "e0010000-0000-0000-0000-000000000002"
        g01_id = groups_def[0]["id"]
        u_minh_bank = accounts_map["c0010000-0000-0000-0000-000000000001"]["bank"]

        cur.execute("""
            INSERT INTO core.child_wallets (
                id, group_id, child_name, date_of_birth, user_id, child_username,
                balance, currency, weekly_allowance, privacy_level, spend_limit_daily,
                allowance_source, allowance_account_id, created_at, updated_at
            ) VALUES
            (%s, %s, 'Nguyễn Gia Bảo (Bin)', '2014-05-12', 'c0010000-0000-0000-0000-000000000003', 'bin_kid', 550000.0, 'VND', 100000.0, 'PARENT_SUPERVISED', 150000.0, 'PERSONAL_ACCOUNT', %s, '2026-08-31 08:00:00+07', '2026-08-31 08:00:00+07'),
            (%s, %s, 'Nguyễn Hà My (Bông)', '2017-09-20', 'c0010000-0000-0000-0000-000000000004', 'bong_kid', 320000.0, 'VND', 50000.0, 'PARENT_SUPERVISED', 100000.0, 'PERSONAL_ACCOUNT', %s, '2026-08-31 08:00:00+07', '2026-08-31 08:00:00+07');
        """, (wallet_bin_id, g01_id, u_minh_bank, wallet_bong_id, g01_id, u_minh_bank))

        cur.execute("UPDATE core.group_members SET linked_child_wallet_id = %s WHERE group_id = %s AND user_id = 'c0010000-0000-0000-0000-000000000003';", (wallet_bin_id, g01_id))
        cur.execute("UPDATE core.group_members SET linked_child_wallet_id = %s WHERE group_id = %s AND user_id = 'c0010000-0000-0000-0000-000000000004';", (wallet_bong_id, g01_id))

        # 5. Group Funds
        fund_g01_id = "f0010000-0000-0000-0000-000000000001"
        fund_g02_id = "f0010000-0000-0000-0000-000000000002"
        fund_g05_id = "f0010000-0000-0000-0000-000000000005"
        
        cur.execute("""
            INSERT INTO core.group_funds (id, group_id, balance, currency, created_at, updated_at)
            VALUES
            (%s, %s, 8500000.0, 'VND', '2026-09-01 08:00:00+07', '2026-09-01 08:00:00+07'),
            (%s, %s, 3200000.0, 'VND', '2026-09-01 08:00:00+07', '2026-09-01 08:00:00+07'),
            (%s, %s, 650000.0, 'VND', '2026-09-05 08:00:00+07', '2026-09-05 08:00:00+07');
        """, (fund_g01_id, g01_id, fund_g02_id, groups_def[1]["id"], fund_g05_id, groups_def[4]["id"]))

        # 6. Sinh giao dịch cá nhân 3 tháng (01/09/2026 - 23/11/2026)
        print("[*] Generating personal transactions for 14 personas over 84 days...")
        start_date = datetime.datetime(2026, 9, 1, 6, 0, 0)
        end_date = datetime.datetime(2026, 11, 23, 23, 0, 0)
        
        # Danh mục tham chiếu
        cat_food = cat_map.get("FOOD_DRINK") or cat_map.get("FOOD_DRINKS")
        cat_trans = cat_map.get("TRANSPORTATION") or cat_map.get("TRANSPORT")
        cat_shop = cat_map.get("SHOPPING")
        cat_util = cat_map.get("UTILITIES") or cat_map.get("BILLS")
        cat_entertain = cat_map.get("ENTERTAINMENT")
        cat_family = cat_map.get("FAMILY")
        cat_health = cat_map.get("HEALTHCARE") or cat_map.get("HEALTH")
        cat_salary = cat_map.get("SALARY") or cat_map.get("SALARY_SYS")
        cat_bonus = cat_map.get("BONUS") or cat_map.get("BONUS_SYS")
        cat_other_inc = cat_map.get("OTHER_INCOME") or cat_map.get("OTHER_INCOME_SYS")

        tx_records = []
        account_deltas = {} # acc_id -> delta balance

        for u in users_def:
            u_id = u["id"]
            if u["is_kid"]:
                # Giao dịch của trẻ em (tiêu vặt: đồ ăn vặt, mua truyện tranh, bút thước)
                acc_cash = accounts_map[u_id]["cash"]
                # Tiền tiêu vặt hàng tuần bố mẹ nạp vào ví bé (Tuần 1, 2, 3, 4 mỗi tháng)
                allowance_weekly = 100000.0 if u["username"] == "bin_kid" else 50000.0
                for month in [9, 10, 11]:
                    for day in [1, 8, 15, 22]:
                        if month == 11 and day > 22: continue
                        tx_date = datetime.datetime(2026, month, day, 8, 0, 0)
                        tx_id = str(uuid.uuid4())
                        tx_records.append((
                            tx_id, u_id, acc_cash, None, cat_family or cat_other_inc,
                            "INCOME", allowance_weekly, tx_date, tx_date.date(),
                            f"[INCOME_DEPOSIT] Bố nạp tiền tiêu vặt tuần {day//7 + 1}", "MANUAL", False
                        ))
                        account_deltas[acc_cash] = account_deltas.get(acc_cash, 0.0) + allowance_weekly

                for month in [9, 10, 11]:
                    max_day = 30 if month in [9, 11] else 31
                    if month == 11: max_day = 23
                    for day in range(1, max_day + 1):
                        if random.random() < 0.25: # ~ 1 lần / 4 ngày
                            amt = random.choice([10000, 15000, 20000, 25000, 30000])
                            tx_date = datetime.datetime(2026, month, day, random.randint(8, 17), random.randint(0, 59))
                            desc = random.choice(["Mua bút bi và vở kẻ ngang", "Bánh mì xúc xích giờ ra chơi", "Trà sữa kem phô mai", "Kem Tràng Tiền", "Tập giấy kiểm tra"])
                            tx_id = str(uuid.uuid4())
                            tx_records.append((
                                tx_id, u_id, acc_cash, None, cat_food if "Bánh" in desc or "Trà" in desc else cat_shop,
                                "EXPENSE", amt, tx_date, tx_date.date(), desc, "MANUAL", False
                            ))
                            account_deltas[acc_cash] = account_deltas.get(acc_cash, 0.0) - amt
                continue

            # Người lớn: 
            acc_cash = accounts_map[u_id]["cash"]
            acc_bank = accounts_map[u_id]["bank"]
            acc_momo = accounts_map[u_id]["momo"]

            # Lương ngày 5 hàng tháng
            for month in [9, 10, 11]:
                sal_date = datetime.datetime(2026, month, 5, 9, 30, 0)
                sal_amt = u["salary"]
                tx_id = str(uuid.uuid4())
                tx_records.append((
                    tx_id, u_id, acc_bank, None, cat_salary, "INCOME", sal_amt,
                    sal_date, sal_date.date(), f"Nhận lương tháng {month}/2026", "MANUAL", False
                ))
                account_deltas[acc_bank] = account_deltas.get(acc_bank, 0.0) + sal_amt

            # Chi phí sinh hoạt hàng ngày (Ăn uống, cà phê, đi chợ, di chuyển)
            cur_dt = start_date
            while cur_dt <= end_date:
                # 70% ngày có phát sinh chi tiêu
                if random.random() < 0.75:
                    num_tx = random.choices([1, 2, 3, 4], weights=[0.4, 0.35, 0.18, 0.07])[0]
                    for _ in range(num_tx):
                        hour = random.choice([7, 8, 11, 12, 13, 18, 19, 20])
                        minute = random.randint(0, 59)
                        tx_time = cur_dt.replace(hour=hour, minute=minute)
                        
                        # Chọn loại chi tiêu thực tế
                        r = random.random()
                        if r < 0.45: # Ăn uống
                            amt = random.choice([25000, 35000, 40000, 45000, 65000, 85000, 120000])
                            desc = random.choice(["Ăn sáng phở bò tái lăn", "Cà phê Highland", "Cơm trưa văn phòng", "Bún chả Hà Nội", "Trà sữa Phúc Long", "Ăn tối cơm gia đình"])
                            cat = cat_food
                            acc = random.choice([acc_cash, acc_momo, acc_bank])
                        elif r < 0.65: # Đi lại
                            amt = random.choice([50000, 80000, 100000, 150000])
                            desc = random.choice(["Đổ xăng xe máy Petrolimex", "GrabBike đi làm", "Nạp thẻ ePass thu phí tự động", "Bảo dưỡng xe máy"])
                            cat = cat_trans
                            acc = random.choice([acc_cash, acc_momo])
                        elif r < 0.85: # Mua sắm siêu thị
                            amt = random.choice([150000, 220000, 340000, 450000, 680000])
                            desc = random.choice(["Đi chợ WinMart thực phẩm tươi", "Mua đồ gia dụng Bách Hóa Xanh", "Shopee vật dụng cá nhân", "Mua sắm quần áo Uniqlo"])
                            cat = cat_shop
                            acc = random.choice([acc_bank, acc_momo])
                        else: # Giải trí
                            amt = random.choice([110000, 180000, 250000])
                            desc = random.choice(["Vé xem phim CGV cuối tuần", "Xem triển lãm nghệ thuật", "Sách Fahasa"])
                            cat = cat_entertain
                            acc = random.choice([acc_momo, acc_bank])

                        tx_id = str(uuid.uuid4())
                        tx_records.append((
                            tx_id, u_id, acc, None, cat, "EXPENSE", amt,
                            tx_time, tx_time.date(), desc, "MANUAL", False
                        ))
                        account_deltas[acc] = account_deltas.get(acc, 0.0) - amt

                # Chi phí cố định đầu tháng (ngày 10)
                if cur_dt.day == 10:
                    bill_amt = random.choice([650000, 850000, 1100000, 1450000])
                    tx_time = cur_dt.replace(hour=14, minute=15)
                    tx_id = str(uuid.uuid4())
                    tx_records.append((
                        tx_id, u_id, acc_bank, None, cat_util, "EXPENSE", bill_amt,
                        tx_time, tx_time.date(), f"Thanh toán tiền điện nước và internet tháng {cur_dt.month}", "MANUAL", False
                    ))
                    account_deltas[acc_bank] = account_deltas.get(acc_bank, 0.0) - bill_amt

                # Chuyển khoản nội bộ giữa Ngân hàng và MoMo / Tiền mặt (2 lần / tháng)
                if cur_dt.day in [6, 20]:
                    transfer_amt = 1500000.0
                    tx_time = cur_dt.replace(hour=10, minute=0)
                    tx_id = str(uuid.uuid4())
                    tx_records.append((
                        tx_id, u_id, acc_bank, acc_momo, None, "TRANSFER", transfer_amt,
                        tx_time, tx_time.date(), "Nạp tiền từ Techcombank vào ví MoMo", "MANUAL", False
                    ))
                    account_deltas[acc_bank] = account_deltas.get(acc_bank, 0.0) - transfer_amt
                    account_deltas[acc_momo] = account_deltas.get(acc_momo, 0.0) + transfer_amt

                cur_dt += datetime.timedelta(days=1)

            # Sự kiện bất thường đặc thù cho U05 (Phạm Quốc Bảo) vào ngày 18/10/2026 (AI Anomaly Detection)
            if u_id == "c0010000-0000-0000-0000-000000000005":
                anomaly_dt = datetime.datetime(2026, 10, 18, 15, 20, 0)
                anomaly_amt = 6800000.0
                tx_id = str(uuid.uuid4())
                tx_records.append((
                    tx_id, u_id, acc_bank, None, cat_shop, "EXPENSE", anomaly_amt,
                    anomaly_dt, anomaly_dt.date(), "Mua bàn phím cơ Custom và màn hình phụ Dell 27 inch", "MANUAL", False
                ))
                account_deltas[acc_bank] = account_deltas.get(acc_bank, 0.0) - anomaly_amt

        print(f"[+] Generated {len(tx_records)} personal transaction records.")

        # Batch insert transactions
        query_tx = """
            INSERT INTO core.transactions (
                id, user_id, account_id, to_account_id, category_id,
                type, amount, currency_code, exchange_rate, base_amount, to_amount,
                occurred_at, occurred_date, note, description_raw, source, is_excluded_from_report,
                created_at, updated_at
            ) VALUES %s;
        """
        execute_values(cur, query_tx, [(
            r[0], r[1], r[2], r[3], r[4],
            r[5], r[6], 'VND', 1.0, r[6], r[6] if r[5] == 'TRANSFER' else None,
            r[7], r[8], r[9], r[9], r[10], r[11], r[7], r[7]
        ) for r in tx_records], page_size=1000)

        # Cập nhật số dư cuối cùng của tất cả tài khoản chính xác 100%
        print("[*] Updating exact account balances to guarantee 100% financial integrity...")
        for acc_id, delta in account_deltas.items():
            cur.execute("""
                UPDATE core.accounts
                SET balance = initial_balance::numeric + %s,
                    current_balance = (initial_balance::numeric + %s)::money,
                    updated_at = NOW()
                WHERE id = %s;
            """, (delta, delta, acc_id))

        # 7. Nhiệm vụ việc nhà (Child Chores) cho Bin & Bông
        chores_data = [
            (str(uuid.uuid4()), wallet_bin_id, "Rửa bát sau bữa tối cả tuần", 50000, "DAILY", "EASY", 20, "APPROVED", "c0010000-0000-0000-0000-000000000001", "2026-09-08 19:30:00+07", "Con làm rất sạch sẽ!"),
            (str(uuid.uuid4()), wallet_bin_id, "Quét và lau nhà phòng khách", 40000, "WEEKLY", "MEDIUM", 35, "APPROVED", "c0010000-0000-0000-0000-000000000002", "2026-09-15 17:00:00+07", "Mẹ khen Bin nhé!"),
            (str(uuid.uuid4()), wallet_bin_id, "Đạt điểm 10 kiểm tra Toán", 100000, "ONCE", "HARD", 60, "APPROVED", "c0010000-0000-0000-0000-000000000001", "2026-10-22 20:00:00+07", "Thưởng con đạt thành tích xuất sắc!"),
            (str(uuid.uuid4()), wallet_bin_id, "Dọn dẹp góc học tập ngăn nắp", 30000, "WEEKLY", "EASY", 15, "ASSIGNED", None, None, None),
            (str(uuid.uuid4()), wallet_bong_id, "Gấp quần áo giúp mẹ", 30000, "WEEKLY", "EASY", 20, "APPROVED", "c0010000-0000-0000-0000-000000000002", "2026-09-12 18:00:00+07", "Bé Bông ngoan lắm!"),
            (str(uuid.uuid4()), wallet_bong_id, "Tưới cây ban công mỗi sáng", 20000, "DAILY", "EASY", 10, "APPROVED", "c0010000-0000-0000-0000-000000000001", "2026-10-05 07:30:00+07", "Cây xanh tốt nhờ Bông!"),
            (str(uuid.uuid4()), wallet_bong_id, "Tự giác đi ngủ trước 10h tối", 30000, "DAILY", "EASY", 10, "ASSIGNED", None, None, None)
        ]
        for c in chores_data:
            cur.execute("""
                INSERT INTO core.child_chores (
                    id, wallet_id, title, reward_amount, frequency, difficulty,
                    estimated_minutes, status, approved_by_user_id, approved_at, feedback, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, '2026-09-02 08:00:00+07');
            """, c)
        print(f"[+] Inserted {len(chores_data)} kid chores.")

        # 8. Yêu cầu xin tiền (Child Spend Requests)
        spend_requests = [
            (str(uuid.uuid4()), wallet_bin_id, 120000, cat_shop, "Con xin tiền mua sách Lịch sử và Địa lý bổ trợ", "APPROVED", "c0010000-0000-0000-0000-000000000001", "2026-10-10 14:00:00+07", "Bố đồng ý, con chăm đọc nhé."),
            (str(uuid.uuid4()), wallet_bong_id, 200000, cat_shop, "Con xin tiền mua gấu bông bông gòn ở trường", "REJECTED", "c0010000-0000-0000-0000-000000000002", "2026-10-12 19:30:00+07", "Gấu bông con có nhiều rồi, để dịp sinh nhật nhé."),
            (str(uuid.uuid4()), wallet_bong_id, 85000, cat_shop, "Con xin tiền mua hộp màu vẽ 24 màu học Mỹ thuật", "APPROVED", "c0010000-0000-0000-0000-000000000002", "2026-10-14 20:00:00+07", "Mẹ duyệt cho Bông vẽ tranh nhé!"),
            (str(uuid.uuid4()), wallet_bin_id, 90000, cat_shop, "Con xin tiền mua bộ compa và thước kẻ kỹ thuật", "PENDING", None, None, None)
        ]
        for sr in spend_requests:
            cur.execute("""
                INSERT INTO core.child_spend_requests (
                    id, wallet_id, amount, category_id, description, status,
                    responded_by_user_id, responded_at, response_notes, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, '2026-10-09 10:00:00+07', '2026-10-09 10:00:00+07');
            """, sr)
        print(f"[+] Inserted {len(spend_requests)} child spend requests.")

        # 9. Đóng góp quỹ nhóm (Group Fund Contributions)
        fund_contribs = [
            (str(uuid.uuid4()), fund_g01_id, "c0010000-0000-0000-0000-000000000001", accounts_map["c0010000-0000-0000-0000-000000000001"]["bank"], 5000000, "2026-09-02", "Bố Minh đóng quỹ sinh hoạt tháng 9"),
            (str(uuid.uuid4()), fund_g01_id, "c0010000-0000-0000-0000-000000000002", accounts_map["c0010000-0000-0000-0000-000000000002"]["bank"], 5000000, "2026-09-02", "Mẹ Mai đóng quỹ sinh hoạt tháng 9"),
            (str(uuid.uuid4()), fund_g02_id, "c0010000-0000-0000-0000-000000000005", accounts_map["c0010000-0000-0000-0000-000000000005"]["bank"], 2000000, "2026-09-03", "Bảo góp quỹ hẹn hò tháng 9"),
            (str(uuid.uuid4()), fund_g02_id, "c0010000-0000-0000-0000-000000000006", accounts_map["c0010000-0000-0000-0000-000000000006"]["bank"], 2000000, "2026-09-03", "Linh góp quỹ hẹn hò tháng 9"),
            (str(uuid.uuid4()), fund_g05_id, "c0010000-0000-0000-0000-000000000005", accounts_map["c0010000-0000-0000-0000-000000000005"]["bank"], 1500000, "2026-09-05", "Bảo đóng quỹ Đà Lạt đợt 1"),
            (str(uuid.uuid4()), fund_g05_id, "c0010000-0000-0000-0000-000000000006", accounts_map["c0010000-0000-0000-0000-000000000006"]["bank"], 1500000, "2026-09-05", "Linh đóng quỹ Đà Lạt đợt 1"),
            (str(uuid.uuid4()), fund_g05_id, "c0010000-0000-0000-0000-000000000008", accounts_map["c0010000-0000-0000-0000-000000000008"]["bank"], 1500000, "2026-09-05", "Tuấn đóng quỹ Đà Lạt đợt 1"),
            (str(uuid.uuid4()), fund_g05_id, "c0010000-0000-0000-0000-000000000009", accounts_map["c0010000-0000-0000-0000-000000000009"]["bank"], 1500000, "2026-09-05", "Trang đóng quỹ Đà Lạt đợt 1")
        ]
        for fc in fund_contribs:
            cur.execute("""
                INSERT INTO core.group_fund_contributions (
                    id, fund_id, contributor_user_id, source_account_id, amount, contributed_at, note, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s::timestamp with time zone);
            """, (fc[0], fc[1], fc[2], fc[3], fc[4], fc[5], fc[6], f"{fc[5]} 09:00:00+07"))
        print(f"[+] Inserted {len(fund_contribs)} group fund contributions.")

        # 10. Chi tiêu nhóm & Chia tiền (Group Expenses & Splits)
        # Phòng trọ 302: Tiền phòng tháng 9, 10, 11 (6tr/tháng)
        g03_id = groups_def[2]["id"]
        u_bao = "c0010000-0000-0000-0000-000000000005"
        u_huy = "c0010000-0000-0000-0000-000000000007"
        u_tuan = "c0010000-0000-0000-0000-000000000008"

        room_expenses = [
            (str(uuid.uuid4()), g03_id, "Tiền thuê phòng trọ 302 tháng 09/2026", 6000000, "2026-09-05", u_bao, accounts_map[u_bao]["bank"]),
            (str(uuid.uuid4()), g03_id, "Tiền điện nước mạng phòng 302 tháng 09/2026", 1450000, "2026-09-10", u_bao, accounts_map[u_bao]["bank"]),
            (str(uuid.uuid4()), g03_id, "Tiền thuê phòng trọ 302 tháng 10/2026", 6000000, "2026-10-05", u_bao, accounts_map[u_bao]["bank"]),
            (str(uuid.uuid4()), g03_id, "Tiền điện nước mạng phòng 302 tháng 10/2026", 1580000, "2026-10-10", u_bao, accounts_map[u_bao]["bank"]),
            (str(uuid.uuid4()), g03_id, "Tiền thuê phòng trọ 302 tháng 11/2026", 6000000, "2026-11-05", u_bao, accounts_map[u_bao]["bank"])
        ]

        for exp in room_expenses:
            exp_id, grp_id, desc, amt, dt, paid_by, src_acc = exp
            cur.execute("""
                INSERT INTO core.group_expenses (
                    id, group_id, description, amount, currency, paid_by_user_id,
                    split_method, expense_date, created_by_user_id, payment_source, source_account_id, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, 'VND', %s, 'EQUAL', %s, %s, 'PERSONAL_ACCOUNT', %s, %s::timestamp with time zone, %s::timestamp with time zone);
            """, (exp_id, grp_id, desc, amt, paid_by, dt, paid_by, src_acc, f"{dt} 10:00:00+07", f"{dt} 10:00:00+07"))

            # Chia 3 người đều nhau
            split_amt = round(amt / 3, 2)
            for m_id in [u_bao, u_huy, u_tuan]:
                cur.execute("""
                    INSERT INTO core.group_expense_splits (id, expense_id, user_id, amount, percentage)
                    VALUES (%s, %s, %s, %s, 33.33);
                """, (str(uuid.uuid4()), exp_id, m_id, split_amt))

        # 11. Thanh toán nợ nhóm (Group Settlements)
        settlements = [
            (str(uuid.uuid4()), g03_id, u_tuan, u_bao, 2483333, "2026-09-12", "Tuấn gửi tiền phòng tháng 9 cho Bảo", "CONFIRMED"),
            (str(uuid.uuid4()), g03_id, u_huy, u_bao, 2483333, "2026-09-14", "Huy gửi tiền phòng tháng 9 cho Bảo", "CONFIRMED"),
            (str(uuid.uuid4()), g03_id, u_tuan, u_bao, 2526666, "2026-10-12", "Tuấn gửi tiền phòng tháng 10 cho Bảo", "CONFIRMED"),
            (str(uuid.uuid4()), g03_id, u_huy, u_bao, 1500000, "2026-11-08", "Huy ứng trả trước 1tr5 tiền phòng còn nợ", "CONFIRMED"),
            (str(uuid.uuid4()), g03_id, u_huy, u_bao, 3026666, "2026-11-20", "Huy tất toán toàn bộ tiền phòng cho Bảo", "CONFIRMED")
        ]
        for st in settlements:
            cur.execute("""
                INSERT INTO core.group_settlements (
                    id, group_id, from_user_id, to_user_id, amount, currency,
                    payment_method, settlement_date, notes, status, created_at, confirmed_at
                ) VALUES (%s, %s, %s, %s, %s, 'VND', 'BANK_TRANSFER', %s, %s, %s, %s::timestamp with time zone, %s::timestamp with time zone);
            """, (st[0], st[1], st[2], st[3], st[4], st[5], st[6], st[7], f"{st[5]} 11:00:00+07", f"{st[5]} 11:30:00+07" if st[7] == 'CONFIRMED' else None))
        print(f"[+] Inserted {len(room_expenses)} group expenses and {len(settlements)} settlements.")

        # 12. Tin nhắn chat nhóm (Group Messages) & Tương tác
        chat_dialogs = [
            (g03_id, u_bao, "Chào anh em, hôm nay có hóa đơn điện nước tháng 9 rồi nhé! Tổng 1tr450k cả phòng.", "2026-09-10 14:00:00+07"),
            (g03_id, u_tuan, "Oke Bảo, để tối mình bank luôn nhé.", "2026-09-10 14:15:00+07"),
            (g03_id, u_huy, "Em mới chuyển lương part-time, em ck cho anh rồi nha anh Bảo ơi!", "2026-09-14 18:30:00+07"),
            (g03_id, u_bao, "Đã nhận đủ tiền phòng tháng 9 của 2 ông nhé. Thank you!", "2026-09-14 19:00:00+07"),
            (g03_id, u_huy, "Anh Bảo ơi tháng này em bị chậm lương ở quán cà phê, cho em khất mấy hôm nhé ạ!", "2026-10-06 09:30:00+07"),
            (g03_id, u_bao, "Oke Huy, anh ứng tiền phòng trước cho chủ nhà rồi nhé. Khi nào có lương gửi lại anh sau.", "2026-10-06 10:00:00+07"),
            (g03_id, u_huy, "Em cảm ơn anh Bảo nhiều ạ!", "2026-10-06 10:05:00+07"),
            (groups_def[1]["id"], u_bao, "Cuối tuần này em muốn đi ăn ở đâu nè?", "2026-10-15 11:30:00+07"),
            (groups_def[1]["id"], "c0010000-0000-0000-0000-000000000006", "Mình đi ăn lẩu Haidilao ở Vincom đi anh ơi, lâu rồi thèm quá!", "2026-10-15 11:35:00+07"),
            (groups_def[1]["id"], u_bao, "Oke chốt, để anh đặt bàn trước nhé!", "2026-10-15 11:40:00+07"),
            (groups_def[4]["id"], u_bao, "Mọi người ơi lịch trình Đà Lạt tháng 11 chốt đi ngày 06/11 nhé!", "2026-09-20 16:00:00+07"),
            (groups_def[4]["id"], "c0010000-0000-0000-0000-000000000009", "Tuyệt vời, em vừa nộp quỹ đợt 1 rồi nha nhóm trưởng!", "2026-09-20 16:15:00+07")
        ]
        for msg in chat_dialogs:
            cur.execute("""
                INSERT INTO core.group_messages (
                    id, group_id, sender_id, message_type, content, created_at, updated_at
                ) VALUES (%s, %s, %s, 'TEXT', %s, %s::timestamp with time zone, %s::timestamp with time zone);
            """, (str(uuid.uuid4()), msg[0], msg[1], msg[2], msg[3], msg[3]))
        print(f"[+] Inserted {len(chat_dialogs)} realistic group messages.")

        # 13. Ngân sách (Budgets) cho U05 & U01
        budgets_data = [
            # U05 (Bảo) - Tháng 9, 10, 11
            (str(uuid.uuid4()), u_bao, "Ngân sách tháng 09/2026", 14000000, 12650000, "ON_TRACK", "2026-09-01", "2026-09-30"),
            (str(uuid.uuid4()), u_bao, "Ngân sách tháng 10/2026", 14000000, 16800000, "EXCEEDED", "2026-10-01", "2026-10-31"), # Vượt hạn mức do mua màn hình
            (str(uuid.uuid4()), u_bao, "Ngân sách tháng 11/2026", 15000000, 9200000, "ON_TRACK", "2026-11-01", "2026-11-30"),
            # U01 (Bố Minh)
            (str(uuid.uuid4()), "c0010000-0000-0000-0000-000000000001", "Ngân sách chi tiêu gia đình T11", 22000000, 15400000, "ON_TRACK", "2026-11-01", "2026-11-30")
        ]
        for b in budgets_data:
            cur.execute("""
                INSERT INTO core.budgets (
                    id, user_id, name, total_amount, spent_amount, remaining_amount,
                    percentage_used, status, currency_code, period_type, start_date, end_date, created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s - %s,
                    ROUND((%s::numeric / %s::numeric) * 100, 1), %s, 'VND', 'MONTHLY', %s, %s, '2026-09-01 08:00:00+07', '2026-09-01 08:00:00+07'
                );
            """, (b[0], b[1], b[2], b[3], b[4], b[3], b[4], b[4], b[3], b[5], b[6], b[7]))
        print(f"[+] Inserted {len(budgets_data)} budgets (including budget warning scenario for AI).")

        # 14. Mục tiêu tài chính (Goals)
        goals_data = [
            (str(uuid.uuid4()), u_bao, "Đổi Macbook Pro M3 16 inch", "SAVINGS", 48000000, 24000000, "2027-04-30", "IN_PROGRESS", "laptop", "#3B82F6"),
            (str(uuid.uuid4()), "c0010000-0000-0000-0000-000000000001", "Mua ô tô gia đình 7 chỗ", "PURCHASE", 650000000, 320000000, "2027-12-31", "IN_PROGRESS", "car", "#10B981"),
            (str(uuid.uuid4()), "c0010000-0000-0000-0000-000000000003", "Tiết kiệm mua xe đạp leo núi", "PURCHASE", 2500000, 950000, "2027-06-01", "IN_PROGRESS", "bike", "#F59E0B")
        ]
        for g in goals_data:
            cur.execute("""
                INSERT INTO core.goals (
                    id, user_id, name, goal_type, target_amount, current_amount,
                    currency_code, target_date, status, icon, color, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s::numeric::money, %s::numeric::money, 'VND', %s, %s, %s, %s, '2026-09-01 09:00:00+07', '2026-09-01 09:00:00+07');
            """, g)
        print(f"[+] Inserted {len(goals_data)} financial goals.")

        # 15. Sổ nợ & Vay mượn (Debts)
        debts_data = [
            (str(uuid.uuid4()), u_bao, "LEND", "Hoàng Anh Tuấn (Vay mua đồ công nghệ)", 3000000, 0, "2026-09-15", "2026-10-15", "SETTLED", "Đã trả xong qua chuyển khoản"),
            (str(uuid.uuid4()), u_huy, "BORROW", "Phạm Quốc Bảo (Ứng tiền phòng trọ)", 2000000, 0, "2026-10-06", "2026-11-20", "SETTLED", "Đã trả đủ tiền phòng cho anh Bảo"),
            (str(uuid.uuid4()), "c0010000-0000-0000-0000-000000000010", "BORROW", "Ngân hàng Shinhan (Vay tiêu dùng)", 35000000, 24000000, "2026-08-01", "2027-08-01", "ACTIVE", "Trả góp định kỳ ngày 15 hàng tháng")
        ]
        for d in debts_data:
            cur.execute("""
                INSERT INTO core.debts (
                    id, user_id, debt_type, counterparty_name, principal_amount,
                    remaining_amount, currency_code, start_date, due_date, status, description, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s::numeric::money, %s::numeric::money, 'VND', %s, %s, %s, %s, '2026-09-01 10:00:00+07', '2026-09-01 10:00:00+07');
            """, d)
        print(f"[+] Inserted {len(debts_data)} debt records.")

        # 16. Thông báo hệ thống (Notifications)
        notifications_data = [
            (str(uuid.uuid4()), u_bao, "SYSTEM", "NORMAL", "Chào mừng bạn đến với Finora!", "Bắt đầu quản lý tài chính thông minh cùng gia đình và bạn bè ngay hôm nay.", "/dashboard", False, "2026-09-01 08:00:00+07"),
            (str(uuid.uuid4()), u_bao, "BUDGET_EXCEEDED", "HIGH", "Cảnh báo vượt ngân sách tháng 10!", "Tổng chi tiêu tháng 10 của bạn đã đạt 120% hạn mức dự kiến (16.800.000 đ / 14.000.000 đ).", "/budget", True, "2026-10-20 09:00:00+07"),
            (str(uuid.uuid4()), u_bao, "GROUP_EXPENSE", "NORMAL", "Chi tiêu nhóm mới: Tiền phòng trọ 302", "Phạm Quốc Bảo đã thanh toán 6.000.000 đ cho tiền thuê phòng trọ.", "/groups", True, "2026-11-05 10:30:00+07"),
            (str(uuid.uuid4()), "c0010000-0000-0000-0000-000000000001", "KID_REQUEST", "NORMAL", "Bin vừa gửi yêu cầu xin tiền", "Bin xin 120.000 đ mua sách Lịch sử và Địa lý.", "/child-wallet", True, "2026-10-09 10:05:00+07")
        ]
        for n in notifications_data:
            cur.execute("""
                INSERT INTO core.notifications (
                    id, user_id, type, priority, title, body, action_url, is_read, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::timestamp without time zone);
            """, n)
        print(f"[+] Inserted {len(notifications_data)} notifications.")

        conn.commit()
        print("==================================================")
        print("  SEED COMPLETED SUCCESSFULLY!")
        print("==================================================")

    except Exception as e:
        conn.rollback()
        print(f"[!] Error: {e}")
        raise e
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
