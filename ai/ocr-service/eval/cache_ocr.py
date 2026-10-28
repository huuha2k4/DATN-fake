# eval/cache_ocr.py
"""
Chạy OCR trên toàn bộ tập ảnh và lưu kết quả ra JSON.
Sau này sửa extractor/layout không cần chạy lại OCR nữa.

Cách dùng (từ thư mục ocr-service/):
    python eval/cache_ocr.py                  # cache toàn bộ
    python eval/cache_ocr.py --split test     # chỉ cache tập test
    python eval/cache_ocr.py --overwrite      # ghi đè cache đã có

Output:
    eval/ocr_cache/<filename>.json
    {
        "filename": "mcocr_public_xxx.jpg",
        "img_shape": [h, w],
        "items": [{"box": [...], "text": "...", "score": 0.97}, ...]
    }
"""

import sys
import json
import argparse
from pathlib import Path

sys.path.append(".")

import cv2
import pandas as pd

from app.ocr_engine import OCREngine
from app.preprocess import preprocess, rotate_to_portrait

CACHE_DIR = Path("eval/ocr_cache")


def cache_one(img_path: str, engine: OCREngine, overwrite: bool = False) -> dict:
    fname = Path(img_path).name
    out_path = CACHE_DIR / (fname + ".json")

    if out_path.exists() and not overwrite:
        return {"status": "skip", "file": fname}

    img = cv2.imread(img_path)
    if img is None:
        return {"status": "error", "file": fname, "msg": "cannot read image"}

    # Xoay về portrait nếu cần
    if img.shape[1] > img.shape[0]:
        img = rotate_to_portrait(img, engine=engine)

    # Tiền xử lý
    img_p = preprocess(img, resize=True, contrast=True)

    # OCR
    items = engine.read(img_p)

    # Lưu JSON
    data = {
        "filename": fname,
        "img_shape": list(img_p.shape[:2]),
        "items": items,
    }
    out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"status": "ok", "file": fname, "n_items": len(items)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--split", choices=["train", "test", "dev", "all"], default="all")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv("data/labels.csv", dtype=str)
    if args.split != "all" and "split" in df.columns:
        df = df[df["split"] == args.split].reset_index(drop=True)

    print(f"Sẽ cache {len(df)} ảnh → {CACHE_DIR}/")
    engine = OCREngine()

    ok = skip = err = 0
    for i, row in df.iterrows():
        img_path = row.get("img_path") or f"data/images/{row['filename']}"
        result = cache_one(img_path, engine, overwrite=args.overwrite)

        if result["status"] == "ok":
            ok += 1
        elif result["status"] == "skip":
            skip += 1
        else:
            err += 1
            print(f"  [ERR] {result['file']}: {result.get('msg')}")

        if (i + 1) % 50 == 0:
            print(f"  {i+1}/{len(df)} — ok={ok} skip={skip} err={err}")

    print(f"\n✅ Xong: ok={ok}, skip={skip}, err={err}")
    print(f"Cache tại: {CACHE_DIR.resolve()}")


if __name__ == "__main__":
    main()
