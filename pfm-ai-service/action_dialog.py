"""Business dialogue helpers. Choice IDs only come from authenticated READ results."""
from __future__ import annotations

import re
import unicodedata
from collections import Counter
from decimal import Decimal
from typing import Any


def fold(value: str) -> str:
    chars = unicodedata.normalize("NFD", value.casefold())
    return "".join(c for c in chars if not unicodedata.combining(c)).replace("đ", "d")


def amounts(message: str) -> list[Decimal]:
    text = re.sub(r"\b\d{1,4}[/\-]\d{1,2}(?:[/\-]\d{1,4})?\b", " ", fold(message))
    found = []
    for hit in re.finditer(r"(?<![\w\-])([0-9]+(?:[.,][0-9]+)*)(?:\s*(trieu|tr|nghin|ngan|k|vnd|dong|d)\b(?:\s+([0-9]{1,3})\b)?)?", text):
        number, unit, tail = hit.groups()
        if not unit and not re.fullmatch(r"\d{1,3}(?:[.,]\d{3})+", number):
            prefix = text[text.rfind("\n", 0, hit.start()) + 1:hit.start()].strip()
            if prefix and not re.search(r"\b(so tien|han muc|gia|chi|thu|chuyen|tra no|dong quy|gom)\s*$", prefix):
                continue
        scale = {"tr": 1_000_000, "trieu": 1_000_000, "nghin": 1_000, "ngan": 1_000, "k": 1_000}.get(unit, 1)
        if re.fullmatch(r"\d{1,3}(?:[.,]\d{3})+", number):
            number = number.replace(".", "").replace(",", "")
        else:
            number = number.replace(",", ".")
        if number.count(".") > 1:
            continue
        value = Decimal(number) * scale
        if tail and unit in {"tr", "trieu"}:
            value += Decimal(tail) * 10 ** (6 - len(tail))
        if value > 0:
            found.append(value)
    return found


QUESTIONS = {
    "amount": "Bạn muốn ghi nhận số tiền bao nhiêu?",
    "accountId": "Bạn muốn sử dụng ví nào?",
    "sourceAccountId": "Bạn muốn sử dụng ví nguồn nào?",
    "toAccountId": "Bạn muốn chuyển đến ví nào?",
    "groupId": "Bạn muốn ghi nhận khoản này vào nhóm nào?",
    "categoryId": "Bạn muốn dùng danh mục nào?",
    "paymentSource": "Bạn muốn dùng quỹ nhóm hay chi hộ từ ví cá nhân?",
    "splits": "Bạn muốn chia đều cho ai? Nếu chia theo số tiền, hãy ghi tên và số tiền của từng người, ví dụ «chia An 30k, Bình 20k». Nếu trùng tên, hãy làm rõ thành viên trước.",
    "debtId": "Bạn muốn thanh toán hoặc thu hồi khoản nợ nào?",
    "debtType": "Bạn muốn ghi một khoản đi vay hay một khoản cho vay?",
    "goalId": "Bạn muốn sử dụng mục tiêu nào?",
    "budgetId": "Bạn muốn cập nhật ngân sách nào?",
    "scheduleId": "Bạn muốn cập nhật lịch nào?",
    "targetAmount": "Bạn muốn đặt số tiền mục tiêu là bao nhiêu?",
    "principalAmount": "Số tiền gốc của khoản nợ là bao nhiêu?",
    "initialBalance": "Số dư ban đầu của ví là bao nhiêu?",
    "totalAmount": "Bạn muốn đặt hạn mức ngân sách là bao nhiêu?",
}


def read_data(result: Any) -> Any:
    if isinstance(result, dict) and "data" in result:
        return result["data"]
    return result


def spending_assessment(result: Any) -> str:
    profile = read_data(result)
    if not isinstance(profile, dict) or profile.get("status") == "ERROR":
        raise ValueError("Spending profile unavailable")
    summary = profile.get("summary") or {}
    metrics = profile.get("metrics") or {}
    breakdown = profile.get("rule_50_30_20") or {}
    income = summary.get("total_income")
    ratios = [breakdown.get("needs_pct"), breakdown.get("wants_pct")]
    if profile.get("status") != "SUCCESS" or not isinstance(income, (int, float)) or income <= 0:
        return ("Chưa đủ giao dịch thu và chi để đánh giá theo quy tắc 50/30/20. "
                "Bạn có thể bổ sung thu nhập và phân loại các khoản chi trước khi đối chiếu.")
    expense = summary.get("total_expense")
    if any(not isinstance(value, (int, float)) for value in [expense, *ratios]):
        return "Mình chưa có đủ dữ liệu phân loại chi tiêu để tính tỷ lệ 50/30/20."

    def money(value: float) -> str:
        return f"{value:,.0f}".replace(",", ".") + " đ"

    def percent(value: float) -> str:
        return f"{value:.1f}".replace(".", ",") + "%"

    remaining = income - expense
    observation = "Trong lịch sử giao dịch đã ghi nhận"
    if metrics.get("observation_days"):
        observation += f" ({metrics['observation_days']} ngày từ giao dịch đầu đến giao dịch cuối)"
    lines = [f"{observation}, bạn có **{money(income)} thu nhập** và **{money(expense)} chi tiêu**."]
    unclassified = metrics.get("unclassified_expense", 0)
    if isinstance(unclassified, (int, float)) and unclassified > 0:
        lines.append(f"Có {money(unclassified)} chưa có danh mục rõ ràng. Bạn nên phân loại khoản này trước khi đối chiếu tỷ lệ thiết yếu và cá nhân.")
    else:
        lines.extend([
            f"- **Chi thiết yếu** {percent(ratios[0])} thu nhập, mốc tham khảo 50%.",
            f"- **Chi cá nhân** {percent(ratios[1])} thu nhập, mốc tham khảo 30%.",
        ])
    if remaining >= 0:
        lines.append(f"- **Chênh lệch thu chi** {money(remaining)} ({percent(remaining / income * 100)}). Đây là phần có thể phân bổ, chưa phản ánh số tiền đã tiết kiệm.")
    else:
        lines.append(f"- **Chi vượt thu** {money(-remaining)}. Hãy ưu tiên cân bằng thu chi trước khi đặt mốc tiết kiệm.")
    target_gap = income * .2 - remaining
    if target_gap > 0 and not unclassified:
        lines.append(f"Để dành được 20% thu nhập theo mốc tham khảo, bạn cần cải thiện chênh lệch khoảng **{money(target_gap)}** trong một kỳ có mức thu chi tương tự. Hãy rà các khoản chi cá nhân có thể điều chỉnh trước.")
    elif not unclassified:
        lines.append(f"Chênh lệch hiện đủ để cân nhắc dành riêng **{money(income * .2)}** theo mốc 20%, sau khi dự phòng nghĩa vụ sắp đến hạn.")
    top = profile.get("top_categories") or []
    if top and isinstance(top[0], dict):
        category = top[0].get("category") or top[0].get("name")
        if isinstance(category, str) and category.strip():
            lines.append(f"Danh mục chi nhiều nhất là {category[:120]}. Bạn có thể xem lại các khoản lặp lại trong danh mục này và tách phần có thể điều chỉnh.")
    return "\n\n".join(lines)


