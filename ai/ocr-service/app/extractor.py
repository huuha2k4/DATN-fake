# app/extractor.py
import re
import unicodedata
import numpy as np
from datetime import datetime
from typing import List, Optional, Tuple, Dict

from rapidfuzz import fuzz


# ---------------------------------------------------------------------------
# Tiện ích chung
# ---------------------------------------------------------------------------

def strip_accents(s: str) -> str:
    """Bỏ dấu và chuyển thường để so khớp từ khóa mà không bị ảnh hưởng bởi lỗi OCR dấu."""
    s = s.replace("đ", "d").replace("Đ", "D")
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.lower()


# ---------------------------------------------------------------------------
# Trích xuất TỔNG TIỀN
# ---------------------------------------------------------------------------

# Keyword có ĐỘ ƯU TIÊN — tầng cao hơn tìm trước
# Tier 1: rõ ràng nhất (phai thanh toan / tong cong)
# Tier 2: khá rõ (tong tien / thanh tien)
# Tier 3: dễ nhầm nhất (thanh toan — có thể là "TT: tiền mặt")
TOTAL_KEYWORD_TIERS: List[List[str]] = [
    # Tier 1 — rõ ràng nhất
    ["tong tien phai", "phai thanh toan", "tong tien phai thanh toan", "phai tra",
     "tong cong", "tongcong", "grand total"],
    # Tier 2 — khá rõ
    ["tong tien", "thanh tien", "tong thanh toan", "total amount", "so tien phai tra",
     "tien thanh toan", "tong tienphai"],
    # Tier 3 — dễ nhầm nhất
    ["thanh toan", "total", "so tien", "amount",
     # OCR ghép chữ hay gặp
     "tong congdagom", "tongcongdagom", "tongtiendag", "t&ng cong", "t&ng tien"],
]
# Flat list để dùng chỗ khác
TOTAL_KEYWORDS = [kw for tier in TOTAL_KEYWORD_TIERS for kw in tier]

EXCLUDE_KEYWORDS = [
    # Tiền khách / tiền thừa / tiền thối
    "khach dua", "tien thua", "tien tra lai", "tien mat",
    "tralai", "tra lai", "tien thoi", "tien thu",
    "khach tra", "tien khach",
    # Giảm giá
    "giam gia", "chiet khau", "tien giam", "tong tien giam",
    "tong tien a giam", "khuyen mai", "discount",
    # Thuế riêng
    "thue gtgt", "tam tinh", "subtotal",
    # Thanh toán bằng thẻ/ví (không phải tổng)
    "visa", "mastercard", "the tin dung", "the atm", "vinid",
    "momo", "zalopay", "vnpay", "diem tich luy",
    # Mã thiết bị / mã giao dịch (hay bị nhầm là số tiền)
    "terminal", "terminalid", "terminal id",
    "merchantid", "merchant id",
    "pass:", "password",
    "card no", "so the",
    "ref:", "reference",
    "approval", "auth code", "ma phe duyet",
    "so tham chieu", "tham chieu",
    # Thu ngân / quầy — số mã nhân viên hay bị nhầm
    "th.ngan", "thu ngan", "quay", "nhan vien",
    "cashier", "ma nhan vien", "nvbh",
    # Hotline / SĐT
    "hotline", "so dt", "dien thoai",
]

# Khoảng hợp lý — đặt thành config để dễ điều chỉnh
AMOUNT_MIN = 2_000      # Dưới 2.000đ không phải tổng tiền hóa đơn thực tế
AMOUNT_MAX = 100_000_000

# Số dạng 125.000 / 125,000 / 1.250.000 / 125000 — KHÔNG bắt số âm
NUMBER_RE = re.compile(r"(?<![0-9,.-])\d{1,3}(?:[.,]\d{3})+|\b\d{4,}(?!\d)")

