FROM python:3.10-slim

# Thư viện hệ thống cần cho OpenCV và PaddleOCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cài dependencies trước (tận dụng layer cache Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code và dữ liệu classify
COPY app ./app
COPY classify_data ./classify_data

# Model PaddleOCR sẽ được tải lần đầu khi container start
# và được cache vào volume ocr_models (/root/.paddleocr)
# để tránh tải lại mỗi lần restart container

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
