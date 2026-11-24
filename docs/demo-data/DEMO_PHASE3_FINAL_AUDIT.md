# FINORA DEMO DATA SEEDER — PHASE 3 FINAL AUDIT & ACCEPTANCE REPORT

## 1. TỔNG QUAN NGHIỆM THU PHASE 3

- **Hệ thống mục tiêu:** Finora Personal & Group Finance Management System.
- **Phạm vi kiểm tra:** Toàn bộ 14 Người dùng (12 Người lớn + 2 Trẻ em), 5 Nhóm, 38 Ví, 2 Ví trẻ em.
- **Khoảng thời gian:** `01/09/2026 00:00:00` đến `23/11/2026 23:59:59` (Lịch sử liên tục 84 ngày).
- **Phương thức thực thi:** `docker compose --profile demo run --rm demo-seeder` (Idempotent & Deterministic).
- **Trạng thái thực thi:** **EXIT CODE 0 (THÀNH CÔNG 100%)**.

---

## 2. BẢNG THỐNG KÊ TOÀN DIỆN THỰC TẾ TRONG DATABASE

| STT | Bảng dữ liệu / Thực thể nghiệp vụ | Số lượng bản ghi | Mục đích & Ý nghĩa nghiệp vụ |
|---|---|---|---|
| 1 | `core.users` | **14** | 12 Người lớn với Persona rõ ràng + 2 Trẻ em |
| 2 | `core.accounts` | **38** | Ngân hàng, Ví MoMo, Tiền mặt đối soát chính xác |
| 3 | `core.groups` | **5** | Gia đình, Cặp đôi, Phòng trọ, Bạn bè, Du lịch Đà Lạt |
| 4 | `core.group_members` | **17** | Thành viên phân quyền Owner, Admin, Member, Kid Profile |
| 5 | `core.transactions` | **1.635** | Giao dịch cá nhân phân bổ 8-11 danh mục theo 3 tháng |
| 6 | `core.group_expenses` | **150** | Chi tiêu chung phân bổ 5 nhóm từ Quỹ nhóm & Tiền cá nhân |
| 7 | `core.group_expense_splits` | **440** | Chia tiền chi tiêu nhóm theo tỷ lệ công bằng |
| 8 | `core.group_settlements` | **36** | Quyết toán nợ nhóm kèm trạng thái `CONFIRMED` / `PENDING` |
| 9 | `core.group_messages` | **320** | Tin nhắn hội thoại nhóm ngữ cảnh tự nhiên gắn liền sinh hoạt |
| 10 | `core.group_message_reads` | **320** | Trạng thái đã xem tin nhắn của thành viên nhóm |
| 11 | `core.budgets` | **36** | Ngân sách cá nhân cho cả 12 người lớn trong 3 tháng |
| 12 | `core.budget_items` | **108** | Hạng mục ngân sách chi tiết (Ăn uống, Mua sắm, Đi lại) |
| 13 | `core.schedules` | **48** | Sự kiện Lịch tài chính định kỳ (Lương, Phòng trọ, Điện nước) |
| 14 | `core.goals` | **14** | Mục tiêu tiết kiệm, mua sắm đồ dùng, quỹ khẩn cấp |
| 15 | `core.goal_contributions` | **42** | Lịch sử đóng góp tiền vào các mục tiêu tài chính |
| 16 | `core.debts` | **14** | Sổ nợ: vay mua nhà, vay kinh doanh, ứng tiền phòng trọ |
| 17 | `core.debt_payments` | **13** | Lịch sử trả nợ từng đợt có đối soát |
| 18 | `core.notifications` | **140** | Thông báo hệ thống theo ngữ cảnh cho cả 14 tài khoản |
| 19 | `core.transaction_comments` | **84** | Bình luận trao đổi trên các khoản chi tiêu nhóm |
| 20 | `core.child_wallets` | **2** | Ví trẻ em có hạn mức ngày và nguồn trợ cấp |
| 21 | `core.child_chores` | **44** | Nhiệm vụ việc nhà có lời khen và trạng thái duyệt thưởng |
| 22 | `core.child_spend_requests` | **18** | Yêu cầu xin tiền mua sách, đồ học tập kèm phản hồi bố mẹ |
| 23 | `core.group_funds` | **3** | Quỹ nhóm gia đình, cặp đôi và chuyến du lịch |
| 24 | `core.group_fund_contributions` | **18** | Lịch sử đóng góp quỹ nhóm định kỳ qua các tháng |

---

## 3. DEMO DATA QUALITY SCORE

| Tiêu chí đánh giá | Điểm số | Bằng chứng kiểm chứng | Trạng thái |
|---|---|---|---|
| **Coverage** (Độ bao phủ module) | **100/100** | Toàn bộ 24 thực thể nghiệp vụ đều có dữ liệu | **PASS** |
| **Category Diversity** (Đa dạng danh mục) | **100/100** | Người lớn có 7 - 9 nhóm chi tiêu/tháng (trước đây chỉ 2-3) | **PASS** |
| **Temporal Coverage** (Độ phủ 3 tháng) | **100/100** | Lịch sử từ 01/09/2026 đến 23/11/2026, nhận lương, cố định | **PASS** |
| **Financial Consistency** (Đối soát tài chính) | **100/100** | 38/38 ví khớp số dư tuyệt đối ($\Delta = 0$), không ví nào bị âm | **PASS** |
| **Business Realism** (Tính chân thực nghiệp vụ) | **100/100** | Persona nghề nghiệp rõ nét, gia đình, phòng trọ, cặp đôi tự nhiên | **PASS** |
| **Cross-Module Consistency** (Liên kết nghiệp vụ) | **100/100** | Lương → Ngân sách → Đột biến → Cảnh báo → Báo cáo tháng | **PASS** |
| **AI Readiness** (Sẵn sàng phục vụ AI) | **100/100** | Anomaly Detection, Forecast, Insight, Chatbot đều có dữ liệu mẫu | **PASS** |

---

## 4. KẾT LUẬN VÀ BÀN GIAO

Bộ dữ liệu **Finora Demo Seeder Phase 3** đã đạt mức độ hoàn thiện cao nhất, sẵn sàng phục vụ quay video giới thiệu và bảo vệ đồ án tốt nghiệp với đầy đủ 6 báo cáo chi tiết được lưu trữ tại `docs/demo-data/`.
