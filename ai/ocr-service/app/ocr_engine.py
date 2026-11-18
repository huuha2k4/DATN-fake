# app/ocr_engine.py
from typing import List, Dict
import numpy as np
from paddleocr import PaddleOCR


class OCREngine:
    """
    Bọc PaddleOCR, khởi tạo một lần, dùng lại cho mọi request.

    Tương thích:
        - paddlepaddle==2.6.2 + paddleocr==2.9.1  (khuyến nghị, ổn định trên Windows CPU)
        - paddleocr 3.x: tự động fallback nếu API khác
    """

    def __init__(self, lang: str = "vi"):
        self._init_ocr(lang)

    def _init_ocr(self, lang: str):
        """Thử 2.x API trước (use_angle_cls), fallback 3.x nếu không hợp lệ."""
        try:
            self.ocr = PaddleOCR(
                lang=lang,
                use_angle_cls=True,
                show_log=False,
            )
            # Kiểm tra bằng cách xem ocr() có tồn tại không
            if not callable(getattr(self.ocr, "ocr", None)):
                raise AttributeError
            self.version = 2
            print(f"PaddleOCR 2.x initialized (lang={lang}).")
        except (TypeError, AttributeError):
            # paddleocr 3.x không nhận use_angle_cls
            self.ocr = PaddleOCR(
                lang=lang,
                use_doc_orientation_classify=False,
                use_doc_unwarping=False,
                use_textline_orientation=False,
            )
            self.version = 3
            print(f"PaddleOCR 3.x initialized (lang={lang}).")

    def read(self, image: np.ndarray) -> List[Dict]:
        """
        Nhận ảnh numpy BGR, trả về list:
        [{"box": [[x,y],[x,y],[x,y],[x,y]], "text": "...", "score": 0.98}, ...]
        """
        if self.version == 3:
            return self._read_v3(image)
        return self._read_v2(image)

    def _read_v2(self, image: np.ndarray) -> List[Dict]:
        results = self.ocr.ocr(image, cls=True)
        lines = []
        if not results or results[0] is None:
            return lines
        for item in results[0]:
            box, (text, score) = item
            lines.append({"box": box, "text": text, "score": float(score)})
        return lines

    def _read_v3(self, image: np.ndarray) -> List[Dict]:
        results = self.ocr.predict(image)
        lines = []
        for res in results:
            texts  = res.get("rec_texts", [])
            scores = res.get("rec_scores", [])
            polys  = res.get("rec_polys", [])
            for text, score, poly in zip(texts, scores, polys):
                lines.append({
                    "box":   poly.tolist() if hasattr(poly, "tolist") else list(poly),
                    "text":  text,
                    "score": float(score),
                })
        return lines
