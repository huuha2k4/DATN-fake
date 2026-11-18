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

# Phiếu tạm tính / giao dịch treo — TỪCHỐI, không tạo giao dịch
_DRAFT_KEYWORDS = [
    "giao dich treo",
    "phieu tam tinh",
    "tam tinh",        # "PHIEU TAM TINH", "TAM TINH"
    "pending",
    "phieu thu tam",
    "provisional",
]

# Hóa đơn đã thanh toán — dấu hiệu tích cực
_PAID_KEYWORDS = [
    "da thanh toan", "payment", "paid",
    "tong tien phai", "tong cong", "thanh toan",
    "hoa don ban hang", "hoa don gtgt",
    "hoadon ban hang", "hoadonbanhang", "hoadon banhang",  # OCR hay ghép/tách
    "phieu tinh tien", "phieu thanh toan",
    "bill", "receipt",
]


def _classify_receipt(all_text: str) -> str:
    """Phân loại loại hóa đơn từ toàn bộ text OCR (đã strip_accents).

    Returns: 'draft' | 'paid' | 'unknown'
    """
    if any(kw in all_text for kw in _DRAFT_KEYWORDS):
        return "draft"
    if any(kw in all_text for kw in _PAID_KEYWORDS):
        return "paid"
    return "unknown"


class ReceiptPipeline:
    """
    Pipeline end-to-end: ảnh → JSON kết quả.

    Luồng xử lý:
      1. Tiền xử lý + xoay ảnh
      2. OCR
      3. Phân loại loại hóa đơn
         - 'draft': trả về ngay với kind='draft', không trích xuất
         - 'paid'/'unknown': trích xuất đầy đủ bằng ML (hoặc rule-based)
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
        all_text = " ".join(strip_accents(l) for l in lines)

        # --- Bước 3: Phân loại ---
        kind = _classify_receipt(all_text)

        if kind == "draft":
            # Phiếu tạm tính — không trích xuất, trả về ngay
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
            }

        # --- Bước 4: Trích xuất (ML hoặc rule-based) ---
        if USE_ML:
            result = _ml_extractor.extract_all(items, lines)
            return {
                "kind":             kind,
                "merchant_name":    result["merchant_name"],
                "transaction_date": result["transaction_date"],
                "transaction_time": result["transaction_time"],
                "total_amount":     result["total_amount"],
                "currency":         "VND",
                "raw_text":         raw_text,
                "confidence":       round(confidence, 3),
                "needs_review":     result["needs_review"],
            }

        # Rule-based fallback
        date_str, time_str = extract_datetime(lines)
        total = extract_total_by_position(items) or extract_total(lines)
        return {
            "kind":             kind,
            "merchant_name":    extract_merchant(lines, items=items),
            "transaction_date": date_str,
            "transaction_time": time_str,
            "total_amount":     total,
            "currency":         "VND",
            "raw_text":         raw_text,
            "confidence":       round(confidence, 3),
            "needs_review":     confidence < 0.70,
        }
