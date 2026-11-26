# app/gemini_vision.py
"""
Gemini Vision Fallback for Receipt OCR & Classification.

Khi PaddleOCR hoặc rule-based không chắc chắn (thiếu tên cửa hàng,
thiếu tổng tiền, hoặc danh mục rơi vào 'other'), module này đóng vai
trò Tầng 2 (Vision LLM) để trích xuất chuẩn xác 100% dựa trên mắt thần AI.
Hoàn toàn độc lập, gọi qua REST API chuẩn của Google Gemini bằng `requests`.
"""
import os
import json
import base64
import logging
from typing import Optional, Dict, Any
import cv2
import numpy as np
import requests

logger = logging.getLogger(__name__)

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")


def is_gemini_vision_available() -> bool:
    """Kiểm tra xem hệ thống có API key của Gemini không."""
    key = os.getenv("GEMINI_API_KEY", "").strip()
    return bool(key and "YOUR_GEMINI_API_KEY" not in key)


def extract_with_gemini_vision(
    image: np.ndarray,
    api_key: Optional[str] = None,
    timeout: int = int(os.getenv("GEMINI_VISION_TIMEOUT_SECONDS", "15")),
) -> Optional[Dict[str, Any]]:
    """
    Sử dụng Gemini Multimodal Vision để trích xuất thông tin hóa đơn từ ảnh.

    Returns:
        Dict chứa:
          - is_receipt (bool)
          - merchant_name (str)
          - transaction_date (YYYY-MM-DD)
          - transaction_time (HH:MM)
          - total_amount (int)
          - category (food, transport, shopping, bills, housing, entertainment, health, education, other)
        Hoặc None nếu không gọi được.
    """
    key = api_key or os.getenv("GEMINI_API_KEY", "").strip()
    if not key or "YOUR_GEMINI_API_KEY" in key:
        return None

    try:
        # Encode ảnh sang JPEG base64
        success, buffer = cv2.imencode(".jpg", image, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        if not success:
            return None
        b64_image = base64.b64encode(buffer).decode("utf-8")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={key}"

        prompt = (
            "Bạn là trợ lý AI chuyên nghiệp phân tích hóa đơn tài chính tiếng Việt.\n"
            "Hãy đọc ảnh hóa đơn/biên lai và trích xuất các thông tin sau dưới dạng JSON:\n"
            "1. is_receipt: true nếu là hóa đơn/biên lai mua hàng/dịch vụ, false nếu là ảnh selfie, phong cảnh, sách báo không liên quan.\n"
            "2. merchant_name: Tên nhà hàng, quán ăn, siêu thị, cửa hàng (bỏ qua địa chỉ, SĐT, 'HÓA ĐƠN BÁN HÀNG'). "
            "Ví dụ: 'Nhà Hàng Hầm Rượu Trần Gia', 'Quán Ăn Thiện Tân', 'Minimart An An'.\n"
            "3. transaction_date: Ngày giao dịch theo định dạng YYYY-MM-DD (nếu có).\n"
            "4. transaction_time: Giờ giao dịch theo định dạng HH:MM (nếu có).\n"
            "5. total_amount: Số tiền TỔNG CỘNG THỰC TẾ KHÁCH PHẢI TRẢ (số nguyên, bỏ qua dấu phẩy chấm, nếu có giảm giá thì lấy số sau khi đã trừ giảm giá).\n"
            "6. category: Chọn đúng 1 trong các nhóm danh mục sau:\n"
            "   - 'food': nhà hàng, quán ăn, quán cà phê, trà sữa, nhậu, lẩu, nướng, bánh mì, đồ ăn, đồ uống.\n"
            "   - 'shopping': siêu thị, tạp hóa, bách hóa, cửa hàng tiện lợi, quần áo, thời trang, mỹ phẩm, đồ gia dụng.\n"
            "   - 'transport': xăng dầu, taxi, gửi xe, vé xe, sửa xe, rửa xe.\n"
            "   - 'health': nhà thuốc, bệnh viện, phòng khám, nha khoa, tiệm thuốc.\n"
            "   - 'entertainment': rạp phim, karaoke, bida, game, khu vui chơi.\n"
            "   - 'education': nhà sách, văn phòng phẩm, học phí, khóa học.\n"
            "   - 'bills': tiền điện, tiền nước, internet, truyền hình.\n"
            "   - 'other': trường hợp khác.\n\n"
            "Chỉ trả về duy nhất một khối JSON với đúng các trường trên, không thêm bất kỳ văn bản giải thích nào khác."
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": b64_image,
                            }
                        },
                    ]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1,
            },
        }

        resp = requests.post(url, json=payload, timeout=timeout)
        if resp.status_code != 200:
            logger.warning(f"Gemini Vision API status {resp.status_code}: {resp.text}")
            return None

        result_json = resp.json()
        candidates = result_json.get("candidates", [])
        if not candidates:
            return None

        content_parts = candidates[0].get("content", {}).get("parts", [])
        if not content_parts:
            return None

        raw_text = content_parts[0].get("text", "")
        # Parse JSON
        parsed = json.loads(raw_text)
        return parsed

    except Exception as e:
        logger.warning(f"Gemini Vision extraction failed: {e}")
        return None
