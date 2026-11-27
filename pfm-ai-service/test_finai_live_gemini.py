"""Opt-in Gemini checks using synthetic READ responses and in-memory proposals."""
import json
import os
import time
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch
from zoneinfo import ZoneInfo

from action_agent import run_action_chat


@unittest.skipUnless(os.getenv("FINAI_LIVE_TEST") == "1", "opt-in external Gemini calls")
class FinAiLiveGeminiTests(unittest.TestCase):
    def setUp(self):
        today = datetime.now(ZoneInfo("Asia/Ho_Chi_Minh")).date()
        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)
        previous_end = month_start - timedelta(days=1)
        self.context = {
            "timezone": "Asia/Ho_Chi_Minh", "currentDateTime": f"{today}T12:00:00+07:00",
            "currentDate": str(today), "yesterday": str(today - timedelta(days=1)),
            "currentWeekStart": str(week_start), "currentWeekEnd": str(week_start + timedelta(days=6)),
            "nextWeekStart": str(week_start + timedelta(days=7)), "nextWeekEnd": str(week_start + timedelta(days=13)),
            "currentMonthStart": str(month_start),
            "currentMonthEnd": str((month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)),
            "upcoming30DaysEnd": str(today + timedelta(days=30)),
            "previousMonthStart": str(previous_end.replace(day=1)), "previousMonthEnd": str(previous_end),
            "lastThreeMonthsStart": str((previous_end.replace(day=1) - timedelta(days=1)).replace(day=1)),
            "currentQuarterStart": str(today.replace(month=(today.month - 1) // 3 * 3 + 1, day=1)),
            "currentYearStart": str(today.replace(month=1, day=1)),
        }

    def invoke(self, name, prompt, fixtures, *, draft=None, selection=None):
        reads = []
        trace = {}
        started = time.monotonic()

        def read(tool, args, _deadline):
            self.assertIn(tool, fixtures)
            reads.append((tool, args))
            return {"status": "SUCCESS", "tool": tool, "data": fixtures[tool]}

        try:
            def record(event, **fields):
                if event == "request_complete":
                    trace.update(fields)

            with patch("action_agent.BackendToolClient") as backend, patch("action_agent._trace", side_effect=record):
                backend.return_value.execute_read.side_effect = read
                reply = run_action_chat(prompt, "synthetic-context", self.context, draft=draft, selected_option=selection)
            self.assertTrue(reply["message"].strip())
            return reply, reads
        except Exception as error:
            self.fail(f"{name}: {type(error).__name__}")
        finally:
            print(json.dumps({"case": name, "model": os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest"),
                              "reads": [tool for tool, _ in reads],
                              "model_rounds": trace.get("modelRound"),
                              "input_tokens": trace.get("inputTokens"), "output_tokens": trace.get("outputTokens"),
                              "duration_ms": round((time.monotonic() - started) * 1000)}), flush=True)

    def test_financial_knowledge_remains_read_free(self):
        answer, reads = self.invoke("knowledge", "Giải thích quy tắc 50/30/20 là gì?", {})
        self.assertEqual([], reads)
        self.assertFalse(answer["proposals"])
        self.assertIn("50", answer["message"])

    def test_real_social_question_uses_no_financial_tools(self):
        answer, reads = self.invoke("social-rice", "Bạn ăn cơm chưa?", {})
        self.assertEqual([], reads)
        self.assertEqual([], answer["proposals"])
        self.assertIn("ăn", answer["message"].casefold())
        self.assertRegex(answer["message"].casefold(), r"\bai\b|trợ lý")

    def test_real_capability_question_describes_confirmation(self):
        answer, reads = self.invoke("capability-help", "Bạn có thể giúp gì cho tôi?", {})
        self.assertEqual([], reads)
        self.assertEqual([], answer["proposals"])
        self.assertIn("xác nhận", answer["message"].casefold())
        self.assertRegex(answer["message"].casefold(), r"ví|ngân sách|chi tiêu")

    def test_real_out_of_scope_question_is_a_normal_answer(self):
        answer, reads = self.invoke("outside-java", "Viết code Java cho tôi.", {})
        self.assertEqual([], reads)
        self.assertEqual([], answer["proposals"])
        self.assertRegex(answer["message"].casefold(), r"java|lập trình|mã nguồn|\bcode\b")
        self.assertNotIn("thử lại", answer["message"].casefold())

    def test_financial_calendar_requires_both_sources(self):
        answer, reads = self.invoke("calendar", "Tuần này tôi có lịch tài chính nào sắp đến hạn?", {
            "get_schedules": {"content": [], "totalElements": 0},
            "get_debts": {"debts": [], "calendarOccurrences": [], "calendarOccurrenceCount": 0},
        })
        self.assertEqual({"get_schedules", "get_debts"}, {tool for tool, _ in reads})
        self.assertFalse(answer["proposals"])

    def test_complete_transfer_is_proposal_with_exact_accounts(self):
        source = "10000000-0000-4000-8000-000000000001"
        destination = "10000000-0000-4000-8000-000000000002"
        answer, _ = self.invoke("transfer", "Chuyển 500k từ ví Tiền mặt sang Vietcombank hôm nay.", {
            "get_accounts": {"accounts": [
                {"id": source, "name": "Tiền mặt", "isActive": True, "balance": 1000000},
                {"id": destination, "name": "Vietcombank", "isActive": True, "balance": 2500000},
            ]},
            "get_transactions": {"content": []},
        })
        self.assertEqual(1, len(answer["proposals"]))
        proposal = answer["proposals"][0]
        self.assertEqual("create_transaction", proposal["toolName"])
        args = proposal["arguments"]
        self.assertEqual(("TRANSFER", source, destination, 500000),
                         (args["transactionType"], args["accountId"], args["toAccountId"], args["amount"]))
        self.assertNotIn("categoryId", args)

    def test_group_fund_stays_group_fund(self):
        group = "20000000-0000-4000-8000-000000000001"
        member = "20000000-0000-4000-8000-000000000002"
        category = "20000000-0000-4000-8000-000000000003"
        answer, reads = self.invoke("group-fund",
            "Tạo chi tiêu nhóm Phòng trọ 50k ăn tối bằng quỹ nhóm, danh mục Ăn uống, chia đều cho cả nhóm.", {
                "get_groups": {"content": [{"id": group, "name": "Phòng trọ", "status": "ACTIVE"}]},
                "get_group_finances": [{"userId": member, "name": "Thành viên thử nghiệm"}],
                "get_categories": [{"id": category, "name": "Ăn uống"}],
                "get_accounts": {"accounts": []},
            })
        self.assertEqual(1, len(answer["proposals"]))
        proposal = answer["proposals"][0]
        self.assertEqual("create_group_transaction", proposal["toolName"])
        args = proposal["arguments"]
        self.assertEqual((group, category, "GROUP_FUND", 50000),
                         (args["groupId"], args["categoryId"], args["paymentSource"], args["amount"]))
        self.assertNotIn("sourceAccountId", args)
        for tool, arguments in reads:
            if tool == "get_group_finances":
                self.assertEqual({"groupId": group, "section": "members",
                                  "page": 1, "pageSize": 20}, arguments)

    def test_representative_personal_spending_and_no_data(self):
        profile = {
            "status": "SUCCESS", "summary": {"total_income": 10000000, "total_expense": 8500000},
            "rule_50_30_20": {"needs_pct": 55, "wants_pct": 30}, "metrics": {"unclassified_expense": 0},
        }
        prompt = "Đánh giá chi tiêu cá nhân của tôi theo 50/30/20 và gợi ý cách tiết kiệm."
        answer, reads = self.invoke("personal-503020", prompt, {"get_spending_profile": profile})
        self.assertEqual(["get_spending_profile"], [tool for tool, _ in reads])
        self.assertIn("500.000", answer["message"])
        self.assertFalse(answer["proposals"])
        empty, _ = self.invoke("no-data", prompt, {"get_spending_profile": {"status": "INSUFFICIENT_DATA"}})
        self.assertIn("Chưa đủ", empty["message"])
        self.assertFalse(empty["proposals"])

    def test_group_selection_then_change_of_intent(self):
        ids = ["30000000-0000-4000-8000-000000000001", "30000000-0000-4000-8000-000000000002"]
        fixtures = {"get_groups": {"content": [
            {"id": ids[0], "name": "Phòng trọ"}, {"id": ids[1], "name": "Gia đình"},
        ]}}
        answer, _ = self.invoke("group-choice", "Chi tiêu nhóm 50k ăn tối", fixtures)
        self.assertEqual("groupId", answer["draft"]["field"])
        answer, _ = self.invoke("group-source", "Phòng trọ", fixtures, draft=answer["draft"], selection=ids[0])
        self.assertEqual("paymentSource", answer["draft"]["field"])
        self.assertEqual(ids[0], answer["draft"]["slots"]["groupId"])
        answer, reads = self.invoke("topic-change", "Giải thích quy tắc 50/30/20 là gì?", {},
                                    draft=answer["draft"])
        self.assertFalse(reads)
        self.assertFalse(answer["proposals"])
        self.assertNotIn("draft", answer)

    def test_wallet_selection_completes_transfer(self):
        source = "40000000-0000-4000-8000-000000000001"
        second = "40000000-0000-4000-8000-000000000002"
        destination = "40000000-0000-4000-8000-000000000003"
        fixtures = {"get_accounts": {"accounts": [
            {"id": source, "name": "Tiền mặt", "isActive": True, "balance": 1000000},
            {"id": second, "name": "Ví điện tử", "isActive": True, "balance": 1000000},
            {"id": destination, "name": "Vietcombank", "isActive": True, "balance": 1000000},
        ]}, "get_transactions": {"content": []}}
        initial, _ = self.invoke("wallet-choice", "Chuyển 50k sang Vietcombank.", fixtures)
        self.assertEqual("accountId", initial["draft"]["field"])
        reply, _ = self.invoke("wallet-selected", "Tiền mặt", fixtures, draft=initial["draft"], selection=source)
        args = reply["proposals"][0]["arguments"]
        self.assertEqual((source, destination, 50000), (args["accountId"], args["toAccountId"], args["amount"]))

    def test_period_analysis_uses_previous_month(self):
        answer, reads = self.invoke("period-analysis",
            "Đánh giá chi tiêu cá nhân của tôi tháng trước theo 50/30/20 và gợi ý tiết kiệm.", {
                "get_financial_overview": {"income": 10000000, "expense": 8000000,
                                           "totalIncome": 10000000, "totalExpense": 8000000},
            })
        self.assertFalse(answer["proposals"])
        self.assertEqual(1, len(reads))
        self.assertEqual(self.context["previousMonthStart"], reads[0][1]["fromDate"])
        self.assertEqual(self.context["previousMonthEnd"], reads[0][1]["toDate"])

    def test_debt_direction_and_advice(self):
        for direction, prompt in (("BORROWING", "Ghi trả nợ An 50k."), ("LENDING", "Ghi thu hồi nợ An 50k.")):
            with self.subTest(direction=direction):
                answer, reads = self.invoke(direction, prompt, {
                    "get_debts": {"debts": [], "totalElements": 0},
                })
                self.assertEqual("get_debts", reads[0][0])
                self.assertEqual(direction, reads[0][1]["debtType"])
                self.assertFalse(answer["proposals"])
        answer, _ = self.invoke("advice-without-action", "Tôi có nên lập ngân sách ăn uống không?", {
            "get_budgets": {"content": [], "totalElements": 0}, "get_transactions": {"content": []},
            "get_financial_overview": {"income": 0, "expense": 0},
        })
        self.assertFalse(answer["proposals"])
