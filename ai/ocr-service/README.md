# OCR Service — Quét hóa đơn

Service Python + FastAPI nhận ảnh hóa đơn và trả về JSON gồm tên cửa hàng, ngày giờ, tổng tiền.
Chạy độc lập — Spring Boot chỉ cần gọi `POST /ocr/receipt`.

## Cấu trúc

```
ocr-service/
├── app/
│   ├── main.py          # FastAPI — endpoint /ocr/receipt
│   ├── ocr_engine.py    # Bọc PaddleOCR 2.x / 3.x
│   ├── preprocess.py    # Tiền xử lý ảnh (resize, CLAHE, denoise, deskew)
│   ├── layout.py        # Ghép dòng chữ theo thứ tự đọc
│   ├── extractor.py     # Trích xuất tổng tiền, ngày giờ, tên cửa hàng
│   ├── pipeline.py      # Nối toàn bộ các bước
│   └── schemas.py       # Pydantic response model
├── data/
│   ├── images/          # Ảnh hóa đơn (tự thêm, không commit)
│   └── labels.csv       # Nhãn ground truth
├── eval/
│   └── evaluate.py      # Script đánh giá độ chính xác
├── demo/
│   └── streamlit_app.py # Trang demo
├── requirements.txt
└── Dockerfile
```

## Cài đặt

```bash
# Tạo và kích hoạt môi trường ảo
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

pip install -r requirements.txt
```

> **Lưu ý:** Python 3.9–3.11 được khuyến nghị. PaddlePaddle có thể chưa hỗ trợ Python 3.12+.

## Chạy service

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

- Swagger UI: http://localhost:8001/docs
- Health check: http://localhost:8001/health

## Test nhanh

```bash
curl -X POST "http://localhost:8001/ocr/receipt" -F "file=@data/images/001.jpg"
```

## Đánh giá độ chính xác

1. Thêm ảnh vào `data/images/`, cập nhật `data/labels.csv`
2. Chạy:

```bash
python eval/evaluate.py
```

Kết quả ghi ra `eval/summary.csv` và `eval/detail_*.csv`.

## Demo Streamlit

```bash
# Mở terminal thứ hai (service phải đang chạy)
streamlit run demo/streamlit_app.py
```

## Docker

```bash
docker build -t ocr-service .
docker run -p 8001:8001 ocr-service
```

## JSON trả về

```json
{
  "merchant_name": "Highlands Coffee",
  "transaction_date": "2026-09-28",
  "transaction_time": "14:35",
  "total_amount": 125000,
  "currency": "VND",
  "raw_text": "HIGHLANDS COFFEE\n...",
  "confidence": 0.91
}
```

- Trường nào không đọc được sẽ trả `null`, không đoán bừa.
- `confidence` < 0.7 → nên hiển thị cảnh báo "kiểm tra lại" trên FE.

## Tích hợp với Spring Boot

BE gửi `multipart/form-data` với field tên `file` tới `POST http://<ocr-host>:8001/ocr/receipt`, nhận JSON như trên.
FE hiển thị kết quả cho người dùng chỉnh sửa trước khi lưu giao dịch.
