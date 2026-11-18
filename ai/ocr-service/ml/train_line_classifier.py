# ml/train_line_classifier.py
"""
Huấn luyện mô hình phân loại dòng OCR.

QUAN TRỌNG — Phân tách dữ liệu đúng cách (tránh data leakage):
  - Chỉ dùng split=dev (346 ảnh) để train ML
  - split=test (809 ảnh) giữ nguyên làm eval thuần túy
  - Trong tập dev: train/val chia theo ảnh (GroupKFold / group_ids = img_id)
    để các dòng của cùng 1 hóa đơn không nằm ở cả hai phía

Dataset: mcocr_train_df.csv (1155 hóa đơn, 6586 dòng đã gán nhãn)

Cách dùng:
    python ml/train_line_classifier.py

Output:
    ml/line_classifier.pkl   model đã train
    ml/report.txt            classification report + feature importance
    ml/cv_scores.json        cross-validation scores
"""

import sys
import json
import pickle
import unicodedata
from pathlib import Path

sys.path.append(".")

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import GroupKFold, cross_val_score
from sklearn.svm import LinearSVC

ML_DIR = Path("ml")
ML_DIR.mkdir(exist_ok=True)


# ---------------------------------------------------------------------------
# Tiện ích
# ---------------------------------------------------------------------------

def strip_accents(s: str) -> str:
    s = s.replace("đ", "d").replace("Đ", "D")
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if unicodedata.category(c) != "Mn").lower()


def fix_encoding(s: str) -> str:
    try:
        return s.encode("latin-1").decode("utf-8")
    except Exception:
        return s


# ---------------------------------------------------------------------------
# Feature engineering — 20 features
# ---------------------------------------------------------------------------

# Keyword sets
TOTAL_KWS   = ["tong", "thanh", "total", "cong", "phai", "tt", "amount"]
EXCLUDE_KWS = ["khach", "thua", "mat", "giam", "tra lai", "the", "visa",
               "tien thua", "tien mat", "change"]
DATE_KWS    = ["ngay", "gio", "thoi gian", "date", "time", "ngay ban"]
SELLER_KWS  = ["coffee", "mart", "shop", "store", "minimart", "co.op",
               "vincommerce", "vinmart", "highland", "circle", "sieu thi"]
ADDR_KWS    = ["duong", "phuong", "quan", "tp", "huyen", "khu",
               "dia chi", "so", "tang", "toa"]
AMOUNT_RE   = __import__("re").compile(r"\d{1,3}(?:[.,]\d{3})+|\d{4,}")


def extract_features(
    text: str,
    position: float = 0.5,
    prev_text: str = "",
    next_text: str = "",
    box=None,
    all_heights=None,
) -> np.ndarray:
    """
    Trích xuất 20 feature từ một dòng text OCR.

    Features cơ bản (14):
      position, has_total, has_exclude, has_date, has_seller, has_addr,
      n_digits, n_letters, has_amount, log_max_amount, len_text,
      digit_ratio, has_colon, all_upper

    Features ngữ cảnh (3):
      prev_has_total   — dòng trước có keyword tổng không
      next_has_amount  — dòng sau có số tiền không
      prev_has_amount  — dòng trước có số tiền không

    Features hình học (3, nếu có box):
      rel_height       — chiều cao dòng / median chiều cao (font to hơn trung bình?)
      x_right_ratio    — vị trí x phải / width ảnh (số tiền thường gần mép phải)
      has_number_right — có block số cùng hàng bên phải không (dùng 1 nếu box cung cấp)
    """
    n = strip_accents(text)
    pn = strip_accents(prev_text)
    nn = strip_accents(next_text)

    # --- Cơ bản ---
    has_total   = float(any(k in n for k in TOTAL_KWS))
    has_exclude = float(any(k in n for k in EXCLUDE_KWS))
    has_date    = float(any(k in n for k in DATE_KWS))
    has_seller  = float(any(k in n for k in SELLER_KWS))
    has_addr    = float(any(k in n for k in ADDR_KWS))

    n_digits  = sum(c.isdigit() for c in text)
    n_letters = sum(c.isalpha() for c in text)
    n_total   = max(len(text), 1)

    amounts = AMOUNT_RE.findall(text)
    has_amount = float(len(amounts) > 0)
    max_amount = 0.0
    for a in amounts:
        try:
            v = int(a.replace(".", "").replace(",", ""))
            max_amount = max(max_amount, float(v))
        except Exception:
            pass
    log_max_amount = float(np.log1p(max_amount))

    has_colon   = float(":" in text)
    all_upper   = float(text.upper() == text and n_letters > 2)
    digit_ratio = n_digits / n_total

    # --- Ngữ cảnh ---
    prev_has_total  = float(any(k in pn for k in TOTAL_KWS))
    next_has_amount = float(bool(AMOUNT_RE.search(next_text)))
    prev_has_amount = float(bool(AMOUNT_RE.search(prev_text)))

    # --- Hình học (nếu có box) ---
    if box is not None and all_heights is not None and len(all_heights) > 0:
        ys = [p[1] for p in box]
        h = max(ys) - min(ys)
        median_h = float(np.median(all_heights)) or 1.0
        rel_height = h / median_h

        xs = [p[0] for p in box]
        img_w = max(p[0] for p in box) + 1  # xấp xỉ
        x_right_ratio = max(xs) / img_w
    else:
        rel_height    = 1.0
        x_right_ratio = 0.5

    return np.array([
        # Cơ bản
        position, has_total, has_exclude, has_date, has_seller, has_addr,
        n_digits, n_letters, has_amount, log_max_amount,
        len(text), digit_ratio, has_colon, all_upper,
        # Ngữ cảnh
        prev_has_total, next_has_amount, prev_has_amount,
        # Hình học
        rel_height, x_right_ratio,
        # Extra: tổng số lần xuất hiện keyword tổng
        sum(n.count(k) for k in TOTAL_KWS),
    ], dtype=float)


