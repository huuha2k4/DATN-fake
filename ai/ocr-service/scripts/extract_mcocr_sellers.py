# scripts/extract_mcocr_sellers.py
"""
Xuất tên cửa hàng từ MC-OCR, tự động gán nhãn qua từ điển,
lưu ra mcocr_sellers_labeled.csv để dùng làm dữ liệu thật.

Cách dùng (từ thư mục ocr-service/):
    python scripts/extract_mcocr_sellers.py

Output:
    classify_data/mcocr_sellers_to_label.csv   — tất cả sellers chưa gán nhãn
    classify_data/mcocr_sellers_labeled.csv    — sellers đã gán nhãn tự động + thủ công
"""

import sys
sys.path.append(".")

import pandas as pd
from app.classify.normalize import normalize
from app.classify.dictionary import BrandDictionary

SRC_CSV   = "data/mcocr_train_df.csv/mcocr_train_df.csv"
TO_LABEL  = "classify_data/mcocr_sellers_to_label.csv"
LABELED   = "classify_data/mcocr_sellers_labeled.csv"


def fix_encoding(s: str) -> str:
    try:
        return s.encode("latin-1").decode("utf-8")
    except Exception:
        return s


def main():
    print(f"Đọc {SRC_CSV}...")
    df = pd.read_csv(SRC_CSV, dtype=str)

    # Lấy tất cả dòng có nhãn SELLER
    sellers = []
    for _, row in df.iterrows():
        texts  = [fix_encoding(t.strip()) for t in str(row["anno_texts"]).split("|||")]
        labels = [l.strip() for l in str(row["anno_labels"]).split("|||")]
        for text, label in zip(texts, labels):
            if label == "SELLER" and text and text != "nan":
                sellers.append(fix_encoding(text).strip())

    # Loại trùng, loại rỗng
    sellers = list({s for s in sellers if len(s) >= 2})
    print(f"Tổng sellers unique: {len(sellers)}")

    # Lưu file chưa gán nhãn (để gán tay hoặc dùng LLM)
    to_label = pd.DataFrame({"text": sellers})
    to_label.to_csv(TO_LABEL, index=False, encoding="utf-8-sig")
    print(f"Lưu danh sách chưa gán nhãn: {TO_LABEL}")

    # Tự động gán nhãn qua từ điển
    print("\nTự động gán nhãn qua từ điển...")
    brand_dict = BrandDictionary("classify_data/brands.csv")

    rows = []
    auto = manual_needed = 0
    for text in sellers:
        hit = brand_dict.lookup(text)
        if hit:
            rows.append({
                "text":     text,
                "category": hit[0],
                "group":    normalize(hit[1]),
                "source":   "real",
                "auto":     True,
            })
            auto += 1
        else:
            rows.append({
                "text":     text,
                "category": "",           # cần gán tay
                "group":    normalize(text)[:30],
                "source":   "real",
                "auto":     False,
            })
            manual_needed += 1

    labeled = pd.DataFrame(rows)
    labeled.to_csv(LABELED, index=False, encoding="utf-8-sig")

    print(f"  Tự động gán được : {auto}")
    print(f"  Cần gán thủ công : {manual_needed}")
    print(f"Lưu: {LABELED}")
    print()
    print("Phân bố danh mục tự động:")
    print(labeled[labeled["auto"]]["category"].value_counts().to_string())
    print()
    print("Gợi ý: mở classify_data/mcocr_sellers_labeled.csv,")
    print("điền cột 'category' cho các dòng auto=False rồi chạy build_dataset.py")


if __name__ == "__main__":
    main()
