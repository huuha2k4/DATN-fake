"""
tests/test_auditor.py
Kiểm thử Bộ rà soát / Tự kiểm toán hóa đơn (Self-Auditing Gate).
"""
import pytest
from app.auditor import audit_receipt


class TestAuditor:
    def test_audit_valid_receipt(self):
        result = {
            "kind": "paid",
            "merchant_name": "Highlands Coffee",
            "total_amount": 125000,
            "transaction_date": "2024-05-15",
            "confidence": 0.92,
            "raw_text": "Highlands Coffee\n1 Ca phe sua da 45,000\n1 Tra dao 80,000\nTong tien: 125,000\nCam on",
        }
        is_suspicious, reasons = audit_receipt(result)
        assert is_suspicious is False
        assert len(reasons) == 0

    def test_audit_missing_total(self):
        result = {
            "kind": "paid",
            "merchant_name": "Highlands Coffee",
            "total_amount": None,
            "confidence": 0.90,
            "raw_text": "Highlands Coffee\nCa phe",
        }
        is_suspicious, reasons = audit_receipt(result)
        assert is_suspicious is True
        assert any("Không trích xuất được tổng tiền" in r for r in reasons)

    def test_audit_missing_merchant(self):
        result = {
            "kind": "paid",
            "merchant_name": None,
            "total_amount": 50000,
            "confidence": 0.85,
            "raw_text": "50,000 VND",
        }
        is_suspicious, reasons = audit_receipt(result)
        assert is_suspicious is True
        assert any("Không trích xuất được tên cửa hàng" in r for r in reasons)

    def test_audit_invalid_merchant_noise(self):
        # Trích xuất nhầm HÀ NỘI hoặc HÓA ĐƠN BÁN HÀNG thành tên quán
        result = {
            "kind": "paid",
            "merchant_name": "HÀ NỘI",
            "total_amount": 3000000,
            "confidence": 0.88,
            "raw_text": "HOA DON BAN HANG\nHA NOI\nTong: 3,000,000",
        }
        is_suspicious, reasons = audit_receipt(result)
        assert is_suspicious is True
        assert any("Tên cửa hàng bị nhầm" in r for r in reasons)

    def test_audit_total_mismatch_with_bottom(self):
        # Trích xuất 42,000 (món đầu tiên) trong khi cuối hóa đơn là 537,000
        result = {
            "kind": "paid",
            "merchant_name": "QUAN AN THIEN TAN",
            "total_amount": 42000,
            "confidence": 0.85,
            "raw_text": (
                "QUAN AN THIEN TAN\n"
                "1 BUN SING 42,000\n"
                "1 MI GION 37,000\n"
                "TIEN MAT 537,000\n"
                "CAM ON QUY KHACH"
            ),
        }
        is_suspicious, reasons = audit_receipt(result)
        assert is_suspicious is True
        assert any("nhỏ hơn đáng kể số tiền ở cuối hóa đơn" in r for r in reasons)

    def test_audit_total_is_year(self):
        result = {
            "kind": "paid",
            "merchant_name": "Nha Thuoc ABC",
            "total_amount": 2024,
            "confidence": 0.85,
            "raw_text": "Nha Thuoc ABC\nNgay 12/05/2024\nTong: 2024",
        }
        is_suspicious, reasons = audit_receipt(result)
        assert is_suspicious is True
        assert any("trùng với năm" in r for r in reasons)

    def test_audit_future_date(self):
        result = {
            "kind": "paid",
            "merchant_name": "WinMart",
            "total_amount": 50000,
            "transaction_date": "2035-01-01",
            "confidence": 0.90,
            "raw_text": "WinMart\n50,000",
        }
        is_suspicious, reasons = audit_receipt(result)
        assert is_suspicious is True
        assert any("nằm trong tương lai" in r for r in reasons)

    def test_audit_low_confidence(self):
        result = {
            "kind": "paid",
            "merchant_name": "WinMart",
            "total_amount": 50000,
            "confidence": 0.50,
            "raw_text": "WinMart\n50,000",
        }
        is_suspicious, reasons = audit_receipt(result)
        assert is_suspicious is True
        assert any("Điểm tin cậy OCR quá thấp" in r for r in reasons)

    def test_audit_rejected_kind(self):
        result = {
            "kind": "not_receipt",
            "merchant_name": None,
            "total_amount": None,
            "confidence": 0.30,
            "reject_reason": "Ảnh phong cảnh",
            "raw_text": "bien",
        }
        is_suspicious, reasons = audit_receipt(result)
        assert is_suspicious is True
        assert any("Loại ảnh bị nghi ngờ" in r for r in reasons)
