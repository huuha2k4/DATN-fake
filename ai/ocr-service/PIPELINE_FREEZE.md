# Pipeline Freeze Point

**Ngày đóng băng:** 2026-10-14  
**Mục đích:** Đánh giá cuối cùng trên tập test (289 ảnh). Sau mốc này KHÔNG sửa bất kỳ rule, từ điển, ngưỡng nào dựa trên quan sát tập test.

---

## Danh sách file đã đóng băng

| File | Nội dung | Ghi chú |
|---|---|---|
| `app/extractor.py` | Rule trích xuất tổng tiền, ngày, tên cửa hàng | ❄️ Đóng băng |
| `app/pipeline.py` | Pipeline OCR + phân loại kind | ❄️ Đóng băng |
| `app/preprocess.py` | Tiền xử lý ảnh, xoay, CLAHE | ❄️ Đóng băng |
| `app/layout.py` | Ghép dòng theo tọa độ | ❄️ Đóng băng |
| `ml/predictor.py` | ML extractor cho tổng tiền | ❄️ Đóng băng |
| `ml/line_classifier.pkl` | Model GradientBoosting OCR lines | ❄️ Đóng băng |
| `classify_data/brands.csv` | Từ điển thương hiệu | ❄️ Đóng băng |
| `models/category_clf.joblib` | Model LR phân loại danh mục | ❄️ Đóng băng |

---

## Trạng thái leakage mềm (ghi rõ cho báo cáo)

**OCR rule (extractor.py):**  
Một số keyword trong `EXCLUDE_KEYWORDS` (`th.ngan`, `hotline`, `quay`) được thêm sau khi quan sát ảnh thuộc tập test cũ (phân bố 30/70). Sau khi chia lại (60/15/25), các ảnh đó phân tán vào cả 3 split nên leakage mềm không bị tập trung vào test mới. Tuy nhiên không thể loại bỏ hoàn toàn ảnh hưởng.

**Từ điển brands.csv:**  
Alias `big c`, `nha sach`, `velutino` được thêm sau khi quan sát ảnh test cũ. Alias này hợp lý về mặt nghiệp vụ (chuẩn hóa tên thương hiệu phổ biến) nên được giữ lại. Kết quả test không nên diễn giải là hoàn toàn độc lập với quá trình phát triển.

**ML OCR (line_classifier):**  
Train chỉ trên `split='train'` (693 ảnh). GroupKFold theo `img_id` ngăn rò rỉ nhãn giữa fold train/val trong CV. Leakage mềm có thể xảy ra ở việc chọn features dựa trên quan sát lỗi.

**Classify ML (category_clf):**  
Train chỉ trên `transactions_manual.csv` (viết tay thuần túy) và `mcocr_sellers_labeled.csv`. Đã loại bỏ các mẫu lấy trực tiếp từ tên cửa hàng trong ảnh test — lưu riêng ở `from_test_images.csv`.

---

## Cam kết từ đây trở đi

1. Không xem nội dung ảnh test để sửa rule
2. Không thêm alias vào brands.csv dựa trên lỗi quan sát trong test
3. Đánh giá test chạy đúng một lần duy nhất
4. Mọi thay đổi sau này chỉ được phép trên tập train/val