# Regex nhận diện số điện thoại / fax VN
# VD: 024.71066866, 028-3960-0913, 1800.xxxx
PHONE_LINE_RE = re.compile(r"(?:0\d{2,3}|1800|1900)[.\-]\d{3,}")


def parse_amount(token: str) -> Optional[int]:
    """
    Chuyển chuỗi số tiền thành int. Trả None nếu không hợp lệ.
    Các rule lọc:
      - Bắt đầu 0 + không dấu phân cách + dài → SĐT/mã
      - Pattern 0xx. → SĐT VN có dấu chấm
      - 6 chữ số bắt đầu 19xx/20xx → năm ghép giờ
      - Ngoài khoảng AMOUNT_MIN–AMOUNT_MAX
    """
    digits = re.sub(r"[.,]", "", token)
    if not digits.isdigit():
        return None
    value = int(digits)

    if "." not in token and "," not in token:
        if token.startswith("0") or len(token) >= 8:   # >= 8 thay vì >= 9
            return None

    if re.match(r"^0\d{2,3}\.", token):
        return None

    if len(digits) == 6 and digits[:2] in ("19", "20"):
        return None

    # Loại năm (4 chữ số không có dấu phân cách, trong khoảng 2010-2030)
    # Lưu ý: 2.000đ có dấu chấm nên không bị lọc ở đây
    if len(digits) == 4 and "." not in token and "," not in token and 2010 <= value <= 2030:
        return None

    if value < AMOUNT_MIN or value > AMOUNT_MAX:
        return None

    return value


def find_numbers(line: str) -> List[int]:
    """Tìm tất cả số tiền hợp lệ trong một dòng, bỏ qua dòng chứa SĐT."""
    if PHONE_LINE_RE.search(line):
        return []
    return [v for m in NUMBER_RE.finditer(line)
            if (v := parse_amount(m.group())) is not None]


def _search_tier(lines: List[str], norm: List[str], tier_keywords: List[str]) -> Optional[int]:
    """Tìm tổng tiền trong 1 tier keyword, duyệt từ dưới lên."""
    for i in range(len(lines) - 1, -1, -1):
        n = norm[i]

        # Bỏ qua dòng loại trừ THUẦN — không có keyword tổng
        has_total_kw = any(k in n for k in tier_keywords)
        has_excl_kw  = any(k in n for k in EXCLUDE_KEYWORDS)

        if not has_total_kw:
            continue

        if has_excl_kw and not has_total_kw:
            continue  # loại trừ thuần (không bao giờ vào đây vì has_total_kw đã check)

        nums = find_numbers(lines[i])
        if not nums:
            # Thử dòng kế tiếp nếu số tách riêng
            if i + 1 < len(lines):
                nums = find_numbers(lines[i + 1])
                if nums:
                    return max(nums)
            continue

        if has_excl_kw:
            # Dòng ghép nhiều keyword (cả tổng lẫn loại trừ)
            # → lấy số nhỏ nhất hợp lệ (tổng tiền thường nhỏ hơn tiền khách đưa)
            # Lọc bỏ số lớn hơn 2x số nhỏ nhất (tiền khách thường lớn hơn hẳn)
            min_num = min(nums)
            filtered = [v for v in nums if v <= min_num * 2]
            if filtered:
                return min(filtered)
            return min_num

        return max(nums)

    return None


def extract_total(lines: List[str]) -> Optional[int]:
    """
    Trích xuất tổng tiền từ danh sách dòng text.

    Chiến lược:
      1. Tìm theo keyword tier cao → thấp (tong tien phai > tong tien > thanh toan)
      2. Fallback: số xuất hiện nhiều nhất (tổng tiền thường lặp lại 2-3 lần)
      3. Fallback cuối: số lớn nhất hợp lý
    """
    norm = [strip_accents(l) for l in lines]

    for tier in TOTAL_KEYWORD_TIERS:
        result = _search_tier(lines, norm, tier)
        if result is not None:
            return result

    # Fallback 1: số xuất hiện nhiều nhất (≥2 lần) — tổng tiền thường lặp lại
    all_nums = [v for l in lines for v in find_numbers(l)
                if v >= AMOUNT_MIN]
    if all_nums:
        from collections import Counter
        freq = Counter(all_nums)
        # Lấy số xuất hiện ≥2 lần, ưu tiên số xuất hiện nhiều hơn
        repeated = [(v, c) for v, c in freq.items() if c >= 2]
        if repeated:
            # Trong số lặp lại, lấy số lớn nhất (tổng > từng món)
            return max(v for v, _ in repeated)

    # Fallback 2: số lớn nhất hợp lý
    return max(all_nums) if all_nums else None


