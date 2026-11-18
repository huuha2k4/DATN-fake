# tests/test_extractor.py
"""
Unit test cho app/extractor.py.

Chạy:
    python -m pytest tests/ -v
    python -m pytest tests/ -v --tb=short   # traceback ngắn hơn

Không cần PaddleOCR, không cần ảnh thật.
Mọi test đều dùng OCR items giả (dict box+text+score) hoặc lines text.
"""

import pytest
from app.extractor import (
    strip_accents,
    parse_amount,
    find_numbers,
    extract_total,
    extract_total_by_position,
    extract_datetime,
    extract_merchant,
    KNOWN_BRANDS,
)

# ---------------------------------------------------------------------------
# Helpers tạo OCR item giả
# ---------------------------------------------------------------------------

def make_item(text: str, x: float, y: float, w: float = 150.0, h: float = 20.0, score: float = 0.95) -> dict:
    """Tạo OCR item giả với bounding box hình chữ nhật."""
    return {
        "text": text,
        "score": score,
        "box": [
            [x,     y],
            [x + w, y],
            [x + w, y + h],
            [x,     y + h],
        ],
    }


def make_receipt_items(rows: list) -> list:
    """
    Tạo danh sách items từ list các hàng.
    Mỗi phần tử là (y, [(text, x), ...]).
    VD: make_receipt_items([(10, [("TONG CONG", 10), ("125.000", 400)])])
    """
    items = []
    for y, cols in rows:
        for text, x in cols:
            items.append(make_item(text, x, y))
    return items


# ===========================================================================
# Test: strip_accents
# ===========================================================================

class TestStripAccents:
    def test_basic(self):
        assert strip_accents("Tiền") == "tien"

    def test_d_special(self):
        assert strip_accents("đồng") == "dong"
        assert strip_accents("Đà Nẵng") == "da nang"

    def test_already_plain(self):
        assert strip_accents("abc123") == "abc123"

    def test_uppercase(self):
        assert strip_accents("HIGHLANDS") == "highlands"


# ===========================================================================
# Test: parse_amount
# ===========================================================================

class TestParseAmount:
    # --- Trường hợp hợp lệ ---
    def test_with_dot_separator(self):
        assert parse_amount("125.000") == 125000

    def test_with_comma_separator(self):
        assert parse_amount("125,000") == 125000

    def test_large_amount(self):
        assert parse_amount("1.250.000") == 1250000

    def test_no_separator_4digits(self):
        assert parse_amount("5000") == 5000

    def test_exact_min(self):
        # AMOUNT_MIN = 2000
        assert parse_amount("2.000") == 2000
        assert parse_amount("1.000") is None   # dưới min

    # --- Trường hợp không hợp lệ ---
    def test_phone_starts_with_zero_no_sep(self):
        assert parse_amount("0987654321") is None

    def test_phone_with_dot(self):
        assert parse_amount("024.71066866") is None

    def test_year_hour_pattern(self):
        # 202016 = năm 2020 ghép giờ 16:xx
        assert parse_amount("202016") is None

    def test_too_small(self):
        assert parse_amount("500") is None

    def test_too_large(self):
        assert parse_amount("200.000.000") is None

    def test_non_digit(self):
        assert parse_amount("abc") is None

    def test_long_no_separator(self):
        assert parse_amount("123456789") is None


# ===========================================================================
# Test: find_numbers
# ===========================================================================

class TestFindNumbers:
    def test_simple(self):
        assert find_numbers("TONG CONG  125.000") == [125000]

    def test_multiple(self):
        result = find_numbers("2  x  45.000  =  90.000")
        assert 45000 in result
        assert 90000 in result

    def test_phone_line_ignored(self):
        # Dòng chứa SĐT VN → bỏ qua toàn dòng
        assert find_numbers("028.3960.0913") == []
        assert find_numbers("Hotline: 024.71066866-44561") == []

    def test_negative_not_captured(self):
        # Số âm không được bắt
        assert find_numbers("-13.455") == []

    def test_empty_line(self):
        assert find_numbers("") == []

    def test_year_in_date_not_captured(self):
        # 202016 từ ngày giờ dính nhau không được bắt
        assert find_numbers("Ngay14/08/202016:16") == []


# ===========================================================================
# Test: extract_total (text-based)
# ===========================================================================

