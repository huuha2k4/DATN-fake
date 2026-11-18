# app/classify/dictionary.py
from __future__ import annotations

import pandas as pd
from rapidfuzz import fuzz

from .normalize import normalize, strip_legal_prefix


class BrandDictionary:
    """
    Tầng 0 — từ điển thương hiệu.

    Cải tiến v2:
    - Bỏ tiền tố pháp nhân trước khi tra ("Cong ty TNHH KFC" → "KFC")
    - Alias dài ưu tiên: "grabfood" thắng "grab"
    - Alias ngắn (< 6 ký tự): chỉ khớp nguyên từ, không fuzzy
    """

    def __init__(self, path: str = "classify_data/brands.csv",
                 fuzzy_threshold: int = 92):
        df = pd.read_csv(path, comment='#')  # bỏ dòng comment
        items = [
            (normalize(a), c)
            for a, c in zip(df["alias"], df["category"])
            if str(a).strip()
        ]
        self.items = sorted(set(items), key=lambda x: -len(x[0]))
        self.fuzzy_threshold = fuzzy_threshold

    def lookup(self, text: str) -> tuple | None:
        """
        Tra từ điển theo thứ tự:
        1. Bỏ tiền tố pháp nhân (nếu có)
        2. Khớp nguyên từ
        3. Khớp mờ (chỉ alias ≥ 6 ký tự)
        """
        # Bỏ tên pháp nhân trước khi tra
        clean_text = strip_legal_prefix(text)
        n = f" {normalize(clean_text)} "

        # Bước 1: khớp nguyên từ
        for alias, cat in self.items:
            if f" {alias} " in n:
                return cat, alias

        # Bước 2: khớp mờ (chỉ alias dài)
        for alias, cat in self.items:
            if len(alias) >= 6 and fuzz.partial_ratio(alias, n) >= self.fuzzy_threshold:
                return cat, alias

        return None