def rows(result: Any, *keys: str) -> list[dict]:
    data = read_data(result)
    if isinstance(data, dict):
        data = next((data[k] for k in keys if isinstance(data.get(k), list)), [])
    return [row for row in data if isinstance(row, dict)] if isinstance(data, list) else []


def options(field: str, results: list[tuple[str, Any]], excluded_id: str | None = None) -> list[dict[str, str]]:
    source = {
        "accountId": ("get_accounts", ("accounts",), ("id", "accountId"), ("name",)),
        "sourceAccountId": ("get_accounts", ("accounts",), ("id", "accountId"), ("name",)),
        "toAccountId": ("get_accounts", ("accounts",), ("id", "accountId"), ("name",)),
        "groupId": ("get_groups", ("content", "groups", "items"), ("id", "groupId"), ("name",)),
        "categoryId": ("get_categories", ("categories",), ("id", "categoryId"), ("name",)),
        "debtId": ("get_debts", ("content", "debts", "items"), ("id", "debtId"),
                   ("name", "counterpartyName", "creditor_name", "debtor_name")),
        "goalId": ("get_goals", ("content", "goals", "items"), ("id", "goalId"), ("name",)),
        "budgetId": ("get_budgets", ("content", "budgets", "items"), ("id", "budgetId"), ("name",)),
        "scheduleId": ("get_schedules", ("content", "schedules", "items"), ("id", "scheduleId"), ("name", "title")),
    }.get(field)
    if not source:
        return []
    tool, containers, ids, labels = source
    choices: dict[str, dict[str, str]] = {}
    for name, result in results:
        if name != tool:
            continue
        for row in rows(result, *containers):
            identifier = next((str(row[k]) for k in ids if row.get(k)), None)
            label = next((row[k] for k in labels if isinstance(row.get(k), str) and row[k].strip()), None)
            if (identifier and label and identifier != excluded_id and row.get("isActive", True)
                    and row.get("status") not in {"ARCHIVED", "INACTIVE", "DELETED", "CANCELLED", "PAID_OFF"}
                    and not (tool == "get_accounts" and row.get("isChildWallet"))):
                choices[identifier] = {"id": identifier, "label": label[:200]}
    duplicate_counts = Counter(fold(option["label"]) for option in choices.values())
    for option in choices.values():
        if duplicate_counts[fold(option["label"])] > 1:
            option["label"] = f'{option["label"][:165]} · mã {option["id"][-12:]}'
    return list(choices.values())


def choose(message: str, choices: list[dict[str, str]], allow_single: bool = False) -> str | None:
    text = fold(message)
    matched = [choice for choice in choices if re.search(r"(?<!\w)" + re.escape(fold(choice["label"])) + r"(?!\w)", text)]
    if not matched and allow_single and len(choices) == 1:
        return choices[0]["id"]
    return matched[0]["id"] if len(matched) == 1 else None


def choose_ordinal(message: str, choices: list[dict[str, str]]) -> str | None:
    match = re.fullmatch(r"(?:(?:cai|vi|nhom|muc|lua chon)\s+)?thu\s+(nhat|hai|ba|tu|[1-9][0-9]?)", fold(message).strip())
    if not match:
        return None
    index = {"nhat": 1, "hai": 2, "ba": 3, "tu": 4}.get(match[1])
    if index is None:
        index = int(match[1])
    return choices[index - 1]["id"] if index <= len(choices) else None


def clarification(route: str, field: str, user_turns: list[str], *, choices: list | None = None,
                  question: str | None = None, slots: dict | None = None) -> dict:
    prompt = (question or QUESTIONS.get(field) or "Bạn có thể bổ sung thông tin còn thiếu cho yêu cầu này không?").strip()
    return {
        "message": prompt,
        "proposals": [],
        "draft": {
            "route": route, "field": field, "turns": user_turns[-8:],
            "slots": slots or {}, "options": (choices or [])[:24],
        },
    }
