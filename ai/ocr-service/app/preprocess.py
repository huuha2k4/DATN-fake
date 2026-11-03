# app/preprocess.py
import cv2
import numpy as np

# Keyword hóa đơn — dùng để chấm điểm hướng xoay
_RECEIPT_KEYWORDS = [
    "tong", "tien", "ngay", "gio", "thanh", "hang", "so luong",
    "don gia", "vat", "thue", "gia", "tong cong", "ket", "don",
]

# ---------------------------------------------------------------------------
# Resize
# ---------------------------------------------------------------------------

def resize_keep_ratio(img: np.ndarray, max_side: int = 1800) -> np.ndarray:
    """Thu nhỏ nếu ảnh quá lớn, giữ tỉ lệ."""
    h, w = img.shape[:2]
    scale = max_side / max(h, w)
    if scale >= 1:
        return img
    return cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)


def _resize_for_orientation(img: np.ndarray, max_side: int = 600) -> np.ndarray:
    """Thu nhỏ mạnh hơn để chạy OCR thử nghiệm nhanh khi chọn hướng xoay."""
    h, w = img.shape[:2]
    scale = max_side / max(h, w)
    if scale >= 1:
        return img
    return cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)


# ---------------------------------------------------------------------------
# EXIF rotation — đọc đúng hướng từ metadata ảnh điện thoại
# ---------------------------------------------------------------------------

def fix_exif_rotation(img_bytes: bytes) -> np.ndarray:
    """
    Đọc ảnh từ bytes và xoay đúng hướng theo EXIF.
    Dùng ImageOps.exif_transpose (chuẩn hơn _getexif, hỗ trợ cả JPEG/HEIC).
    Xử lý: 90° CW, 90° CCW, 180°, mirror.
    Fallback về cv2.imdecode nếu không có Pillow.
    """
    try:
        from PIL import Image, ImageOps
        import io
        pil_img = Image.open(io.BytesIO(img_bytes))
        pil_img = ImageOps.exif_transpose(pil_img)   # xử lý mọi orientation tag
        pil_img = pil_img.convert("RGB")
        return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    except Exception:
        arr = np.frombuffer(img_bytes, np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)


# ---------------------------------------------------------------------------
# Orientation score — dùng OCR để chấm điểm hướng ảnh
# ---------------------------------------------------------------------------

def _orientation_score(img: np.ndarray, engine) -> float:
    """
    Chấm điểm một hướng ảnh dựa trên:
      - Tổng weighted score: sum(score_i × len(text_i))
        → ảnh đúng chiều có text dài và score cao
      - Bonus: số keyword hóa đơn tìm thấy
        → ảnh đúng chiều có keyword "tong", "ngay", "tien"...

    Chạy trên ảnh thu nhỏ (max 600px) để tiết kiệm thời gian.
    """
    import unicodedata

    def strip(s: str) -> str:
        s = s.replace("đ", "d").replace("Đ", "D")
        s = unicodedata.normalize("NFD", s)
        s = "".join(c for c in s if unicodedata.category(c) != "Mn")
        return s.lower()

    small = _resize_for_orientation(img)
    items = engine.read(small)
    if not items:
        return 0.0

    # Weighted score
    weighted = sum(it["score"] * len(it["text"]) for it in items)

    # Keyword bonus
    all_text = " ".join(strip(it["text"]) for it in items)
    kw_bonus = sum(1 for kw in _RECEIPT_KEYWORDS if kw in all_text)

    return weighted + kw_bonus * 5.0


# ---------------------------------------------------------------------------
# Auto-rotate ảnh về portrait (dọc)
# ---------------------------------------------------------------------------

def rotate_to_portrait(img: np.ndarray, engine=None) -> np.ndarray:
    """
    Xác định và xoay ảnh về chiều dọc đúng.

    Xử lý 4 trường hợp:
      - Đã dọc đúng chiều        → giữ nguyên
      - Nằm ngang (CW hoặc CCW)  → xoay 90°
      - Lật ngược 180°           → xoay 180°

    Nếu có engine: dùng OCR score × text length + keyword bonus (chính xác nhất)
    Nếu không có engine: dùng Hough Lines (fallback nhanh)
    """
    h, w = img.shape[:2]

    if engine is not None:
        return _rotate_by_ocr_score(img, engine)

    # Fallback không có engine
    if w > h:
        return _rotate_landscape_by_hough(img)
    return img