# ---------------------------------------------------------------------------
# Trích xuất NGÀY GIỜ
# ---------------------------------------------------------------------------

DATE_RE = re.compile(r"(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{4}|\d{2})")
TIME_RE = re.compile(r"(\d{1,2})\s*:\s*(\d{2})(?::\d{2})?")


def extract_datetime(lines: List[str]) -> Tuple[Optional[str], Optional[str]]:
    """
    Trích xuất ngày (YYYY-MM-DD) và giờ (HH:MM) từ danh sách dòng.
    Định dạng ngày Việt Nam: dd/mm/yyyy (khác kiểu Mỹ mm/dd/yyyy).
    """
    date_str, time_str = None, None
    for line in lines:
        if date_str is None:
            for m in DATE_RE.finditer(line):
                d, mth, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
                if y < 100:
                    y += 2000
                try:
                    date_str = datetime(y, mth, d).strftime("%Y-%m-%d")
                    break
                except ValueError:
                    # Ngày không hợp lệ (ví dụ 31/02), bỏ qua
                    continue
        if time_str is None:
            m = TIME_RE.search(line)
            if m and int(m.group(1)) < 24 and int(m.group(2)) < 60:
                time_str = f"{int(m.group(1)):02d}:{m.group(2)}"
        if date_str and time_str:
            break
    return date_str, time_str


# ---------------------------------------------------------------------------
# Trích xuất TÊN CỬA HÀNG
# ---------------------------------------------------------------------------

# Danh sách thương hiệu quen thuộc — mở rộng theo dữ liệu thực tế
# Bao gồm các thương hiệu phổ biến trong tập MC-OCR 2021
# ---------------------------------------------------------------------------
# Dữ liệu thương hiệu
# ---------------------------------------------------------------------------

# Thương hiệu ngắn (<=4 ký tự) cần ngưỡng cao hơn và khớp nguyên từ
# để tránh false positive (vd "KFC" lọt vào chuỗi dài bất kỳ)
SHORT_BRAND_THRESHOLD = 92   # token phải gần như nguyên từ
LONG_BRAND_THRESHOLD  = 75   # tên dài khớp mờ vẫn được

KNOWN_BRANDS: List[str] = [
    # Cà phê / trà sữa
    "Highlands Coffee", "The Coffee House", "Phúc Long", "Starbucks",
    "Trung Nguyên", "Cộng Cà Phê", "Milano Coffee", "Thức Coffee",
    # Siêu thị / cửa hàng tiện lợi
    "Circle K", "WinMart", "Bách Hóa Xanh", "VinCommerce", "VinMart",
    "Co.opmart", "Co.op Food", "Saigon Co.op", "Co.op Smile",
    "Lotte Mart", "GS25", "FamilyMart", "MiniStop",
    "MINIMART ANAN", "Phúc Anh Minimart", "B's Mart",
    "Mega Market", "MM Mega Market",
    "Siêu Thị Bách Hóa Tổng Hợp",
    # Ăn uống / nhà hàng
    "KFC", "Lotteria", "Jollibee", "McDonald's", "Burger King",
    "Pizza Hut", "Domino's", "Phở 24",
    # Ngân hàng / ví điện tử
    "Vietcombank", "MB Bank", "Techcombank", "BIDV", "Agribank",
    "VPBank", "ACB", "Sacombank", "TPBank", "HDBank", "MoMo", "ZaloPay",
    # Thương mại điện tử
    "Shopee", "Lazada", "Tiki", "Sendo",
    # Dược phẩm / sức khỏe
    "Guardian", "Watsons", "Medicare", "Pharmacity", "Long Châu",
]

