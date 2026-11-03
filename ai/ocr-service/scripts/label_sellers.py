# scripts/label_sellers.py
"""
Gán nhãn bổ sung cho sellers chưa được từ điển nhận ra.
Dùng rule đơn giản dựa vào từ khóa trong tên.

Chạy: python scripts/label_sellers.py
"""
import sys
sys.path.append(".")

import pandas as pd
from app.classify.normalize import strip_accents


def infer_category(text: str):
    n = strip_accents(str(text)).lower()

    # Noise — bỏ qua
    noise_kws = [
        "ten dai ly", "ngay kinh doanh", "giam gia", "ren dai ly",
        "www", "linh kien", "tien tra", "ban hang", "hoa don",
        "p.cam", "tp.cam", "qnh",
    ]
    if any(k in n for k in noise_kws):
        return None

    food_kws = [
        "cafe", "coffee", "ca phe", "quan an", "nha hang",
        "com", "pho", "bun", "banh", "tea", "tra sua",
        "sushi", "pizza", "burger", "food", "an uong",
        "dimsum", "dim sum", "buffet", "lau", "nuong",
        "hai san", "bbq", "restaurant", "eatery",
        "books n coffee", "guitar cafe", "just goop",
        "aozorora", "thuc cofee", "thuc coffee",
        "milan", "velutino",
    ]
    if any(k in n for k in food_kws):
        return "food"

    shopping_kws = [
        "sieu thi", "vincommerce", "winmart", "co op", "coop",
        "saigon co", "vm ", "vm+", "satra", "siêu thị",
        "shop", "store", "cua hang", "dien may", "fpt",
        "mart", "market", "plaza", "indochina", "uniqlo",
        "fashion", "clothes", "sctc", "minh loan",
    ]
    if any(k in n for k in shopping_kws):
        return "shopping"

    transport_kws = ["taxi", "xe", "petro", "xang", "fuel", "parking", "gui xe"]
    if any(k in n for k in transport_kws):
        return "transport"

    health_kws = ["benh vien", "phong kham", "nha thuoc", "thuoc", "clinic",
                  "hospital", "y te", "suc khoe"]
    if any(k in n for k in health_kws):
        return "health"

    bills_kws = ["dien luc", "evn", "nuoc", "internet", "viettel",
                 "vinaphone", "mobifone", "vnpt", "fpt", "wifi"]
    if any(k in n for k in bills_kws):
        return "bills"

    entertainment_kws = ["cinema", "cgv", "galaxy", "phim", "karaoke", "game"]
    if any(k in n for k in entertainment_kws):
        return "entertainment"

    education_kws = ["truong", "school", "university", "hoc", "dao tao"]
    if any(k in n for k in education_kws):
        return "education"

    travel_kws = ["airline", "hotel", "khach san", "resort", "travel", "tour"]
    if any(k in n for k in travel_kws):
        return "travel"

    transfer_kws = ["bank", "ngan hang", "momo", "zalopay", "vnpay", "atm"]
    if any(k in n for k in transfer_kws):
        return "transfer"

    return "other"


def main():
    df = pd.read_csv("classify_data/mcocr_sellers_labeled.csv")
    needs_label = df["auto"] == False

    added = 0
    for idx, row in df[needs_label].iterrows():
        cat = infer_category(row["text"])
        if cat:
            df.at[idx, "category"] = cat
            added += 1

    df.to_csv("classify_data/mcocr_sellers_labeled.csv", index=False, encoding="utf-8-sig")

    labeled = df[df["category"].notna() & (df["category"] != "")]
    unlabeled = df[df["category"].isna() | (df["category"] == "")]

    print(f"Gán thêm được: {added} dòng")
    print(f"\nPhân bố danh mục ({len(labeled)} dòng có nhãn):")
    print(labeled["category"].value_counts().to_string())
    print(f"\nCòn trống: {len(unlabeled)} dòng (sẽ bị bỏ qua khi build dataset)")


if __name__ == "__main__":
    main()
