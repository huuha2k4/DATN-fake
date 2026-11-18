# eval/export_val_errors.py
"""
Bước 1: Xuất toàn bộ ca tổng tiền sai trên Val.

Mỗi ca có: img_id, ground_truth, predicted_total,
           ocr_text, error_type (A/B/C), ghi chú.

Chạy: python eval/export_val_errors.py
Output: eval/val_total_errors.csv
"""
import sys, json
sys.path.append(".")

from pathlib import Path
import pandas as pd
from app.layout import group_lines
from app.extractor import (
    find_numbers, strip_accents,
    TOTAL_KEYWORDS, TOTAL_KEYWORD_TIERS,
    EXCLUDE_KEYWORDS,
)

CACHE_DIR = Path("eval/ocr_cache")


def classify_error(pred_total, true_total, lines, items) -> dict:
    """
    Phân loại lỗi theo 3 nhóm A/B/C.
    Trả dict: {error_type, primary_cause, notes, true_in_ocr, lines_with_true}
    """
    all_nums    = [v for l in lines for v in find_numbers(l)]
    true_in_ocr = true_total in all_nums

    # Tìm dòng chứa true_total
    true_lines = [(i, l) for i, l in enumerate(lines)
                  if true_total in find_numbers(l)]

    # ── Nhóm A: OCR không đọc được số đúng ─────────────────
    if not true_in_ocr:
        # Kiểm tra có OCR đọc sai ký tự không (số gần đúng)
        close_nums = [v for v in all_nums
                      if v and abs(v - true_total) / max(true_total, 1) < 0.05]
        if close_nums:
            return {
                "error_type": "A",
                "primary_cause": "ocr_digit_error",
                "notes": f"Số gần đúng trong OCR: {close_nums[:3]}",
                "true_in_ocr": False,
                "lines_with_true": "",
            }
        return {
            "error_type": "A",
            "primary_cause": "ocr_missing",
            "notes": "Số đúng không xuất hiện trong OCR text",
            "true_in_ocr": False,
            "lines_with_true": "",
        }

    # ── Nhóm C: Lỗi parse số ────────────────────────────────
    # Tìm xem có token nào trong lines mà parse ra sai không
    from app.extractor import NUMBER_RE, parse_amount
    raw_tokens_with_true = []
    for line in lines:
        for m in NUMBER_RE.finditer(line):
            tok = m.group()
            parsed = parse_amount(tok)
            if parsed and parsed == true_total:
                raw_tokens_with_true.append(tok)

    # Kiểm tra có token nào bị parse thành giá trị sai không
    raw_tokens_wrong = []
    for line in lines:
        for m in NUMBER_RE.finditer(line):
            tok = m.group()
            # Số trong text khớp với true nhưng parse ra sai
            digits_only = tok.replace(".", "").replace(",", "")
            if digits_only.isdigit() and int(digits_only) == true_total:
                parsed = parse_amount(tok)
                if parsed != true_total:
                    raw_tokens_wrong.append((tok, parsed))

    if raw_tokens_wrong:
        return {
            "error_type": "C",
            "primary_cause": "parse_error",
            "notes": f"Token bị parse sai: {raw_tokens_wrong[:3]}",
            "true_in_ocr": True,
            "lines_with_true": " | ".join(l[:60] for _, l in true_lines[:2]),
        }

    # ── Nhóm B: Chọn sai dòng ───────────────────────────────
    true_line_texts = [l for _, l in true_lines]
    true_line_norms = [strip_accents(l) for l in true_line_texts]

    has_total_kw_on_true = any(
        any(k in n for k in TOTAL_KEYWORDS) for n in true_line_norms
    )
    has_excl_kw_on_true = any(
        any(k in n for k in EXCLUDE_KEYWORDS) for n in true_line_norms
    )

    if has_total_kw_on_true and has_excl_kw_on_true:
        sub = "wrong_line_kw_mixed"
        note = "Dòng có cả keyword tổng lẫn loại trừ — bị lọc nhầm"
    elif has_total_kw_on_true:
        sub = "wrong_line_kw"
        note = "Có keyword tổng nhưng chọn nhầm dòng khác"
    else:
        sub = "wrong_line_nokw"
        note = "Không có keyword tổng — ML/rule chọn số lớn hơn"

    return {
        "error_type": "B",
        "primary_cause": sub,
        "notes": note,
        "true_in_ocr": True,
        "lines_with_true": " | ".join(l[:60] for l in true_line_texts[:2]),
    }


