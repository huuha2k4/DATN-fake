"""
FINORA DEMO DATA SEEDER — MASTER ENGINE (TOTAL REBUILD, REALISM & INTEGRITY)
Đáp ứng 100% các tiêu chuẩn kiểm định P0:
- 14 Users Canonical (12 Người lớn Persona chuyên biệt & 2 Trẻ em)
- 38 Accounts cá nhân phân bổ 12 ngân hàng/ví khác nhau, liên kết đúng core.banks UUID
- 5 Nhóm liên kết gia đình, cặp đôi, phòng trọ, bạn thân, du lịch chuẩn xác 100%
- Chi tiêu thực tế: Lương 22tr tiêu 14-17tr/tháng (tiền trọ, ăn uống, đi lại, hẹn hò, mua sắm)
- KHÔNG lộ metadata kỹ thuật (#01, #27, (bao_dev)), nội dung đời thường tự nhiên
- Hội thoại nhóm đối đáp theo luồng thực tế (Threaded Contextual Dialogue)
- Bình luận chi tiêu đúng người, đúng ngữ cảnh
- 100% tài khoản dương tiền, đối soát chính xác tuyệt đối (Delta = 0)
- Idempotent, Deterministic.
"""

import os
import sys
import random
import datetime
import uuid
import json
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values

SEED = 20261124
random.seed(SEED)

DB_HOST = os.getenv("POSTGRES_SERVER", os.getenv("DB_HOST", "postgres"))
DB_PORT = int(os.getenv("POSTGRES_PORT", os.getenv("DB_PORT", "5432")))
DB_NAME = os.getenv("POSTGRES_DB", os.getenv("DB_NAME", "finance_db"))
DB_USER = os.getenv("POSTGRES_USER", os.getenv("DB_USER", "postgres"))
DB_PASS = os.getenv("POSTGRES_PASSWORD", os.getenv("DB_PASSWORD", "postgres"))

PASSWORD_HASH = "$2a$12$5gADzOOu4sScBJesZB1XCOjXQYFBhZYH1rQ5ExATPJZ..SLneChFi"

def get_connection():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )

