# eval/analyze_errors.py
"""
Giai đoạn A: phân tích lỗi trên train+val.

Với mỗi ảnh sai, lấy raw OCR text từ cache và phân loại:
  1. ocr_missing   : số đúng KHÔNG có trong OCR text
  2. wrong_line    : số đúng CÓ trong OCR text nhưng chọn sai dòng
  3. format_error  : số có nhưng parse sai (format lạ)
  4. null_pred     : pipeline trả None trong khi có số đúng
  5. date_ocr_err  : ngày sai do OCR đọc nhầm chữ số
  6. date_missing  : ngày không có trong OCR text
  7. merchant_miss : merchant không có trong từ điển / ML sai

Chạy: python eval/analyze_errors.py [--split train|val|trainval]
Output: eval/error_analysis.csv + in bảng phân loại
"""
import sys, json, argparse
sys.path.append(".")

from pathlib import Path
import numpy as np
import pandas as pd
from app.layout import group_lines
from app.extractor import find_numbers, strip_accents
from app.extractor import TOTAL_KEYWORDS, TOTAL_KEYWORD_TIERS

CACHE_DIR = Path("eval/ocr_cache")


def get_lines(filename: str):
    cache = CACHE_DIR / (filename + ".json")
    if not cache.exists():
        return None, None
    data = json.loads(cache.read_text(encoding="utf-8"))
    items = data["items"]
    lines = group_lines(items)
    return items, lines


def classify_total_error(pred_total, true_total, lines) -> str:
    if true_total is None:
        return "no_label"
    if pred_total == true_total:
        return "correct"

    # Kiểm tra số đúng có trong OCR text không
    all_nums = [v for l in lines for v in find_numbers(l)]
    if true_total not in all_nums:
        return "ocr_missing"      # OCR đọc sai ký tự → không sửa được

    # Số đúng có nhưng pipeline chọn sai
    if pred_total is None:
        return "null_pred"        # Pipeline trả None dù có số

    # Kiểm tra có keyword tổng tiền trên dòng đúng không
    for line in lines:
        if true_total in find_numbers(line):
            n = strip_accents(line)
            has_kw = any(k in n for k in TOTAL_KEYWORDS)
            if has_kw:
                return "wrong_line_kw"   # Có keyword nhưng chọn nhầm dòng khác
            else:
                return "wrong_line_nokw" # Không có keyword, chỉ dựa vào ML/số lớn
    return "format_error"