# Từ khóa nhận ra tên pháp nhân — khi gặp thì tìm thương hiệu ở dòng kế tiếp
LEGAL_ENTITY_HINTS = [
    "cong ty", "co., ltd", "co.,ltd", "tnhh", "co phan", "tap doan",
    "joint stock", "corporation", "corp", "inc.", "llc",
]

SKIP_HINTS = [
    # Địa chỉ
    "dia chi", "dc:", " duong ", "phuong ", "quan 1", "quan 2",
    "quan 3", "quan 4", "quan 5", "quan 6", "quan 7", "quan 8",
    "quan 9", "quan 10", "quan 11", "quan 12", "quan binh",
    "quan go", "quan phu", "quan tan", "quan thu", "quan thu duc",
    "tp.", "huyen ", "khu ", "toa ", "tang ", "lau ",
    "p.cam", "p.phu", "p.tan", "tp.cam", "tp.hcm", "tp.ha",
    "ha noi", "ho chi minh",
    # Liên hệ
    "tel", "sdt", "dt:", "hotline", "fax", "email", "website",
    "www", ".com", ".vn", "http",
    # Mã số / thuế
    "mst", "ma so thue", "ma so doanh nghiep",
    # Tiêu đề hóa đơn
    "hoa don", "hoa on", "ban hang", "phieu thu", "phieu ban",
    "receipt", "invoice", "don hang",
    # Nhân viên / quầy
    "thu ngan", "cashier", "quay:", "nhan vien", "nvbh",
    "ngay ban", "ngay:", "gio:", "mat hang", "so hoa don",
    # Nhãn đại lý / mã POS (không phải tên thương hiệu)
    "ten dai ly", "dai ly:", "pos:", "terminal", "merchant id",
    "tong ket giao dich", "phieu giao dich", "bien lai",
]


def _looks_like_noise(line: str) -> bool:
    """Trả True nếu dòng là địa chỉ / SĐT / mã số / tiêu đề — không phải tên cửa hàng."""
    n = strip_accents(line)
    if any(h in n for h in SKIP_HINTS):
        return True
    letters = sum(c.isalpha() for c in line)
    digits  = sum(c.isdigit() for c in line)
    # Quá ít chữ cái hoặc số nhiều hơn chữ → noise
    return letters < 3 or digits > letters


def _is_legal_entity(line: str) -> bool:
    """Kiểm tra dòng có phải tên pháp nhân (Công ty TNHH...) không."""
    n = strip_accents(line)
    return any(h in n for h in LEGAL_ENTITY_HINTS)


def _extract_brand_token(line: str) -> str:
    """
    Tách phần thương hiệu ra khỏi dòng bị ghép với địa chỉ.
    VD: "VinCommerce  P.Cam Binh TP.Cam Pha" → "VinCommerce"

    Trường hợp nhiều brand ghép: "Co.Op Food  Saigon Co.op"
    → thử khớp từng segment, trả segment khớp brand tốt nhất.
    """
    address_triggers = [
        " p.", " q.", " tp.", " quan", " phuong", " huyen",
        " duong", " khu", " toa ", " tang ", " lau ",
        ",", " - ",
    ]
    n = strip_accents(line)
    cut = len(line)
    for trigger in address_triggers:
        idx = n.find(trigger)
        if 0 < idx < cut:
            cut = idx
    return line[:cut].strip()


def _font_size_score(item: Dict) -> float:
    """Ước lượng kích thước chữ từ bounding box — tên cửa hàng thường to nhất."""
    ys = [p[1] for p in item["box"]]
    return float(max(ys) - min(ys))


