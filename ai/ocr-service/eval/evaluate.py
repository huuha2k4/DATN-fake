# eval/evaluate.py
"""
Đánh giá pipeline OCR theo quy trình 3 split: train / val / test.

Quy trình:
  - train (60%, 693 ảnh) : phát triển rule và train ML
  - val   (15%, 173 ảnh) : chọn ngưỡng, kiểm tra trong quá trình phát triển
  - test  (25%, 289 ảnh) : đánh giá cuối MỘT LẦN DUY NHẤT, không sửa sau

Cách dùng:
  # Đo trên val (trong quá trình phát triển)
  python eval/evaluate.py --split val

  # Đo trên tất cả split (tổng hợp, không dùng để điều chỉnh)
  python eval/evaluate.py --split all

  # Đánh giá cuối — chỉ chạy một lần khi đã đóng băng pipeline
  python eval/evaluate.py --split test --final

  # Dùng cache JSON (nhanh hơn nhiều)
  python eval/evaluate.py --split val --cached-only
"""

import sys
import json
import argparse
import time
from pathlib import Path

sys.path.append(".")

import cv2
import numpy as np
import pandas as pd
from rapidfuzz import fuzz

from app.extractor import (
    strip_accents, extract_total, extract_total_by_position,
    extract_datetime, extract_merchant,
)
from app.layout import group_lines
from app.ocr_engine import OCREngine
from app.pipeline import ReceiptPipeline
from app.preprocess import preprocess, rotate_to_portrait

CACHE_DIR = Path("eval/ocr_cache")

CONFIGS = {
    "P0_baseline": dict(resize=False, contrast=False),
    "P1_resize":   dict(resize=True,  contrast=False),
    "P2_contrast": dict(resize=True,  contrast=True),
}


# ---------------------------------------------------------------------------
# Load items từ cache hoặc chạy OCR trực tiếp
# ---------------------------------------------------------------------------

def load_items(img_path: str, filename: str, engine: OCREngine,
               prep: dict, cached_only: bool) -> tuple:
    """Trả về (items, lines, time_s) hoặc (None, None, 0) nếu lỗi."""
    cache_path = CACHE_DIR / (filename + ".json")

    if cache_path.exists():
        data = json.loads(cache_path.read_text(encoding="utf-8"))
        return data["items"], group_lines(data["items"]), 0.0

    if cached_only:
        return None, None, 0.0

    img = cv2.imread(img_path)
    if img is None:
        return None, None, 0.0

    t0 = time.time()
    if img.shape[1] > img.shape[0]:
        img = rotate_to_portrait(img, engine=engine)
    img_p = preprocess(img, **prep)
    items = engine.read(img_p)
    return items, group_lines(items), time.time() - t0


# ---------------------------------------------------------------------------
# So sánh kết quả với nhãn
# ---------------------------------------------------------------------------

def compare_row(pred: dict, row: pd.Series) -> dict:
    # Total
    pred_total = pred.get("total_amount")
    try:
        true_total = int(float(str(row["total"]))) \
            if pd.notna(row.get("total")) else None
    except ValueError:
        true_total = None
    total_ok = (pred_total == true_total) \
        if (pred_total is not None and true_total is not None) else False

    # Date
    pred_date = pred.get("transaction_date")
    true_date = str(row.get("date", "") or "").strip()
    true_date = true_date if true_date and true_date != "nan" else None
    date_ok = (pred_date == true_date) \
        if (pred_date and true_date) else False

    # Merchant sim
    pred_m = str(pred.get("merchant_name") or "")
    true_m = str(row.get("merchant") or "")
    merchant_sim = fuzz.ratio(strip_accents(pred_m), strip_accents(true_m))

    return {
        "filename":      row["filename"],
        "split":         row.get("split", ""),
        "total_ok":      total_ok,
        "date_ok":       date_ok,
        "merchant_sim":  merchant_sim,
        "pred_total":    pred_total,
        "true_total":    true_total,
        "pred_date":     pred_date,
        "true_date":     true_date,
        "pred_merchant": pred.get("merchant_name"),
        "true_merchant": true_m,
        "confidence":    pred.get("confidence", 0.0),
    }


# ---------------------------------------------------------------------------
# Đánh giá một config trên một DataFrame
# ---------------------------------------------------------------------------