FEATURE_NAMES = [
    "position", "has_total", "has_exclude", "has_date", "has_seller", "has_addr",
    "n_digits", "n_letters", "has_amount", "log_max_amount",
    "len_text", "digit_ratio", "has_colon", "all_upper",
    "prev_has_total", "next_has_amount", "prev_has_amount",
    "rel_height", "x_right_ratio",
    "total_kw_count",
]


# ---------------------------------------------------------------------------
# Chuẩn bị dataset — chia theo ảnh (GroupKFold safe)
# ---------------------------------------------------------------------------

def build_dataset(csv_path: str, dev_filenames: set) -> tuple:
    """
    Parse mcocr_train_df.csv → (X, y, groups).

    - Chỉ lấy ảnh có filename trong dev_filenames (split=dev)
    - groups = img_id để GroupKFold chia đúng theo ảnh
    - Nhãn: TOTAL_COST | SELLER | TIMESTAMP | ADDRESS
    """
    df = pd.read_csv(csv_path, dtype=str)

    # Chỉ lấy ảnh trong tập dev
    df = df[df["img_id"].isin(dev_filenames)].reset_index(drop=True)
    print(f"  Ảnh dùng để train ML (split=dev): {len(df)}")

    X_list, y_list, groups = [], [], []

    for _, row in df.iterrows():
        img_id = row["img_id"]
        texts  = [fix_encoding(t.strip()) for t in str(row["anno_texts"]).split("|||")]
        labels = [l.strip() for l in str(row["anno_labels"]).split("|||")]
        n = len(texts)

        # Cố lấy box nếu có
        try:
            import ast
            polys = ast.literal_eval(row["anno_polygons"])
            boxes = [p.get("segmentation", [[0,0,0,0]])[0] for p in polys]
            # Chuyển segmentation flat list → list of [x,y] pairs
            boxes_parsed = []
            for b in boxes:
                if len(b) >= 4:
                    pts = [(b[i], b[i+1]) for i in range(0, len(b)-1, 2)]
                    boxes_parsed.append(pts)
                else:
                    boxes_parsed.append(None)
            all_heights = []
            for bx in boxes_parsed:
                if bx:
                    ys = [p[1] for p in bx]
                    all_heights.append(max(ys) - min(ys))
        except Exception:
            boxes_parsed = [None] * n
            all_heights = []

        for i, (text, label) in enumerate(zip(texts, labels)):
            if not text or text == "nan":
                continue

            # Chuẩn hóa nhãn
            if label in ("TOTAL_COST", "TOTAL_TOTAL_COST"):
                label = "TOTAL_COST"
            elif label == "SELLER":
                label = "SELLER"
            elif label == "TIMESTAMP":
                label = "TIMESTAMP"
            elif label == "ADDRESS":
                label = "ADDRESS"
            else:
                continue  # Bỏ nhãn không rõ

            position  = i / max(n - 1, 1)
            prev_text = texts[i - 1] if i > 0 else ""
            next_text = texts[i + 1] if i < n - 1 else ""
            box       = boxes_parsed[i] if i < len(boxes_parsed) else None

            features = extract_features(
                text, position, prev_text, next_text,
                box=box, all_heights=all_heights,
            )
            X_list.append(features)
            y_list.append(label)
            groups.append(img_id)

    return np.array(X_list), np.array(y_list), np.array(groups)


