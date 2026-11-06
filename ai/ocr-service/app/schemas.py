# app/schemas.py
from typing import Any, List, Literal, Optional
from pydantic import BaseModel, Field

ReceiptKind = Literal[
    "paid",         # Hóa đơn đã thanh toán → trích xuất đầy đủ
    "unknown",      # Hóa đơn nhưng không xác định được trạng thái → vẫn trích xuất
    "draft",        # Phiếu tạm tính → từ chối
    "not_receipt",  # Không phải hóa đơn (phong cảnh, selfie, văn bản thường...)
    "low_quality",  # Ảnh quá mờ / thiếu text → yêu cầu chụp lại
    "handwritten",  # Chữ viết tay → không trích xuất tự động
]


class CategoryResult(BaseModel):
    """Kết quả phân loại danh mục giao dịch."""
    category:      str   = Field(description="ID danh mục (food, shopping...)")
    category_name: str   = Field(description="Tên hiển thị tiếng Việt")
    confidence:    float = Field(description="Độ tin cậy 0-1")
    source:        str   = Field(description="dictionary | model | fallback")
    status:        str   = Field(description="auto | suggest | ask")
    needs_review:  bool  = Field(description="True nếu cần người dùng xác nhận")
    matched:       Optional[str]       = Field(default=None)
    top3:          List[Any]           = Field(default=[])


class ReceiptResult(BaseModel):
    """Schema kết quả trả về từ endpoint /ocr/receipt."""

    kind: ReceiptKind = Field(
        default="paid",
        description=(
            "paid | unknown — hóa đơn hợp lệ, đã trích xuất | "
            "draft — phiếu tạm tính, từ chối | "
            "not_receipt — không phải hóa đơn | "
            "low_quality — ảnh quá mờ, chụp lại | "
            "handwritten — viết tay, nhập thủ công"
        ),
    )
    merchant_name: Optional[str] = Field(default=None)
    transaction_date: Optional[str] = Field(default=None)
    transaction_time: Optional[str] = Field(default=None)
    total_amount: Optional[int] = Field(default=None)
    currency: str = Field(default="VND")
    raw_text: str = Field(description="Toàn bộ văn bản OCR")
    confidence: float = Field(description="Điểm tin cậy OCR (0-1)")
    needs_review: bool = Field(default=False)
    reject_reason: Optional[str] = Field(
        default=None,
        description="Lý do từ chối — chỉ có giá trị khi kind là draft/not_receipt/low_quality/handwritten",
    )

    # Phân loại danh mục — None nếu bị từ chối hoặc không phân loại được
    category: Optional[CategoryResult] = Field(
        default=None,
        description="Danh mục giao dịch được tự động phân loại.",
    )

    model_config = {
        "json_schema_extra": {
            "examples": {
                "Hóa đơn hợp lệ": {
                    "value": {
                        "kind": "paid",
                        "merchant_name": "Highlands Coffee",
                        "transaction_date": "2026-09-28",
                        "transaction_time": "14:35",
                        "total_amount": 125000,
                        "currency": "VND",
                        "raw_text": "HIGHLANDS COFFEE\n...",
                        "confidence": 0.91,
                        "needs_review": False,
                        "reject_reason": None,
                        "category": {
                            "category": "food",
                            "category_name": "Ăn uống",
                            "confidence": 0.95,
                            "source": "dictionary",
                            "status": "auto",
                            "needs_review": False,
                            "matched": "highlands coffee",
                            "top3": [],
                        },
                    }
                },
                "Ảnh không phải hóa đơn": {
                    "value": {
                        "kind": "not_receipt",
                        "merchant_name": None,
                        "transaction_date": None,
                        "transaction_time": None,
                        "total_amount": None,
                        "currency": "VND",
                        "raw_text": "",
                        "confidence": 0.82,
                        "needs_review": False,
                        "reject_reason": "Ảnh không phải hóa đơn hoặc biên lai.",
                        "category": None,
                    }
                },
                "Ảnh quá mờ": {
                    "value": {
                        "kind": "low_quality",
                        "merchant_name": None,
                        "transaction_date": None,
                        "transaction_time": None,
                        "total_amount": None,
                        "currency": "VND",
                        "raw_text": "",
                        "confidence": 0.21,
                        "needs_review": True,
                        "reject_reason": "Ảnh quá mờ hoặc thiếu thông tin, vui lòng chụp lại.",
                        "category": None,
                    }
                },
            }
        }
    }


class ClassifyRequest(BaseModel):
    """Request body cho endpoint /classify."""
    text:    str            = Field(description="Merchant name hoặc nội dung giao dịch")
    kind:    str            = Field(default="expense", description="expense | income")
    user_id: Optional[str] = Field(default=None)


class ClassifyBatchRequest(BaseModel):
    items:   List[ClassifyRequest]
