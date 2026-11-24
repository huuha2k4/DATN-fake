# FINORA DEMO DATA SEEDER — FINANCIAL RECONCILIATION REPORT (PHASE 3)

## 1. NGUYÊN TẮC ĐỐI SOÁT TÀI CHÍNH

Mỗi tài khoản ví cá nhân trong hệ thống Finora tuân thủ công thức toàn vẹn:
$$\text{Balance}_{\text{Cuối kỳ}} = \text{Initial Balance} + \sum \text{Income} + \sum \text{Transfer In} - \sum \text{Expense} - \sum \text{Transfer Out}$$

**Kết quả kiểm tra:**
- **Số tài khoản kiểm tra:** 38 / 38 tài khoản.
- **Số tài khoản lệch số dư:** 0 tài khoản (Sai số $\Delta = 0.0000$ VNĐ).
- **Số tài khoản bị âm tiền:** **0 tài khoản** (100% tài khoản dương tiền từ $103.000$ đ đến $93.443.716$ đ).

## 2. BẢNG ĐỐI SOÁT CHI TIẾT 38 TÀI KHOẢN

| Username | Tên tài khoản | Loại ví | Số dư đầu kỳ | Số dư cuối kỳ | Số dư tính toán từ TX | Độ lệch ($\Delta$) | Trạng thái |
|---|---|---|---|---|---|---|---|
| `ha_teacher` | Ví MoMo | E_WALLET | 1.600.000 đ | 103.000 đ | 103.000 đ | 0.00 đ | **MATCH (PASS)** |
| `vy_student` | Ví tiền mặt | CASH | 600.000 đ | 103.000 đ | 103.000 đ | 0.00 đ | **MATCH (PASS)** |
| `bao_dev` | Ví tiền mặt | CASH | 1.500.000 đ | 104.000 đ | 104.000 đ | 0.00 đ | **MATCH (PASS)** |
| `minh_father` | Ví tiền mặt | CASH | 2.500.000 đ | 112.000 đ | 112.000 đ | 0.00 đ | **MATCH (PASS)** |
| `khang_sales` | Ví tiền mặt | CASH | 2.000.000 đ | 113.000 đ | 113.000 đ | 0.00 đ | **MATCH (PASS)** |
| `mai_mother` | Ví tiền mặt | CASH | 4.000.000 đ | 115.000 đ | 115.000 đ | 0.00 đ | **MATCH (PASS)** |
| `bao_dev` | Ví MoMo | E_WALLET | 2.500.000 đ | 116.000 đ | 116.000 đ | 0.00 đ | **MATCH (PASS)** |
| `nam_merchant` | Ví MoMo | E_WALLET | 5.000.000 đ | 116.000 đ | 116.000 đ | 0.00 đ | **MATCH (PASS)** |
| `huy_student` | Ví tiền mặt | CASH | 800.000 đ | 117.000 đ | 117.000 đ | 0.00 đ | **MATCH (PASS)** |
| `tuan_office` | Ví MoMo | E_WALLET | 1.800.000 đ | 121.000 đ | 121.000 đ | 0.00 đ | **MATCH (PASS)** |
| `khang_sales` | Ví MoMo | E_WALLET | 2.800.000 đ | 123.000 đ | 123.000 đ | 0.00 đ | **MATCH (PASS)** |
| `linh_mkt` | Ví MoMo | E_WALLET | 3.000.000 đ | 125.000 đ | 125.000 đ | 0.00 đ | **MATCH (PASS)** |
| `linh_mkt` | Ví tiền mặt | CASH | 1.200.000 đ | 126.000 đ | 126.000 đ | 0.00 đ | **MATCH (PASS)** |
| `nam_merchant` | Ví tiền mặt | CASH | 6.000.000 đ | 136.000 đ | 136.000 đ | 0.00 đ | **MATCH (PASS)** |
| `trang_freelance`| Ví tiền mặt | CASH | 1.100.000 đ | 141.000 đ | 141.000 đ | 0.00 đ | **MATCH (PASS)** |
| `minh_father` | Ví MoMo | E_WALLET | 3.500.000 đ | 143.000 đ | 143.000 đ | 0.00 đ | **MATCH (PASS)** |
| `tuan_office` | Ví tiền mặt | CASH | 1.000.000 đ | 151.000 đ | 151.000 đ | 0.00 đ | **MATCH (PASS)** |
| `mai_mother` | Ví MoMo | E_WALLET | 2.000.000 đ | 162.000 đ | 162.000 đ | 0.00 đ | **MATCH (PASS)** |
| `trang_freelance`| Ví MoMo | E_WALLET | 2.200.000 đ | 205.000 đ | 205.000 đ | 0.00 đ | **MATCH (PASS)** |
| `huy_student` | Ví MoMo | E_WALLET | 1.200.000 đ | 348.000 đ | 348.000 đ | 0.00 đ | **MATCH (PASS)** |
| `bong_kid` | Heo đất tiền mặt | CASH | 200.000 đ | 680.000 đ | 680.000 đ | 0.00 đ | **MATCH (PASS)** |
| `bin_kid` | Heo đất tiền mặt | CASH | 350.000 đ | 1.025.000 đ | 1.025.000 đ | 0.00 đ | **MATCH (PASS)** |
| `ha_teacher` | Ví tiền mặt | CASH | 2.200.000 đ | 1.120.000 đ | 1.120.000 đ | 0.00 đ | **MATCH (PASS)** |
| `vy_student` | Ví MoMo | E_WALLET | 1.500.000 đ | 1.620.000 đ | 1.620.000 đ | 0.00 đ | **MATCH (PASS)** |
| `phuc_shipper` | Ví tiền mặt | CASH | 1.800.000 đ | 1.687.000 đ | 1.687.000 đ | 0.00 đ | **MATCH (PASS)** |
| `phuc_shipper` | Ví MoMo | E_WALLET | 3.500.000 đ | 5.851.000 đ | 5.851.000 đ | 0.00 đ | **MATCH (PASS)** |
| `vy_student` | VietinBank iPay | BANK | 4.200.000 đ | 9.347.464 đ | 9.347.464 đ | 0.00 đ | **MATCH (PASS)** |
| `huy_student` | TPBank Sinh Viên| BANK | 6.500.000 đ | 14.974.728 đ | 14.974.728 đ | 0.00 đ | **MATCH (PASS)** |
| `phuc_shipper` | Sacombank eKYC | BANK | 12.000.000 đ | 32.762.082 đ | 32.762.082 đ | 0.00 đ | **MATCH (PASS)** |
| `linh_mkt` | MB Bank Modern | BANK | 18.000.000 đ | 32.774.652 đ | 32.774.652 đ | 0.00 đ | **MATCH (PASS)** |
| `ha_teacher` | Agribank Giáo Viên| BANK | 19.000.000 đ | 36.921.942 đ | 36.921.942 đ | 0.00 đ | **MATCH (PASS)** |
| `tuan_office` | BIDV SmartBanking | BANK | 15.000.000 đ | 37.482.590 đ | 37.482.590 đ | 0.00 đ | **MATCH (PASS)** |
| `bao_dev` | Techcombank Digi| BANK | 32.000.000 đ | 57.884.810 đ | 57.884.810 đ | 0.00 đ | **MATCH (PASS)** |
| `trang_freelance`| VPBank Timo | BANK | 21.000.000 đ | 62.677.047 đ | 62.677.047 đ | 0.00 đ | **MATCH (PASS)** |
| `khang_sales` | ACB EBIZ | BANK | 25.000.000 đ | 68.519.030 đ | 68.519.030 đ | 0.00 đ | **MATCH (PASS)** |
| `mai_mother` | Techcombank Private| BANK | 38.000.000 đ | 77.692.413 đ | 77.692.413 đ | 0.00 đ | **MATCH (PASS)** |
| `nam_merchant` | Techcombank Business| BANK | 68.000.000 đ | 91.328.633 đ | 91.328.633 đ | 0.00 đ | **MATCH (PASS)** |
| `minh_father` | Vietcombank Priority| BANK | 45.000.000 đ | 93.443.716 đ | 93.443.716 đ | 0.00 đ | **MATCH (PASS)** |

**KẾT LUẬN ĐỐI SOÁT:** Hoàn toàn chính xác, đạt chuẩn Financial Integrity 100%.
