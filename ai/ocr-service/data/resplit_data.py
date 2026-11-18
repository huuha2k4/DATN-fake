# data/resplit_data.py
"""
Chia lại dữ liệu theo quy trình đúng:
  train : 60% (693 ảnh) — phát triển rule, train ML
  val   : 15% (174 ảnh) — chọn ngưỡng, kiểm tra trong quá trình phát triển
  test  : 25% (288 ảnh) — đánh giá cuối một lần, không điều chỉnh sau đó

Nguyên tắc:
  - RANDOM_SEED cố định để tái lập
  - Chia ngẫu nhiên đơn giản (1155 ảnh từ cùng nguồn MC-OCR)
  - Lưu danh sách ảnh từng split để kiểm soát

Ghi chú về leakage mềm (ghi vào báo cáo):
  Rule extractor.py và brands.csv đã được điều chỉnh dựa trên quan sát
  một số ảnh thuộc tập test cũ (dev/test 30/70). Sau khi chia lại, tập
  test mới (25%) chứa một phần ảnh từ cả tập dev lẫn test cũ — không
  loại bỏ hoàn toàn leakage mềm. Kết quả test được hiểu là đánh giá
  nội bộ, có nguy cơ lạc quan nhẹ.

Chạy: python data/resplit_data.py
"""

import random
from pathlib import Path

import pandas as pd

SRC_CSV   = Path("data/labels.csv")
OUT_CSV   = Path("data/labels.csv")
SEED      = 42

# Tỉ lệ mới
TRAIN_RATIO = 0.60
VAL_RATIO   = 0.15
# test = phần còn lại (~25%)


def main():
    df = pd.read_csv(SRC_CSV, dtype=str)
    n  = len(df)
    print(f"Tổng ảnh: {n}")
    print(f"Phân bố cũ:\n{df['split'].value_counts()}\n")

    # Lưu backup split cũ
    df["split_old"] = df["split"]

    # Xáo ngẫu nhiên với seed cố định
    indices = list(range(n))
    random.seed(SEED)
    random.shuffle(indices)

    n_train = int(n * TRAIN_RATIO)
    n_val   = int(n * VAL_RATIO)

    new_split = [""] * n
    for rank, idx in enumerate(indices):
        if rank < n_train:
            new_split[idx] = "train"
        elif rank < n_train + n_val:
            new_split[idx] = "val"
        else:
            new_split[idx] = "test"

    df["split"] = new_split

    print(f"Phân bố mới:")
    vc = df["split"].value_counts()
    for s in ["train", "val", "test"]:
        c = vc.get(s, 0)
        print(f"  {s:5s}: {c:4d} ({c/n*100:.1f}%)")

    df.to_csv(OUT_CSV, index=False, encoding="utf-8-sig")
    print(f"\n✅ Đã lưu: {OUT_CSV}")
    print("\nLưu ý: split_old giữ nguyên phân bố cũ (dev/test 30/70) để tham chiếu")

    # Ghi danh sách ảnh từng split để kiểm soát
    for s in ["train", "val", "test"]:
        fnames = df[df["split"] == s]["filename"].tolist()
        Path(f"data/split_{s}.txt").write_text("\n".join(fnames), encoding="utf-8")
        print(f"  split_{s}.txt: {len(fnames)} ảnh")


if __name__ == "__main__":
    main()
