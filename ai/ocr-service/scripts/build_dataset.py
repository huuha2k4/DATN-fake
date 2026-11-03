# scripts/build_dataset.py
"""
Xây dựng tập dữ liệu huấn luyện từ 3 nguồn:
  A. Tên cửa hàng thật từ MC-OCR (mcocr_sellers_labeled.csv)
  B. Dữ liệu sinh từ brands.csv (giả lập nhiều cách viết)
  C. Nội dung chuyển khoản tự do theo từng danh mục

Output: classify_data/transactions.csv
  - text       : văn bản gốc (chưa normalize)
  - text_norm  : văn bản đã normalize
  - category   : nhãn danh mục
  - group      : thương hiệu chuẩn hóa (dùng GroupKFold)
  - source     : real | synthetic

Chạy: python scripts/build_dataset.py
"""
import sys
import random
sys.path.append(".")

import pandas as pd
from app.classify.normalize import normalize, strip_accents

random.seed(42)

# ---------------------------------------------------------------------------
# Template và dữ liệu sinh
# ---------------------------------------------------------------------------
BRANCHES = [
    "quan 1", "q3", "q7", "cau giay", "ha noi", "tp hcm",
    "thu duc", "da nang", "nguyen trai", "le loi", "tran hung dao",
    "hoang mai", "dong da", "bac tu liem", "cam pha", "quang ninh",
]

CONFUSE = {"o": "0", "l": "1", "i": "1", "s": "5", "b": "8"}

BRAND_TEMPLATES = [
    "{b}",
    "{b} {br}",
    "thanh toan {b}",
    "{b} {code}",
    "{b} chi nhanh {br}",
    "cong ty tnhh {b}",
    "{b} vietnam",
    "{b} {br} {code}",
    "tt {b}",
    "{b} - {br}",
]

# Nội dung chuyển khoản / ghi chú tự do theo danh mục
FREE_TEXT = {
    "food": [
        "an trua", "an sang", "an toi", "tien an", "tra sua", "cafe voi ban",
        "di nhau", "mua do an", "tien com", "an vat", "nhau cuoi tuan",
        "tien com trua", "dat do an online", "order tra sua", "tien ca phe",
        "an bun", "an pho", "com binh dan", "banh mi sang",
    ],
    "transport": [
        "do xang", "ve xe buyt", "gui xe", "tien taxi", "rua xe",
        "ve tau", "phi cau duong", "sua xe may", "thay nhot xe",
        "do xang xe may", "xe om", "di taxi", "tien grab",
    ],
    "shopping": [
        "mua quan ao", "mua do dung", "mua giay", "mua dien thoai",
        "mua do gia dung", "mua sach", "mua my pham", "mua do online",
        "mua sam cuoi nam", "mua do cho em", "mua qua tang",
    ],
    "bills": [
        "tien dien", "tien nuoc", "tien internet", "cuoc dien thoai",
        "nap the dien thoai", "tien wifi", "phi truyen hinh",
        "dong tien dien thang 8", "thanh toan tien nuoc", "phi dich vu",
    ],
    "housing": [
        "tien nha", "tien phong tro", "dat coc nha", "tien thue nha",
        "phi quan ly chung cu", "sua nha", "tien phong thang 9",
        "dat coc thue phong", "tien o nha tro",
    ],
    "entertainment": [
        "xem phim", "choi game", "nap game", "karaoke",
        "mua ve concert", "dang ky netflix", "choi billiard",
        "di bar", "mua ve su kien", "nap coin game",
    ],
    "health": [
        "mua thuoc", "kham benh", "tien vien phi", "xet nghiem",
        "kham rang", "mua vitamin", "phi kham dinh ky",
        "mua thuoc cam", "tien kham benh vien",
    ],
    "education": [
        "dong hoc phi", "hoc phi ky 1", "mua giao trinh", "phi thi ielts",
        "khoa hoc online", "tien hoc them", "mua sach giao khoa",
        "hoc phi lop tieng anh", "phi thi chung chi",
    ],
    "travel": [
        "ve may bay", "dat khach san", "tien tour", "tien du lich",
        "phong khach san", "ve tau di choi", "tour ha long",
        "dat phong resort", "ve may bay ha noi",
    ],
    "transfer": [
        "chuyen tien", "gui tien cho ban", "tra no", "cho muon tien",
        "gui tien me", "tra tien ban", "chuyen khoan",
        "gui tien ba", "hoan tien", "tra lai tien vay",
    ],
    "other": [
        "chi phi khac", "phat sinh", "khong ro noi dung",
        "chi phi linh tinh", "tien le",
    ],
    "salary": [
        "luong thang 8", "nhan luong", "thu nhap thang nay",
        "tien luong", "luong co ban",
    ],
    "bonus": [
        "thuong tet", "thuong quy", "thuong kpi",
        "tien thuong du an", "thuong cuoi nam",
    ],
    "family": [
        "ba gui tien", "me chuyen", "anh cho muon",
        "gia dinh ho tro", "ba cho tien hoc",
    ],
    "other_income": [
        "thu nhap them", "lam them", "ban do cu",
        "thu nhap phu", "tien freelance",
    ],
}

