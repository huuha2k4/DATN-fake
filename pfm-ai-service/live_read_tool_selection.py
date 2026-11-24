"""Manual/live Gemini tool-selection audit. Does not execute backend tools or writes."""
from __future__ import annotations

import json
import time

from langchain_core.messages import HumanMessage, SystemMessage

from action_agent import SYSTEM_PROMPT, TemporalContext, _model, _route_tools, _runtime_prompt


QUESTIONS = [
    ("Tháng này tui tiêu bao nhiêu?", {"get_financial_overview"}),
    ("Liệt kê 10 giao dịch gần nhất.", {"get_transactions"}),
    ("Ví Vietcombank còn bao nhiêu?", {"get_accounts"}),
    ("Ngân sách ăn uống còn bao nhiêu?", {"get_budgets"}),
    ("Mục tiêu mua xe đã hoàn thành bao nhiêu phần trăm?", {"get_goals"}),
    ("Tui đang nợ ai?", {"get_debts"}),
    ("Tuần sau có khoản nào đến hạn?", {"get_schedules", "get_debts"}),
    ("Tui đang tham gia những nhóm nào?", {"get_groups"}),
    ("Nhóm phòng trọ tháng này chi bao nhiêu?", {"get_groups"}),
    ("Quy tắc 50/30/20 là gì?", set()),
]


def main() -> None:
    context = TemporalContext(
        timezone="Asia/Ho_Chi_Minh", currentDateTime="2026-11-20T15:00:00+07:00",
        currentDate="2026-11-20", yesterday="2026-11-19",
        currentWeekStart="2026-11-16", currentWeekEnd="2026-11-22",
        nextWeekStart="2026-11-23", nextWeekEnd="2026-11-29",
        currentMonthStart="2026-11-01", currentMonthEnd="2026-11-30",
        upcoming30DaysEnd="2026-12-20", previousMonthStart="2026-10-01",
        previousMonthEnd="2026-10-31", lastThreeMonthsStart="2026-09-01",
        currentQuarterStart="2026-10-01", currentYearStart="2026-01-01",
    )
    system = SystemMessage(content=SYSTEM_PROMPT + "\n\n" + _runtime_prompt(context))
    results = []
    for question, expected in QUESTIONS:
        route = _route_tools(question)
        model = _model(route.available_tools)
        started = time.perf_counter()
        response = model.invoke([system, HumanMessage(content=question)])
        calls = [call.get("name", "") for call in (response.tool_calls or [])]
        usage = getattr(response, "usage_metadata", None) or {}
        results.append({
            "question": question,
            "expected": sorted(expected),
            "available": list(route.available_tools),
            "selected": calls,
            "passed": set(calls) == expected,
            "latencyMs": round((time.perf_counter() - started) * 1000),
            "usage": usage,
        })
    print(json.dumps({"results": results, "passed": sum(r["passed"] for r in results),
                      "total": len(results)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