class TestExtractTotal:
    def test_keyword_tong_cong(self):
        lines = [
            "HIGHLANDS COFFEE",
            "Phin Sua Da  x1  45.000",
            "TONG CONG  125.000",
        ]
        assert extract_total(lines) == 125000

    def test_keyword_thanh_toan(self):
        lines = [
            "Co.op Food",
            "So tien phai thanh toan",
            "98.500",
        ]
        assert extract_total(lines) == 98500

    def test_tier_priority_phai_over_thanh_toan(self):
        # "tong tien phai" (tier 1) phải thắng "thanh toan" (tier 3)
        lines = [
            "Thanh toan  200.000",
            "TONG TIEN PHAI T.TOAN  103.235",
        ]
        assert extract_total(lines) == 103235

    def test_exclude_giam_gia(self):
        lines = [
            "Tong tien giam  13.455",
            "TONG TIEN PHAI T.TOAN  98.500",
        ]
        assert extract_total(lines) == 98500

    def test_exclude_tien_mat(self):
        lines = [
            "Tien mat  200.000",
            "TONG CONG  125.000",
        ]
        assert extract_total(lines) == 125000

    def test_number_on_next_line(self):
        # Số nằm ở dòng riêng sau keyword
        lines = [
            "TONG CONG",
            "125.000",
        ]
        assert extract_total(lines) == 125000

    def test_fallback_largest(self):
        # Không có keyword → lấy số lớn nhất
        lines = [
            "Mat hang  45.000",
            "Mat hang  80.000",
        ]
        assert extract_total(lines) == 80000

    def test_phone_not_picked(self):
        # Số điện thoại không được lấy làm tổng tiền
        lines = [
            "Hotline: 024.71066866-44561",
            "TONG CONG  12.900",
        ]
        assert extract_total(lines) == 12900

    def test_no_valid_number(self):
        # Chỉ có số năm 2020 < AMOUNT_MIN (2000) → None
        lines = ["HIGHLANDS COFFEE", "Ngay: 14/08/2020"]
        assert extract_total(lines) is None

    def test_amount_min_boundary(self):
        # Đúng ngưỡng AMOUNT_MIN = 2000
        assert extract_total(["Tong cong  2.000"]) == 2000
        assert extract_total(["Tong cong  1.999"]) is None

    def test_pending_handled_in_pipeline(self):
        # extractor không biết pending, pipeline xử lý — đây chỉ test extractor thuần
        lines = ["Giao dich treo", "s GD treo: 140"]
        # Không có số hợp lệ nào → None
        assert extract_total(lines) is None


# ===========================================================================
# Test: extract_total_by_position
# ===========================================================================

class TestExtractTotalByPosition:
    def test_number_to_right_of_keyword(self):
        # Layout điển hình: keyword bên trái, số bên phải
        items = make_receipt_items([
            (100, [("TONG CONG", 10),   ("125.000", 400)]),
        ])
        assert extract_total_by_position(items) == 125000

    def test_number_in_same_block(self):
        # Keyword và số trong cùng 1 block
        items = [make_item("TONG CONG  125.000", 10, 100)]
        assert extract_total_by_position(items) == 125000

    def test_number_on_next_row(self):
        # Keyword 1 hàng, số hàng dưới căn phải
        items = make_receipt_items([
            (100, [("TONG CONG", 10)]),
            (130, [("125.000",   400)]),
        ])
        assert extract_total_by_position(items) == 125000

    def test_tier_priority(self):
        # Tier 1 (phai thanh toan) phải thắng tier 3 (thanh toan)
        items = make_receipt_items([
            (80,  [("Thanh toan", 10),             ("200.000", 400)]),
            (120, [("TONG TIEN PHAI T.TOAN", 10),  ("103.235", 400)]),
        ])
        assert extract_total_by_position(items) == 103235

    def test_exclude_tien_giam(self):
        items = make_receipt_items([
            (80,  [("Tong tien giam",         10), ("13.455", 400)]),
            (120, [("TONG TIEN PHAI T.TOAN",  10), ("98.500", 400)]),
        ])
        assert extract_total_by_position(items) == 98500

    def test_empty_items(self):
        assert extract_total_by_position([]) is None

    def test_no_keyword(self):
        items = make_receipt_items([
            (100, [("San pham A", 10), ("45.000", 400)]),
            (130, [("San pham B", 10), ("80.000", 400)]),
        ])
        # Không có keyword tổng → None
        assert extract_total_by_position(items) is None


# ===========================================================================
# Test: extract_datetime
# ===========================================================================

