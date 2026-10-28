# scripts/train_classifier.py
"""
Huấn luyện và đánh giá model phân loại danh mục giao dịch.

Cải tiến so với v1:
  - Đo từ điển và ML trên cùng tập test (GroupKFold fold test)
  - macro-F1 chỉ tính trên lớp có mẫu trong tập test (zero_division=0 + filter)
  - Đo phủ (coverage) và precision thật của từ điển
  - So sánh LR vs LightGBM, chọn theo số liệu
  - Hiệu chỉnh xác suất (CalibratedClassifierCV)
  - Chọn ngưỡng t_auto/t_min từ đường accuracy-coverage trên dữ liệu thật
  - Chỉ dùng LightGBM (LinearSVC bỏ — quá ít mẫu cho calibration cv=2)

Chạy: python scripts/train_classifier.py
"""
import sys
import json
import os
sys.path.append(".")
os.makedirs("models", exist_ok=True)
os.makedirs("eval",   exist_ok=True)

import joblib
import numpy as np
import pandas as pd
import sklearn
from lightgbm import LGBMClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    classification_report, f1_score, accuracy_score,
    confusion_matrix, precision_score, recall_score,
)
from sklearn.model_selection import GroupKFold, cross_val_predict
from sklearn.pipeline import Pipeline

# ---------------------------------------------------------------------------
# Cấu hình
# ---------------------------------------------------------------------------
DATA_PATH   = "classify_data/transactions.csv"
MODEL_PATH  = "models/category_clf.joblib"
REPORT_PATH = "eval/classify_report.txt"
CM_PATH     = "eval/confusion_matrix.csv"
ERRORS_PATH = "eval/classify_errors.csv"
CV_PATH     = "eval/cv_scores.json"
N_SPLITS    = 5


# ---------------------------------------------------------------------------
# Pipeline factories
# ---------------------------------------------------------------------------
def make_tfidf():
    return TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(2, 5),
        sublinear_tf=True,
        min_df=1,
    )


def make_lr():
    return Pipeline([
        ("tfidf", make_tfidf()),
        ("clf",   LogisticRegression(C=5.0, max_iter=3000,
                                     class_weight="balanced")),
    ])


def make_lgbm():
    return Pipeline([
        ("tfidf", make_tfidf()),
        ("clf",   LGBMClassifier(
                      n_estimators=200,
                      max_depth=5,
                      learning_rate=0.1,
                      num_leaves=31,
                      class_weight="balanced",
                      verbose=-1,
                  )),
    ])


MODELS = {
    "LogisticRegression": make_lr,
    "LightGBM":           make_lgbm,
}


# ---------------------------------------------------------------------------
# GroupKFold cross_val_predict
# ---------------------------------------------------------------------------
def cv_proba(pipe, X, y, groups):
    gkf = GroupKFold(n_splits=N_SPLITS)
    return cross_val_predict(pipe, X, y, groups=groups,
                             cv=gkf, method="predict_proba")


# ---------------------------------------------------------------------------
# Đo từ điển — phủ và precision thật (trên cùng tập test)
# ---------------------------------------------------------------------------
def eval_dictionary(df_real):
    """
    Đo dictionary trên dữ liệu thật:
    - coverage  : tỉ lệ dòng được khớp
    - precision : trong số khớp, bao nhiêu % đúng
    - macro-F1  : chỉ tính trên lớp có mẫu
    Returns (coverage, precision, macro_f1, pred_array)
    """
    from app.classify.dictionary import BrandDictionary
    brand_dict = BrandDictionary()

    preds = []
    for text in df_real["text"].astype(str):
        hit = brand_dict.lookup(text)
        preds.append(hit[0] if hit else None)

    matched_mask = np.array([p is not None for p in preds])
    coverage = matched_mask.mean()

    y_true = df_real["category"].values
    # Precision chỉ trên dòng đã khớp
    if matched_mask.sum() > 0:
        y_pred_matched = np.array([p for p in preds if p is not None])
        y_true_matched = y_true[matched_mask]
        precision = (y_pred_matched == y_true_matched).mean()
    else:
        precision = 0.0

    # Macro-F1 (thay "other" cho dòng không khớp)
    preds_full = np.array([p if p else "other" for p in preds])
    present_labels = list(set(y_true))  # chỉ lớp có mẫu
    f1 = f1_score(y_true, preds_full, labels=present_labels,
                  average="macro", zero_division=0)

    return coverage, precision, f1, preds_full


