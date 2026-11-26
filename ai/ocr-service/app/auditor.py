"""
app/auditor.py
Bộ rà soát / Kiểm toán hóa đơn tự động (Self-Auditing & Cross-Validation Gate).

Nhiệm vụ:
  Đánh giá tính hợp lý của kết quả OCR Tầng 1 (PaddleOCR + Regex) so với thực tế
  trước khi quyết định có cần kích hoạt Tầng 2 (Mắt thần Gemini Vision) hay không.
"""
from datetime import datetime
import re
from typing import Dict, List, Tuple
from app.extractor import strip_accents, find_numbers, STANDALONE_CITIES

MIN_REASONABLE_AMOUNT = 1_000
MAX_REASONABLE_AMOUNT = 500_000_000

INVALID_MERCHANT_WORDS = {
    "hoa don", "hoa don ban hang", "ban hang", "phieu thu", "phieu ban",
    "receipt", "invoice", "tien mat", "thanh toan", "vnd", "dong",
    "tong cong", "tong tien", "tong", "thu ngan", "khach hang", "cam on",
    "hen gap lai", "quy khach", "so gd", "so phieu", "ngay", "gio",
    "ha noi", "hanoi", "ho chi minh", "tphcm", "sai gon", "da nang", "binh duong"
}


def audit_receipt(ocr_result: Dict) -> Tuple[bool, List[str]]:
    """
    Rà soát kết quả OCR Tầng 1 theo 4 trụ cột nghiệp vụ:
      1. Rà soát trạng thái & điểm tin cậy (Status & Confidence)
      2. Rà soát tính hợp lý của Tổng tiền (Total Amount Sanity & Arithmetic)
      3. Rà soát tính hợp lệ của Tên cửa hàng (Merchant Validation)
      4. Rà soát tính hợp lý của Ngày giao dịch (Transaction Date Sanity)

    Trả về:
      (is_suspicious: bool, reasons: List[str])
      - is_suspicious: True nếu kết quả OCR có điểm bất thường / không khớp thực tế -> Cần gọi Gemini Vision.
      - reasons: Danh sách chi tiết các lý do phát hiện bất thường.
    """
    reasons: List[str] = []
    kind = ocr_result.get("kind", "paid")
    confidence = ocr_result.get("confidence", 1.0)
    total = ocr_result.get("total_amount")
    merchant = ocr_result.get("merchant_name")
    trans_date = ocr_result.get("transaction_date")
    raw_text = ocr_result.get("raw_text", "")
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]

    # -------------------------------------------------------------
    # 1. Trụ cột 1: Trạng thái từ chối hoặc Điểm tin cậy OCR quá thấp
    # -------------------------------------------------------------
    rejected_kinds = {"not_receipt", "low_quality", "handwritten", "draft"}
    if kind in rejected_kinds:
        reasons.append(f"Loại ảnh bị nghi ngờ ({kind}): {ocr_result.get('reject_reason') or 'Không phải hóa đơn thanh toán'}")

    if confidence < 0.65:
        reasons.append(f"Điểm tin cậy OCR quá thấp ({confidence:.2f} < 0.65) - ảnh mờ/nhiễu")

    # -------------------------------------------------------------
    # 2. Trụ cột 2: Rà soát Tổng tiền (Total Amount)
    # -------------------------------------------------------------
    if total is None:
        reasons.append("Không trích xuất được tổng tiền thanh toán")
    else:
        # 2.1. Số tiền quá nhỏ hoặc quá lớn phi lý
        if total < MIN_REASONABLE_AMOUNT:
            reasons.append(f"Tổng tiền ({total:,} đ) nhỏ hơn mức tối thiểu hợp lý ({MIN_REASONABLE_AMOUNT:,} đ)")
        elif total > MAX_REASONABLE_AMOUNT:
            reasons.append(f"Tổng tiền ({total:,} đ) vượt quá mức tiêu dùng cá nhân hợp lý ({MAX_REASONABLE_AMOUNT:,} đ)")

        # 2.2. Trùng với năm (đọc nhầm năm vào tổng tiền)
        curr_year = datetime.now().year
        if (curr_year - 5) <= total <= (curr_year + 2):
            reasons.append(f"Tổng tiền ({total}) trùng với năm ({curr_year}), nghi ngờ đọc nhầm ngày tháng")

        # 2.3. Kiểm toán số học (Arithmetic & Max line check)
        all_numbers = [v for l in lines for v in find_numbers(l) if v >= 1000]
        if all_numbers:
            max_num = max(all_numbers)
            bottom_lines = lines[len(lines) // 2:]
            bottom_numbers = [v for l in bottom_lines for v in find_numbers(l) if v >= 1000]
            # Nếu số lớn nhất ở cuối hóa đơn lớn hơn hẳn số đã trích xuất (lệch > 1.3x)
            if max_num > total * 1.3 and max_num in bottom_numbers:
                reasons.append(f"Tổng tiền trích xuất ({total:,} đ) nhỏ hơn đáng kể số tiền ở cuối hóa đơn ({max_num:,} đ)")

    # -------------------------------------------------------------
    # 3. Trụ cột 3: Rà soát Tên cửa hàng (Merchant Name)
    # -------------------------------------------------------------
    if not merchant:
        reasons.append("Không trích xuất được tên cửa hàng/đơn vị phát hành")
    else:
        m_norm = strip_accents(merchant).lower().strip()
        if len(m_norm) < 3:
            reasons.append(f"Tên cửa hàng quá ngắn: '{merchant}'")

        clean_m = re.sub(r"[^\w\s]", "", m_norm).strip()
        if clean_m in INVALID_MERCHANT_WORDS or clean_m in STANDALONE_CITIES:
            reasons.append(f"Tên cửa hàng bị nhầm với địa danh hoặc tiêu đề hóa đơn: '{merchant}'")

        letters = sum(c.isalpha() for c in merchant)
        digits = sum(c.isdigit() for c in merchant)
        if letters < 2 or (digits > letters):
            reasons.append(f"Tên cửa hàng chứa quá nhiều số hoặc ký tự đặc biệt: '{merchant}'")

        if any(hint in m_norm for hint in ["mst", "dt:", "tel:", "dia chi", "duong "]):
            reasons.append(f"Tên cửa hàng bị dính địa chỉ/SĐT/mã số thuế: '{merchant}'")

    # -------------------------------------------------------------
    # 4. Trụ cột 4: Rà soát Ngày giao dịch (Transaction Date)
    # -------------------------------------------------------------
    if trans_date:
        try:
            d = datetime.strptime(trans_date, "%Y-%m-%d").date()
            today = datetime.now().date()
            if d > today:
                reasons.append(f"Ngày giao dịch ({trans_date}) nằm trong tương lai")
            elif d.year < 2010:
                reasons.append(f"Năm giao dịch ({d.year}) quá xa trong quá khứ")
        except ValueError:
            reasons.append(f"Định dạng ngày giao dịch không hợp lệ: {trans_date}")

    is_suspicious = len(reasons) > 0
    return is_suspicious, reasons