def main():
    det = pd.read_csv("eval/detail_val_P2_contrast.csv", dtype=str)
    n   = len(det)

    rows = []
    error_summary = {"A_ocr_missing": 0, "A_digit_error": 0,
                     "B_kw": 0, "B_kw_mixed": 0, "B_nokw": 0,
                     "C_parse": 0}

    for _, row in det.iterrows():
        # Parse values
        try:
            pred_t = int(float(row["pred_total"])) \
                if str(row.get("pred_total","")) not in ("nan","") else None
        except Exception:
            pred_t = None
        try:
            true_t = int(float(row["true_total"])) \
                if str(row.get("true_total","")) not in ("nan","") else None
        except Exception:
            true_t = None

        if true_t is None or pred_t == true_t:
            continue

        # Load OCR
        cache = CACHE_DIR / (row["filename"] + ".json")
        if not cache.exists():
            continue
        data  = json.loads(cache.read_text(encoding="utf-8"))
        items = data["items"]
        lines = group_lines(items)

        info = classify_error(pred_t, true_t, lines, items)

        # Lấy OCR text đầy đủ của dòng chứa số liên quan
        relevant_lines = []
        for i, l in enumerate(lines):
            nums = find_numbers(l)
            n_str = strip_accents(l)
            has_tot = any(k in n_str for k in TOTAL_KEYWORDS)
            if nums or has_tot:
                relevant_lines.append(f"[{i:02d}] {l[:70]}")

        rows.append({
            "img_id":         row["filename"],
            "split":          row.get("split","val"),
            "ground_truth":   true_t,
            "predicted_total": pred_t,
            "error_type":     info["error_type"],
            "primary_cause":  info["primary_cause"],
            "notes":          info["notes"],
            "true_in_ocr":    info["true_in_ocr"],
            "lines_with_true": info["lines_with_true"],
            "ocr_relevant":   "\n".join(relevant_lines[:6]),
        })

        # Đếm
        key = f"{info['error_type']}_{info['primary_cause'].split('_')[-1]}"
        error_summary[info["primary_cause"]] = \
            error_summary.get(info["primary_cause"], 0) + 1

    # Lưu
    out = pd.DataFrame(rows)
    out_path = "eval/val_total_errors.csv"
    out.to_csv(out_path, index=False, encoding="utf-8-sig")

    # In bảng tổng hợp
    total_errors = len(out)
    print(f"\n{'='*65}")
    print(f"PHÂN LOẠI LỖI TỔNG TIỀN — VAL (n={n}, sai={total_errors})")
    print(f"{'='*65}")
    print(f"\n{'Nhóm':5} {'Nguyên nhân':28} {'Số ca':>6} {'%sai':>8} {'% tổng':>8}  Hành động")
    print("-" * 80)

    group_totals = {"A": 0, "B": 0, "C": 0}
    for cause, cnt in sorted(error_summary.items(), key=lambda x: -x[1]):
        if cnt == 0:
            continue
        grp = cause[0].upper() if cause[0].upper() in "ABC" else "B"
        # Determine group from error_type
        group_totals[out[out["primary_cause"]==cause]["error_type"].iloc[0]
                     if len(out[out["primary_cause"]==cause])>0 else "B"] += cnt

        pct_err  = cnt / total_errors * 100
        pct_all  = cnt / n * 100
        action = {
            "ocr_missing":     "❌ Không sửa được (OCR engine)",
            "ocr_digit_error": "⚠️  Thử tiền xử lý ảnh",
            "wrong_line_kw":   "🔧 Sửa rule/ML extractor",
            "wrong_line_kw_mixed": "🔧 Logic dòng ghép TOT+EXC",
            "wrong_line_nokw": "🔧 Sửa scoring/fallback",
            "parse_error":     "🔧 Sửa parse_amount/find_numbers",
        }.get(cause, "")
        print(f"  {'':3} {cause:28} {cnt:>6}  {pct_err:>7.1f}%  {pct_all:>7.1f}%  {action}")

    print(f"\n{'':5} {'TỔNG LỖI':28} {total_errors:>6}  {'100.0%':>8}  {total_errors/n*100:>7.1f}%")
    print(f"{'':5} {'Không sửa được (Nhóm A)':28} {group_totals.get('A',0):>6}  "
          f"{group_totals.get('A',0)/total_errors*100 if total_errors else 0:>7.1f}%")
    print(f"{'':5} {'Có thể sửa (Nhóm B+C)':28} "
          f"{group_totals.get('B',0)+group_totals.get('C',0):>6}  "
          f"{(group_totals.get('B',0)+group_totals.get('C',0))/total_errors*100 if total_errors else 0:>7.1f}%")
    print(f"\n✅ Chi tiết → {out_path}")
    print(f"\nGợi ý xem lỗi theo nhóm:")
    print(f"  python -c \"import pandas as pd; df=pd.read_csv('eval/val_total_errors.csv'); "
          f"print(df[df.error_type=='A'][['img_id','ground_truth','predicted_total','notes']].to_string())\"")


if __name__ == "__main__":
    main()
