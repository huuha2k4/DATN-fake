# app/classify/normalize.py
import re
import unicodedata

# Viết tắt phổ biến trong nội dung giao dịch ngân hàng / hóa đơn
ABBREV = {
    "cf":      "cafe",
    "caphe":   "cafe",
    "ck":      "chuyen khoan",
    "tt":      "thanh toan",
    "tk":      "tai khoan",
    "dt":      "dien thoai",
    "sdt":     "so dien thoai",
    "hd":      "hoa don",
    "kh":      "khach hang",
    "tx":      "taxi",
    "bv":      "benh vien",
    "pk":      "phong kham",
    "qs":      "quan su",
    "nt":      "noi that",
    "vt":      "vat tu",
    "sp":      "san pham",
    "dv":      "dich vu",
    "ctv":     "cong tac vien",
    "nv":      "nhan vien",
    "hdsd":    "huong dan su dung",
}


def strip_accents(s: str) -> str:
    """Bỏ dấu tiếng Việt, chuyển đ→d."""
    s = s.replace("đ", "d").replace("Đ", "D")
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


# Tiền tố tên pháp nhân — bỏ trước khi tra từ điển
_LEGAL_PREFIXES = re.compile(
    r"^(cong ty (tnhh|co phan|cp)|cty (ld )?tnhh|tap doan|"
    r"he thong sieu thi|chuoi cua hang|"
    r"cua hang|chi nhanh|he thong)\s+",
    re.IGNORECASE,
)


def strip_legal_prefix(text: str) -> str:
    """
    Bỏ tiền tố tên pháp nhân để lộ ra tên thương hiệu.
    VD: "Cong ty TNHH KFC Viet Nam"  →  "KFC Viet Nam"
        "Chuoi cua hang The Coffee House"  →  "The Coffee House"
    """
    n = strip_accents(str(text))
    m = _LEGAL_PREFIXES.match(n)
    if m:
        # Trả về phần gốc (có dấu) bỏ đúng số ký tự đã match
        return text[m.end():].strip()
    return text


def normalize(text: str) -> str:
    """
    Chuẩn hóa văn bản đầu vào:
    1. Bỏ dấu, chuyển thường
    2. Bỏ URL
    3. Bỏ số dài (mã giao dịch, số tài khoản)
    4. Bỏ ký tự đặc biệt
    5. Mở rộng viết tắt
    6. Bỏ khoảng trắng thừa

    Dùng CÙNG hàm này lúc train và lúc predict — không được thay đổi.
    """
    if not text:
        return ""
    s = strip_accents(str(text)).lower()
    s = re.sub(r"https?://\S+|www\.\S+", " ", s)       # bỏ URL
    s = re.sub(r"\b\d{6,}\b", " ", s)                  # bỏ mã giao dịch (≥6 chữ số)
    s = re.sub(r"[^a-z0-9\s]", " ", s)                 # bỏ ký tự đặc biệt
    s = re.sub(r"\s+", " ", s).strip()
    tokens = [ABBREV.get(t, t) for t in s.split()]
    return " ".join(tokens)