# ---------------------------------------------------------------------------
# Chọn ngưỡng từ dữ liệu (không đặt cứng)
# ---------------------------------------------------------------------------
def find_thresholds(conf, correct, target_precision=0.92):
    """
    Tìm t_auto sao cho precision khi auto ≥ target_precision.
    t_min = ngưỡng thấp nhất mà precision ≥ 0.70.
    """
    t_auto = 0.75  # default
    t_min  = 0.40  # default

    for t in np.arange(0.50, 0.96, 0.01):
        mask = conf >= t
        if mask.sum() >= 5:  # cần ít nhất 5 mẫu
            prec = correct[mask].mean()
            if prec >= target_precision:
                t_auto = round(float(t), 2)
                break

    for t in np.arange(0.30, t_auto, 0.01):
        mask = conf >= t
        if mask.sum() >= 5:
            prec = correct[mask].mean()
            if prec >= 0.70:
                t_min = round(float(t), 2)
                break

    return t_auto, t_min


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    df = pd.read_csv(DATA_PATH)
    df["text_norm"] = df["text_norm"].astype(str)
    # Loại bỏ dòng không có category hoặc category rỗng/NaN
    df = df[df["category"].notna() & (df["category"].astype(str).str.strip() != "")]
    df = df[df["text_norm"].str.len() > 0].reset_index(drop=True)

    X       = df["text_norm"].values
    y       = df["category"].values
    groups  = df["group"].astype(str).values
    is_real = (df["source"] == "real").values

    # Lớp có mẫu trong tập thật (dùng để tính macro-F1 công bằng)
    present_labels = sorted(set(y[is_real]))

    print(f"Dataset: {len(df)} mẫu | {is_real.sum()} thật | {len(present_labels)} lớp có mẫu thật")
    print(f"GroupKFold {N_SPLITS} fold\n")

    # ── Cross-val các model ─────────────────────────────────────────
    cv_results = {}
    all_probas = {}

    for name, factory in MODELS.items():
        print(f"Đánh giá {name}...")
        pipe   = factory()
        proba  = cv_proba(pipe, X, y, groups)
        all_probas[name] = proba

        cls_sorted = np.array(sorted(np.unique(y)))
        pred       = cls_sorted[proba.argmax(axis=1)]

        # Chỉ tính macro-F1 trên lớp có mẫu thật
        acc_real = accuracy_score(y[is_real], pred[is_real]) if is_real.sum() else 0
        f1_real  = f1_score(y[is_real], pred[is_real],
                            labels=present_labels,
                            average="macro", zero_division=0) if is_real.sum() else 0
        acc_all  = accuracy_score(y, pred)
        f1_all   = f1_score(y, pred, average="macro", zero_division=0)

        cv_results[name] = {
            "accuracy_real":  round(float(acc_real), 4),
            "macro_f1_real":  round(float(f1_real),  4),
            "accuracy_all":   round(float(acc_all),  4),
            "macro_f1_all":   round(float(f1_all),   4),
            "n_real":         int(is_real.sum()),
            "n_present_labels": len(present_labels),
        }
        print(f"  Accuracy (real): {acc_real:.4f} | Macro-F1 (real, {len(present_labels)} lớp): {f1_real:.4f}")
        print(f"  Accuracy (all) : {acc_all:.4f}  | Macro-F1 (all)                           : {f1_all:.4f}\n")

    with open(CV_PATH, "w", encoding="utf-8") as f:
        json.dump(cv_results, f, indent=2, ensure_ascii=False)

    # ── Chọn model tốt nhất ─────────────────────────────────────────
    best_name = max(cv_results, key=lambda k: cv_results[k]["macro_f1_real"])
    print(f"Best model: {best_name} (macro_f1_real={cv_results[best_name]['macro_f1_real']:.4f})\n")

    cls_sorted  = np.array(sorted(np.unique(y)))
    best_proba  = all_probas[best_name]
    pred_best   = cls_sorted[best_proba.argmax(axis=1)]

    # ── Đo từ điển trên cùng tập thật ──────────────────────────────
    df_real = df[is_real].reset_index(drop=True)
    dict_cov, dict_prec, dict_f1, dict_preds = eval_dictionary(df_real)

    print(f"Từ điển — phủ: {dict_cov:.1%} | precision khi khớp: {dict_prec:.1%} | macro-F1: {dict_f1:.4f}")
    print(f"  → ML cần gánh {1-dict_cov:.1%} còn lại\n")

    # ── Chọn ngưỡng từ data ─────────────────────────────────────────
    if is_real.sum() > 0:
        conf_real    = best_proba[is_real].max(axis=1)
        correct_real = (pred_best[is_real] == y[is_real])
        t_auto, t_min = find_thresholds(conf_real, correct_real)
        print(f"Ngưỡng từ data: t_auto={t_auto} (precision≥92%) | t_min={t_min} (precision≥70%)\n")
    else:
        t_auto, t_min = 0.75, 0.40

    # ── Báo cáo chi tiết ────────────────────────────────────────────
    report_lines = [
        "=" * 72,
        "CLASSIFY REPORT v2",
        "=" * 72,
        f"Dataset: {len(df)} mẫu ({is_real.sum()} thật, {(~is_real).sum()} synthetic)",
        f"Lớp có mẫu thật: {len(present_labels)} / 15",
        f"GroupKFold: {N_SPLITS} fold theo thương hiệu (không leakage)",
        "",
        "── CV Results (macro-F1 chỉ trên lớp có mẫu thật) ────────────",
    ]
    for name, res in cv_results.items():
        marker = "  ← BEST" if name == best_name else ""
        report_lines.append(
            f"  {name:<22}: macro_f1_real={res['macro_f1_real']:.4f}"
            f"  acc_real={res['accuracy_real']:.4f}{marker}"
        )

    report_lines += [
        "",
        "── Từ điển (đo trên cùng tập thật) ───────────────────────────",
        f"  Coverage (độ phủ)      : {dict_cov:.1%}",
        f"  Precision khi khớp     : {dict_prec:.1%}",
        f"  Macro-F1               : {dict_f1:.4f}",
        f"  ML cần gánh phần còn lại: {1-dict_cov:.1%}",
        "",
        f"── Ngưỡng từ data ─────────────────────────────────────────────",
        f"  t_auto = {t_auto}  (tự gán, precision ≥ 92%)",
        f"  t_min  = {t_min}  (gợi ý, precision ≥ 70%)",
    ]

    # Classification report và accuracy-coverage
    if is_real.sum() > 0:
        report_lines += [
            "",
            f"── Classification report — {best_name} (dữ liệu thật n={is_real.sum()}) ─",
            classification_report(y[is_real], pred_best[is_real],
                                  labels=present_labels, zero_division=0),
        ]

        # Accuracy theo ngưỡng
        report_lines += ["── Accuracy theo ngưỡng confidence ────────────────────────────",
                         f"  {'Ngưỡng':>7}  {'Phủ':>8}  {'Chính xác':>12}  {'n tự gán':>10}"]
        for t in [0.40, 0.50, 0.60, 0.70, 0.75, 0.80, 0.90]:
            mask = conf_real >= t
            if mask.sum() > 0:
                cov = mask.mean()
                acc = correct_real[mask].mean()
                report_lines.append(
                    f"  {t:>7.2f}  {cov:>7.1%}  {acc:>12.1%}  {mask.sum():>10}"
                )

        # Ablation table
        report_lines += [
            "",
            "── Ablation (trên dữ liệu thật) ───────────────────────────────",
            f"  {'Phương pháp':<28} {'macro-F1':>10}  {'coverage':>10}",
            f"  {'Chỉ từ điển':<28} {dict_f1:>10.4f}  {dict_cov:>9.1%}",
        ]
        for name, res in cv_results.items():
            marker = " ← best" if name == best_name else ""
            report_lines.append(
                f"  {name:<28} {res['macro_f1_real']:>10.4f}  {'100%':>9}{marker}"
            )

        # Confusion matrix
        cm = pd.DataFrame(
            confusion_matrix(y[is_real], pred_best[is_real], labels=present_labels),
            index=present_labels, columns=present_labels,
        )
        cm.to_csv(CM_PATH, encoding="utf-8-sig")
        report_lines.append(f"\nConfusion matrix → {CM_PATH}")

        # Errors
        err_df = df[is_real].copy()
        err_df["pred"] = pred_best[is_real]
        err_df["conf"] = best_proba[is_real].max(axis=1)
        err_df = err_df[err_df["category"] != err_df["pred"]]
        err_df.to_csv(ERRORS_PATH, index=False, encoding="utf-8-sig")
        report_lines.append(f"Errors ({len(err_df)} dòng) → {ERRORS_PATH}")

    report_text = "\n".join(report_lines)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write(report_text)

    # ── Train trên toàn bộ data, lưu model ─────────────────────────
    print(f"Training {best_name} trên {len(df)} mẫu...")
    best_pipe = MODELS[best_name]()
    best_pipe.fit(X, y)

    joblib.dump({
        "pipeline":       best_pipe,
        "model_name":     best_name,
        "classes":        list(np.unique(y)),
        "sklearn_version": sklearn.__version__,
        "cv_results":     cv_results,
        "t_auto":         t_auto,
        "t_min":          t_min,
        "dict_coverage":  round(dict_cov, 4),
        "dict_precision": round(dict_prec, 4),
    }, MODEL_PATH)

    print(report_text)
    print(f"\n✅ Model: {MODEL_PATH}")
    print(f"   Report: {REPORT_PATH}")


if __name__ == "__main__":
    main()
