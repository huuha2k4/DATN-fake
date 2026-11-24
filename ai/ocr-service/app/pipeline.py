# app/pipeline.py
import numpy as np

from app.ocr_engine import OCREngine
from app.preprocess import preprocess
from app.layout import group_lines
from app.extractor import (
    extract_total, extract_total_by_position,
    extract_datetime, extract_merchant, strip_accents,
)

# Load ML extractor nếu model đã train
try:
    from ml.predictor import MLExtractor
    _ml_extractor = MLExtractor()
    USE_ML = True
except Exception:
    USE_ML = False

# ---------------------------------------------------------------------------
# Keyword phân loại loại hóa đơn
# ---------------------------------------------------------------------------

# Phiếu tạm tính / giao dịch treo — TỪ CHỐI, không tạo giao dịch
_DRAFT_KEYWORDS = [
    "giao dich treo",
    "phieu tam tinh",
    "tam tinh",
    "pending",
    "phieu thu tam",
    "provisional",
]

# Hóa đơn đã thanh toán — dấu hiệu tích cực
_PAID_KEYWORDS = [
    "da thanh toan", "payment", "paid",
    "tong tien phai", "tong cong", "thanh toan",
    "hoa don ban hang", "hoa don gtgt",
    "hoadon ban hang", "hoadonbanhang", "hoadon banhang",
    "phieu tinh tien", "phieu thanh toan",
    "bill", "receipt",
]

# ---------------------------------------------------------------------------
# Tín hiệu nhận dạng hóa đơn / biên lai
# ---------------------------------------------------------------------------

# Keyword mạnh — chỉ cần 1 là đủ để xác nhận là hóa đơn
_RECEIPT_STRONG_KEYWORDS = [
    # Tiêu đề hóa đơn
    "hoa don", "hoadon", "phieu tinh tien", "phieu thanh toan",
    "phieu ban hang", "phieu thu", "bien lai",
    "invoice", "receipt", "bill",
    # Tổng tiền
    "tong tien", "tong cong", "thanh toan", "tong thanh toan",
    "tong so tien", "so tien phai",
    # Thuế
    "thue gtgt", "vat", "tien thue",
    # Mã số thuế / mã hóa đơn
    "ma so thue", "mst", "so hoa don",
    # Tiện ích
    "tien dien", "tien nuoc", "cuoc phi", "kwh",
    "chi so dien", "chi so nuoc",
]

# Keyword hỗ trợ — cần kết hợp nhiều tín hiệu
_RECEIPT_SUPPORT_KEYWORDS = [
    "nhan vien", "thu ngan", "cashier",
    "khach hang", "customer",
    "don vi tinh", "so luong", "don gia", "thanh tien",
    "chiet khau", "discount",
    "ngay", "gio", "thoi gian",
    "ten hang", "san pham",
    "xin cam on", "cam on quy khach",
]

# Dấu hiệu KHÔNG phải hóa đơn
_NOT_RECEIPT_KEYWORDS = [
    # Văn bản thông thường
    "chương", "chuong", "điều", "dieu", "khoản", "khoan",
    "nghị định", "nghi dinh", "thông tư", "thong tu",
    "quyết định", "quyet dinh",
    # Mạng xã hội / web
    "facebook", "instagram", "twitter", "youtube",
    "http", "www", ".com", ".vn",
    # Thư từ / email
    "kinh gui", "tran trong",
    "than gui",
]

# Dấu hiệu viết tay — OCR thường cho confidence rất thấp + ít text có cấu trúc
_HANDWRITTEN_SIGNALS = [
    "viet tay", "handwritten",
]

# Ngưỡng chất lượng
_MIN_CONFIDENCE_ACCEPT = 0.40   # Dưới mức này → yêu cầu chụp lại
_MIN_TEXT_LENGTH = 20           # Ít hơn 20 ký tự → ảnh quá mờ / không có text
_MIN_ITEMS_FOR_RECEIPT = 3      # Ít hơn 3 block text → không đủ cấu trúc hóa đơn