class TestExtractDatetime:
    def test_dd_mm_yyyy_slash(self):
        date, time = extract_datetime(["Ngay: 14/08/2020 16:16"])
        assert date == "2020-08-14"
        assert time == "16:16"

    def test_dd_mm_yyyy_dash(self):
        date, _ = extract_datetime(["11-08-2020"])
        assert date == "2020-08-11"

    def test_dd_mm_yy(self):
        date, _ = extract_datetime(["14/08/20"])
        assert date == "2020-08-14"

    def test_time_separate_line(self):
        _, time = extract_datetime(["Ngay: 14/08/2020", "Gio: 09:17"])
        assert time == "09:17"

    def test_time_with_seconds(self):
        _, time = extract_datetime(["18:18:30"])
        assert time == "18:18"

    def test_invalid_date_ignored(self):
        # 31/02 không hợp lệ → bỏ qua, lấy ngày hợp lệ tiếp theo
        date, _ = extract_datetime(["31/02/2020", "14/08/2020"])
        assert date == "2020-08-14"

    def test_no_date(self):
        date, time = extract_datetime(["HIGHLANDS COFFEE", "Phin Sua Da  45.000"])
        assert date is None
        assert time is None

    def test_date_time_not_swapped(self):
        # Đảm bảo không nhầm mm/dd (Mỹ)
        date, _ = extract_datetime(["15/08/2020"])
        assert date == "2020-08-15"   # dd=15, mm=08 — không phải mm=15


# ===========================================================================
# Test: extract_merchant
# ===========================================================================

class TestExtractMerchant:
    def test_known_brand_direct(self):
        lines = ["HIGHLANDS COFFEE", "So 1 Nguyen Trai Q1"]
        assert extract_merchant(lines) == "Highlands Coffee"

    def test_brand_with_address_on_same_line(self):
        # Brand bị ghép với địa chỉ
        lines = ["VinCommerce  P.Cam Binh TP.Cam Pha"]
        assert extract_merchant(lines) == "VinCommerce"

    def test_header_noise_skipped(self):
        lines = ["HOA DON BAN HANG", "VinCommerce", "P.Cam Son"]
        assert extract_merchant(lines) == "VinCommerce"

    def test_address_line_skipped(self):
        lines = [
            "So 1 Nguyen Trai, Q.1, TP.HCM",
            "Highlands Coffee",
        ]
        assert extract_merchant(lines) == "Highlands Coffee"

    def test_legal_entity_skipped(self):
        # "Cong ty TNHH ..." → tìm dòng sau
        lines = [
            "Cong Ty TNHH Thuong Mai Vincommerce",
            "VinCommerce",
            "P.Cam Son TP.Cam Pha",
        ]
        assert extract_merchant(lines) == "VinCommerce"

    def test_short_brand_not_false_positive(self):
        # "GS25" không được khớp với chuỗi dài chứa "GS" ngẫu nhiên
        lines = ["GS25 Nguyen Hue", "So tien 25.000"]
        result = extract_merchant(lines)
        assert result == "GS25"

    def test_fallback_first_valid_line(self):
        # Không khớp brand nào → lấy dòng đầu hợp lệ (không phải noise)
        lines = ["Quan ca phe ABC", "So luong  3  mon"]
        result = extract_merchant(lines)
        assert result == "Quan ca phe ABC"

    def test_address_line_is_noise(self):
        # "duong" trong SKIP_HINTS → bị lọc
        from app.extractor import _looks_like_noise
        assert _looks_like_noise("123 Duong XYZ") is True

    def test_no_valid_line(self):
        lines = ["HOA DON BAN HANG", "024.71066866", "MST: 123456"]
        # Tất cả đều bị lọc → None
        result = extract_merchant(lines)
        assert result is None

    def test_minimart_anan(self):
        lines = ["MINIMART ANAN", "Cho Suoi Phu Thi Gia Lam"]
        assert extract_merchant(lines) == "MINIMART ANAN"

    def test_co_op_mart(self):
        lines = ["Saigon Co.op", "Co.op Food HN THE K-PARK"]
        assert extract_merchant(lines) == "Saigon Co.op"


# ===========================================================================
# Test: KNOWN_BRANDS không có duplicate
# ===========================================================================

class TestKnownBrands:
    def test_no_duplicates(self):
        from app.extractor import strip_accents
        normalized = [strip_accents(b) for b in KNOWN_BRANDS]
        assert len(normalized) == len(set(normalized)), \
            "KNOWN_BRANDS có brand trùng nhau sau khi bỏ dấu"

    def test_all_non_empty(self):
        assert all(len(b.strip()) > 0 for b in KNOWN_BRANDS)