def _match_brands(tokens: List[str]) -> tuple:
    """
    Khớp mờ danh sách token với KNOWN_BRANDS.

    Nguyên tắc:
    - Tên ngắn (<=4 ký tự): dùng token_set_ratio + ngưỡng cao (92)
      để tránh "KFC" khớp với chuỗi dài ngẫu nhiên
    - Tên dài: partial_ratio ngưỡng 75
    - Ưu tiên brand dài hơn khi cùng score — "Siêu Thị Bách Hóa Tổng Hợp"
      nên thắng "Bách Hóa Xanh" khi text có đủ chữ
    """
    best_brand, best_score, best_len = None, 0, 0

    for token in tokens:
        n = strip_accents(token)
        for brand in KNOWN_BRANDS:
            b = strip_accents(brand)
            is_short = len(b) <= 4

            if is_short:
                score = fuzz.token_set_ratio(b, n)
                threshold = SHORT_BRAND_THRESHOLD
            else:
                score = fuzz.partial_ratio(b, n)
                threshold = LONG_BRAND_THRESHOLD

            # Ưu tiên: score cao hơn; nếu bằng nhau thì brand dài hơn thắng
            if score > best_score or (score == best_score and len(b) > best_len):
                best_brand, best_score, best_len = brand, score, len(b)

    if best_score == 0:
        return None, 0

    b = strip_accents(best_brand)
    req = SHORT_BRAND_THRESHOLD if len(b) <= 4 else LONG_BRAND_THRESHOLD
    return (best_brand, best_score) if best_score >= req else (None, best_score)


def extract_merchant(
    lines: List[str],
    items: Optional[List[Dict]] = None,
    top_n: int = 8,
) -> Optional[str]:
    """
    Trích xuất tên cửa hàng với các cải tiến:

    1. Phát hiện tên pháp nhân ("Công ty TNHH ...") → bỏ qua, tìm tiếp dòng sau
    2. Tách phần thương hiệu ra khỏi địa chỉ ghép chung
    3. Fuzzy match với ngưỡng khác nhau cho tên ngắn/dài
    4. Nếu có items (bounding box): ưu tiên block có font lớn nhất (tên hay in to)
    5. Fallback: dòng đầu hợp lệ sau khi lọc noise
    """
    # --- Bước 1: Thu thập candidates từ text lines ---
    brand_candidates: List[str] = []
    fallback_candidates: List[str] = []
    skip_next = False  # Bỏ dòng ngay sau khi tên pháp nhân

    for i, line in enumerate(lines[:top_n]):
        if skip_next:
            skip_next = False
            continue

        # Nhận ra tên pháp nhân → tìm thương hiệu ở dòng tiếp theo thay vì dòng này
        if _is_legal_entity(line):
            # Dòng kế tiếp thường là thương hiệu thật
            if i + 1 < len(lines):
                next_line = lines[i + 1]
                token = _extract_brand_token(next_line)
                if not _looks_like_noise(token) and len(token) >= 3:
                    brand_candidates.append(token)
            skip_next = True
            continue

        token = _extract_brand_token(line)
        if not _looks_like_noise(token) and len(token) >= 3:
            brand_candidates.append(token)
        if not _looks_like_noise(line):
            fallback_candidates.append(line)

    # --- Bước 2: Ưu tiên block font lớn nhất nếu có items ---
    if items:
        # Lấy top 3 block có font lớn nhất trong phần đầu ảnh
        top_items = sorted(items, key=lambda it: -_font_size_score(it))
        # Chỉ xét items nằm trong 30% trên của ảnh
        all_ys = [float(np.mean([p[1] for p in it["box"]])) for it in items]
        max_y = max(all_ys) if all_ys else 1
        top_area_items = [
            it for it in top_items
            if float(np.mean([p[1] for p in it["box"]])) < max_y * 0.35
        ][:3]

        large_font_tokens = []
        for it in top_area_items:
            token = _extract_brand_token(it["text"])
            if not _looks_like_noise(token) and len(token) >= 3:
                large_font_tokens.append(token)

        # Thử khớp từ font lớn trước
        if large_font_tokens:
            brand, score = _match_brands(large_font_tokens)
            if brand:
                return brand
            # Nếu không khớp brand nhưng token font lớn hợp lệ → dùng làm fallback
            if large_font_tokens[0] not in brand_candidates:
                brand_candidates = large_font_tokens + brand_candidates

    # --- Bước 3: Khớp brand từ text candidates ---
    brand, score = _match_brands(brand_candidates)
    if brand:
        return brand

    # --- Bước 4: Fallback — dòng đầu hợp lệ ---
    if brand_candidates:
        return brand_candidates[0]
    if fallback_candidates:
        return _extract_brand_token(fallback_candidates[0])
    return None


