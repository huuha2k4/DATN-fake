# data/parse_mcocr.py
"""
Chuyển đổi mcocr_train_df.csv (MC-OCR 2021) sang labels.csv
đúng format mà evaluate.py và pipeline cần.

Cách dùng (chạy từ thư mục ocr-service/):
    python data/parse_mcocr.py

Cấu trúc thư mục ảnh thực tế:
    data/images/train_images/train_images/mcocr_public_*.jpg  (1155 ảnh - có nhãn)
    data/images/val_images/val_images/mcocr_val_*.jpg         (391 ảnh  - không có nhãn)

Đầu vào:  data/mcocr_train_df.csv/mcocr_train_df.csv
Đầu ra:   data/labels.csv

Output labels.csv columns:
  filename  - tên file ảnh gốc (img_id)
  img_path  - đường dẫn tương đối từ thư mục ocr-service/ để đọc ảnh
  merchant  - tên cửa hàng (từ nhãn SELLER)
  date      - ngày giao dịch YYYY-MM-DD (từ nhãn TIMESTAMP)
  total     - tổng tiền VND int (từ nhãn TOTAL_COST)
  split     - 'dev' hoặc 'test'
"""

import re
import random
from datetime import datetime
from pathlib import Path

import pandas as pd

# ---------------------------------------------------------------------------
# Cấu hình
# ---------------------------------------------------------------------------
SRC_CSV     = Path("data/mcocr_train_df.csv/mcocr_train_df.csv")
OUT_CSV     = Path("data/labels.csv")
TRAIN_DIR   = Path("data/images/train_images/train_images")
MIN_QUALITY = 0.0    # 0.0 = giữ tất cả; tăng lên 0.6 để lọc ảnh quá xấu
DEV_RATIO   = 0.15   # val = 15%
TRAIN_RATIO = 0.60   # train = 60%, test = 25% (phần còn lại)

# ---------------------------------------------------------------------------
# Tiện ích parse
# ---------------------------------------------------------------------------
NUMBER_RE = re.compile(r"\d{1,3}(?:[.,]\d{3})+|\d{4,}")
DATE_RE   = re.compile(r"(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{4}|\d{2})")


def fix_encoding(s: str) -> str:
    """Sửa lỗi encoding Latin-1 bị đọc nhầm từ UTF-8 (phổ biến trong MC-OCR CSV)."""
    try:
        return s.encode("latin-1").decode("utf-8")
    except (UnicodeDecodeError, UnicodeEncodeError):
        return s


def parse_amount(token: str):
    """Chuyển chuỗi tiền → int, trả None nếu không hợp lệ."""
    digits = re.sub(r"[.,]", "", token)
    if not digits.isdigit():
        return None
    v = int(digits)
    # Loại số điện thoại / mã số
    if "." not in token and "," not in token and (token.startswith("0") or len(token) >= 9):
        return None
    if v < 1_000 or v > 1_000_000_000:
        return None
    return v


def extract_total(text: str):
    """Lấy số tiền lớn nhất hợp lệ từ chuỗi text."""
    nums = [parse_amount(m.group()) for m in NUMBER_RE.finditer(text)]
    nums = [n for n in nums if n is not None]
    return max(nums) if nums else None


def extract_date(text: str):
    """Trích xuất ngày dạng YYYY-MM-DD từ chuỗi text timestamp."""
    for m in DATE_RE.finditer(text):
        d, mth, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y < 100:
            y += 2000
        try:
            return datetime(y, mth, d).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


# ---------------------------------------------------------------------------
# Parse một dòng CSV
# ---------------------------------------------------------------------------
def parse_row(row) -> dict:
    texts  = [fix_encoding(t.strip()) for t in str(row["anno_texts"]).split("|||")]
    labels = [l.strip() for l in str(row["anno_labels"]).split("|||")]

    merchant = None
    date_str = None
    total    = None

    for text, label in zip(texts, labels):
        # SELLER → tên cửa hàng (lấy cái đầu tiên có ý nghĩa)
        if label == "SELLER" and merchant is None:
            candidate = fix_encoding(text).strip()
            if len(candidate) > 2:
                merchant = candidate

        # TIMESTAMP → ngày giao dịch
        if label == "TIMESTAMP" and date_str is None:
            date_str = extract_date(text)

        # TOTAL_COST → lấy số lớn nhất trong tất cả các nhãn TOTAL
        if "TOTAL" in label:
            v = extract_total(text)
            if v is not None:
                total = max(total, v) if total is not None else v

    # Đường dẫn ảnh tương đối từ thư mục ocr-service/
    img_path = str(TRAIN_DIR / row["img_id"])

    return {
        "filename": row["img_id"],
        "img_path": img_path,
        "merchant": merchant,
        "date":     date_str,
        "total":    total,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print(f"Đọc file: {SRC_CSV}")
    df = pd.read_csv(SRC_CSV, dtype=str)
    print(f"  Tổng số dòng: {len(df)}")

    # Lọc theo chất lượng ảnh
    if MIN_QUALITY > 0:
        df["anno_image_quality"] = pd.to_numeric(df["anno_image_quality"], errors="coerce")
        before = len(df)
        df = df[df["anno_image_quality"] >= MIN_QUALITY].copy()
        print(f"  Sau lọc chất lượng >= {MIN_QUALITY}: {len(df)} ảnh (bỏ {before - len(df)})")

    # Chỉ giữ ảnh thực sự tồn tại trong thư mục
    df["_exists"] = df["img_id"].apply(lambda fn: (TRAIN_DIR / fn).exists())
    missing = (~df["_exists"]).sum()
    if missing > 0:
        print(f"  [WARN] {missing} ảnh không tìm thấy trong {TRAIN_DIR} — bỏ qua.")
    df = df[df["_exists"]].drop(columns=["_exists"]).reset_index(drop=True)
    print(f"  Ảnh tồn tại và sẽ dùng: {len(df)}")

    # Parse từng dòng
    print("Đang parse các trường...")
    records = [parse_row(row) for _, row in df.iterrows()]
    out = pd.DataFrame(records)

    # Thống kê
    n = len(out)
    print(f"\n  Tổng ảnh      : {n}")
    print(f"  Có merchant   : {out['merchant'].notna().sum()} ({out['merchant'].notna().mean():.0%})")
    print(f"  Có date       : {out['date'].notna().sum()} ({out['date'].notna().mean():.0%})")
    print(f"  Có total      : {out['total'].notna().sum()} ({out['total'].notna().mean():.0%})")

    # Chia dev/test ngẫu nhiên, stratify không bắt buộc ở đây
    random.seed(RANDOM_SEED)
    indices = list(range(n))
    random.shuffle(indices)
    n_dev = int(n * DEV_RATIO)
    dev_set = set(indices[:n_dev])
    out["split"] = ["dev" if i in dev_set else "test" for i in range(n)]
    print(f"\n  Tập dev  : {n_dev} ảnh")
    print(f"  Tập test : {n - n_dev} ảnh")

    # Lưu
    out.to_csv(OUT_CSV, index=False, encoding="utf-8-sig")
    print(f"\n✅ Đã lưu: {OUT_CSV}")
    print("\nVí dụ 5 dòng đầu:")
    print(out[["filename", "merchant", "date", "total", "split"]].head().to_string(index=False))


if __name__ == "__main__":
    main()
