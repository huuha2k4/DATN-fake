FROM python:3.10-slim

# Thư viện hệ thống cần cho OpenCV và PaddleOCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv

# Cài dependencies trước (tận dụng layer cache Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir \
    paddlepaddle==2.6.2 \
    paddleocr==2.9.1 \
    opencv-python==4.10.0.84 \
    numpy==1.26.4 \
    fastapi==0.115.0 \
    "uvicorn[standard]==0.30.6" \
    python-multipart==0.0.12 \
    pydantic==2.9.2 \
    rapidfuzz==3.10.0

# Copy source code
COPY app ./app

# Tải model PaddleOCR vào image (tránh tải lại mỗi lần start container)
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(lang='vi', show_log=False)"

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
