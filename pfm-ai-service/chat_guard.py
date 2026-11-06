# -*- coding: utf-8 -*-
"""Deterministic scope guard for the personal-finance assistant."""

import re
import unicodedata


OUT_OF_SCOPE_REPLY = (
    "Mình là trợ lý quản lý tài chính cá nhân, nên chỉ hỗ trợ các nội dung như "
    "chi tiêu, ngân sách, số dư, giao dịch, tiết kiệm, nợ và kế hoạch tài chính. "
    "Bạn hãy hỏi mình một câu liên quan đến tài chính nhé."
)

_FINANCE_TERMS = (
    "tien", "tai khoan", "so du", "chi tieu", "chi bao nhieu", "ngan sach", "giao dich",
    "thu nhap", "luong", "tiet kiem", "no", "vay", "the tin dung",
    "dau tu", "bao hiem", "lai suat", "ty gia", "quy khan cap", "thue",
    "financial", "finance", "money", "account", "balance", "expense",
    "spending", "budget", "transaction", "income", "salary", "saving",
    "debt", "loan", "credit card", "investment", "insurance", "interest",
    "exchange rate", "currency", "tax", "stock", "fund",
)
_SOCIAL_MESSAGES = ("chao", "xin chao", "hello", "hi", "hey", "cam on", "thank you")
_MONEY_REFERENCE = re.compile(r"(?<!\d)(?:\d{1,3}(?:[.,]\d{3})+|\d{5,})(?!\d)")
_CLEARLY_OFF_TOPIC_TERMS = (
    "python", "javascript", "java", "code", "lap trinh", "thoi tiet",
    "bong da", "phim", "am nhac", "nau an", "bai tap",
)


def _normalise(text: str) -> str:
    decomposed = unicodedata.normalize("NFD", text.lower())
    without_accents = "".join(
        character for character in decomposed if unicodedata.category(character) != "Mn"
    ).replace("đ", "d")
    return re.sub(r"\s+", " ", without_accents).strip()


def is_in_scope_question(question: str) -> bool:
    """Return whether a user message belongs to personal-finance assistance."""
    normalized = _normalise(question)
    if not normalized:
        return False
    if any(re.search(rf"(?<!\w){re.escape(term)}(?!\w)", normalized) for term in _FINANCE_TERMS):
        return True
    # Follow-up questions often refer only to an amount returned by the assistant,
    # e.g. "Ủa 440000 là cái nào?".  Treat a money-sized number as financial
    # context even when the user does not repeat words such as "giao dịch".
    if _MONEY_REFERENCE.search(normalized):
        return True
    return len(normalized.split()) <= 4 and any(
        normalized == message or normalized.startswith(f"{message} ")
        for message in _SOCIAL_MESSAGES
    )


def is_financial_follow_up(question: str, conversation_history: list[tuple[str, str]]) -> bool:
    """Allow a short reference to the previous financial answer in the same session."""
    normalized = _normalise(question)
    if not normalized or len(normalized.split()) > 14:
        return False
    if any(term in normalized for term in _CLEARLY_OFF_TOPIC_TERMS):
        return False
    return any(role == "assistant" and is_in_scope_question(message)
               for role, message in conversation_history[-4:])
