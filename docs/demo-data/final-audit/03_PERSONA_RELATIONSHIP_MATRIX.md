# BÁO CÁO 03 — MA TRẬN NHÂN VẬT & MỐI QUAN HỆ (PERSONA MATRIX)

Hệ sinh thái Demo bao gồm 14 tài khoản với phân quyền, nghề nghiệp, độ tuổi và mối quan hệ rõ ràng:

| Username | Tên hiển thị | Vai trò / Nghề nghiệp | Thu nhập / Tháng | Mối quan hệ trong hệ sinh thái |
| :--- | :--- | :--- | :--- | :--- |
| `bao_dev` | Trần Gia Bảo | Software Engineer (Lead Persona) | 22.000.000 đ | Người yêu Linh (`linh_mkt`), Bạn cùng phòng Huy (`huy_student`) & Tuấn (`tuan_office`), Bạn thân Khang/Trang/Nam |
| `linh_mkt` | Lê Mỹ Linh | Marketing Executive | 16.000.000 đ | Người yêu Bảo (`bao_dev`), Bạn nhóm Du lịch |
| `minh_father` | Nguyễn Quang Minh | Trưởng phòng Dự án (Bố) | 28.000.000 đ | Chồng Mai (`mai_mother`), Bố của Bin (`bin_kid`) & Bông (`bong_kid`) |
| `mai_mother` | Hoàng Thu Mai | Kế toán trưởng (Mẹ) | 19.000.000 đ | Vợ Minh (`minh_father`), Mẹ của Bin (`bin_kid`) & Bông (`bong_kid`) |
| `bin_kid` | Nguyễn Gia Bin | Học sinh Lớp 5 (Con trai lớn) | Thưởng làm việc nhà | Con của Minh & Mai, Anh trai Bông |
| `bong_kid` | Nguyễn Ngọc Bông | Học sinh Lớp 1 (Con gái út) | Thưởng làm việc nhà | Con của Minh & Mai, Em gái Bin |
| `huy_student` | Đặng Quốc Huy | Sinh viên năm cuối CNTT | 7.000.000 đ (Bán thời gian + Trợ cấp) | Bạn cùng phòng của Bảo & Tuấn |
| `tuan_office` | Vũ Anh Tuấn | Chuyên viên Nhân sự (HR) | 14.000.000 đ | Bạn cùng phòng của Bảo & Huy |
| `khang_sales` | Phạm Thế Khang | Giám đốc Bán hàng BĐS | 22.000.000 đ + Thưởng | Bạn thân Bảo, Thành viên Hội Bạn Thân & Nhóm Du Lịch |
| `trang_freelance`| Đỗ Thùy Trang | UI/UX Designer Tự do | 20.000.000 đ | Bạn thân Bảo, Thành viên Hội Bạn Thân & Nhóm Du Lịch |
| `nam_merchant` | Hoàng Văn Nam | Chủ Cửa hàng Tiện lợi | 30.000.000 đ (Doanh thu) | Bạn thân Bảo, Nhóm Bạn Thân |
| `ha_teacher` | Phan Thu Hà | Giáo viên Cấp 2 | 13.000.000 đ | Bạn bè độc lập |
| `phuc_shipper` | Lê Hồng Phúc | Tài xế Công nghệ / Giao hàng | 11.000.000 đ | Người lao động dịch vụ độc lập |
| `vy_student` | Trịnh Thúy Vy | Sinh viên Ngôn ngữ | 5.000.000 đ | Người học độc lập |

## Tính Toàn Vẹn Quan Hệ:
- Tuyệt đối không có sự nhầm lẫn giữa vợ chồng, người yêu hay bạn cùng phòng.
- Trẻ em (`bin_kid`, `bong_kid`) được bảo trợ chính xác bởi `minh_father` và `mai_mother`.
