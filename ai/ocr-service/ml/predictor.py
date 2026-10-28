# ml/predictor.py
"""
Dùng model đã train để trích xuất tổng tiền từ OCR items.
Thay thế extract_total_by_position + extract_total trong pipeline.

Cách dùng:
    from ml.predictor import MLExtractor
    extractor = MLExtractor()
    total = extractor.extract_total(items, lines)
"""

import pickle
import sys
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np

sys.path.append(".")

from ml.train_line_classifier import extract_features, AMOUNT_RE
from app.extractor import (
    find_numbers, strip_accents,
    extract_total_by_position, extract_total,
    EXCLUDE_KEYWORDS, TOTAL_KEYWORDS,
)

MODEL_PATH = Path("ml/line_classifier.pkl")


class MLExtractor:
    """
    Trích xuất tổng tiền bằng ML model + fallback rule-based.

    Chiến lược:
    1. Dùng model phân loại để tìm dòng có nhãn TOTAL_COST
    2. Lọc bỏ dòng có EXCLUDE_KEYWORDS (tiền khách, tiền thừa...)
    3. Lấy số tiền lớn nhất trong các dòng TOTAL_COST
    4. Fallback về rule-based nếu ML không tìm được
    """

    def __init__(self):
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Model không tồn tại: {MODEL_PATH}\n"
                "Chạy: python ml/train_line_classifier.py"
            )
        with open(MODEL_PATH, "rb") as f:
            payload = pickle.load(f)
        # Hỗ trợ cả format cũ (model trực tiếp) và mới (dict có metadata)
        if isinstance(payload, dict):
            self.model = payload["model"]
            self.model_name = payload.get("model_name", "unknown")
            self.feature_names = payload.get("feature_names", [])
        else:
            self.model = payload
            self.model_name = "unknown"
            self.feature_names = []
        print(f"ML model loaded: {MODEL_PATH} ({self.model_name})")

    def predict_lines(self, lines: List[str]) -> List[str]:
        """Dự đoán nhãn cho từng dòng text (dùng context features)."""
        if not lines:
            return []
        n = len(lines)
        X = np.array([
            extract_features(
                line,
                position=i / max(n - 1, 1),
                prev_text=lines[i - 1] if i > 0 else "",
                next_text=lines[i + 1] if i < n - 1 else "",
            )
            for i, line in enumerate(lines)
        ])
        return self.model.predict(X).tolist()

    def predict_proba_lines(self, lines: List[str]) -> np.ndarray:
        """Trả về xác suất từng nhãn cho từng dòng (nếu model hỗ trợ)."""
        if not lines:
            return None
        n = len(lines)
        X = np.array([
            extract_features(
                line,
                position=i / max(n - 1, 1),
                prev_text=lines[i - 1] if i > 0 else "",
                next_text=lines[i + 1] if i < n - 1 else "",
            )
            for i, line in enumerate(lines)
        ])
        if hasattr(self.model, "predict_proba"):
            return self.model.predict_proba(X)
        # LinearSVC không có predict_proba — dùng decision_function
        if hasattr(self.model, "decision_function"):
            df = self.model.decision_function(X)
            # Softmax để normalize
            e = np.exp(df - df.max(axis=1, keepdims=True))
            return e / e.sum(axis=1, keepdims=True)
        return None

    def extract_total(
        self,
        items: List[Dict],
        lines: List[str],
    ) -> Optional[int]:
        """
        Trích xuất tổng tiền dùng predict_proba.

        Ưu tiên dòng có P(TOTAL_COST) cao nhất + có số tiền
        + không bị loại trừ (tiền khách, tiền thừa...).
        Fallback về rule-based nếu ML không tìm được.
        """
        if not lines:
            return None

        proba = self.predict_proba_lines(lines)
        classes = list(self.model.classes_)
        total_idx = classes.index("TOTAL_COST") if "TOTAL_COST" in classes else None

        if proba is not None and total_idx is not None:
            best_score, best_total = 0.0, None

            # Đếm tần suất mỗi số trong toàn hóa đơn (trước vòng lặp)
            from collections import Counter
            all_valid_nums = [v for l in lines for v in find_numbers(l)]
            freq = Counter(all_valid_nums)

            # Từ điển ưu tiên — tier cao hơn nhân thêm bonus
            from app.extractor import TOTAL_KEYWORD_TIERS
            def _tier_bonus(line_norm: str) -> float:
                for tier_idx, tier in enumerate(TOTAL_KEYWORD_TIERS):
                    if any(k in line_norm for k in tier):
                        # Tier 0 (cao nhất) = bonus 2.0, tier 1 = 1.5, tier 2 = 1.0
                        return 2.0 - tier_idx * 0.5
                return 1.0  # không có keyword, không bonus

            for i, (line, prob_row) in enumerate(zip(lines, proba)):
                p_total = float(prob_row[total_idx])
                if p_total < 0.3:
                    continue

                norm = strip_accents(line)
                has_total_kw = any(k in norm for k in TOTAL_KEYWORDS)
                has_excl_kw  = any(k in norm for k in EXCLUDE_KEYWORDS) or \
                               any(k in norm for k in ["tra lai", "tien thua", "tien thoi",
                                                       "change", "tien khach", "tralai",
                                                       "khach tra", "tien thu"])

                # Bỏ qua dòng loại trừ THUẦN (không có keyword tổng)
                if has_excl_kw and not has_total_kw:
                    continue

                nums = find_numbers(line)
                if not nums:
                    continue

                max_num = max(nums)

                # Dòng ghép cả tổng lẫn loại trừ → lấy số nhỏ nhất hợp lệ
                if has_excl_kw and has_total_kw:
                    min_num = min(nums)
                    candidates = [v for v in nums if v <= min_num * 2]
                    max_num = min(candidates) if candidates else min_num

                tier_b = _tier_bonus(norm)
                # Ưu tiên: keyword tier cao > p_total cao > số lớn (tiebreak nhẹ)
                score = p_total * tier_b * (1 + np.log1p(float(max_num)) / 50)

                if score > best_score:
                    best_score = score
                    best_total = max_num

            if best_total is not None:
                return best_total

        # Fallback rule-based
        return extract_total_by_position(items) or extract_total(lines)

    def needs_review(
        self,
        items: List[Dict],
        lines: List[str],
        threshold: float = 0.80,
    ) -> bool:
        """
        Trả True nếu model không tự tin → FE hiển thị cảnh báo "kiểm tra lại".

        threshold=0.80: khi P(TOTAL_COST) của dòng được chọn < 0.80
        thì coi là cần người dùng xác nhận.
        """
        if not lines:
            return True

        proba = self.predict_proba_lines(lines)
        if proba is None:
            return True

        classes = list(self.model.classes_)
        total_idx = classes.index("TOTAL_COST") if "TOTAL_COST" in classes else None
        if total_idx is None:
            return True

        # Xác suất cao nhất cho nhãn TOTAL_COST trong toàn hóa đơn
        max_p = float(proba[:, total_idx].max())
        return max_p < threshold

    def extract_all(
        self,
        items: List[Dict],
        lines: List[str],
    ) -> dict:
        """
        Trích xuất tất cả trường bằng ML + rule-based.

        Returns:
            {
                "total_amount": int | None,
                "transaction_date": str | None,
                "transaction_time": str | None,
                "merchant_name": str | None,
                "needs_review": bool,
                "ml_labels": list[str],
            }
        """
        from app.extractor import extract_datetime, extract_merchant
        import re, unicodedata
        from datetime import datetime

        proba  = self.predict_proba_lines(lines)
        labels = self.predict_lines(lines)
        classes = list(self.model.classes_)

        # --- Tổng tiền ---
        total = self.extract_total(items, lines)

        # --- Ngày giờ: dùng ML chọn dòng TIMESTAMP trước, rồi chạy regex ---
        date_str, time_str = None, None
        timestamp_idx = classes.index("TIMESTAMP") if "TIMESTAMP" in classes else None

        if proba is not None and timestamp_idx is not None:
            # Lấy top 3 dòng có P(TIMESTAMP) cao nhất
            ts_probs = [(i, float(proba[i][timestamp_idx]))
                        for i in range(len(lines))]
            ts_probs.sort(key=lambda x: -x[1])

            DATE_RE = re.compile(r"(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{4}|\d{2})")
            TIME_RE = re.compile(r"(\d{1,2})\s*:\s*(\d{2})(?::\d{2})?")

            for i, p in ts_probs[:5]:
                if p < 0.3:
                    break
                line = lines[i]
                if date_str is None:
                    for m in DATE_RE.finditer(line):
                        d, mth, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
                        if y < 100: y += 2000
                        try:
                            date_str = datetime(y, mth, d).strftime("%Y-%m-%d")
                            break
                        except ValueError:
                            continue
                if time_str is None:
                    m = TIME_RE.search(line)
                    if m and int(m.group(1)) < 24 and int(m.group(2)) < 60:
                        time_str = f"{int(m.group(1)):02d}:{m.group(2)}"

        # Fallback regex trên toàn bộ dòng nếu ML không tìm được
        if not date_str or not time_str:
            d_fallback, t_fallback = extract_datetime(lines)
            date_str  = date_str  or d_fallback
            time_str  = time_str  or t_fallback

        # --- Tên cửa hàng: dùng ML chọn dòng SELLER trước ---
        merchant = None
        seller_idx = classes.index("SELLER") if "SELLER" in classes else None

        if proba is not None and seller_idx is not None:
            sel_probs = [(i, float(proba[i][seller_idx]))
                         for i in range(len(lines))]
            sel_probs.sort(key=lambda x: -x[1])

            # Lấy top 3 dòng SELLER, truyền vào extract_merchant để fuzzy match
            top_seller_lines = [lines[i] for i, p in sel_probs[:3] if p >= 0.4]
            if top_seller_lines:
                merchant = extract_merchant(
                    top_seller_lines + lines,  # ưu tiên dòng ML chọn
                    items=items,
                    top_n=len(top_seller_lines) + 4,
                )

        if merchant is None:
            merchant = extract_merchant(lines, items=items)

        # --- needs_review ---
        review = self.needs_review(items, lines)

        return {
            "total_amount":      total,
            "transaction_date":  date_str,
            "transaction_time":  time_str,
            "merchant_name":     merchant,
            "needs_review":      review,
            "ml_labels":         labels,
        }