# ---------------------------------------------------------------------------
# Training + GroupKFold CV
# ---------------------------------------------------------------------------

def train():
    csv_path = "data/mcocr_train_df.csv/mcocr_train_df.csv"
    labels_path = "data/labels.csv"

    # Lấy danh sách ảnh dev (không dùng ảnh test để train)
    df_labels = pd.read_csv(labels_path, dtype=str)
    dev_filenames = set(df_labels[df_labels["split"] == "dev"]["filename"].tolist())
    print(f"Tập dev: {len(dev_filenames)} ảnh dùng để train ML")
    print(f"Tập test: {len(df_labels[df_labels['split']=='test'])} ảnh — KHÔNG dùng để train")

    print(f"\nLoading data từ {csv_path}...")
    X, y, groups = build_dataset(csv_path, dev_filenames)

    print(f"\nDataset (dev only): {len(X)} dòng")
    from collections import Counter
    for k, v in Counter(y).most_common():
        print(f"  {k}: {v} ({v/len(y)*100:.1f}%)")

    # --- GroupKFold Cross-validation (5 fold theo ảnh) ---
    print("\n=== GroupKFold CV (5 fold, group=img_id) ===")
    gkf = GroupKFold(n_splits=5)
    models = {
        "LogisticRegression": LogisticRegression(max_iter=1000, C=1.0),
        "GradientBoosting":   GradientBoostingClassifier(
            n_estimators=200, max_depth=4, learning_rate=0.1
        ),
    }

    # Thử thêm LightGBM nếu cài được
    try:
        from lightgbm import LGBMClassifier
        models["LightGBM"] = LGBMClassifier(
            n_estimators=200, max_depth=6, learning_rate=0.1,
            verbose=-1,
        )
        print("LightGBM available ✓")
    except ImportError:
        print("LightGBM không có — bỏ qua (pip install lightgbm để thêm)")

    cv_results = {}
    for name, clf in models.items():
        scores = cross_val_score(clf, X, y, groups=groups, cv=gkf, scoring="accuracy")
        cv_results[name] = {
            "mean": float(scores.mean()),
            "std":  float(scores.std()),
            "scores": scores.tolist(),
        }
        print(f"  {name}: {scores.mean():.4f} ± {scores.std():.4f}")

    # Lưu CV scores
    cv_path = ML_DIR / "cv_scores.json"
    cv_path.write_text(json.dumps(cv_results, indent=2), encoding="utf-8")
    print(f"\nCV scores lưu tại: {cv_path}")

    # --- Train model tốt nhất trên toàn bộ dev set ---
    best_name = max(cv_results, key=lambda k: cv_results[k]["mean"])
    print(f"\nBest model: {best_name} (CV mean={cv_results[best_name]['mean']:.4f})")

    best_clf = models[best_name]
    best_clf.fit(X, y)

    # --- Đánh giá trên dev set (để debug, không phải số báo cáo) ---
    y_pred = best_clf.predict(X)
    print("\n[Dev set — chỉ để debug, không phải số báo cáo]")
    print(classification_report(y, y_pred))

    # --- Feature importance ---
    report_lines = [
        f"Best model: {best_name}",
        f"CV (GroupKFold 5-fold): {cv_results[best_name]['mean']:.4f} ± {cv_results[best_name]['std']:.4f}",
        "",
        "=== CV Results ===",
    ]
    for name, res in cv_results.items():
        report_lines.append(f"  {name}: {res['mean']:.4f} ± {res['std']:.4f}")

    report_lines += ["", "=== Classification Report (dev set) ===",
                     classification_report(y, y_pred)]

    if hasattr(best_clf, "feature_importances_"):
        importances = best_clf.feature_importances_
        fi_sorted = sorted(zip(FEATURE_NAMES, importances), key=lambda x: -x[1])
        report_lines += ["", "=== Feature Importance ==="]
        for fname, imp in fi_sorted:
            bar = "█" * int(imp * 50)
            report_lines.append(f"  {fname:22s} {imp:.4f}  {bar}")

    report_path = ML_DIR / "report.txt"
    report_path.write_text("\n".join(report_lines), encoding="utf-8")
    print(f"Report lưu tại: {report_path}")

    # --- Lưu model ---
    model_path = ML_DIR / "line_classifier.pkl"
    with open(model_path, "wb") as f:
        pickle.dump({
            "model": best_clf,
            "model_name": best_name,
            "feature_names": FEATURE_NAMES,
            "n_features": len(FEATURE_NAMES),
            "sklearn_version": __import__("sklearn").__version__,
        }, f)
    print(f"✅ Model saved: {model_path}")

    return best_clf


if __name__ == "__main__":
    train()