FREE_PREFIX = [
    "", "", "", "ck ", "chuyen khoan ", "thanh toan ",
    "nguyen van a ck ", "tt ", "nhan ", "tra ",
]


def code() -> str:
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"
    return "".join(random.choice(chars) for _ in range(random.randint(4, 8)))


def noise(s: str) -> str:
    """Mô phỏng lỗi OCR và cách viết đời thường."""
    if random.random() < 0.30:
        s = strip_accents(s)
    if random.random() < 0.15 and len(s) > 4:
        i = random.randrange(len(s))
        s = s[:i] + s[i + 1:]   # rớt 1 ký tự
    if random.random() < 0.15:
        s = "".join(
            CONFUSE.get(c, c) if random.random() < 0.15 else c
            for c in s
        )
    if random.random() < 0.25:
        s = s.upper()
    return s


# ---------------------------------------------------------------------------
# Nguồn A: dữ liệu thật từ MC-OCR
# ---------------------------------------------------------------------------
def from_real(path: str = "classify_data/mcocr_sellers_labeled.csv") -> list:
    rows = []

    # Nguồn A1: MC-OCR sellers đã gán nhãn
    try:
        df = pd.read_csv(path, comment='#')  # bỏ dòng comment
        for _, r in df.iterrows():
            cat = str(r.get("category", "")).strip()
            if not cat or cat == "nan":
                continue
            g = str(r.get("group", "")).strip()
            if not g or g == "nan":
                g = normalize(r["text"])[:30]
            rows.append({"text": r["text"], "category": cat, "group": g, "source": "real"})
    except FileNotFoundError:
        print(f"  [WARN] Không tìm thấy {path}")

    # Nguồn A2: mẫu thủ công bổ sung cho lớp thiếu (health, education, bills...)
    manual_path = "classify_data/transactions_manual.csv"
    try:
        df2 = pd.read_csv(manual_path)
        for _, r in df2.iterrows():
            cat = str(r.get("category", "")).strip()
            if not cat or cat == "nan":
                continue
            g = str(r.get("group", normalize(r["text"])[:30])).strip()
            rows.append({"text": r["text"], "category": cat, "group": g, "source": "real"})
        print(f"  Đọc {len(df2)} mẫu thủ công từ {manual_path}")
    except FileNotFoundError:
        print(f"  [INFO] Không có {manual_path} — bỏ qua")

    return rows


# ---------------------------------------------------------------------------
# Nguồn B: dữ liệu sinh từ brands.csv
# ---------------------------------------------------------------------------
def from_brands(path: str = "classify_data/brands.csv", per_alias: int = 5) -> list:
    df = pd.read_csv(path)
    rows = []
    for alias, cat in zip(df["alias"], df["category"]):
        for _ in range(per_alias):
            t = random.choice(BRAND_TEMPLATES).format(
                b=alias,
                br=random.choice(BRANCHES),
                code=code(),
            )
            rows.append({
                "text":     noise(t),
                "category": cat,
                "group":    normalize(alias),
                "source":   "synthetic",
            })
    return rows


# ---------------------------------------------------------------------------
# Nguồn C: nội dung chuyển khoản tự do
# ---------------------------------------------------------------------------
def from_free_text(per_phrase: int = 4) -> list:
    rows = []
    for cat, phrases in FREE_TEXT.items():
        for p in phrases:
            for _ in range(per_phrase):
                t = random.choice(FREE_PREFIX) + p
                rows.append({
                    "text":     noise(t),
                    "category": cat,
                    "group":    normalize(p),
                    "source":   "synthetic",
                })
    return rows


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("Xây dựng dataset...")

    rows_real  = from_real()
    rows_brand = from_brands()
    rows_free  = from_free_text()

    all_rows = rows_real + rows_brand + rows_free
    df = pd.DataFrame(all_rows)

    # Normalize text
    df["text_norm"] = df["text"].astype(str).map(normalize)
    df = df[df["text_norm"].str.len() > 0]
    df = df.drop_duplicates(subset=["text_norm", "category"])

    # Lưu
    out_path = "classify_data/transactions.csv"
    df.to_csv(out_path, index=False, encoding="utf-8-sig")

    print(f"\nTổng: {len(df)} mẫu")
    print(f"\nNguồn:")
    print(df["source"].value_counts().to_string())
    print(f"\nDanh mục:")
    print(df["category"].value_counts().to_string())
    print(f"\n✅ Đã lưu: {out_path}")


if __name__ == "__main__":
    main()