def _rotate_by_ocr_score(img: np.ndarray, engine) -> np.ndarray:
    """
    Thử 4 hướng, chọn hướng có orientation_score cao nhất.
    Chỉ thử 180° và CW/CCW khi cần thiết để tiết kiệm thời gian.
    """
    h, w = img.shape[:2]
    is_landscape = w > h

    # Xây danh sách các hướng cần thử
    candidates = {}
    candidates["original"] = img

    if is_landscape:
        candidates["cw"]  = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
        candidates["ccw"] = cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
    else:
        # Ảnh dọc: cũng thử 180° (lật ngược)
        candidates["180"] = cv2.rotate(img, cv2.ROTATE_180)

    # Chấm điểm từng hướng
    scores = {k: _orientation_score(v, engine) for k, v in candidates.items()}
    best = max(scores, key=scores.get)

    # Nếu ảnh dọc và original thắng → không cần xoay
    if best == "original":
        return img

    # Nếu 180° chênh lệch không đáng kể → giữ original (tránh xoay nhầm)
    if best == "180":
        orig_score = scores["original"]
        best_score = scores["180"]
        if best_score < orig_score * 1.15:   # Cần hơn 15% mới xoay 180°
            return img

    return candidates[best]


def _rotate_landscape_by_hough(img: np.ndarray) -> np.ndarray:
    """Fallback khi không có engine: đếm đường nằm ngang bằng Hough Lines."""
    cw  = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
    ccw = cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
    return cw if _count_horizontal_lines(cw) >= _count_horizontal_lines(ccw) else ccw


def _count_horizontal_lines(img: np.ndarray) -> int:
    gray  = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur  = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 50, 150)
    lines = cv2.HoughLinesP(
        edges, 1, np.pi / 180,
        threshold=60,
        minLineLength=img.shape[1] // 5,
        maxLineGap=15,
    )
    if lines is None:
        return 0
    count = 0
    for line in lines:
        x1, y1, x2, y2 = line[0]
        if x2 == x1:
            continue
        angle = abs(np.degrees(np.arctan2(y2 - y1, x2 - x1)))
        if angle < 15 or angle > 165:
            count += 1
    return count


# ---------------------------------------------------------------------------
# Deskew — chỉnh nghiêng nhẹ
# ---------------------------------------------------------------------------

def deskew(img: np.ndarray, max_angle: float = 15.0) -> np.ndarray:
    """
    Phát hiện và chỉnh góc nghiêng nhẹ bằng Hough Lines.
    Chỉ chỉnh nếu góc trong khoảng [0.3°, max_angle°].
    """
    gray  = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur  = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 50, 150, apertureSize=3)

    lines = cv2.HoughLinesP(
        edges, 1, np.pi / 180,
        threshold=80,
        minLineLength=img.shape[1] // 4,
        maxLineGap=20,
    )

    angles = []
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            if x2 == x1:
                continue
            angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
            if abs(angle) < max_angle:
                angles.append(angle)

    if not angles:
        return _deskew_fallback(img, max_angle)

    median_angle = float(np.median(angles))
    if abs(median_angle) < 0.3:
        return img
    return _rotate_image(img, -median_angle)


def _deskew_fallback(img: np.ndarray, max_angle: float) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.bitwise_not(gray)
    thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
    coords = np.column_stack(np.where(thresh > 0))
    if len(coords) < 100:
        return img
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = 90 + angle
    elif angle > 45:
        angle = angle - 90
    if abs(angle) < 0.3 or abs(angle) > max_angle:
        return img
    return _rotate_image(img, angle)


def _rotate_image(img: np.ndarray, angle: float) -> np.ndarray:
    h, w = img.shape[:2]
    M = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
    return cv2.warpAffine(
        img, M, (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )


# ---------------------------------------------------------------------------
# Contrast & Denoise
# ---------------------------------------------------------------------------

def enhance_contrast(img: np.ndarray) -> np.ndarray:
    """Tăng tương phản cục bộ bằng CLAHE — tốt cho hóa đơn nhiệt bị mờ."""
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    return cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)


def denoise(img: np.ndarray) -> np.ndarray:
    return cv2.fastNlMeansDenoisingColored(img, None, 5, 5, 7, 21)


# ---------------------------------------------------------------------------
# Pipeline tiền xử lý chính
# ---------------------------------------------------------------------------

def preprocess(
    img: np.ndarray,
    resize: bool = True,
    portrait: bool = False,   # False vì pipeline.py gọi rotate_to_portrait riêng
    contrast: bool = False,
    denoise_on: bool = False,
    deskew_on: bool = False,
) -> np.ndarray:
    """
    Tiền xử lý ảnh hóa đơn trước khi đưa vào OCR.

    Lưu ý: rotate_to_portrait được gọi riêng trong pipeline.py (cần engine),
    không nằm ở đây nữa. Tham số portrait=True giữ để tương thích evaluate.py cũ.

    Cấu hình so sánh:
        P0 (baseline) : tất cả False
        P1            : resize=True
        P2            : resize=True, contrast=True
        P3            : resize=True, contrast=True, denoise_on=True
        P4            : resize=True, contrast=True, deskew_on=True
    """
    if resize:
        img = resize_keep_ratio(img)
    if denoise_on:
        img = denoise(img)
    if contrast:
        img = enhance_contrast(img)
    if deskew_on:
        img = deskew(img)
    return img