# ---------------------------------------------------------------------------
# Trích xuất TỔNG TIỀN theo vị trí (tọa độ bounding box)
# ---------------------------------------------------------------------------

def extract_total_by_position(items: List[Dict]) -> Optional[int]:
    """
    Dùng tọa độ bounding box để tìm tổng tiền chính xác:

    Với mỗi tier keyword (cao → thấp):
      1. Tìm block chứa keyword tổng tiền (không bị loại trừ)
      2. Lấy số từ block CÙNG HÀNG bên phải keyword
      3. Nếu không có → thử số trong chính block keyword
      4. Nếu vẫn không có → thử hàng KẾ TIẾP (số căn phải)
    """
    if not items:
        return None

    def center_y(item) -> float:
        return float(np.mean([p[1] for p in item["box"]]))

    def center_x(item) -> float:
        return float(np.mean([p[0] for p in item["box"]]))

    def max_x(item) -> float:
        return float(max(p[0] for p in item["box"]))

    def height(item) -> float:
        ys = [p[1] for p in item["box"]]
        return float(max(ys) - min(ys))

    median_h = float(np.median([height(it) for it in items])) or 1.0
    row_threshold = median_h * 0.8

    # Sắp xếp items theo y để dễ tìm hàng kế tiếp
    sorted_items = sorted(items, key=lambda it: center_y(it))

    def find_next_row_items(kw_cy: float) -> List[Dict]:
        """Tìm items ở hàng ngay dưới keyword."""
        below = [it for it in sorted_items if center_y(it) > kw_cy + row_threshold]
        if not below:
            return []
        next_cy = center_y(below[0])
        return [it for it in below if abs(center_y(it) - next_cy) <= row_threshold]

    # Duyệt từ dưới lên theo tier
    reversed_items = list(reversed(sorted_items))

    for tier in TOTAL_KEYWORD_TIERS:
        for kw_item in reversed_items:
            norm = strip_accents(kw_item["text"])

            if any(k in norm for k in EXCLUDE_KEYWORDS):
                continue
            if not any(k in norm for k in tier):
                continue

            kw_cy = center_y(kw_item)
            kw_cx = center_x(kw_item)

            # Ưu tiên 1: block cùng hàng, bên phải keyword
            same_row_right = [
                it for it in sorted_items
                if it is not kw_item
                and abs(center_y(it) - kw_cy) <= row_threshold
                and center_x(it) > kw_cx
            ]
            candidates = [v for it in same_row_right for v in find_numbers(it["text"])]

            # Ưu tiên 2: số trong chính block keyword
            if not candidates:
                candidates = find_numbers(kw_item["text"])

            # Ưu tiên 3: hàng kế tiếp, lấy số gần mép phải nhất
            if not candidates:
                next_row = find_next_row_items(kw_cy)
                if next_row:
                    # Lấy block nằm xa nhất bên phải (số tiền thường căn phải)
                    rightmost = max(next_row, key=lambda it: max_x(it))
                    candidates = find_numbers(rightmost["text"])

            if candidates:
                return max(candidates)

    return None