def _detect_image_type(
    all_text_norm: str,
    raw_text: str,
    confidence: float,
    item_count: int,
) -> str:
    """
    Bước 1: Xác định loại ảnh trước khi trích xuất.

    Returns:
        "receipt"     — ảnh hóa đơn/biên lai hợp lệ → tiếp tục xử lý
        "not_receipt" — ảnh không phải hóa đơn (phong cảnh, selfie, văn bản thường...)
        "low_quality" — ảnh quá mờ, thiếu text, confidence OCR thấp → yêu cầu chụp lại
        "handwritten" — ảnh viết tay, khó trích xuất tự động → cần xem xét thủ công
        "draft"       — phiếu tạm tính → từ chối
    """
    text_len = len(raw_text.replace(" ", "").replace("\n", ""))

    # --- Kiểm tra chất lượng ảnh trước ---
    if confidence < _MIN_CONFIDENCE_ACCEPT and text_len < _MIN_TEXT_LENGTH:
        return "low_quality"

    if item_count < _MIN_ITEMS_FOR_RECEIPT and text_len < _MIN_TEXT_LENGTH:
        return "low_quality"

    # --- Kiểm tra viết tay ---
    if any(kw in all_text_norm for kw in _HANDWRITTEN_SIGNALS):
        return "handwritten"
    # Heuristic viết tay: confidence OCR trung bình thấp + rất ít text có cấu trúc
    if confidence < 0.45 and item_count < 8:
        return "handwritten"

    # --- Kiểm tra dấu hiệu KHÔNG phải hóa đơn ---
    not_receipt_hits = sum(1 for kw in _NOT_RECEIPT_KEYWORDS if kw in all_text_norm)
    if not_receipt_hits >= 2:
        return "not_receipt"

    # --- Kiểm tra keyword mạnh — chỉ cần 1 là đủ ---
    for kw in _RECEIPT_STRONG_KEYWORDS:
        if kw in all_text_norm:
            return "receipt"

    # --- Kiểm tra kết hợp keyword hỗ trợ ---
    support_hits = sum(1 for kw in _RECEIPT_SUPPORT_KEYWORDS if kw in all_text_norm)

    # Có số tiền (dạng X.XXX hoặc XXX,XXX) + ít nhất 2 keyword hỗ trợ → hóa đơn
    import re
    has_money = bool(re.search(r"\d{1,3}[.,]\d{3}", raw_text))
    if has_money and support_hits >= 2:
        return "receipt"

    # Không đủ tín hiệu → không phải hóa đơn
    return "not_receipt"


def _classify_payment_status(all_text_norm: str) -> str:
    """
    Bước 2: Chỉ chạy sau khi _detect_image_type() trả "receipt".
    Xác định trạng thái thanh toán.

    Returns: "draft" | "paid" | "unknown"
    """
    if any(kw in all_text_norm for kw in _DRAFT_KEYWORDS):
        return "draft"
    if any(kw in all_text_norm for kw in _PAID_KEYWORDS):
        return "paid"
    return "unknown"


