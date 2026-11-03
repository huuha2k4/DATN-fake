# app/classify/predictor.py
"""
Predictor phân loại danh mục giao dịch — ghép 3 tầng:

  [0] Từ điển thương hiệu  → chính xác cao, giải thích được
  [1] ML (LogisticRegression trên TF-IDF ký tự)
  [∅] Fallback "other"     → không đoán khi không chắc

Cải tiến v2:
  - Đọc ngưỡng t_auto/t_min từ model (không hardcode)
  - Xử lý tên pháp nhân trước khi tra từ điển
  - Fallback dùng raw_text khi merchant_name None hoặc OCR kém
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Optional

import joblib
import numpy as np

from .normalize import normalize, strip_legal_prefix
from .dictionary import BrandDictionary
from .memory import UserMemory

EXPENSE_CLASSES = {
    "food", "transport", "shopping", "bills",
    "housing", "entertainment", "health", "education",
    "travel", "transfer", "other",
}
INCOME_CLASSES = {"salary", "bonus", "family", "other_income"}

# Từ khóa ngữ nghĩa trong raw_text — tăng confidence cho lớp tương ứng
_RAW_TEXT_HINTS = {
    "food":          ["ban", "phuc vu", "mon an", "thuc don", "bep", "com", "pho", "bun"],
    "transport":     ["bien so", "xe", "chuyen di", "km"],
    "health":        ["benh nhan", "bac si", "kham", "thuoc", "don thuoc"],
    "entertainment": ["rap chieu phim", "phim", "ghe so", "suat chieu"],
    "shopping":      ["san pham", "so luong", "don gia", "ma hang"],
    "bills":         ["chi so", "kwh", "khoi", "ky thanh toan"],
}


class CategoryPredictor:
    """
    Phân loại danh mục giao dịch với kiến trúc nhiều tầng.
    Khởi tạo một lần khi service start, dùng lại cho mọi request.
    """

    def __init__(
        self,
        model_path:    str = "models/category_clf.joblib",
        brands_path:   str = "classify_data/brands.csv",
        taxonomy_path: str = "classify_data/taxonomy.json",
        memory: Optional[UserMemory] = None,
        t_auto: float = 0.95,
        t_min:  float = 0.30,
    ):
        self.brand_dict = BrandDictionary(brands_path)
        self.memory     = memory  # UserMemory — tầng cá nhân hóa

        self._model_loaded = False
        if Path(model_path).exists():
            try:
                bundle = joblib.load(model_path)
                self.pipe    = bundle["pipeline"]
                self.classes = list(self.pipe.named_steps["clf"].classes_)
                # Đọc ngưỡng từ model nếu có, fallback về tham số
                self.t_auto = bundle.get("t_auto", t_auto)
                self.t_min  = bundle.get("t_min",  t_min)
                self._model_loaded = True
                print(f"Classify model loaded: {model_path} "
                      f"({bundle.get('model_name','?')}) "
                      f"t_auto={self.t_auto} t_min={self.t_min}")
            except Exception as e:
                print(f"[WARN] Không load được classify model: {e}")
                self.t_auto, self.t_min = t_auto, t_min
        else:
            print(f"[WARN] Classify model chưa có: {model_path}")
            self.t_auto, self.t_min = t_auto, t_min

        self.taxonomy: dict = {}
        if Path(taxonomy_path).exists():
            with open(taxonomy_path, encoding="utf-8") as f:
                raw = json.load(f)
            for group in raw.values():
                self.taxonomy.update(group)

    # -----------------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------------

    def predict(
        self,
        text: str,
        kind: str = "expense",
        user_id: Optional[str] = None,
        raw_text: str = "",
    ) -> dict:
        """
        Phân loại một văn bản giao dịch.

        Args:
            text     : merchant_name hoặc nội dung giao dịch
            kind     : "expense" | "income"
            user_id  : id người dùng (cho cá nhân hóa)
            raw_text : toàn bộ OCR text để dùng làm fallback/tín hiệu bổ sung
        """
        allowed = EXPENSE_CLASSES if kind == "expense" else INCOME_CLASSES
        n = normalize(text)

        if not n:
            # Thử dùng raw_text nếu merchant rỗng
            if raw_text:
                return self._predict_from_raw(raw_text, allowed)
            return self._result("other", 0.0, "fallback", allowed)

        # --- Tầng -1: Bộ nhớ cá nhân (ưu tiên cao nhất) ---
        if self.memory and user_id:
            # Thử các độ dài prefix giảm dần để khớp "circle k" trong "circle k q1"
            tokens = n.split()
            for length in range(len(tokens), 0, -1):
                key = " ".join(tokens[:length])
                remembered = self.memory.get(user_id, key)
                if remembered and remembered in allowed:
                    return self._result(remembered, 0.99, "user_memory",
                                        allowed)

        # --- Tầng 0: Từ điển (bỏ tên pháp nhân trước) ---
        clean = strip_legal_prefix(text)
        hit = self.brand_dict.lookup(clean)
        if hit and hit[0] in allowed:
            return self._result(hit[0], 0.95, "dictionary", allowed, alias=hit[1])

        # --- Tầng 1: ML model ---
        if self._model_loaded:
            proba = self.pipe.predict_proba([n])[0]
            mask = np.array([1.0 if c in allowed else 0.0 for c in self.classes])
            p = proba * mask
            if p.sum() > 0:
                p = p / p.sum()

                # Tín hiệu bổ sung từ raw_text
                if raw_text:
                    p = self._boost_from_raw_text(p, raw_text)
                    p = p / p.sum()

                order = np.argsort(-p)
                top3  = [{"category": self.classes[i], "p": round(float(p[i]), 3)}
                         for i in order[:3]]
                best_cat  = self.classes[order[0]]
                best_conf = float(p[order[0]])

                if best_conf >= self.t_min:
                    return self._result(best_cat, best_conf, "model", allowed, top3=top3)

        # --- Thử fallback raw_text ---
        if raw_text:
            r = self._predict_from_raw(raw_text, allowed)
            if r["status"] != "ask":
                return r

        return self._result("other", 0.0, "fallback", allowed)

    def predict_batch(
        self,
        texts: list[str],
        kind: str = "expense",
        user_id: Optional[str] = None,
    ) -> list[dict]:
        return [self.predict(t, kind, user_id) for t in texts]

    # -----------------------------------------------------------------------
    # Helpers
    # -----------------------------------------------------------------------

    def _predict_from_raw(self, raw_text: str, allowed: set) -> dict:
        """Dùng vài dòng đầu raw_text làm input khi merchant_name rỗng."""
        lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
        fallback_text = " ".join(lines[:4])  # 4 dòng đầu thường có tên cửa hàng
        n = normalize(fallback_text)
        if not n:
            return self._result("other", 0.0, "fallback", allowed)

        # Thử từ điển trên raw
        hit = self.brand_dict.lookup(fallback_text)
        if hit and hit[0] in allowed:
            return self._result(hit[0], 0.85, "dictionary_raw", allowed, alias=hit[1])

        # Thử ML trên raw
        if self._model_loaded:
            proba = self.pipe.predict_proba([n])[0]
            mask  = np.array([1.0 if c in allowed else 0.0 for c in self.classes])
            p = proba * mask
            if p.sum() > 0:
                p = p / p.sum()
                order = np.argsort(-p)
                best_cat  = self.classes[order[0]]
                best_conf = float(p[order[0]])
                top3 = [{"category": self.classes[i], "p": round(float(p[i]), 3)}
                        for i in order[:3]]
                if best_conf >= self.t_min:
                    return self._result(best_cat, best_conf * 0.85,
                                        "model_raw", allowed, top3=top3)

        return self._result("other", 0.0, "fallback", allowed)

    def _boost_from_raw_text(self, p: np.ndarray, raw_text: str) -> np.ndarray:
        """
        Tăng nhẹ xác suất cho lớp khớp với từ khóa ngữ nghĩa trong raw_text.
        Chỉ boost 10% — không đủ để đảo ngược quyết định model, chỉ phá tie.
        """
        from .normalize import strip_accents
        raw_n = strip_accents(raw_text).lower()
        boost = np.ones(len(self.classes))
        for i, cls in enumerate(self.classes):
            hints = _RAW_TEXT_HINTS.get(cls, [])
            if any(h in raw_n for h in hints):
                boost[i] = 1.10
        return p * boost

    def _result(
        self,
        category: str,
        confidence: float,
        source: str,
        allowed: set,
        alias: Optional[str] = None,
        top3: Optional[list] = None,
    ) -> dict:
        if confidence >= self.t_auto:
            status = "auto"
        elif confidence >= self.t_min:
            status = "suggest"
        else:
            status = "ask"

        return {
            "category":      category,
            "category_name": self.taxonomy.get(category, category),
            "confidence":    round(confidence, 3),
            "source":        source,
            "status":        status,
            "needs_review":  status != "auto",
            "matched":       alias,
            "top3":          top3 or [],
        }