def classify_date_error(pred_date, true_date, lines) -> str:
    if true_date is None:
        return "no_label"
    if pred_date == true_date:
        return "correct"

    # Tìm chuỗi ngày đúng trong lines
    true_compact = true_date.replace("-", "")  # 20200815
    found_in_ocr = any(true_compact in strip_accents(l) or
                       true_date.replace("-", "/") in l or
                       true_date.replace("-", ".") in l
                       for l in lines)
    if not found_in_ocr:
        return "ocr_missing"
    if pred_date is None:
        return "null_pred"
    return "ocr_digit_error"   # Ngày có trong OCR nhưng đọc sai 1-2 chữ số


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--split", default="trainval",
                        choices=["train", "val", "trainval"])
    args = parser.parse_args()

    df = pd.read_csv("data/labels.csv", dtype=str)
    if args.split == "trainval":
        df = df[df["split"].isin(["train", "val"])].reset_index(drop=True)
    else:
        df = df[df["split"] == args.split].reset_index(drop=True)

    print(f"Phân tích lỗi trên {args.split}: {len(df)} ảnh\n")

    # Load kết quả đã đo từ detail file
    detail_path = "eval/detail_val_P2_contrast.csv"
    if args.split in ["train", "trainval"]:
        detail_path = "eval/detail_train_P2_contrast.csv"

    if not Path(detail_path).exists():
        print(f"[ERROR] Chưa có {detail_path}. Chạy evaluate.py --split {args.split} trước.")
        sys.exit(1)

    det = pd.read_csv(detail_path, dtype=str)

    rows = []
    total_cats = {}
    date_cats  = {}
    merchant_cats = {}

    for _, row in det.iterrows():
        fname = row["filename"]
        _, lines = get_lines(fname)
        if lines is None:
            continue

        # Parse values
        try:
            pred_total = int(float(row["pred_total"])) if pd.notna(row.get("pred_total")) else None
        except: pred_total = None
        try:
            true_total = int(float(row["true_total"])) if pd.notna(row.get("true_total")) else None
        except: true_total = None

        pred_date = row.get("pred_date", "") or None
        true_date = row.get("true_date", "") or None
        if str(pred_date) == "nan": pred_date = None
        if str(true_date) == "nan": true_date = None

        # Phân loại lỗi total
        tot_cat = classify_total_error(pred_total, true_total, lines)
        total_cats[tot_cat] = total_cats.get(tot_cat, 0) + 1

        # Phân loại lỗi date
        dat_cat = classify_date_error(pred_date, true_date, lines)
        date_cats[dat_cat] = date_cats.get(dat_cat, 0) + 1

        # Merchant
        m_sim = float(row.get("merchant_sim", 0) or 0)
        m_cat = "correct" if m_sim >= 80 else (
            "no_label" if not str(row.get("true_merchant","")).strip() else "wrong"
        )
        merchant_cats[m_cat] = merchant_cats.get(m_cat, 0) + 1

        if tot_cat not in ("correct", "no_label") or dat_cat not in ("correct", "no_label"):
            rows.append({
                "filename":   fname,
                "split":      row.get("split",""),
                "total_cat":  tot_cat,
                "date_cat":   dat_cat,
                "pred_total": pred_total,
                "true_total": true_total,
                "pred_date":  pred_date,
                "true_date":  true_date,
                "pred_merchant": row.get("pred_merchant",""),
                "true_merchant": row.get("true_merchant",""),
                "merchant_sim":  m_sim,
            })

    n = len(det)
    print("=" * 60)
    print("PHÂN LOẠI LỖI TỔNG TIỀN:")
    print("=" * 60)
    for cat, cnt in sorted(total_cats.items(), key=lambda x: -x[1]):
        pct = cnt / n * 100
        action = {
            "correct":       "✅ Đúng",
            "no_label":      "⬜ Không có nhãn",
            "ocr_missing":   "❌ OCR sai ký tự → không sửa được",
            "wrong_line_kw": "🔧 Chọn sai dòng (có keyword) → cải thiện được",
            "wrong_line_nokw":"🔧 Chọn sai dòng (không keyword) → cải thiện được",
            "null_pred":     "🔧 Trả None dù có số → cải thiện được",
            "format_error":  "🔧 Lỗi parse format → cải thiện được",
        }.get(cat, cat)
        print(f"  {cat:22s}: {cnt:4d} ({pct:5.1f}%)  {action}")

    print()
    print("=" * 60)
    print("PHÂN LOẠI LỖI NGÀY:")
    print("=" * 60)
    for cat, cnt in sorted(date_cats.items(), key=lambda x: -x[1]):
        pct = cnt / n * 100
        action = {
            "correct":        "✅ Đúng",
            "no_label":       "⬜ Không có nhãn",
            "ocr_missing":    "❌ OCR không đọc được ngày",
            "null_pred":      "🔧 Trả None dù có ngày",
            "ocr_digit_error":"❌ OCR đọc sai chữ số ngày",
        }.get(cat, cat)
        print(f"  {cat:22s}: {cnt:4d} ({pct:5.1f}%)  {action}")

    print()
    print("=" * 60)
    print("PHÂN LOẠI MERCHANT:")
    print("=" * 60)
    for cat, cnt in sorted(merchant_cats.items(), key=lambda x: -x[1]):
        pct = cnt / n * 100
        print(f"  {cat:22s}: {cnt:4d} ({pct:5.1f}%)")

    # Lưu chi tiết lỗi
    out = pd.DataFrame(rows)
    out_path = f"eval/error_analysis_{args.split}.csv"
    out.to_csv(out_path, index=False, encoding="utf-8-sig")
    print(f"\n✅ Chi tiết {len(rows)} ảnh lỗi → {out_path}")

    # In top 20 ca sai total có thể sửa được
    fixable = out[out["total_cat"].isin(["wrong_line_kw", "wrong_line_nokw", "null_pred"])]
    if len(fixable) > 0:
        print(f"\n--- Top 20 ca total sai CÓ THỂ SỬA ({len(fixable)} ca) ---")
        for _, r in fixable.head(20).iterrows():
            _, lines = get_lines(r["filename"])
            if lines is None: continue
            print(f"\n[{r['total_cat']}] pred={r['pred_total']} true={r['true_total']} | {r['filename']}")
            for i, l in enumerate(lines):
                nums = find_numbers(l)
                if nums or any(k in strip_accents(l) for k in ["tong","thanh","total"]):
                    print(f"  [{i:02d}] nums={nums} | {l[:80]}")


if __name__ == "__main__":
    main()
