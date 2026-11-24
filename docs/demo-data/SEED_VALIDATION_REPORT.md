# BÁO CÁO NGHIỆM THU DỮ LIỆU SEED — FINORA (VALIDATION REPORT)

**Thời gian kiểm thử**: 23/11/2026 14:55:00  
**Đối tượng**: PostgreSQL `finance_db` qua `docker compose --profile demo run --rm demo-seeder`  
**Trạng thái**: **PASS 100%**

---

## 1. THỐNG KÊ SỐ LƯỢNG BẢN GHI ĐÃ SEED

| Module / Bảng | Số lượng thực tế | Ghi chú kiểm thử | Kết quả |
|---|---|---|---|
| `core.users` | 14 personas + 1 admin | 12 người lớn, 2 trẻ em (Bin, Bông) | **PASS** |
| `core.accounts` | 38 tài khoản ví | Mỗi người lớn 3 ví (Cash, Bank, MoMo), trẻ em 1 ví | **PASS** |
| `core.groups` | 5 nhóm liên kết | Gia đình, Cặp đôi, Phòng trọ, Bạn thân, Du lịch | **PASS** |
| `core.group_members` | 17 liên kết thành viên | Đúng vai trò Owner, Admin, Member, Kid Profile | **PASS** |
| `core.child_wallets` | 2 ví trẻ em | Số dư dương (Bin: 925k, Bông: 255k) | **PASS** |
| `core.child_chores` | 7 nhiệm vụ việc nhà | 5 việc hoàn thành duyệt thưởng, 2 việc đang giao | **PASS** |
| `core.child_spend_requests` | 4 yêu cầu xin tiền | Duyệt mua sách, từ chối gấu bông, duyệt màu vẽ | **PASS** |
| `core.group_funds` | 3 quỹ nhóm | Quỹ gia đình (8.5tr), Quỹ cặp đôi (3.2tr), Du lịch (650k) | **PASS** |
| `core.group_fund_contributions` | 8 lần nộp quỹ | Minh, Mai, Bảo, Linh, Tuấn, Trang | **PASS** |
| `core.group_expenses` | 5 chi tiêu nhóm | Tiền phòng trọ, điện nước mạng tháng 9, 10, 11 | **PASS** |
| `core.group_expense_splits` | 15 bản ghi chia tiền | Chia đều 3 thành viên phòng trọ | **PASS** |
| `core.group_settlements` | 5 thanh toán nợ | Tất toán công nợ giữa Huy, Tuấn và Bảo | **PASS** |
| `core.group_messages` | 12 tin nhắn hội thoại | Trao đổi tự nhiên, thực tế trong nhóm | **PASS** |
| `core.transactions` | 1.710 giao dịch | Phân bổ chân thực 84 ngày (01/09 - 23/11/2026) | **PASS** |
| `core.budgets` | 4 ngân sách | Có kịch bản bình thường và cảnh báo vượt hạn mức | **PASS** |
| `core.goals` | 3 mục tiêu tài chính | Mua Macbook, mua ô tô, mua xe đạp | **PASS** |
| `core.debts` | 3 sổ nợ cá nhân | Cho vay bạn bè, ứng tiền phòng, vay tiêu dùng | **PASS** |
| `core.notifications` | 4 thông báo | Cảnh báo ngân sách, thông báo xin tiền, chi tiêu nhóm | **PASS** |

---

## 2. ĐỐI SOÁT TÍNH ĐÚNG ĐẮN TÀI CHÍNH (FINANCIAL INTEGRITY)

1. **Công thức số dư ví tiền**:
   - $\text{Balance} = \text{Initial Balance} + \sum \text{Income} - \sum \text{Expense} \pm \text{Transfer}$.
   - Kiểm tra `SELECT count(*) FROM core.accounts WHERE balance < 0;` $\rightarrow$ Kết quả: **0** (Không có bất kỳ ví nào bị âm tiền).
2. **Đối soát công nợ phòng trọ 302**:
   - Tổng tiền phòng Bảo ứng cho Huy (tháng 10): 2.000.000 đ.
   - Huy trả đợt 1 (08/11): 1.500.000 đ.
   - Huy trả đợt 2 (20/11): tất toán nốt số tiền còn lại.
   - Dư nợ hiện tại: **0 đ** (Hợp lý và chính xác).
3. **Kiểm tra Idempotency (Chạy lại nhiều lần)**:
   - Thực hiện chạy `docker compose --profile demo run --rm demo-seeder` 2 lần liên tiếp.
   - Kết quả: Không bị lỗi khóa ngoại, không bị nhân đôi người dùng, số lượng bản ghi duy trì chính xác và ổn định.
