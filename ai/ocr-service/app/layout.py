# app/layout.py
from typing import List, Dict
import numpy as np


def _center_y(box) -> float:
    return float(np.mean([p[1] for p in box]))


def _center_x(box) -> float:
    return float(np.mean([p[0] for p in box]))


def _height(box) -> float:
    ys = [p[1] for p in box]
    return float(max(ys) - min(ys))


def group_lines(items: List[Dict]) -> List[str]:
    """
    Nhóm các đoạn chữ có cùng hàng (y gần nhau), sắp theo x trong hàng,
    rồi trả về list các dòng text theo thứ tự từ trên xuống dưới.

    Ngưỡng ghép dòng dựa trên chiều cao trung bình của các ký tự (median_h * 0.6),
    giúp hoạt động ổn với nhiều cỡ font khác nhau.
    """
    if not items:
        return []

    # Sắp xếp theo tọa độ y tăng dần (trên xuống dưới)
    items = sorted(items, key=lambda it: _center_y(it["box"]))
    median_h = float(np.median([_height(it["box"]) for it in items])) or 1.0
    threshold = median_h * 0.6

    rows, current = [], [items[0]]
    for it in items[1:]:
        if abs(_center_y(it["box"]) - _center_y(current[-1]["box"])) <= threshold:
            current.append(it)
        else:
            rows.append(current)
            current = [it]
    rows.append(current)

    lines = []
    for row in rows:
        # Sắp xếp trong hàng theo x (trái sang phải)
        row = sorted(row, key=lambda it: _center_x(it["box"]))
        lines.append("  ".join(it["text"] for it in row))
    return lines