def evaluate_split(config_name: str, prep: dict, engine: OCREngine,
                   df: pd.DataFrame, cached_only: bool) -> dict:
    rows, times = [], []

    for _, row in df.iterrows():
        img_path = str(row.get("img_path") or f"data/images/{row['filename']}")
        items, lines, t = load_items(
            img_path, row["filename"], engine, prep, cached_only
        )
        if items is None:
            continue
        times.append(t)

        # Trích xuất
        date_str, time_str = extract_datetime(lines)
        all_text = " ".join(strip_accents(l) for l in lines)
        is_pending = any(kw in all_text for kw in [
            "giao dich treo", "pending transaction"
        ])

        # Ưu tiên ML extractor nếu có
        try:
            from ml.predictor import MLExtractor
            _ext = MLExtractor()
            total = None if is_pending else (
                _ext.extract_total(items, lines) or
                extract_total_by_position(items) or
                extract_total(lines)
            )
        except Exception:
            total = None if is_pending else (
                extract_total_by_position(items) or extract_total(lines)
            )

        pred = {
            "merchant_name":    extract_merchant(lines, items=items),
            "transaction_date": date_str,
            "total_amount":     total,
            "confidence":       float(np.mean([it["score"] for it in items]))
                                if items else 0.0,
        }
        rows.append(compare_row(pred, row))

    if not rows:
        return {}

    res = pd.DataFrame(rows)
    n   = len(res)

    summary = {
        "config":            config_name,
        "n_images":          n,
        "total_acc_%":       round(res["total_ok"].mean() * 100, 1),
        "date_acc_%":        round(res["date_ok"].mean() * 100, 1),
        "merchant_sim_avg":  round(res["merchant_sim"].mean(), 1),
        "merchant_acc_80%":  round((res["merchant_sim"] >= 80).mean() * 100, 1),
        "total_null_%":      round(res["pred_total"].isna().mean() * 100, 1),
        "avg_time_s":        round(sum(times) / max(len(times), 1), 3),
    }
    return summary, res


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--split", default="val",
                        choices=["train", "val", "test", "all"],
                        help="Split để đánh giá (mặc định: val)")
    parser.add_argument("--config", default=None,
                        help="Chỉ chạy 1 config")
    parser.add_argument("--cached-only", action="store_true",
                        help="Chỉ dùng cache JSON, không chạy OCR lại")
    parser.add_argument("--final", action="store_true",
                        help="Đánh giá cuối — ghi cảnh báo nếu không phải test")
    args = parser.parse_args()

    # Cảnh báo quy trình
    if args.final and args.split != "test":
        print(f"[WARN] --final nên dùng với --split test, không phải {args.split}")
    if args.split == "test" and not args.final:
        print("[WARN] Đang đo trên tập test nhưng chưa dùng flag --final.")
        print("       Chỉ chạy test một lần cuối sau khi đóng băng pipeline.")
        print("       Thêm --final để xác nhận đây là lần chạy cuối.")
        sys.exit(1)

    # Load nhãn
    df = pd.read_csv("data/labels.csv", dtype=str)

    if args.split == "all":
        splits_to_run = ["train", "val", "test"]
    else:
        splits_to_run = [args.split]

    engine = OCREngine()
    configs_to_run = (
        {args.config: CONFIGS[args.config]}
        if args.config and args.config in CONFIGS
        else CONFIGS
    )

    # Chạy từng split
    for split_name in splits_to_run:
        split_df = df[df["split"] == split_name].reset_index(drop=True)
        print(f"\n{'='*65}")
        print(f"SPLIT: {split_name.upper()} — {len(split_df)} ảnh")
        if split_name == "test" and args.final:
            print("*** ĐÂY LÀ ĐÁNH GIÁ CUỐI CÙNG — KHÔNG SỬA SAU KHI XEM KẾT QUẢ ***")
        print(f"{'='*65}")

        summaries, detail_frames = [], []

        for cfg_name, prep in configs_to_run.items():
            print(f"\n▶ Config: {cfg_name} ({'cached' if args.cached_only else 'live'}) ...")
            result = evaluate_split(
                cfg_name, prep, engine, split_df, args.cached_only
            )
            if not result:
                continue
            summary, detail_df = result
            summaries.append(summary)
            detail_frames.append(detail_df)

            print(f"  total={summary['total_acc_%']}%  "
                  f"date={summary['date_acc_%']}%  "
                  f"merchant_sim={summary['merchant_sim_avg']}  "
                  f"null={summary['total_null_%']}%")

        if not summaries:
            print("  Không có kết quả (thiếu cache? Chạy cache_ocr.py trước)")
            continue

        # Lưu kết quả
        out_df = pd.DataFrame(summaries)
        summary_path = f"eval/summary_{split_name}.csv"
        out_df.to_csv(summary_path, index=False, encoding="utf-8-sig")

        # Lưu detail cho config tốt nhất (P2)
        best_cfg = "P2_contrast" if "P2_contrast" in [s["config"] for s in summaries] \
            else summaries[-1]["config"]
        for cfg_name, detail_df in zip([s["config"] for s in summaries], detail_frames):
            detail_path = f"eval/detail_{split_name}_{cfg_name}.csv"
            detail_df.to_csv(detail_path, index=False, encoding="utf-8-sig")

        print(f"\n  Tổng hợp ({split_name}):")
        print(out_df.to_string(index=False))
        print(f"\n  ✅ Lưu: {summary_path}")

    # Nếu chạy all, in bảng so sánh train/val/test
    if args.split == "all" and len(splits_to_run) == 3:
        print(f"\n{'='*65}")
        print("SO SÁNH TRAIN / VAL / TEST (config P2_contrast):")
        print(f"{'='*65}")
        rows = []
        for s in ["train", "val", "test"]:
            p = Path(f"eval/summary_{s}.csv")
            if p.exists():
                sdf = pd.read_csv(p)
                row = sdf[sdf["config"] == "P2_contrast"]
                if not row.empty:
                    r = row.iloc[0]
                    rows.append({
                        "split": s,
                        "n":     r["n_images"],
                        "total_acc_%":      r["total_acc_%"],
                        "date_acc_%":       r["date_acc_%"],
                        "merchant_acc_80%": r["merchant_acc_80%"],
                    })
        if rows:
            print(pd.DataFrame(rows).to_string(index=False))
            print()
            print("Chênh lệch train→test nhỏ = tổng quát hóa tốt.")
            print("Chênh lệch lớn = overfitting hoặc leakage mềm.")


if __name__ == "__main__":
    main()