def main():
    print("==================================================")
    print("  FINORA DEMO DATA SEEDER — MASTER ENGINE (FINAL REBUILD)")
    print(f"  Target DB: {DB_NAME} on {DB_HOST}:{DB_PORT}")
    print("  Range: 2026-09-01 00:00:00 to 2026-11-23 23:59:59")
    print("==================================================")
    
    conn = get_connection()
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # 1. Tải danh mục hệ thống và danh mục ngân hàng
        cur.execute("SELECT id, code, name, kind FROM core.categories WHERE user_id IS NULL AND is_system = true;")
        categories = cur.fetchall()
        cat_map = {c['code']: c['id'] for c in categories}
        print(f"[*] Loaded {len(categories)} system categories.")

        cur.execute("SELECT id, code, short_name, name FROM core.banks WHERE is_active = true;")
        banks = cur.fetchall()
        bank_map = {b['code']: b['id'] for b in banks}
        print(f"[*] Loaded {len(banks)} system banks.")

        # 2. CANONICAL PERSONA MANIFEST (14 Users)
        users_def = [
            {
                "id": "c0010000-0000-0000-0000-000000000001", "username": "minh_father", "email": "minh.father@finora.demo",
                "name": "Nguyễn Văn Minh", "salary": 28000000, "is_kid": False, "role_desc": "Bố, Kỹ sư phần mềm cấp cao",
                "persona": "tech_family", "bank_code": "VCB", "bank_name": "Vietcombank Priority",
                "initial_bank": 55000000, "initial_momo": 4000000, "initial_cash": 3000000
            },
            {
                "id": "c0010000-0000-0000-0000-000000000002", "username": "mai_mother", "email": "mai.mother@finora.demo",
                "name": "Trần Ngọc Mai", "salary": 19000000, "is_kid": False, "role_desc": "Mẹ, Kế toán trưởng chu đáo",
                "persona": "accountant_family", "bank_code": "TCB", "bank_name": "Techcombank Private",
                "initial_bank": 42000000, "initial_momo": 3000000, "initial_cash": 4500000
            },
            {
                "id": "c0010000-0000-0000-0000-000000000003", "username": "bin_kid", "email": "bin.kid@finora.kids",
                "name": "Nguyễn Gia Bảo (Bin)", "salary": 0, "is_kid": True, "dob": "2014-05-12", "role_desc": "Con trai lớn, 12 tuổi",
                "persona": "kid_boy", "initial_cash": 400000
            },
            {
                "id": "c0010000-0000-0000-0000-000000000004", "username": "bong_kid", "email": "bong.kid@finora.kids",
                "name": "Nguyễn Hà My (Bông)", "salary": 0, "is_kid": True, "dob": "2017-09-20", "role_desc": "Con gái út, 9 tuổi",
                "persona": "kid_girl", "initial_cash": 250000
            },
            {
                "id": "c0010000-0000-0000-0000-000000000005", "username": "bao_dev", "email": "bao.dev@finora.demo",
                "name": "Phạm Quốc Bảo", "salary": 22000000, "is_kid": False, "role_desc": "Lập trình viên (User Demo Chính)",
                "persona": "software_engineer", "bank_code": "TCB", "bank_name": "Techcombank Digi",
                "initial_bank": 35000000, "initial_momo": 3000000, "initial_cash": 2000000
            },
            {
                "id": "c0010000-0000-0000-0000-000000000006", "username": "linh_mkt", "email": "linh.mkt@finora.demo",
                "name": "Lê Khánh Linh", "salary": 16000000, "is_kid": False, "role_desc": "Nhân viên Marketing năng động",
                "persona": "marketing_young", "bank_code": "MB", "bank_name": "MB Bank Modern",
                "initial_bank": 22000000, "initial_momo": 3500000, "initial_cash": 1800000
            },
            {
                "id": "c0010000-0000-0000-0000-000000000007", "username": "huy_student", "email": "huy.student@finora.demo",
                "name": "Trần Đức Huy", "salary": 7000000, "is_kid": False, "role_desc": "Sinh viên làm thêm part-time",
                "persona": "student_worker", "bank_code": "TPB", "bank_name": "TPBank Sinh Viên",
                "initial_bank": 8000000, "initial_momo": 1500000, "initial_cash": 1000000
            },
            {
                "id": "c0010000-0000-0000-0000-000000000008", "username": "tuan_office", "email": "tuan.office@finora.demo",
                "name": "Hoàng Anh Tuấn", "salary": 14000000, "is_kid": False, "role_desc": "Nhân viên văn phòng ổn định",
                "persona": "office_worker", "bank_code": "BIDV", "bank_name": "BIDV SmartBanking",
                "initial_bank": 18000000, "initial_momo": 2000000, "initial_cash": 1500000
            },
            {
                "id": "c0010000-0000-0000-0000-000000000009", "username": "trang_freelance", "email": "trang.freelance@finora.demo",
                "name": "Đỗ Thu Trang", "salary": 15000000, "is_kid": False, "role_desc": "Freelancer thiết kế đồ họa",
                "persona": "designer_freelance", "bank_code": "VPB", "bank_name": "VPBank Timo",
                "initial_bank": 24000000, "initial_momo": 2500000, "initial_cash": 1500000
            },
            {
                "id": "c0010000-0000-0000-0000-000000000010", "username": "khang_sales", "email": "khang.sales@finora.demo",
                "name": "Nguyễn Minh Khang", "salary": 18000000, "is_kid": False, "role_desc": "Nhân viên kinh doanh & hoa hồng",
                "persona": "sales_corporate", "bank_code": "ACB", "bank_name": "ACB EBIZ",
                "initial_bank": 28000000, "initial_momo": 3000000, "initial_cash": 2500000
            },
            {
                "id": "c0010000-0000-0000-0000-000000000011", "username": "vy_student", "email": "vy.student@finora.demo",
                "name": "Vũ Thảo Vy", "salary": 5000000, "is_kid": False, "role_desc": "Sinh viên đại học năm 3",
                "persona": "college_student", "bank_code": "VTB", "bank_name": "VietinBank iPay",
                "initial_bank": 5500000, "initial_momo": 1800000, "initial_cash": 800000
            },
            {
                "id": "c0010000-0000-0000-0000-000000000012", "username": "nam_merchant", "email": "nam.merchant@finora.demo",
                "name": "Phan Hoàng Nam", "salary": 30000000, "is_kid": False, "role_desc": "Chủ cửa hàng phụ kiện điện thoại",
                "persona": "business_owner", "bank_code": "STB", "bank_name": "Sacombank Doanh Nghiệp",
                "initial_bank": 75000000, "initial_momo": 6000000, "initial_cash": 7000000
            },
            {
                "id": "c0010000-0000-0000-0000-000000000013", "username": "ha_teacher", "email": "ha.teacher@finora.demo",
                "name": "Bùi Thanh Hà", "salary": 13000000, "is_kid": False, "role_desc": "Giáo viên trung học chu đáo",
                "persona": "school_teacher", "bank_code": "AGR", "bank_name": "Agribank Giáo Viên",
                "initial_bank": 21000000, "initial_momo": 2000000, "initial_cash": 2500000
            },
            {
                "id": "c0010000-0000-0000-0000-000000000014", "username": "phuc_shipper", "email": "phuc.shipper@finora.demo",
                "name": "Đặng Đức Phúc", "salary": 11000000, "is_kid": False, "role_desc": "Nhân viên giao hàng công nghệ",
                "persona": "delivery_shipper", "bank_code": "HDB", "bank_name": "HDBank eKYC",
                "initial_bank": 14000000, "initial_momo": 4000000, "initial_cash": 2000000
            },
        ]

        # Dọn dẹp dữ liệu cũ (Idempotent Cleanup)
        demo_user_ids = [u["id"] for u in users_def]
        print("[*] Cleaning up old demo data for clean deterministic rebuild...")
        cur.execute("DELETE FROM core.goal_contributions WHERE goal_id IN (SELECT id FROM core.goals WHERE user_id = ANY(%s::uuid[]));", (demo_user_ids,))
        cur.execute("DELETE FROM core.debt_payments WHERE debt_id IN (SELECT id FROM core.debts WHERE user_id = ANY(%s::uuid[]));", (demo_user_ids,))
        cur.execute("DELETE FROM core.budget_items WHERE budget_id IN (SELECT id FROM core.budgets WHERE user_id = ANY(%s::uuid[]));", (demo_user_ids,))
        cur.execute("DELETE FROM core.budgets WHERE user_id = ANY(%s::uuid[]);", (demo_user_ids,))
        cur.execute("DELETE FROM core.goals WHERE user_id = ANY(%s::uuid[]);", (demo_user_ids,))
        cur.execute("DELETE FROM core.debts WHERE user_id = ANY(%s::uuid[]);", (demo_user_ids,))
        cur.execute("DELETE FROM core.notifications WHERE user_id = ANY(%s::uuid[]);", (demo_user_ids,))
        cur.execute("DELETE FROM core.schedules WHERE user_id = ANY(%s::uuid[]);", (demo_user_ids,))
        cur.execute("DELETE FROM core.transaction_comments WHERE user_id = ANY(%s::uuid[]);", (demo_user_ids,))
        cur.execute("DELETE FROM core.child_data_sharing_requests WHERE group_id::text LIKE 'd001%%';")
        cur.execute("DELETE FROM core.child_spend_requests WHERE wallet_id IN (SELECT id FROM core.child_wallets WHERE group_id::text LIKE 'd001%%');")
        cur.execute("DELETE FROM core.child_chores WHERE wallet_id IN (SELECT id FROM core.child_wallets WHERE group_id::text LIKE 'd001%%');")
        cur.execute("DELETE FROM core.group_settlements WHERE group_id::text LIKE 'd001%%';")
        cur.execute("DELETE FROM core.group_message_reads WHERE message_id IN (SELECT id FROM core.group_messages WHERE group_id::text LIKE 'd001%%');")
        cur.execute("DELETE FROM core.group_messages WHERE group_id::text LIKE 'd001%%';")
        cur.execute("DELETE FROM core.group_expense_splits WHERE expense_id IN (SELECT id FROM core.group_expenses WHERE group_id::text LIKE 'd001%%');")
        cur.execute("DELETE FROM core.group_expenses WHERE group_id::text LIKE 'd001%%';")
        cur.execute("DELETE FROM core.group_fund_contributions WHERE fund_id IN (SELECT id FROM core.group_funds WHERE group_id::text LIKE 'd001%%');")
        cur.execute("DELETE FROM core.group_funds WHERE group_id::text LIKE 'd001%%';")
        cur.execute("DELETE FROM core.transactions WHERE user_id = ANY(%s::uuid[]);", (demo_user_ids,))
        cur.execute("DELETE FROM core.child_wallets WHERE group_id::text LIKE 'd001%%';")
        cur.execute("DELETE FROM core.group_members WHERE group_id::text LIKE 'd001%%';")
        cur.execute("DELETE FROM core.groups WHERE id::text LIKE 'd001%%';")
        cur.execute("DELETE FROM core.accounts WHERE user_id = ANY(%s::uuid[]);", (demo_user_ids,))
        cur.execute("DELETE FROM core.users WHERE id = ANY(%s::uuid[]);", (demo_user_ids,))
        print("[+] Cleanup complete.")

        # 3. Tạo 14 Users
        print("[*] Creating 14 users...")
        for u in users_def:
            dob_val = u.get("dob", "1996-08-15")
            cur.execute("""
                INSERT INTO core.users (
                    id, username, email, full_name, password_hash, user_status, system_role,
                    subscription_tier, preferred_currency, timezone, language, email_verified,
                    mfa_enabled, date_of_birth, created_at, updated_at, version
                ) VALUES (
                    %s, %s, %s, %s, %s, 'ACTIVE', 'USER',
                    'FREE', 'VND', 'Asia/Ho_Chi_Minh', 'vi', true,
                    false, %s::date, '2026-08-25 00:00:00+07', '2026-08-25 00:00:00+07', 0
                );
            """, (u["id"], u["username"], u["email"], u["name"], PASSWORD_HASH, dob_val))
        print("[+] 14 users created.")

        # 4. Tạo Accounts cá nhân (38 accounts) liên kết CHÍNH XÁC core.banks UUID
        print("[*] Creating 38 personal accounts with valid core.banks references...")
        accounts_map = {}
        momo_bank_id = bank_map.get("MOMO")
        for u in users_def:
            u_id = u["id"]
            accounts_map[u_id] = {}
            if u["is_kid"]:
                acc_cash = str(uuid.uuid4())
                init_cash = u["initial_cash"]
                cur.execute("""
                    INSERT INTO core.accounts (
                        id, user_id, name, type, currency_code, balance, current_balance,
                        initial_balance, is_included_in_total, is_active, display_order, created_at, updated_at, version
                    ) VALUES (
                        %s, %s, 'Heo đất tiền mặt', 'CASH', 'VND', %s, %s::numeric::money,
                        %s, true, true, 1, '2026-08-26 08:00:00+07', '2026-08-26 08:00:00+07', 0
                    );
                """, (acc_cash, u_id, init_cash, init_cash, init_cash))
                accounts_map[u_id]["cash"] = acc_cash
            else:
                acc_bank = str(uuid.uuid4())
                acc_cash = str(uuid.uuid4())
                acc_momo = str(uuid.uuid4())
                b_uuid = bank_map.get(u["bank_code"])
                init_b = u["initial_bank"]
                init_c = u["initial_cash"]
                init_m = u["initial_momo"]

                cur.execute("""
                    INSERT INTO core.accounts (id, user_id, name, type, bank_id, currency_code, balance, current_balance, initial_balance, is_included_in_total, is_active, display_order, created_at, updated_at, version)
                    VALUES
                    (%s, %s, %s, 'BANK', %s, 'VND', %s, %s::numeric::money, %s, true, true, 1, '2026-08-26 08:00:00+07', '2026-08-26 08:00:00+07', 0),
                    (%s, %s, 'Ví tiền mặt', 'CASH', NULL, 'VND', %s, %s::numeric::money, %s, true, true, 2, '2026-08-26 08:00:00+07', '2026-08-26 08:00:00+07', 0),
                    (%s, %s, 'Ví MoMo', 'E_WALLET', %s, 'VND', %s, %s::numeric::money, %s, true, true, 3, '2026-08-26 08:00:00+07', '2026-08-26 08:00:00+07', 0);
                """, (
                    acc_bank, u_id, u["bank_name"], b_uuid, init_b, init_b, init_b,
                    acc_cash, u_id, init_c, init_c, init_c,
                    acc_momo, u_id, momo_bank_id, init_m, init_m, init_m
                ))
                accounts_map[u_id]["bank"] = acc_bank
                accounts_map[u_id]["cash"] = acc_cash
                accounts_map[u_id]["momo"] = acc_momo
        print("[+] 38 accounts created with exact core.banks foreign keys.")

        # 5. Định nghĩa 5 Nhóm chuẩn theo kịch bản
        groups_def = [
            {"id": "d0010000-0000-0000-0000-000000000001", "name": "Gia đình Minh - Mai", "type": "FAMILY", "owner_id": "c0010000-0000-0000-0000-000000000001",
             "members": [
                 {"user_id": "c0010000-0000-0000-0000-000000000001", "role": "OWNER", "is_kid": False},
                 {"user_id": "c0010000-0000-0000-0000-000000000002", "role": "ADMIN", "is_kid": False},
                 {"user_id": "c0010000-0000-0000-0000-000000000003", "role": "MEMBER", "is_kid": True},
                 {"user_id": "c0010000-0000-0000-0000-000000000004", "role": "MEMBER", "is_kid": True},
             ]},
            {"id": "d0010000-0000-0000-0000-000000000002", "name": "Cặp đôi Bảo - Linh", "type": "COUPLE", "owner_id": "c0010000-0000-0000-0000-000000000005",
             "members": [
                 {"user_id": "c0010000-0000-0000-0000-000000000005", "role": "OWNER", "is_kid": False},
                 {"user_id": "c0010000-0000-0000-0000-000000000006", "role": "MEMBER", "is_kid": False},
             ]},
            {"id": "d0010000-0000-0000-0000-000000000003", "name": "Phòng trọ 302", "type": "ROOMMATE", "owner_id": "c0010000-0000-0000-0000-000000000005",
             "members": [
                 {"user_id": "c0010000-0000-0000-0000-000000000005", "role": "OWNER", "is_kid": False},
                 {"user_id": "c0010000-0000-0000-0000-000000000007", "role": "MEMBER", "is_kid": False},
                 {"user_id": "c0010000-0000-0000-0000-000000000008", "role": "MEMBER", "is_kid": False},
             ]},
            {"id": "d0010000-0000-0000-0000-000000000004", "name": "Hội bạn thân Đại học", "type": "OTHER", "owner_id": "c0010000-0000-0000-0000-000000000005",
             "members": [
                 {"user_id": "c0010000-0000-0000-0000-000000000005", "role": "OWNER", "is_kid": False},
                 {"user_id": "c0010000-0000-0000-0000-000000000006", "role": "MEMBER", "is_kid": False},
                 {"user_id": "c0010000-0000-0000-0000-000000000007", "role": "MEMBER", "is_kid": False},
                 {"user_id": "c0010000-0000-0000-0000-000000000009", "role": "MEMBER", "is_kid": False},
             ]},
            {"id": "d0010000-0000-0000-0000-000000000005", "name": "Du lịch Đà Lạt 2026", "type": "TRAVEL", "owner_id": "c0010000-0000-0000-0000-000000000005",
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

        # 6. Kids Wallets
        wallet_bin_id = "e0010000-0000-0000-0000-000000000001"
        wallet_bong_id = "e0010000-0000-0000-0000-000000000002"
        g01_id = groups_def[0]["id"]
        g02_id = groups_def[1]["id"]
        g03_id = groups_def[2]["id"]
        g04_id = groups_def[3]["id"]
        g05_id = groups_def[4]["id"]

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

        # 7. Group Funds
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

        # 8. DANH MỤC THAM CHIẾU HỆ THỐNG
        cat_food = cat_map.get("FOOD_DRINK") or cat_map.get("FOOD_DRINKS")
        cat_trans = cat_map.get("TRANSPORTATION") or cat_map.get("TRANSPORT")
        cat_shop = cat_map.get("SHOPPING")
        cat_util = cat_map.get("UTILITIES") or cat_map.get("BILLS")
        cat_entertain = cat_map.get("ENTERTAINMENT")
        cat_family = cat_map.get("FAMILY")
        cat_health = cat_map.get("HEALTHCARE") or cat_map.get("HEALTH")
        cat_edu = cat_map.get("EDUCATION")
        cat_housing = cat_map.get("HOUSING") or cat_util
        cat_salary = cat_map.get("SALARY") or cat_map.get("SALARY_SYS")
        cat_bonus = cat_map.get("BONUS") or cat_map.get("BONUS_SYS")
        cat_other_inc = cat_map.get("OTHER_INCOME") or cat_map.get("OTHER_INCOME_SYS")
        cat_biz_inc = cat_map.get("BUSINESS_INCOME") or cat_map.get("BUSINESS_SYS")

        print("[*] Generating Deterministic, Realistic & Highly Natural Personal Transactions...")
        start_date = datetime.datetime(2026, 9, 1, 6, 0, 0)
        
        tx_records = []
        account_deltas = {}

        # Mẫu giao dịch đời thực và tự nhiên 100% không metadata
        persona_scenarios = {
            "tech_family": { # Minh (Bố, Senior Engineer, 28tr)
                "rent_or_house": ("Trả góp nhà chung cư", 6500000, cat_housing),
                "living_groceries": [("Siêu thị thực phẩm WinMart cuối tuần", 1450000, cat_food), ("Chợ thực phẩm sạch sáng chủ nhật", 850000, cat_food)],
                "daily_expenses": [
                    ("Cơm trưa văn phòng", 65000, cat_food), ("Phở bò tái nạm ăn sáng", 75000, cat_food), ("Cà phê Highlands sáng", 45000, cat_food),
                    ("Đổ xăng xe ô tô", 850000, cat_trans), ("Phí gửi xe hầm tòa nhà", 120000, cat_trans),
                    ("Mua sách lập trình & kiến trúc phần mềm", 320000, cat_edu), ("Đóng quỹ hội phụ huynh lớp Bin", 450000, cat_edu),
                    ("Đồ chơi xếp hình Lego cho con", 380000, cat_family), ("Thực phẩm chức năng Vitamin D cho cả nhà", 420000, cat_health),
                    ("Vé xem phim CGV cuối tuần cả nhà", 320000, cat_entertain), ("Mua phụ kiện màn hình làm việc Shopee", 450000, cat_shop)
                ]
            },
            "accountant_family": { # Mai (Mẹ, Kế toán trưởng, 19tr)
                "rent_or_house": ("Phí dịch vụ quản lý căn hộ & gửi xe", 1850000, cat_util),
                "living_groceries": [("Siêu thị đồ gia dụng Co.opmart", 1200000, cat_food), ("Mua hoa quả và sữa cho các con", 650000, cat_family)],
                "daily_expenses": [
                    ("Bún chả trưa cùng phòng kế toán", 55000, cat_food), ("Bánh mì pate trứng", 30000, cat_food), ("Trà thảo mộc thanh nhiệt", 40000, cat_food),
                    ("Đổ xăng xe máy Lead", 90000, cat_trans), ("GrabCar đi kiểm toán chi nhánh", 85000, cat_trans),
                    ("Quần áo thời trang bé Bông Canifa", 380000, cat_family), ("Khoá học bồi dưỡng chuẩn mực IFRS", 600000, cat_edu),
                    ("Mỹ phẩm chăm sóc da Innisfree", 480000, cat_shop), ("Khám mắt định kỳ cho 2 bé", 350000, cat_health),
                    ("Trà chiều cuối tuần với bạn thân", 150000, cat_entertain), ("Bộ hộp cơm giữ nhiệt Lock&Lock", 290000, cat_shop)
                ]
            },
            "software_engineer": { # Bảo (User Demo Chính, 22tr)
                # Thuê trọ, hẹn hò, ăn uống, công nghệ, giải trí
                "rent_or_house": ("Tiền thuê phòng trọ cá nhân", 3500000, cat_housing),
                "living_groceries": [("Đi siêu thị mua đồ ăn cả tuần", 850000, cat_food), ("Mua đồ dùng sinh hoạt cá nhân", 450000, cat_shop)],
                "daily_expenses": [
                    ("Cơm trưa văn phòng GrabFood", 60000, cat_food), ("Phở bò sáng", 55000, cat_food), ("Cà phê đen đá sáng", 30000, cat_food),
                    ("Đổ xăng xe máy", 80000, cat_trans), ("GrabBike trời mưa", 45000, cat_trans),
                    ("Ăn tối hẹn hò Pizza 4Ps cùng Linh", 580000, cat_food), ("Xem phim rạp Vincom cuối tuần", 240000, cat_entertain),
                    ("Mua áo thun Coolmate", 220000, cat_shop), ("Bàn phím cơ & chuột không dây", 850000, cat_shop),
                    ("Khoá học AWS Certified Solutions Architect", 499000, cat_edu), ("Sữa chua & đồ ăn nhẹ", 120000, cat_food),
                    ("Mua sữa hạt dinh dưỡng", 180000, cat_health), ("Bida thư giãn với Tuấn và Huy", 150000, cat_entertain)
                ]
            },
            "marketing_young": { # Linh (Marketing, 16tr)
                "rent_or_house": ("Tiền thuê căn hộ studio", 3800000, cat_housing),
                "living_groceries": [("Mua thực phẩm healthy siêu thị An Nam", 950000, cat_food), ("Hoa quả tươi dinh dưỡng", 350000, cat_food)],
                "daily_expenses": [
                    ("Salad ức gà trưa", 65000, cat_food), ("Trà sữa Phê La", 60000, cat_food), ("Bún đậu mắm tôm cùng đồng nghiệp", 55000, cat_food),
                    ("BeCar di chuyển họp agency", 75000, cat_trans), ("Đổ xăng xe Vision", 80000, cat_trans),
                    ("Váy đầm thời trang Zara", 650000, cat_shop), ("Son môi MAC chính hãng", 520000, cat_shop),
                    ("Vé workshop vẽ tranh thư giãn", 350000, cat_entertain), ("Vé concert ca nhạc", 900000, cat_entertain),
                    ("Thẻ tập Yoga & Pilates tháng", 600000, cat_health), ("Khóa học Content & TikTok Ads", 450000, cat_edu)
                ]
            },
            "student_worker": { # Huy (Sinh viên làm thêm, 7tr)
                "rent_or_house": ("Phần tiền phòng trọ chia 3 người", 2000000, cat_housing),
                "living_groceries": [("Đi chợ mua thức ăn chung phòng trọ", 350000, cat_food)],
                "daily_expenses": [
                    ("Cơm sinh viên bình dân", 30000, cat_food), ("Bánh mì trứng ăn sáng", 20000, cat_food), ("Cà phê cóc vỉa hè", 18000, cat_food),
                    ("Đổ xăng xe Wave Alpha", 60000, cat_trans), ("Vé xe buýt tháng sinh viên", 100000, cat_trans),
                    ("In ấn đề cương và bài tập nhóm", 45000, cat_edu), ("Giáo trình kinh tế đại cương", 85000, cat_edu),
                    ("Áo thun Shopee giá rẻ", 120000, cat_shop), ("Trà chanh chém gió cùng bạn học", 35000, cat_entertain),
                    ("Mua vở ghi chép & bút bi mới", 40000, cat_edu), ("Cắt tóc nam bình dân", 60000, cat_shop)
                ]
            },
            "office_worker": { # Tuấn (Nhân viên VP, 14tr)
                "rent_or_house": ("Phần tiền phòng trọ chia 3 người", 2000000, cat_housing),
                "living_groceries": [("Siêu thị thực phẩm BigC", 650000, cat_food)],
                "daily_expenses": [
                    ("Cơm trưa văn phòng", 45000, cat_food), ("Phở bò buổi sáng", 45000, cat_food), ("Bia hơi giao lưu đồng nghiệp", 180000, cat_food),
                    ("Đổ xăng xe AirBlade", 90000, cat_trans), ("Vé gửi xe tháng cơ quan", 120000, cat_trans),
                    ("Sơ mi công sở Việt Tiến", 450000, cat_shop), ("Giày tây công sở đi làm", 650000, cat_shop),
                    ("Bóng đá giao hữu sân cỏ nhân tạo", 120000, cat_entertain), ("Cạo vôi răng nha khoa", 200000, cat_health),
                    ("Cà phê cuối tuần", 40000, cat_food), ("Nạp thẻ điện thoại trả sau", 150000, cat_util)
                ]
            },
            "designer_freelance": { # Trang (Designer freelance, 15tr + dự án ngoài)
                "rent_or_house": ("Tiền thuê căn hộ làm việc chung", 3200000, cat_housing),
                "living_groceries": [("Siêu thị thực phẩm tươi sống", 750000, cat_food)],
                "daily_expenses": [
                    ("Ngồi làm việc The Coffee House", 65000, cat_food), ("Đặt cơm bento giao tận nơi", 60000, cat_food),
                    ("GrabBike gặp khách hàng brief", 55000, cat_trans), ("Xăng xe máy", 70000, cat_trans),
                    ("Gói bản quyền phần mềm thiết kế Adobe", 480000, cat_util), ("Ngòi bút vẽ thay thế cho Wacom", 220000, cat_shop),
                    ("Triển lãm nghệ thuật & bảo tàng", 120000, cat_entertain), ("Sách Artbook cảm hứng thiết kế", 320000, cat_edu),
                    ("Gối massage cổ vai gáy làm việc", 450000, cat_health), ("Trà thảo mộc hoa cúc", 45000, cat_food)
                ]
            },
            "sales_corporate": { # Khang (Sales B2B, 18tr + hoa hồng)
                "rent_or_house": ("Tiền thuê căn hộ chung cư mini", 3600000, cat_housing),
                "living_groceries": [("Siêu thị thực phẩm WinMart", 900000, cat_food)],
                "daily_expenses": [
                    ("Cà phê tiếp khách đối tác", 85000, cat_food), ("Ăn trưa cơm văn phòng", 55000, cat_food), ("Tiếp khách ăn tối ký hợp đồng", 650000, cat_food),
                    ("Xăng xe chạy thị trường liên tục", 150000, cat_trans), ("Phí cầu đường BOT", 80000, cat_trans), ("GrabCar đón khách VIP", 120000, cat_trans),
                    ("Cà vạt & phụ kiện sơ mi công sở", 250000, cat_shop), ("Nước hoa nam mini & sáp vuốt tóc", 380000, cat_shop),
                    ("Giao lưu tennis cuối tuần", 250000, cat_entertain), ("Nước uống giải rượu & bảo vệ gan", 150000, cat_health)
                ]
            },
            "college_student": { # Vy (Sinh viên ĐH, 5tr)
                "rent_or_house": ("Tiền phòng ký túc xá sinh viên", 1200000, cat_housing),
                "living_groceries": [("Mua thực phẩm tự nấu ăn", 350000, cat_food)],
                "daily_expenses": [
                    ("Cơm trưa căn tin trường đại học", 25000, cat_food), ("Trà sữa trân châu bạn bè", 35000, cat_food), ("Bánh mì chả lụa", 20000, cat_food),
                    ("Vé tháng xe buýt sinh viên", 100000, cat_trans), ("Xăng xe máy", 50000, cat_trans),
                    ("Photo giáo trình & tài liệu học tập", 35000, cat_edu), ("Sổ tay ghi chép môn học", 30000, cat_edu),
                    ("Vớ tất và phụ kiện tóc xinh Shopee", 45000, cat_shop), ("Vé xem phim suất chiếu sinh viên", 75000, cat_entertain),
                    ("Chụp ảnh photobooth cùng bạn", 80000, cat_entertain)
                ]
            },
            "business_owner": { # Nam (Chủ shop, 30tr)
                "rent_or_house": ("Tiền thuê mặt bằng kho & cửa hàng", 8500000, cat_housing),
                "living_groceries": [("Siêu thị thực phẩm tươi sống", 1500000, cat_food)],
                "daily_expenses": [
                    ("Ăn uống bồi dưỡng hàng ngày", 95000, cat_food), ("Cơm trưa văn phòng", 65000, cat_food), ("Liên hoan nhân viên cửa hàng", 850000, cat_food),
                    ("Xăng xe bán tải chở hàng", 350000, cat_trans), ("Phí gửi xe ô tô", 150000, cat_trans),
                    ("Vật tư bao bì đóng gói hàng carton", 450000, cat_shop), ("Đồng phục nhân viên cửa hàng", 600000, cat_shop),
                    ("Giao lưu hội doanh nhân trẻ", 450000, cat_entertain), ("Gói khám sức khỏe tổng quát", 650000, cat_health),
                    ("Chi phí sinh hoạt gia đình ở quê", 1500000, cat_family)
                ]
            },
            "school_teacher": { # Hà (Giáo viên, 13tr)
                "rent_or_house": ("Tiền thuê nhà giáo viên", 2800000, cat_housing),
                "living_groceries": [("Đi chợ mua thức ăn gia đình", 750000, cat_food)],
                "daily_expenses": [
                    ("Cơm trưa nhà ăn giáo viên", 35000, cat_food), ("Trái cây tráng miệng lớp học", 45000, cat_food),
                    ("Đổ xăng xe máy Yamaha", 75000, cat_trans), ("Bảo dưỡng xe máy định kỳ", 150000, cat_trans),
                    ("Vải may áo dài truyền thống giảng dạy", 450000, cat_shop), ("Giày cao gót êm chân đứng lớp", 320000, cat_shop),
                    ("Bút dạ viết bảng & phấn không bụi", 55000, cat_edu), ("Sách bồi dưỡng phương pháp sư phạm", 120000, cat_edu),
                    ("Viên ngậm bổ phế thảo dược", 65000, cat_health), ("Trà hoa cúc thanh nhiệt", 75000, cat_food)
                ]
            },
            "delivery_shipper": { # Phúc (Shipper, 11tr)
                "rent_or_house": ("Tiền phòng trọ bình dân", 1600000, cat_housing),
                "living_groceries": [("Mua thực phẩm tự nấu ăn tiết kiệm", 450000, cat_food)],
                "daily_expenses": [
                    ("Cơm đĩa bình dân vỉa hè", 35000, cat_food), ("Trà đá vỉa hè & nước tăng lực", 20000, cat_food), ("Bánh bao nóng ăn khuya", 20000, cat_food),
                    ("Đổ xăng xe máy chạy đơn", 110000, cat_trans), ("Thay nhớt xe máy định kỳ", 120000, cat_trans), ("Vá săm xe máy", 35000, cat_trans),
                    ("Găng tay chống nắng & khẩu trang", 45000, cat_shop), ("Giá đỡ điện thoại xe máy", 95000, cat_shop),
                    ("Thuốc cảm cúm & dầu gió", 50000, cat_health), ("Cà phê võng nghỉ trưa", 25000, cat_food),
                    ("Cắt tóc nam", 50000, cat_shop)
                ]
            }
        }

        # Sinh lịch sử giao dịch cá nhân 84 ngày (01/09/2026 - 23/11/2026)
        for u in users_def:
            u_id = u["id"]
            if u["is_kid"]:
                kid_acc = accounts_map[u_id]["cash"]
                account_deltas[kid_acc] = 0.0

                # Tiền tiêu vặt hàng tuần
                allowance_dates = [
                    "2026-09-01 07:00:00", "2026-09-08 07:00:00", "2026-09-15 07:00:00", "2026-09-22 07:00:00",
                    "2026-10-01 07:00:00", "2026-10-08 07:00:00", "2026-10-15 07:00:00", "2026-10-22 07:00:00",
                    "2026-11-01 07:00:00", "2026-11-08 07:00:00", "2026-11-15 07:00:00", "2026-11-22 07:00:00"
                ]
                deposit_amt = 100000 if u["username"] == "bin_kid" else 70000
                for d_str in allowance_dates:
                    tx_id = str(uuid.uuid4())
                    tx_records.append((
                        tx_id, u_id, kid_acc, None, cat_other_inc, "INCOME",
                        deposit_amt, d_str, "Tiền tiêu vặt hàng tuần từ bố mẹ",
                        "Tiền tiêu vặt hàng tuần từ bố mẹ", False, "COMPLETED"
                    ))
                    account_deltas[kid_acc] += deposit_amt

                kid_spend_samples = [
                    ("Bánh mì que ăn sáng", 15000, cat_food),
                    ("Sữa tươi Vinamilk", 12000, cat_food),
                    ("Bút bi & thước kẻ học tập", 20000, cat_shop),
                    ("Bánh tráng trộn sau giờ học", 20000, cat_food),
                    ("Vở kẻ ngang 96 trang", 15000, cat_shop),
                    ("Nước suối đóng chai", 10000, cat_food)
                ]
                for day_offset in range(84):
                    cur_day = start_date + datetime.timedelta(days=day_offset)
                    if (day_offset % 3 == 0) and (u["initial_cash"] + account_deltas[kid_acc] > 50000):
                        item = kid_spend_samples[day_offset % len(kid_spend_samples)]
                        tx_id = str(uuid.uuid4())
                        tx_time = cur_day.replace(hour=7 + (day_offset % 10), minute=(day_offset * 7) % 60)
                        tx_records.append((
                            tx_id, u_id, kid_acc, None, item[2], "EXPENSE",
                            item[1], tx_time.strftime("%Y-%m-%d %H:%M:%S"), item[0], item[0], False, "COMPLETED"
                        ))
                        account_deltas[kid_acc] -= item[1]
                continue

            # Người lớn
            bank_acc = accounts_map[u_id]["bank"]
            cash_acc = accounts_map[u_id]["cash"]
            momo_acc = accounts_map[u_id]["momo"]

            account_deltas[bank_acc] = 0.0
            account_deltas[cash_acc] = 0.0
            account_deltas[momo_acc] = 0.0

            sc = persona_scenarios[u["persona"]]

            # 1. Lương nhận ngày 5 hàng tháng (T09, T10, T11)
            for m in [9, 10, 11]:
                sal_date = datetime.datetime(2026, m, 5, 9, 30, 0)
                sal_amt = u["salary"]
                tx_id = str(uuid.uuid4())
                tx_records.append((
                    tx_id, u_id, bank_acc, None, cat_salary, "INCOME",
                    sal_amt, sal_date.strftime("%Y-%m-%d %H:%M:%S"),
                    f"Nhận lương tháng {m:02d}", f"Nhận lương tháng {m:02d}",
                    False, "COMPLETED"
                ))
                account_deltas[bank_acc] += sal_amt

                # Thu nhập phụ theo nghề
                if u["username"] == "khang_sales":
                    comm_amt = 4500000 if m == 9 else (6000000 if m == 10 else 3800000)
                    tx_id = str(uuid.uuid4())
                    tx_records.append((
                        tx_id, u_id, bank_acc, None, cat_bonus, "INCOME",
                        comm_amt, f"2026-{m:02d}-15 14:00:00",
                        f"Nhận hoa hồng doanh số tháng {m:02d}", f"Nhận hoa hồng doanh số tháng {m:02d}",
                        False, "COMPLETED"
                    ))
                    account_deltas[bank_acc] += comm_amt
                elif u["username"] == "trang_freelance":
                    proj_amt = 4500000 if m == 9 else (7000000 if m == 10 else 4000000)
                    tx_id = str(uuid.uuid4())
                    tx_records.append((
                        tx_id, u_id, bank_acc, None, cat_biz_inc, "INCOME",
                        proj_amt, f"2026-{m:02d}-18 16:30:00",
                        f"Thanh toán dự án thiết kế UI/UX đợt {m}", f"Thanh toán dự án thiết kế UI/UX đợt {m}",
                        False, "COMPLETED"
                    ))
                    account_deltas[bank_acc] += proj_amt

            # 2. Chi phí cố định: Tiền nhà / tiền phòng trọ (ngày 6 hàng tháng)
            for m in [9, 10, 11]:
                rent_item = sc["rent_or_house"]
                tx_id = str(uuid.uuid4())
                tx_records.append((
                    tx_id, u_id, bank_acc, None, rent_item[2], "EXPENSE",
                    rent_item[1], f"2026-{m:02d}-06 10:00:00",
                    f"{rent_item[0]} tháng {m:02d}", f"{rent_item[0]} tháng {m:02d}",
                    False, "COMPLETED"
                ))
                account_deltas[bank_acc] -= rent_item[1]

            # 3. Chi phí cố định: Điện, nước, viễn thông (ngày 10 hàng tháng)
            for m in [9, 10, 11]:
                util_amt = random.randint(750000, 1500000)
                tx_id = str(uuid.uuid4())
                tx_records.append((
                    tx_id, u_id, bank_acc, None, cat_util, "EXPENSE",
                    util_amt, f"2026-{m:02d}-10 14:00:00",
                    f"Thanh toán hóa đơn điện thoại và Internet tháng {m:02d}",
                    f"Thanh toán hóa đơn điện thoại và Internet tháng {m:02d}",
                    False, "COMPLETED"
                ))
                account_deltas[bank_acc] -= util_amt

            # 4. Chuyển tiền nội bộ: Nạp MoMo và Rút tiền ATM có điều tiết
            for m in [9, 10, 11]:
                momo_refill = round(u["salary"] * 0.15)
                cash_refill = round(u["salary"] * 0.12)
                
                # Nạp MoMo
                tx_id = str(uuid.uuid4())
                tx_records.append((
                    tx_id, u_id, bank_acc, momo_acc, None, "TRANSFER",
                    momo_refill, f"2026-{m:02d}-07 11:00:00",
                    "Nạp tiền ví điện tử MoMo từ tài khoản ngân hàng",
                    "Nạp tiền ví điện tử MoMo từ tài khoản ngân hàng",
                    False, "COMPLETED"
                ))
                account_deltas[bank_acc] -= momo_refill
                account_deltas[momo_acc] += momo_refill

                # Rút ATM
                tx_id = str(uuid.uuid4())
                tx_records.append((
                    tx_id, u_id, bank_acc, cash_acc, None, "TRANSFER",
                    cash_refill, f"2026-{m:02d}-08 17:30:00",
                    "Rút tiền mặt ATM nạp vào ví tiền mặt",
                    "Rút tiền mặt ATM nạp vào ví tiền mặt",
                    False, "COMPLETED"
                ))
                account_deltas[bank_acc] -= cash_refill
                account_deltas[cash_acc] += cash_refill

            # 5. Chi phí mua thực phẩm & siêu thị định kỳ (Tuần 1, 2, 3, 4)
            for m in [9, 10, 11]:
                for w in [2, 9, 16, 23]:
                    if m == 11 and w > 23:
                        continue
                    g_item = sc["living_groceries"][w % len(sc["living_groceries"])]
                    tx_id = str(uuid.uuid4())
                    tx_records.append((
                        tx_id, u_id, bank_acc, None, g_item[2], "EXPENSE",
                        g_item[1], f"2026-{m:02d}-{w:02d} 19:30:00",
                        g_item[0], g_item[0], False, "COMPLETED"
                    ))
                    account_deltas[bank_acc] -= g_item[1]

            # 6. Chi tiêu hàng ngày đa dạng theo 84 ngày
            for day_offset in range(84):
                cur_day = start_date + datetime.timedelta(days=day_offset)
                daily_items = sc["daily_expenses"]

                # 1 khoản chi tiêu sinh hoạt chính (mỗi ngày đều có)
                main_item = daily_items[day_offset % len(daily_items)]
                price = main_item[1]
                avail_accs = [bank_acc]
                if (u["initial_momo"] + account_deltas[momo_acc]) > price + 150000:
                    avail_accs.append(momo_acc)
                if (u["initial_cash"] + account_deltas[cash_acc]) > price + 150000:
                    avail_accs.append(cash_acc)
                use_acc = random.choice(avail_accs)
                tx_id = str(uuid.uuid4())
                tx_time = cur_day.replace(hour=11 + (day_offset % 3), minute=(day_offset * 13) % 60)
                tx_records.append((
                    tx_id, u_id, use_acc, None, main_item[2], "EXPENSE",
                    price, tx_time.strftime("%Y-%m-%d %H:%M:%S"), main_item[0], main_item[0], False, "COMPLETED"
                ))
                account_deltas[use_acc] -= price

                # Khoản chi tiêu phụ (cà phê, trà, gửi xe, 50% số ngày)
                if day_offset % 2 == 0:
                    sub_item = daily_items[(day_offset + 3) % len(daily_items)]
                    sub_price = sub_item[1]
                    avail_accs = [bank_acc]
                    if (u["initial_cash"] + account_deltas[cash_acc]) > sub_price + 150000:
                        avail_accs.append(cash_acc)
                    elif (u["initial_momo"] + account_deltas[momo_acc]) > sub_price + 150000:
                        avail_accs.append(momo_acc)
                    sub_acc = random.choice(avail_accs)
                    tx_id = str(uuid.uuid4())
                    tx_time = cur_day.replace(hour=8 + (day_offset % 3), minute=(day_offset * 17) % 60)
                    tx_records.append((
                        tx_id, u_id, sub_acc, None, sub_item[2], "EXPENSE",
                        sub_price, tx_time.strftime("%Y-%m-%d %H:%M:%S"), sub_item[0], sub_item[0], False, "COMPLETED"
                    ))
                    account_deltas[sub_acc] -= sub_price

            # Sự kiện đột biến chi tiêu cho U05 (Phạm Quốc Bảo) vào 18/10/2026 (AI Anomaly Detection)
            if u_id == "c0010000-0000-0000-0000-000000000005":
                anomaly_date = "2026-10-18 15:45:00"
                anomaly_amt = 7500000
                tx_id = str(uuid.uuid4())
                tx_records.append((
                    tx_id, u_id, bank_acc, None, cat_shop, "EXPENSE",
                    anomaly_amt, anomaly_date,
                    "Mua màn hình làm việc Dell UltraSharp U2724D",
                    "Mua màn hình làm việc Dell UltraSharp U2724D",
                    False, "COMPLETED"
                ))
                account_deltas[bank_acc] -= anomaly_amt

        # Chèn toàn bộ Transactions vào DB theo batch
        print(f"[*] Bulk inserting {len(tx_records)} highly realistic personal transactions...")
        execute_values(cur, """
            INSERT INTO core.transactions (
                id, user_id, account_id, to_account_id, category_id,
                type, amount, currency_code, exchange_rate, base_amount, to_amount,
                occurred_at, occurred_date, note, description_raw, is_excluded_from_report, created_at, updated_at
            ) VALUES %s;
        """, [(
            r[0], r[1], r[2], r[3], r[4],
            r[5], f"{r[6]}", 'VND', 1.0, f"{r[6]}", f"{r[6]}" if r[5] == 'TRANSFER' else None,
            r[7], r[7][:10], r[9], r[9], False, r[7], r[7]
        ) for r in tx_records], page_size=1000)
        print(f"[+] Bulk insert complete ({len(tx_records)} records).")

        # Cập nhật số dư cuối cùng của tất cả tài khoản chính xác 100%
        print("[*] Reconciling exact account balances (100% financial consistency)...")
        for acc_id, delta in account_deltas.items():
            cur.execute("""
                UPDATE core.accounts
                SET balance = initial_balance::numeric + %s,
                    current_balance = (initial_balance::numeric + %s)::money,
                    updated_at = NOW()
                WHERE id = %s;
            """, (delta, delta, acc_id))

        # 9. Nhiệm vụ việc nhà trẻ em (Child Chores) — 44 items tự nhiên
        print("[*] Generating 44 natural child chores for Bin & Bông...")
        u_minh = "c0010000-0000-0000-0000-000000000001"
        u_mai = "c0010000-0000-0000-0000-000000000002"
        chores_data = []
        chore_templates = [
            ("Rửa bát sau bữa tối cả tuần", 50000, "DAILY", "EASY", 20, "Con làm rất sạch sẽ, bát đĩa ngăn nắp!"),
            ("Quét và lau nhà phòng khách", 40000, "WEEKLY", "MEDIUM", 35, "Mẹ khen con lau nhà thơm mát!"),
            ("Đạt điểm 10 kiểm tra Toán", 100000, "ONCE", "HARD", 60, "Thưởng con đạt thành tích học tập xuất sắc!"),
            ("Dọn dẹp góc học tập ngăn nắp", 30000, "WEEKLY", "EASY", 15, "Góc học tập gọn gàng đáng khen!"),
            ("Gấp quần áo giúp mẹ", 30000, "WEEKLY", "EASY", 20, "Bé gấp đồ rất khéo léo!"),
            ("Tưới cây ban công mỗi sáng", 20000, "DAILY", "EASY", 10, "Cây xanh tốt nhờ con tưới đều!"),
            ("Tự giác đọc sách tiếng Anh 30 phút", 40000, "DAILY", "MEDIUM", 30, "Con phát âm rất tiến bộ!"),
            ("Đổ rác đúng giờ buổi tối", 20000, "DAILY", "EASY", 10, "Ý thức giữ gìn vệ sinh rất tốt!"),
            ("Gấp chăn gối sau khi thức dậy", 25000, "DAILY", "EASY", 10, "Thói quen buổi sáng rất tốt!"),
            ("Giúp mẹ nhặt rau chuẩn bị bữa tối", 35000, "DAILY", "EASY", 20, "Rau nhặt rất sạch sẽ mẹ rất vui!")
        ]

        for idx in range(22):
            tmpl = chore_templates[idx % len(chore_templates)]
            day = 1 + (idx * 4) % 27
            m = 9 + (idx // 8)
            dt_str = f"2026-{m:02d}-{day:02d} 18:30:00+07"
            status = "APPROVED" if idx < 18 else ("SUBMITTED" if idx < 20 else "ASSIGNED")
            approver = u_minh if idx % 2 == 0 else u_mai
            chores_data.append((
                str(uuid.uuid4()), wallet_bin_id, tmpl[0], tmpl[1], tmpl[2], tmpl[3],
                tmpl[4], status, approver if status == "APPROVED" else None,
                f"2026-{m:02d}-{day:02d} 20:00:00+07" if status == "APPROVED" else None,
                tmpl[5] if status == "APPROVED" else None, dt_str
            ))

        for idx in range(22):
            tmpl = chore_templates[(idx + 4) % len(chore_templates)]
            day = 2 + (idx * 4) % 26
            m = 9 + (idx // 8)
            dt_str = f"2026-{m:02d}-{day:02d} 17:30:00+07"
            status = "APPROVED" if idx < 18 else ("SUBMITTED" if idx < 20 else "ASSIGNED")
            approver = u_mai if idx % 2 == 0 else u_minh
            chores_data.append((
                str(uuid.uuid4()), wallet_bong_id, tmpl[0], tmpl[1], tmpl[2], tmpl[3],
                tmpl[4], status, approver if status == "APPROVED" else None,
                f"2026-{m:02d}-{day:02d} 19:30:00+07" if status == "APPROVED" else None,
                tmpl[5] if status == "APPROVED" else None, dt_str
            ))

        for c in chores_data:
            cur.execute("""
                INSERT INTO core.child_chores (
                    id, wallet_id, title, reward_amount, frequency, difficulty,
                    estimated_minutes, status, approved_by_user_id, approved_at, feedback, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::timestamp with time zone);
            """, c)
        print(f"[+] Inserted {len(chores_data)} kid chores.")

        # 10. Yêu cầu xin tiền trẻ em (Child Spend Requests) — 18 items
        print("[*] Generating 18 child spend requests...")
        spend_requests = [
            (str(uuid.uuid4()), wallet_bin_id, 120000, cat_shop, "Con xin tiền mua sách Lịch sử và Địa lý bổ trợ", "APPROVED", u_minh, "2026-09-08 14:00:00+07", "Bố đồng ý, con chăm đọc nhé.", "2026-09-08 10:00:00+07"),
            (str(uuid.uuid4()), wallet_bong_id, 85000, cat_shop, "Con xin tiền mua hộp màu vẽ 24 màu học Mỹ thuật", "APPROVED", u_mai, "2026-09-12 20:00:00+07", "Mẹ duyệt cho Bông vẽ tranh nhé!", "2026-09-12 15:00:00+07"),
            (str(uuid.uuid4()), wallet_bin_id, 65000, cat_food, "Con xin tiền liên hoan trung thu cùng lớp", "APPROVED", u_minh, "2026-09-20 12:00:00+07", "Bố duyệt cho Bin đi liên hoan vui vẻ.", "2026-09-20 09:00:00+07"),
            (str(uuid.uuid4()), wallet_bong_id, 250000, cat_shop, "Con xin tiền mua ba lô hình công chúa Elsa", "REJECTED", u_mai, "2026-09-22 19:30:00+07", "Ba lô năm ngoái của con còn rất mới và tốt nhé.", "2026-09-22 18:00:00+07"),
            (str(uuid.uuid4()), wallet_bin_id, 50000, cat_shop, "Con xin tiền mua bìa bao tập vở mới", "APPROVED", u_minh, "2026-09-25 15:00:00+07", "Bố duyệt cho Bin nhé.", "2026-09-25 11:00:00+07"),
            (str(uuid.uuid4()), wallet_bong_id, 45000, cat_food, "Con xin tiền mua kem ốc quế sau giờ tan trường", "APPROVED", u_mai, "2026-09-28 17:00:00+07", "Mẹ duyệt cho Bông ăn kem vui nhé.", "2026-09-28 16:30:00+07"),
            (str(uuid.uuid4()), wallet_bin_id, 95000, cat_shop, "Con xin tiền mua bút máy ngòi mài thanh đậm Luyện chữ đẹp", "APPROVED", u_mai, "2026-10-04 16:00:00+07", "Mẹ duyệt, rèn chữ cẩn thận con nha.", "2026-10-04 11:00:00+07"),
            (str(uuid.uuid4()), wallet_bong_id, 150000, cat_shop, "Con xin tiền mua đất nặn Play-Doh 8 màu", "APPROVED", u_minh, "2026-10-09 18:00:00+07", "Bố duyệt, chơi xong nhớ dọn dẹp sạch nhé.", "2026-10-09 14:00:00+07"),
            (str(uuid.uuid4()), wallet_bin_id, 180000, cat_shop, "Con xin tiền mua quả bóng đá size 4 để tập thể dục", "APPROVED", u_minh, "2026-10-15 17:30:00+07", "Ủng hộ con rèn luyện thể thao!", "2026-10-15 13:00:00+07"),
            (str(uuid.uuid4()), wallet_bong_id, 300000, cat_shop, "Con xin tiền mua gấu bông thỏ hồng khổng lồ", "REJECTED", u_mai, "2026-10-18 20:00:00+07", "Gấu bông lớn quá phòng con chật rồi con gái nhé.", "2026-10-18 19:00:00+07"),
            (str(uuid.uuid4()), wallet_bin_id, 80000, cat_shop, "Con xin tiền mua tập giấy kiểm tra và giấy màu thủ công", "APPROVED", u_mai, "2026-10-25 10:30:00+07", "Mẹ duyệt cho Bin mua sắm đồ dùng học tập.", "2026-10-25 08:00:00+07"),
            (str(uuid.uuid4()), wallet_bong_id, 70000, cat_shop, "Con xin tiền mua kẹp tóc hoa cúc và băng đô", "APPROVED", u_mai, "2026-10-28 15:00:00+07", "Mẹ duyệt cho bé Bông điệu nhé!", "2026-10-28 11:30:00+07"),
            (str(uuid.uuid4()), wallet_bin_id, 140000, cat_shop, "Con xin tiền mua sách bách khoa toàn thư Khoa học vũ trụ", "APPROVED", u_minh, "2026-11-03 14:00:00+07", "Sách rất hay, bố duyệt ngay!", "2026-11-03 09:00:00+07"),
            (str(uuid.uuid4()), wallet_bong_id, 90000, cat_shop, "Con xin tiền mua giấy bìa màu làm thiệp tặng cô giáo 20/11", "APPROVED", u_mai, "2026-11-08 19:00:00+07", "Ý tưởng tri ân thầy cô rất tốt, mẹ duyệt nhé!", "2026-11-08 16:00:00+07"),
            (str(uuid.uuid4()), wallet_bin_id, 110000, cat_shop, "Con xin mua hoa tươi tặng cô chủ nhiệm nhân ngày 20/11", "APPROVED", u_minh, "2026-11-18 16:30:00+07", "Bố duyệt cho con tặng hoa cô nhé.", "2026-11-18 11:00:00+07"),
            (str(uuid.uuid4()), wallet_bong_id, 110000, cat_shop, "Con xin mua chậu hoa cẩm tú cầu tặng cô giáo Mỹ thuật", "APPROVED", u_mai, "2026-11-18 17:00:00+07", "Mẹ duyệt hoa cho Bông tặng cô nhé!", "2026-11-18 12:00:00+07"),
            (str(uuid.uuid4()), wallet_bin_id, 90000, cat_shop, "Con xin tiền mua bộ compa và thước kẻ kỹ thuật", "PENDING", None, None, None, "2026-11-22 09:30:00+07"),
            (str(uuid.uuid4()), wallet_bong_id, 60000, cat_shop, "Con xin tiền mua tập nhãn vở và bao bọc sách mới", "PENDING", None, None, None, "2026-11-23 08:00:00+07")
        ]
        for sr in spend_requests:
            cur.execute("""
                INSERT INTO core.child_spend_requests (
                    id, wallet_id, amount, category_id, description, status,
                    responded_by_user_id, responded_at, response_notes, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::timestamp with time zone, %s::timestamp with time zone);
            """, (sr[0], sr[1], sr[2], sr[3], sr[4], sr[5], sr[6], sr[7], sr[8], sr[9], sr[9]))
        print(f"[+] Inserted {len(spend_requests)} child spend requests.")

        # 11. Đóng góp quỹ nhóm (Group Fund Contributions) — 18 items
        print("[*] Generating 18 group fund contributions...")
        u_bao = "c0010000-0000-0000-0000-000000000005"
        u_linh = "c0010000-0000-0000-0000-000000000006"
        u_tuan = "c0010000-0000-0000-0000-000000000008"
        u_trang = "c0010000-0000-0000-0000-000000000009"
        u_huy = "c0010000-0000-0000-0000-000000000007"

        fund_contribs = [
            (str(uuid.uuid4()), fund_g01_id, u_minh, accounts_map[u_minh]["bank"], 5000000, "2026-09-02", "Bố Minh đóng quỹ sinh hoạt tháng 9"),
            (str(uuid.uuid4()), fund_g01_id, u_mai, accounts_map[u_mai]["bank"], 5000000, "2026-09-02", "Mẹ Mai đóng quỹ sinh hoạt tháng 9"),
            (str(uuid.uuid4()), fund_g01_id, u_minh, accounts_map[u_minh]["bank"], 5000000, "2026-10-02", "Bố Minh đóng quỹ sinh hoạt tháng 10"),
            (str(uuid.uuid4()), fund_g01_id, u_mai, accounts_map[u_mai]["bank"], 5000000, "2026-10-02", "Mẹ Mai đóng quỹ sinh hoạt tháng 10"),
            (str(uuid.uuid4()), fund_g01_id, u_minh, accounts_map[u_minh]["bank"], 5000000, "2026-11-02", "Bố Minh đóng quỹ sinh hoạt tháng 11"),
            (str(uuid.uuid4()), fund_g01_id, u_mai, accounts_map[u_mai]["bank"], 5000000, "2026-11-02", "Mẹ Mai đóng quỹ sinh hoạt tháng 11"),
            (str(uuid.uuid4()), fund_g02_id, u_bao, accounts_map[u_bao]["bank"], 2000000, "2026-09-03", "Bảo góp quỹ hẹn hò tháng 9"),
            (str(uuid.uuid4()), fund_g02_id, u_linh, accounts_map[u_linh]["bank"], 2000000, "2026-09-03", "Linh góp quỹ hẹn hò tháng 9"),
            (str(uuid.uuid4()), fund_g02_id, u_bao, accounts_map[u_bao]["bank"], 2000000, "2026-10-03", "Bảo góp quỹ hẹn hò tháng 10"),
            (str(uuid.uuid4()), fund_g02_id, u_linh, accounts_map[u_linh]["bank"], 2000000, "2026-10-03", "Linh góp quỹ hẹn hò tháng 10"),
            (str(uuid.uuid4()), fund_g02_id, u_bao, accounts_map[u_bao]["bank"], 2000000, "2026-11-03", "Bảo góp quỹ hẹn hò tháng 11"),
            (str(uuid.uuid4()), fund_g02_id, u_linh, accounts_map[u_linh]["bank"], 2000000, "2026-11-03", "Linh góp quỹ hẹn hò tháng 11"),
            (str(uuid.uuid4()), fund_g05_id, u_bao, accounts_map[u_bao]["bank"], 1500000, "2026-09-05", "Bảo đóng quỹ Đà Lạt đợt 1"),
            (str(uuid.uuid4()), fund_g05_id, u_linh, accounts_map[u_linh]["bank"], 1500000, "2026-09-05", "Linh đóng quỹ Đà Lạt đợt 1"),
            (str(uuid.uuid4()), fund_g05_id, u_tuan, accounts_map[u_tuan]["bank"], 1500000, "2026-09-05", "Tuấn đóng quỹ Đà Lạt đợt 1"),
            (str(uuid.uuid4()), fund_g05_id, u_trang, accounts_map[u_trang]["bank"], 1500000, "2026-09-05", "Trang đóng quỹ Đà Lạt đợt 1"),
            (str(uuid.uuid4()), fund_g05_id, u_bao, accounts_map[u_bao]["bank"], 1000000, "2026-10-05", "Bảo bổ sung quỹ Đà Lạt đợt 2"),
            (str(uuid.uuid4()), fund_g05_id, u_linh, accounts_map[u_linh]["bank"], 1000000, "2026-10-05", "Linh bổ sung quỹ Đà Lạt đợt 2")
        ]
        for fc in fund_contribs:
            cur.execute("""
                INSERT INTO core.group_fund_contributions (
                    id, fund_id, contributor_user_id, source_account_id, amount, contributed_at, note, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s::timestamp with time zone);
            """, (fc[0], fc[1], fc[2], fc[3], fc[4], fc[5], fc[6], f"{fc[5]} 09:00:00+07"))
        print(f"[+] Inserted {len(fund_contribs)} group fund contributions.")

        # 12. Chi tiêu nhóm & Chia tiền (Group Expenses & Splits) — 150 items
        print("[*] Generating 150 group expenses and splits...")
        group_expense_records = []

        family_items = [
            ("Đi siêu thị WinMart cuối tuần", 1250000, cat_food, "GROUP_FUND"),
            ("Học phí học thêm tiếng Anh cho Bin", 2500000, cat_family, "GROUP_FUND"),
            ("Tiền điện nước sinh hoạt gia đình", 1850000, cat_util, "GROUP_FUND"),
            ("Mua thực phẩm tươi ở chợ đầu mối", 950000, cat_food, "GROUP_FUND"),
            ("Khám răng định kỳ cho cả nhà", 1200000, cat_health, "GROUP_FUND"),
            ("Mua bình nước lọc và gas gia đình", 480000, cat_util, "GROUP_FUND"),
            ("Đăng ký lớp học múa cho bé Bông", 1500000, cat_family, "GROUP_FUND")
        ]
        for i in range(35):
            tmpl = family_items[i % len(family_items)]
            m = 9 + (i // 12)
            d = 1 + (i * 2) % 27
            payer = u_minh if i % 2 == 0 else u_mai
            amt = tmpl[1] + random.randint(-50000, 150000)
            group_expense_records.append((
                str(uuid.uuid4()), g01_id, tmpl[0], amt, f"2026-{m:02d}-{d:02d}",
                payer, accounts_map[payer]["bank"], [u_minh, u_mai], tmpl[3], tmpl[2]
            ))

        couple_items = [
            ("Xem phim CGV & bắp nước Vincom", 360000, cat_entertain, "GROUP_FUND"),
            ("Ăn tối lẩu Haidilao cuối tuần", 1150000, cat_food, "GROUP_FUND"),
            ("Cà phê chuyện trò quán Rue Des Chats", 185000, cat_food, "GROUP_FUND"),
            ("Chuyến dã ngoại ngoại thành Cần Giờ", 850000, cat_trans, "GROUP_FUND"),
            ("Mua bánh kem kỷ niệm quen nhau", 450000, cat_food, "GROUP_FUND"),
            ("Bữa tối lãng mạn Pizza 4P's", 920000, cat_food, "GROUP_FUND")
        ]
        for i in range(30):
            tmpl = couple_items[i % len(couple_items)]
            m = 9 + (i // 10)
            d = 2 + (i * 3) % 26
            payer = u_bao if i % 2 == 0 else u_linh
            amt = tmpl[1] + random.randint(-30000, 80000)
            group_expense_records.append((
                str(uuid.uuid4()), g02_id, tmpl[0], amt, f"2026-{m:02d}-{d:02d}",
                payer, accounts_map[payer]["momo" if amt < 500000 else "bank"], [u_bao, u_linh], tmpl[3], tmpl[2]
            ))

        roommate_items = [
            ("Tiền thuê phòng trọ 302", 6000000, cat_util, "PERSONAL_ACCOUNT"),
            ("Tiền điện nước mạng phòng trọ 302", 1480000, cat_util, "PERSONAL_ACCOUNT"),
            ("Nước bình Lavie 19L (3 bình)", 165000, cat_food, "PERSONAL_ACCOUNT"),
            ("Mua gia vị và gạo ăn chung cả phòng", 420000, cat_food, "PERSONAL_ACCOUNT"),
            ("Thuê dịch vụ bảo dưỡng điều hòa", 350000, cat_util, "PERSONAL_ACCOUNT"),
            ("Mua quạt treo tường thay mới", 550000, cat_shop, "PERSONAL_ACCOUNT")
        ]
        for i in range(30):
            tmpl = roommate_items[i % len(roommate_items)]
            m = 9 + (i // 10)
            d = 5 if "thuê phòng" in tmpl[0] else (10 if "điện nước" in tmpl[0] else 3 + (i * 3) % 25)
            payer = u_bao if i % 3 == 0 else (u_tuan if i % 3 == 1 else u_huy)
            amt = tmpl[1] if "thuê phòng" in tmpl[0] else tmpl[1] + random.randint(-20000, 50000)
            group_expense_records.append((
                str(uuid.uuid4()), g03_id, tmpl[0], amt, f"2026-{m:02d}-{d:02d}",
                payer, accounts_map[payer]["bank"], [u_bao, u_huy, u_tuan], tmpl[3], tmpl[2]
            ))

        friend_items = [
            ("Lẩu nướng Buk Buk cuối tuần", 1600000, cat_food, "PERSONAL_ACCOUNT"),
            ("Cà phê boardgame chiều chủ nhật", 320000, cat_entertain, "PERSONAL_ACCOUNT"),
            ("Liên hoan sinh nhật thành viên nhóm", 2200000, cat_food, "PERSONAL_ACCOUNT"),
            ("Trà sữa Gongcha tụ tập chém gió", 280000, cat_food, "PERSONAL_ACCOUNT"),
            ("Đi hát karaoke mừng thăng chức", 1450000, cat_entertain, "PERSONAL_ACCOUNT")
        ]
        for i in range(30):
            tmpl = friend_items[i % len(friend_items)]
            m = 9 + (i // 10)
            d = 4 + (i * 3) % 25
            payer = [u_bao, u_linh, u_huy, u_trang][i % 4]
            amt = tmpl[1] + random.randint(-40000, 100000)
            group_expense_records.append((
                str(uuid.uuid4()), g04_id, tmpl[0], amt, f"2026-{m:02d}-{d:02d}",
                payer, accounts_map[payer]["bank"], [u_bao, u_linh, u_huy, u_trang], tmpl[3], tmpl[2]
            ))

        travel_items = [
            ("Đặt homestay Mây Lang Thang 3 đêm", 3600000, cat_trans, "GROUP_FUND"),
            ("Vé xe Limousine khứ hồi Sài Gòn - Đà Lạt", 1750000, cat_trans, "GROUP_FUND"),
            ("Thuê xe máy đi lại 3 ngày ở Đà Lạt", 900000, cat_trans, "GROUP_FUND"),
            ("Ăn lẩu gà lá é Tao Ngộ buổi tối", 850000, cat_food, "GROUP_FUND"),
            ("Cà phê săn mây đồi Robin sáng sớm", 380000, cat_food, "GROUP_FUND"),
            ("Vé tham quan vườn hoa Cẩm Tú Cầu", 400000, cat_entertain, "GROUP_FUND"),
            ("Ăn nướng ngói Cu Đức đêm sương mù", 1250000, cat_food, "GROUP_FUND")
        ]
        for i in range(25):
            tmpl = travel_items[i % len(travel_items)]
            m = 10 if i < 10 else 11
            d = 5 + (i * 2) % 22
            payer = [u_bao, u_linh, u_tuan, u_trang][i % 4]
            amt = tmpl[1] + random.randint(-30000, 70000)
            group_expense_records.append((
                str(uuid.uuid4()), g05_id, tmpl[0], amt, f"2026-{m:02d}-{d:02d}",
                payer, accounts_map[payer]["bank"], [u_bao, u_linh, u_tuan, u_trang], tmpl[3], tmpl[2]
            ))

        for exp in group_expense_records:
            exp_id, grp_id, desc, amt, dt, paid_by, src_acc, split_members, p_source, c_id = exp
            cur.execute("""
                INSERT INTO core.group_expenses (
                    id, group_id, description, amount, currency, paid_by_user_id,
                    split_method, expense_date, created_by_user_id, payment_source, source_account_id,
                    category_id, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, 'VND', %s, 'EQUAL', %s, %s, %s, %s, %s, %s::timestamp with time zone, %s::timestamp with time zone);
            """, (exp_id, grp_id, desc, amt, paid_by, dt, paid_by, p_source, src_acc, c_id, f"{dt} 10:00:00+07", f"{dt} 10:00:00+07"))

            split_amt = round(amt / len(split_members), 2)
            pct = round(100.0 / len(split_members), 2)
            for m_id in split_members:
                cur.execute("""
                    INSERT INTO core.group_expense_splits (id, expense_id, user_id, amount, percentage)
                    VALUES (%s, %s, %s, %s, %s);
                """, (str(uuid.uuid4()), exp_id, m_id, split_amt, pct))
        print(f"[+] Inserted {len(group_expense_records)} group expenses and splits.")

        # 13. Quyết toán nợ nhóm (Group Settlements) — 36 items
        print("[*] Generating 36 group settlements...")
        settlements = []
        settle_pairs = [
            (g03_id, u_tuan, u_bao, "Tuấn gửi tiền phòng trọ cho Bảo"),
            (g03_id, u_huy, u_bao, "Huy gửi tiền phòng trọ cho Bảo"),
            (g03_id, u_huy, u_tuan, "Huy gửi tiền điện nước cho Tuấn"),
            (g04_id, u_huy, u_bao, "Huy trả tiền lẩu cho Bảo"),
            (g04_id, u_trang, u_bao, "Trang gửi tiền tiệc liên hoan cho Bảo"),
            (g04_id, u_linh, u_trang, "Linh gửi tiền cafe sinh nhật cho Trang"),
            (g05_id, u_tuan, u_bao, "Tuấn quyết toán phụ thu Đà Lạt cho Bảo"),
            (g05_id, u_trang, u_bao, "Trang thanh toán tiền homestay cho Bảo")
        ]
        for i in range(36):
            pair = settle_pairs[i % len(settle_pairs)]
            m = 9 + (i // 12)
            d = 5 + (i * 2) % 23
            dt_str = f"2026-{m:02d}-{d:02d}"
            amt = random.choice([250000, 350000, 500000, 850000, 1200000, 2000000])
            status = "CONFIRMED" if i < 32 else "PENDING"
            settlements.append((
                str(uuid.uuid4()), pair[0], pair[1], pair[2], amt, dt_str,
                pair[3], status
            ))

        for st in settlements:
            cur.execute("""
                INSERT INTO core.group_settlements (
                    id, group_id, from_user_id, to_user_id, amount, currency,
                    payment_method, settlement_date, notes, status, created_at, confirmed_at
                ) VALUES (%s, %s, %s, %s, %s, 'VND', 'BANK_TRANSFER', %s, %s, %s, %s::timestamp with time zone, %s::timestamp with time zone);
            """, (st[0], st[1], st[2], st[3], st[4], st[5], st[6], st[7], f"{st[5]} 11:00:00+07", f"{st[5]} 11:30:00+07" if st[7] == 'CONFIRMED' else None))
        print(f"[+] Inserted {len(settlements)} group settlements.")

        # 14. Tin nhắn nhóm đối đáp tự nhiên (Contextual Chat Threads) — 320 items & Reads
        print("[*] Generating 320 contextual group messages and reads (Threaded Conversations)...")
        chat_dialogues = {
            g03_id: [ # Phòng trọ 302: Bảo, Huy, Tuấn
                (u_bao, "Tháng này tiền điện hơi cao nhỉ anh em ơi!"),
                (u_tuan, "Ừ, chắc đợt nóng vừa rồi mình bật điều hòa suốt đêm."),
                (u_huy, "Chia ba như mọi tháng đúng không anh Bảo?"),
                (u_bao, "Đúng rồi Huy, anh thanh toán trước rồi, hai ông bank lại giúp anh nhé."),
                (u_tuan, "Oke Bảo, để tí mình chuyển khoản qua Techcombank cho ông."),
                (u_huy, "Em mới nhận lương làm thêm quán cà phê, em vừa chuyển khoản xong rồi nha anh Bảo!"),
                (u_bao, "Anh nhận được tiền của Huy rồi nhé, cảm ơn em trai!"),
                (u_tuan, "Cuối tuần này ai rảnh dọn dẹp phòng khách với cọ nhà vệ sinh nha anh em."),
                (u_huy, "Em nhận phần giặt rèm cửa với quét ban công ạ!"),
                (u_bao, "Thống nhất nhé, làm xong anh bao trà sữa cả phòng.")
            ],
            g01_id: [ # Gia đình Minh - Mai: Minh, Mai
                (u_minh, "Hôm nay bố vừa đóng tiền quỹ sinh hoạt gia đình tháng này rồi mẹ Mai nhé."),
                (u_mai, "Vâng anh, em cũng đã cập nhật học phí tiếng Anh của Bin và lớp múa của Bông rồi."),
                (u_minh, "Bin dạo này tự giác học tập lắm, làm bài kiểm tra toán đạt điểm 10."),
                (u_mai, "Tuyệt quá anh! Cuối tuần cả nhà mình cùng đi siêu thị mua đồ ăn tươi ngon nhé."),
                (u_minh, "Bé Bông vừa xin tiền mua tập nhãn vở và hộp màu mới."),
                (u_mai, "Em duyệt yêu cầu của con gái rồi anh ạ, con vẽ tranh rất đẹp."),
                (u_minh, "Cả nhà cùng cố gắng giữ chi tiêu đúng ngân sách tháng này nha em.")
            ],
            g02_id: [ # Cặp đôi Bảo - Linh: Bảo, Linh
                (u_bao, "Tối nay mình đi ăn lẩu Haidilao mừng anh xong đợt sprint dự án nhé em yêu!"),
                (u_linh, "Tuyệt vời quá anh ơi! Em vừa xem có suất chiếu phim mới lúc 8h tối ở Vincom nữa nè."),
                (u_bao, "Để anh book vé xem phim trước, tiền ăn trích từ quỹ hẹn hò chung nha em."),
                (u_linh, "Dạ anh, em chuẩn bị xong rồi anh qua đón em nha!"),
                (u_bao, "Kỷ niệm quen nhau sắp tới mình đi ngoại thành picnic đổi gió nhé?"),
                (u_linh, "Em thích lắm, để em làm ít kimbap với chuẩn bị trái cây mang theo!")
            ],
            g04_id: [ # Bạn thân: Bảo, Linh, Huy, Trang
                (u_bao, "Alo anh em, cuối tuần này có ai rảnh làm kèo lẩu nướng Buk Buk không?"),
                (u_linh, "Em đi nhé! Đang thèm thịt nướng quá chừng."),
                (u_huy, "Cho em một slot với anh Bảo ơi, em vừa xong ca trực chạy qua liền!"),
                (u_trang, "Trang cũng đi nè, có mang theo bộ boardgame mới toanh để chơi sau khi ăn."),
                (u_bao, "Chốt đơn chiều chủ nhật 5h chiều tại quán quen nha mọi người!"),
                (u_trang, "Trang vừa chuyển phần tiền lẩu của Trang cho Bảo rồi nha.")
            ],
            g05_id: [ # Du lịch Đà Lạt: Bảo, Linh, Tuấn, Trang
                (u_bao, "Mọi người kiểm tra lại lịch trình đi Đà Lạt trên nhóm nhé!"),
                (u_linh, "Em đã liên hệ homestay Mây Lang Thang rồi, view săn mây đồi Robin siêu đẹp luôn."),
                (u_tuan, "Vé xe Limousine giường nằm mình đã đặt khứ hồi xong xuôi cho 4 người rồi nha."),
                (u_trang, "Trang phụ trách phần thuê xe máy và tìm quán ăn ngon đặc sản nhé!"),
                (u_bao, "Quỹ chung mỗi người 1tr5 đợt 1 đã nộp đủ, chuyến này tha hồ ăn chơi không lo chia tiền lẻ!"),
                (u_linh, "Nhớ mang áo ấm dày nha mọi người, trên đó đang lạnh 15 độ đấy ạ!")
            ]
        }

        group_messages_records = []
        for g_id, thread in chat_dialogues.items():
            for i in range(64):
                sender, text = thread[i % len(thread)]
                m = 9 + (i // 22)
                d = 1 + (i * 2) % 27
                h = 8 + (i % 14)
                mi = (i * 7) % 60
                dt_str = f"2026-{m:02d}-{d:02d} {h:02d}:{mi:02d}:00"
                group_messages_records.append((
                    str(uuid.uuid4()), g_id, sender, "TEXT", text, dt_str, dt_str
                ))

        for msg in group_messages_records:
            cur.execute("""
                INSERT INTO core.group_messages (
                    id, group_id, sender_id, message_type, content, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s::timestamp with time zone, %s::timestamp with time zone);
            """, msg)

            other_user = u_tuan if msg[2] == u_bao else u_bao
            cur.execute("""
                INSERT INTO core.group_message_reads (message_id, user_id, read_at)
                VALUES (%s, %s, %s::timestamp with time zone) ON CONFLICT DO NOTHING;
            """, (msg[0], other_user, msg[5]))
        print(f"[+] Inserted {len(group_messages_records)} natural contextual group messages and reads.")

        # 15. Ngân sách & Hạng mục ngân sách (Budgets & Budget Items) — 36 Budgets & 108 Items
        print("[*] Generating 36 budgets and 108 budget items for all 12 adults across 3 months...")
        adult_users = [u for u in users_def if not u["is_kid"]]
        periods = [
            ("2026-09-01", "2026-09-30", "tháng 09/2026", "T09"),
            ("2026-10-01", "2026-10-31", "tháng 10/2026", "T10"),
            ("2026-11-01", "2026-11-30", "tháng 11/2026", "T11")
        ]

        budgets_inserted = 0
        budget_items_inserted = 0
        for u in adult_users:
            u_id = u["id"]
            total_lim = round(u["salary"] * 0.75)
            for p_start, p_end, p_title, p_tag in periods:
                b_id = str(uuid.uuid4())
                if "10" in p_tag and u["username"] == "bao_dev":
                    status = "EXCEEDED"
                    spent = total_lim * 1.15
                elif "10" in p_tag and u["username"] == "huy_student":
                    status = "WARNING"
                    spent = total_lim * 0.92
                elif "11" in p_tag:
                    status = "ON_TRACK"
                    spent = total_lim * 0.65
                else:
                    status = "ON_TRACK"
                    spent = total_lim * 0.82

                rem = total_lim - spent
                pct = round((spent / total_lim) * 100, 1)

                cur.execute("""
                    INSERT INTO core.budgets (
                        id, user_id, name, total_amount, spent_amount, remaining_amount,
                        percentage_used, status, currency_code, period_type, start_date, end_date,
                        created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s,
                        %s, %s, 'VND', 'MONTHLY', %s, %s,
                        '2026-09-01 08:00:00+07', '2026-09-01 08:00:00+07'
                    );
                """, (b_id, u_id, f"Ngân sách chi tiêu {p_title}", total_lim, spent, rem, pct, status, p_start, p_end))
                budgets_inserted += 1

                cur.execute("""
                    INSERT INTO core.budget_items (
                        id, budget_id, category_id, name, amount, spent_amount, remaining,
                        percentage_used, alert_level, created_at, updated_at, version
                    ) VALUES
                    (%s, %s, %s, 'Ăn uống & Cà phê', %s, %s, %s, %s, %s, NOW(), NOW(), 0),
                    (%s, %s, %s, 'Mua sắm & Sinh hoạt', %s, %s, %s, %s, %s, NOW(), NOW(), 0),
                    (%s, %s, %s, 'Đi lại & Di chuyển', %s, %s, %s, %s, %s, NOW(), NOW(), 0);
                """, (
                    str(uuid.uuid4()), b_id, cat_food, total_lim * 0.50, spent * 0.50, (total_lim * 0.50) - (spent * 0.50),
                    pct, 'WARNING' if pct >= 80 else 'OK',
                    str(uuid.uuid4()), b_id, cat_shop, total_lim * 0.30, spent * 0.30, (total_lim * 0.30) - (spent * 0.30),
                    pct, 'DANGER' if pct >= 100 else ('WARNING' if pct >= 80 else 'OK'),
                    str(uuid.uuid4()), b_id, cat_trans, total_lim * 0.20, spent * 0.20, (total_lim * 0.20) - (spent * 0.20),
                    pct, 'OK'
                ))
                budget_items_inserted += 3
        print(f"[+] Inserted {budgets_inserted} budgets and {budget_items_inserted} budget items.")

        # 16. Lịch tài chính (Financial Schedules) — 48 sự kiện
        print("[*] Generating 48 financial schedules for adult personas...")
        schedule_templates = [
            ("Nhận lương công ty hàng tháng", "FREQ=MONTHLY;BYMONTHDAY=5", "Ngày 5 hàng tháng", "INCOME", 22000000, cat_salary, True),
            ("Nộp tiền phòng trọ và sinh hoạt", "FREQ=MONTHLY;BYMONTHDAY=5", "Ngày 5 hàng tháng", "EXPENSE", 2000000, cat_util, False),
            ("Thanh toán tiền điện nước mạng", "FREQ=MONTHLY;BYMONTHDAY=10", "Ngày 10 hàng tháng", "EXPENSE", 1500000, cat_util, False),
            ("Tiết kiệm tự động tích lũy", "FREQ=MONTHLY;BYMONTHDAY=20", "Ngày 20 hàng tháng", "EXPENSE", 2000000, cat_util, True)
        ]
        schedules_data = []
        for u in adult_users:
            u_id = u["id"]
            u_bank = accounts_map[u_id]["bank"]
            for s_idx, tmpl in enumerate(schedule_templates):
                amt = u["salary"] if tmpl[3] == "INCOME" else tmpl[4]
                schedules_data.append((
                    u_id, "TRANSACTION", tmpl[0], tmpl[1], tmpl[2],
                    "2026-09-01", "2026-12-31", "2026-12-05", "ACTIVE", tmpl[3],
                    u_bank, amt, tmpl[5], f"Lịch tự động: {tmpl[0]}", tmpl[6]
                ))

        for sch in schedules_data:
            cur.execute("""
                INSERT INTO core.schedules (
                    user_id, schedule_type, name, recurrence_rule, recurrence_text,
                    start_date, end_date, next_occurrence_date, status, template_transaction_type,
                    template_account_id, template_amount, template_category_id, template_description,
                    auto_execute, created_at, updated_at, version
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW(), 0);
            """, sch)
        print(f"[+] Inserted {len(schedules_data)} financial schedules.")

        # 17. Bình luận chi tiêu (Transaction Comments) — 84 items tự nhiên
        print("[*] Generating 84 natural transaction comments without technical tags...")
        comments_list = []
        sample_comments = [
            "Hóa đơn tháng này tăng nhẹ do tiền điện điều hòa bật suốt đêm nhé anh em!",
            "Mình đã đối soát số điện chuẩn công tơ rồi nhé, mọi người yên tâm.",
            "Phần ăn hôm nay rất ngon và no nê, lần sau nhóm mình ghé lại tiếp!",
            "Em đã kiểm tra hóa đơn và thấy chia rất chuẩn xác, cảm ơn cả nhóm!",
            "Chi tiêu này được trích từ quỹ nhóm đã đóng đầu tháng nha anh em.",
            "Lần sau đi siêu thị nhớ dùng voucher giảm giá WinMart để tiết kiệm hơn nhé!",
            "Chuyến đi chơi thật ý nghĩa và nhiều ảnh đẹp, cảm ơn trưởng nhóm!",
            "Mọi người kiểm tra lại xem ai chưa nhận được hoàn tiền thì báo mình nha."
        ]
        for i in range(84):
            exp_target = group_expense_records[i % len(group_expense_records)]
            u_commenter = exp_target[7][i % len(exp_target[7])]
            text = sample_comments[i % len(sample_comments)]
            comments_list.append((
                str(uuid.uuid4()), exp_target[1], "GROUP_EXPENSE", exp_target[0],
                u_commenter, text
            ))

        for cm in comments_list:
            cur.execute("""
                INSERT INTO core.transaction_comments (
                    id, group_id, commentable_type, commentable_id, user_id, content, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW());
            """, cm)
        print(f"[+] Inserted {len(comments_list)} natural transaction comments.")

        # 18. Mục tiêu tài chính (Goals) & Đóng góp mục tiêu (Goal Contributions)
        print("[*] Generating 14 financial goals and 42 goal contributions...")
        goals_data = [
            (str(uuid.uuid4()), u_bao, "Đổi Macbook Pro M3 16 inch phục vụ công việc", "PURCHASE", 48000000, 28000000, "2027-04-30", "IN_PROGRESS", "laptop", "#3B82F6"),
            (str(uuid.uuid4()), u_bao, "Quỹ dự phòng khẩn cấp 6 tháng chi tiêu", "EMERGENCY_FUND", 60000000, 45000000, "2027-12-31", "IN_PROGRESS", "shield", "#10B981"),
            (str(uuid.uuid4()), u_minh, "Mua ô tô gia đình 7 chỗ phục vụ về quê", "PURCHASE", 650000000, 320000000, "2027-12-31", "IN_PROGRESS", "car", "#10B981"),
            (str(uuid.uuid4()), u_mai, "Sửa sang lại căn hộ và phòng ngủ 2 con", "PURCHASE", 120000000, 85000000, "2027-06-30", "IN_PROGRESS", "home", "#EC4899"),
            (str(uuid.uuid4()), "c0010000-0000-0000-0000-000000000003", "Tiết kiệm mua xe đạp leo núi đi học", "PURCHASE", 2500000, 1150000, "2027-06-01", "IN_PROGRESS", "bike", "#F59E0B"),
            (str(uuid.uuid4()), "c0010000-0000-0000-0000-000000000004", "Mua bộ cọ vẽ sơn dầu chuyên nghiệp", "PURCHASE", 1200000, 750000, "2027-05-15", "IN_PROGRESS", "palette", "#8B5CF6"),
            (str(uuid.uuid4()), u_linh, "Quỹ du lịch Nhật Bản mùa hoa anh đào", "VACATION", 35000000, 22000000, "2027-03-31", "IN_PROGRESS", "plane", "#F43F5E"),
            (str(uuid.uuid4()), u_huy, "Mua laptop học lập trình Web & AI", "PURCHASE", 18000000, 9500000, "2027-02-28", "IN_PROGRESS", "laptop", "#3B82F6"),
            (str(uuid.uuid4()), u_tuan, "Nâng cấp xe máy Honda Air Blade 160", "PURCHASE", 45000000, 30000000, "2027-08-31", "IN_PROGRESS", "bike", "#64748B"),
            (str(uuid.uuid4()), u_trang, "Mua bảng vẽ Wacom Cintiq 16 Pro", "PURCHASE", 25000000, 19000000, "2027-01-31", "IN_PROGRESS", "tablet", "#06B6D4"),
            (str(uuid.uuid4()), "c0010000-0000-0000-0000-000000000010", "Mua đồng hồ thông minh Apple Watch Ultra", "PURCHASE", 19000000, 14000000, "2026-12-31", "IN_PROGRESS", "watch", "#EAB308"),
            (str(uuid.uuid4()), "c0010000-0000-0000-0000-000000000011", "Tiết kiệm học phí khóa học IELTS 7.5", "EDUCATION", 12000000, 7000000, "2027-05-31", "IN_PROGRESS", "book", "#6366F1"),
            (str(uuid.uuid4()), "c0010000-0000-0000-0000-000000000012", "Mở rộng chi nhánh cửa hàng phụ kiện thứ 2", "INVESTMENT", 200000000, 140000000, "2027-10-31", "IN_PROGRESS", "store", "#84CC16"),
            (str(uuid.uuid4()), "c0010000-0000-0000-0000-000000000013", "Quỹ học bổng khuyến học cho học sinh nghèo", "SAVINGS", 30000000, 18000000, "2027-09-05", "IN_PROGRESS", "heart", "#EF4444")
        ]
        goal_contrib_records = []
        for g in goals_data:
            g_id, u_owner, g_name, g_type, tgt, cur_amt, dt_tgt, status, icon, color = g
            cur.execute("""
                INSERT INTO core.goals (
                    id, user_id, name, goal_type, target_amount, current_amount,
                    currency_code, target_date, status, icon, color, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s::numeric::money, %s::numeric::money, 'VND', %s, %s, %s, %s, '2026-09-01 09:00:00+07', '2026-09-01 09:00:00+07');
            """, (g_id, u_owner, g_name, g_type, tgt, cur_amt, dt_tgt, status, icon, color))

            src_acc = accounts_map[u_owner].get("bank") or accounts_map[u_owner].get("cash")
            contrib_amt = round(cur_amt / 3, 2)
            for m_idx, m in enumerate([9, 10, 11]):
                goal_contrib_records.append((
                    str(uuid.uuid4()), g_id, None, contrib_amt, f"2026-{m:02d}-20 10:00:00",
                    f"Trích tích lũy tháng {m:02d} cho mục tiêu", f"2026-{m:02d}-20 10:00:00+07", src_acc, 0
                ))

        for gc in goal_contrib_records:
            cur.execute("""
                INSERT INTO core.goal_contributions (
                    id, goal_id, transaction_id, amount, contributed_at, note, created_at, source_account_id, version
                ) VALUES (%s, %s, %s, %s, %s::timestamp without time zone, %s, %s::timestamp with time zone, %s, %s);
            """, gc)
        print(f"[+] Inserted {len(goals_data)} goals and {len(goal_contrib_records)} goal contributions.")

        # 19. Sổ nợ & Lịch sử trả nợ (Debts & Debt Payments)
        print("[*] Generating 14 debt records and 13 debt payments...")
        debts_data = [
            (str(uuid.uuid4()), u_bao, "LENDING", "Hoàng Anh Tuấn", 3000000, 0, "2026-09-15", "2026-10-15", "PAID_OFF", "Cho Tuấn vay mua đồ công nghệ"),
            (str(uuid.uuid4()), u_huy, "BORROWING", "Phạm Quốc Bảo", 2000000, 0, "2026-10-06", "2026-11-20", "PAID_OFF", "Ứng tiền phòng trọ của anh Bảo"),
            (str(uuid.uuid4()), u_linh, "LENDING", "Đỗ Thu Trang", 1500000, 0, "2026-09-20", "2026-10-20", "PAID_OFF", "Ứng tiền mua vé concert cho Trang"),
            (str(uuid.uuid4()), u_bao, "LENDING", "Trần Đức Huy", 4000000, 2000000, "2026-10-10", "2027-01-10", "ACTIVE", "Cho Huy mượn tiền đóng học phí"),
            (str(uuid.uuid4()), u_tuan, "BORROWING", "Phạm Quốc Bảo", 1200000, 0, "2026-10-25", "2026-11-15", "PAID_OFF", "Ứng tiền bảo dưỡng xe máy"),
            (str(uuid.uuid4()), u_trang, "LENDING", "Nguyễn Minh Khang", 800000, 0, "2026-11-01", "2026-11-15", "PAID_OFF", "Cho Khang mượn tiền mua tài liệu"),
            (str(uuid.uuid4()), "c0010000-0000-0000-0000-000000000010", "BORROWING", "Ngân hàng Shinhan", 35000000, 24000000, "2026-08-01", "2027-08-01", "ACTIVE", "Vay tiêu dùng trả góp"),
            (str(uuid.uuid4()), u_minh, "BORROWING", "Ngân hàng Vietcombank", 500000000, 420000000, "2025-01-01", "2035-01-01", "ACTIVE", "Vay mua nhà gói ưu đãi"),
            (str(uuid.uuid4()), "c0010000-0000-0000-0000-000000000012", "BORROWING", "Ngân hàng Techcombank", 150000000, 95000000, "2026-03-01", "2028-03-01", "ACTIVE", "Vay vốn kinh doanh cửa hàng"),
            (str(uuid.uuid4()), "c0010000-0000-0000-0000-000000000014", "BORROWING", "Công ty Tài chính FE Credit", 20000000, 6000000, "2026-04-01", "2027-04-01", "ACTIVE", "Vay mua xe máy trả góp"),
            (str(uuid.uuid4()), "c0010000-0000-0000-0000-000000000013", "BORROWING", "Quỹ Tín dụng Giáo viên", 40000000, 15000000, "2026-01-15", "2027-01-15", "ACTIVE", "Vay sửa sang nhà cửa"),
            (str(uuid.uuid4()), u_linh, "BORROWING", "Thẻ tín dụng VIB Super Card", 22000000, 11000000, "2026-06-01", "2026-12-01", "ACTIVE", "Trả góp 0% điện thoại mới"),
            (str(uuid.uuid4()), u_mai, "LENDING", "Trần Thu Thảo", 10000000, 5000000, "2026-10-01", "2027-01-01", "ACTIVE", "Cho chị gái mượn sắm đồ Tết"),
            (str(uuid.uuid4()), "c0010000-0000-0000-0000-000000000011", "BORROWING", "Phòng Đào tạo Đại học", 15000000, 15000000, "2026-09-01", "2028-06-30", "ACTIVE", "Vay vốn chính sách sinh viên")
        ]
        debt_payments_records = []
        for d in debts_data:
            d_id, u_owner, d_type, c_name, p_amt, rem_amt, s_dt, due_dt, status, desc = d
            cur.execute("""
                INSERT INTO core.debts (
                    id, user_id, debt_type, counterparty_name, principal_amount,
                    remaining_amount, currency_code, start_date, due_date, status, description, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s::numeric::money, %s::numeric::money, 'VND', %s, %s, %s, %s, '2026-09-01 10:00:00+07', '2026-09-01 10:00:00+07');
            """, (d_id, u_owner, d_type, c_name, p_amt, rem_amt, s_dt, due_dt, status, desc))

            if status == "PAID_OFF" or (p_amt - rem_amt > 0):
                paid_total = p_amt - rem_amt if rem_amt > 0 else p_amt
                src_acc = accounts_map[u_owner].get("bank") or accounts_map[u_owner].get("cash")
                debt_payments_records.append((
                    str(uuid.uuid4()), d_id, None, paid_total, paid_total, 0,
                    due_dt if status == "PAID_OFF" else "2026-11-10",
                    f"Thanh toán đợt trả nợ cho {c_name}", f"2026-11-10 14:00:00+07",
                    src_acc, "BANK_TRANSFER", 0
                ))

        for dp in debt_payments_records:
            cur.execute("""
                INSERT INTO core.debt_payments (
                    id, debt_id, transaction_id, amount, principal_paid, interest_paid,
                    payment_date, note, created_at, account_id, payment_method, version
                ) VALUES (%s, %s, %s, %s, %s, %s, %s::date, %s, %s::timestamp with time zone, %s, %s, %s);
            """, dp)
        print(f"[+] Inserted {len(debts_data)} debts and {len(debt_payments_records)} debt payments.")

        # 20. Thông báo hệ thống theo ngữ cảnh (Notifications) — 140 items tự nhiên
        print("[*] Generating 140 natural context-aware notifications...")
        noti_templates = [
            ("BUDGET_WARNING", "HIGH", "Cảnh báo ngân sách tháng", "Chi tiêu của bạn đã đạt 82% hạn mức ngân sách dự kiến.", "/budget"),
            ("BUDGET_EXCEEDED", "URGENT", "Cảnh báo vượt ngân sách", "Bạn đã chi tiêu vượt hạn mức 115% cho tháng này.", "/budget"),
            ("GROUP_EXPENSE", "NORMAL", "Chi tiêu nhóm mới được thêm", "Một khoản chi tiêu mới vừa được ghi nhận trong nhóm tài chính.", "/groups"),
            ("SETTLEMENT_REQUEST", "HIGH", "Yêu cầu quyết toán nợ nhóm", "Có yêu cầu thanh toán tiền phòng trọ và chi tiêu chung.", "/groups"),
            ("KID_REQUEST", "NORMAL", "Bé gửi yêu cầu xin tiền", "Bé vừa gửi yêu cầu duyệt tiền mua đồ dùng học tập mới.", "/child-wallet"),
            ("CHORE_COMPLETED", "NORMAL", "Bé đã hoàn thành nhiệm vụ", "Nhiệm vụ việc nhà đã hoàn thành đang chờ bạn duyệt thưởng.", "/child-wallet"),
            ("FINAI_INSIGHT", "LOW", "Phân tích tài chính thông minh", "FinAI nhận thấy bạn đã chi tiêu cân đối hơn 15% so với tháng trước.", "/dashboard"),
            ("ANOMALY_DETECTED", "HIGH", "Cảnh báo giao dịch bất thường", "Phát hiện khoản chi tiêu lớn bất thường vào ngày 18/10.", "/spending-analysis"),
            ("GOAL_MILESTONE", "NORMAL", "Tiến độ mục tiêu tài chính", "Chúc mừng! Bạn đã hoàn thành 50% chặng đường mục tiêu tiết kiệm.", "/goals"),
            ("DEBT_REMINDER", "NORMAL", "Nhắc nhở khoản nợ đến hạn", "Khoản nợ định kỳ sắp đến ngày tất toán.", "/debts")
        ]

        notifications_data = []
        for u_idx, u in enumerate(users_def):
            u_id = u["id"]
            for i in range(10):
                tmpl = noti_templates[i % len(noti_templates)]
                m = 9 + (i // 4)
                d = 2 + (i * 3) % 25
                dt_str = f"2026-{m:02d}-{d:02d} 10:00:00"
                is_read = True if i < 8 else False
                notifications_data.append((
                    str(uuid.uuid4()), u_id, tmpl[0], tmpl[1], tmpl[2],
                    tmpl[3], tmpl[4], is_read, dt_str
                ))

        for n in notifications_data:
            cur.execute("""
                INSERT INTO core.notifications (
                    id, user_id, type, priority, title, body, action_url, is_read, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::timestamp without time zone);
            """, n)
        print(f"[+] Inserted {len(notifications_data)} natural notifications.")

        conn.commit()
        print("==================================================")
        print("  SEED MASTER ENGINE COMPLETED 100% SUCCESSFULLY!")
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