class ReceiptPipeline:
    """
    Pipeline end-to-end: ảnh → JSON kết quả.

    Luồng xử lý:
      1. Tiền xử lý + xoay ảnh
      2. OCR
      3. [CỔNG 1] Xác định loại ảnh:
         - not_receipt → từ chối ngay
         - low_quality → yêu cầu chụp lại
         - handwritten → cảnh báo, không trích xuất tự động
         - draft       → từ chối (phiếu tạm tính)
         - receipt     → tiếp tục
      4. [CỔNG 2] Xác định trạng thái thanh toán (paid / unknown)
      5. Trích xuất merchant, date, total
    """

    def __init__(self, engine: OCREngine, **prep_options):
        self.engine = engine
        self.prep_options = prep_options if prep_options else {"resize": True}

    def run(self, image: np.ndarray) -> dict:
        # --- Bước 1: Tiền xử lý + xoay ---
        h, w = image.shape[:2]
        if w > h:
            from app.preprocess import rotate_to_portrait
            image = rotate_to_portrait(image, engine=self.engine)

        opts = {k: v for k, v in self.prep_options.items() if k != "portrait"}
        img = preprocess(image, **opts)

        # --- Bước 2: OCR ---
        items = self.engine.read(img)
        lines = group_lines(items)
        confidence = float(np.mean([it["score"] for it in items])) if items else 0.0
        raw_text = "\n".join(lines)
        all_text_norm = " ".join(strip_accents(l) for l in lines)

        # --- Bước 3: CỔNG 1 — Xác định loại ảnh ---
        image_type = _detect_image_type(
            all_text_norm=all_text_norm,
            raw_text=raw_text,
            confidence=confidence,
            item_count=len(items),
        )

        if image_type == "not_receipt":
            return {
                "kind":             "not_receipt",
                "merchant_name":    None,
                "transaction_date": None,
                "transaction_time": None,
                "total_amount":     None,
                "currency":         "VND",
                "raw_text":         raw_text,
                "confidence":       round(confidence, 3),
                "needs_review":     False,
                "reject_reason":    "Ảnh không phải hóa đơn hoặc biên lai.",
            }

        if image_type == "low_quality":
            return {
                "kind":             "low_quality",
                "merchant_name":    None,
                "transaction_date": None,
                "transaction_time": None,
                "total_amount":     None,
                "currency":         "VND",
                "raw_text":         raw_text,
                "confidence":       round(confidence, 3),
                "needs_review":     True,
                "reject_reason":    "Ảnh quá mờ hoặc thiếu thông tin, vui lòng chụp lại.",
            }

        if image_type == "handwritten":
            return {
                "kind":             "handwritten",
                "merchant_name":    None,
                "transaction_date": None,
                "transaction_time": None,
                "total_amount":     None,
                "currency":         "VND",
                "raw_text":         raw_text,
                "confidence":       round(confidence, 3),
                "needs_review":     True,
                "reject_reason":    "Phát hiện chữ viết tay, vui lòng nhập thông tin thủ công.",
            }

        # --- Bước 4: CỔNG 2 — Xác định trạng thái thanh toán ---
        payment_status = _classify_payment_status(all_text_norm)

        if payment_status == "draft":
            return {
                "kind":             "draft",
                "merchant_name":    None,
                "transaction_date": None,
                "transaction_time": None,
                "total_amount":     None,
                "currency":         "VND",
                "raw_text":         raw_text,
                "confidence":       round(confidence, 3),
                "needs_review":     False,
                "reject_reason":    "Phiếu tạm tính chưa thanh toán, vui lòng dùng hóa đơn cuối.",
            }

        # --- Bước 5: Trích xuất ---
        if USE_ML:
            result = _ml_extractor.extract_all(items, lines)
            return {
                "kind":             payment_status,
                "merchant_name":    result["merchant_name"],
                "transaction_date": result["transaction_date"],
                "transaction_time": result["transaction_time"],
                "total_amount":     result["total_amount"],
                "currency":         "VND",
                "raw_text":         raw_text,
                "confidence":       round(confidence, 3),
                "needs_review":     result["needs_review"],
                "reject_reason":    None,
            }

        # Rule-based fallback
        date_str, time_str = extract_datetime(lines)
        total = extract_total_by_position(items) or extract_total(lines)
        return {
            "kind":             payment_status,
            "merchant_name":    extract_merchant(lines, items=items),
            "transaction_date": date_str,
            "transaction_time": time_str,
            "total_amount":     total,
            "currency":         "VND",
            "raw_text":         raw_text,
            "confidence":       round(confidence, 3),
            "needs_review":     confidence < 0.70,
            "reject_reason":    None,
        }
