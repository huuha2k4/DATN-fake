import unittest
from unittest.mock import Mock, patch
from pydantic import ValidationError

from action_agent import (
    CreateBudgetArgs, CreateTransactionArgs, GetTransactionsArgs,
    GeminiNetworkError, GeminiQuotaError, GeminiRateLimitError, GeminiTimeoutError, SYSTEM_PROMPT, TOOLS, TemporalContext,
    ToolRequiredError, _apply_authoritative_filters, _declaration,
    _apply_overview_authoritative_filters, _invoke_with_controlled_retry,
    _calendar_period, _normalize_gemini_schema, _relative_period, _requires_financial_read,
    _enrich_create_debt_schedule, _is_write_capability_question, _resolve_category_id,
    _route_tools, _simple_read_fast_path, run_action_chat,
)


class ActionAgentSchemaTests(unittest.TestCase):
    temporal = TemporalContext(
        timezone="Asia/Ho_Chi_Minh", currentDateTime="2026-11-19T08:00:00+07:00",
        currentDate="2026-11-19", yesterday="2026-11-18",
        currentWeekStart="2026-11-16", currentWeekEnd="2026-11-22",
        nextWeekStart="2026-11-23", nextWeekEnd="2026-11-29",
        currentMonthStart="2026-11-01", currentMonthEnd="2026-11-30",
        upcoming30DaysEnd="2026-12-19",
        previousMonthStart="2026-10-01", previousMonthEnd="2026-10-31",
        lastThreeMonthsStart="2026-09-01", currentQuarterStart="2026-10-01",
        currentYearStart="2026-01-01",
    )

    def test_full_read_catalog_and_write_waves_are_registered(self):
        self.assertEqual({
            "get_transactions", "get_accounts", "get_financial_overview", "get_budgets", "get_goals",
            "get_debts", "get_schedules", "get_groups", "get_group_finances",
            "get_categories", "get_spending_profile",
            "create_transaction", "create_budget", "create_goal", "contribute_to_goal",
            "create_debt", "record_debt_payment", "update_budget",
            "create_schedule", "update_schedule", "create_account",
            "create_group_transaction", "contribute_group_fund",
            "create_child_spend", "deposit_child_wallet",
        }, set(TOOLS))

    def test_identity_and_arbitrary_arguments_are_forbidden(self):
        with self.assertRaises(ValidationError):
            GetTransactionsArgs.model_validate({"userId": "attacker"})
        with self.assertRaises(ValidationError):
            GetTransactionsArgs.model_validate({"url": "https://attacker.test"})

    def test_transaction_write_requires_correct_resource_shape(self):
        with self.assertRaises(ValidationError):
            CreateTransactionArgs.model_validate({
                "transactionType": "EXPENSE", "accountId": "a", "amount": 1,
                "currencyCode": "VND", "transactionDate": "2026-11-19",
            })
        with self.assertRaises(ValidationError):
            CreateTransactionArgs.model_validate({
                "transactionType": "TRANSFER", "accountId": "a", "toAccountId": "a",
                "amount": 1, "currencyCode": "VND", "transactionDate": "2026-11-19",
            })

    def test_budget_sum_is_validated(self):
        with self.assertRaises(ValidationError):
            CreateBudgetArgs.model_validate({
                "name": "Food", "periodType": "MONTHLY", "startDate": "2026-12-01",
                "endDate": "2026-12-31", "totalAmount": 200,
                "items": [{"categoryId": "c", "amount": 100}],
            })

    def test_prompt_treats_tool_data_as_untrusted(self):
        self.assertIn("untrusted data", SYSTEM_PROMPT)
        self.assertIn("Never ask for, infer, emit, or pass userId", SYSTEM_PROMPT)

    def test_persona_and_failed_tool_rules_are_explicit(self):
        self.assertIn('speak as "mình" or "FinAI"', SYSTEM_PROMPT)
        self.assertIn("tool error or timeout never means 0", SYSTEM_PROMPT)
        self.assertIn("never count TRANSFER as spending", SYSTEM_PROMPT)

    def test_this_month_is_backend_authoritative(self):
        args = _apply_authoritative_filters("Tháng này tui tiêu bao nhiêu?", {}, self.temporal)
        self.assertEqual("2026-11-01", args["fromDate"])
        self.assertEqual("2026-11-19", args["toDate"])
        self.assertEqual("EXPENSE", args["transactionType"])

    def test_previous_month_is_backend_authoritative(self):
        args = _apply_authoritative_filters("Tháng trước tui chi bao nhiêu?", {}, self.temporal)
        self.assertEqual(("2026-10-01", "2026-10-31"), (args["fromDate"], args["toDate"]))

    def test_combined_total_and_top_category_uses_expense_range(self):
        args = _apply_authoritative_filters(
            "Tháng này tổng chi tiêu và danh mục nào chi nhiều nhất?", {"fromDate": "2025-03-01"}, self.temporal)
        self.assertEqual("2026-11-01", args["fromDate"])
        self.assertEqual("2026-11-19", args["toDate"])
        self.assertEqual("EXPENSE", args["transactionType"])

    def test_new_turn_does_not_reuse_old_period(self):
        old = _apply_authoritative_filters("Tháng trước tui chi bao nhiêu?", {}, self.temporal)
        current = _apply_authoritative_filters("Còn tháng này?", old, self.temporal)
        self.assertEqual("2026-11-01", current["fromDate"])
        self.assertEqual("2026-11-19", current["toDate"])

    def test_all_authoritative_relative_periods(self):
        cases = {
            "Hôm qua tui chi bao nhiêu?": ("2026-11-18", "2026-11-18"),
            "Tuần này tui chi bao nhiêu?": ("2026-11-16", "2026-11-19"),
            "Tuần sau có khoản nào đến hạn?": ("2026-11-23", "2026-11-29"),
            "3 tháng gần đây tui tiêu bao nhiêu?": ("2026-09-01", "2026-11-19"),
            "Quý này thu nhập sao?": ("2026-10-01", "2026-11-19"),
            "Năm nay thu nhập sao?": ("2026-01-01", "2026-11-19"),
        }
        for question, expected in cases.items():
            self.assertEqual(expected, _relative_period(question, self.temporal), question)

    def test_month_comparison_has_two_authoritative_periods(self):
        args = _apply_overview_authoritative_filters("So với tháng trước thì sao?", {}, self.temporal)
        self.assertEqual(("2026-11-01", "2026-11-19"), (args["fromDate"], args["toDate"]))
        self.assertEqual(("2026-10-01", "2026-10-31"),
                         (args["comparisonFromDate"], args["comparisonToDate"]))

    def test_general_advice_does_not_require_personal_read(self):
        self.assertFalse(_requires_financial_read("Tui nên tiết kiệm thế nào?"))

    def test_declarations_are_gemini_compatible_while_runtime_stays_strict(self):
        for name, tool in TOOLS.items():
            encoded = str(_declaration(tool)["parameters"])
            self.assertNotIn("additionalProperties", encoded, name)
            self.assertNotIn("$defs", encoded, name)
            self.assertNotIn("$ref", encoded, name)
        with self.assertRaises(ValidationError):
            GetTransactionsArgs.model_validate({"unexpected": True})

    def test_nested_schema_refs_are_resolved_before_defs_are_removed(self):
        schema = _declaration(TOOLS["create_budget"])["parameters"]
        item_schema = schema["properties"]["items"]["items"]
        self.assertEqual("object", item_schema["type"])
        self.assertIn("categoryId", item_schema["properties"])

    def test_unresolvable_schema_reference_fails_closed(self):
        with self.assertRaises(ValueError):
            _normalize_gemini_schema({"$ref": "#/$defs/Missing", "$defs": {}})

    def test_router_limits_tools_by_module_and_supports_unaccented_text(self):
        self.assertEqual(("get_accounts",), _route_tools("so du vi cua tui bao nhieu?").available_tools)
        self.assertEqual(("get_budgets",), _route_tools("ngan sach hien tai").available_tools)
        self.assertEqual(("get_debts", "get_schedules"),
                         _route_tools("Tuan sau co khoan nao den han?").available_tools)
        self.assertEqual((), _route_tools("Xin chao FinAI").available_tools)

    def test_financial_calendar_uses_both_sources_and_full_month(self):
        route = _route_tools("Thang nay co bao nhieu lich tai chinh?")
        self.assertEqual("financial_calendar", route.reason)
        self.assertEqual(("get_debts", "get_schedules"), route.available_tools)
        self.assertEqual(("2026-11-01", "2026-11-30"),
                         _calendar_period("Thang nay co bao nhieu lich tai chinh?", self.temporal))
        self.assertEqual(("2026-11-19", "2026-12-19"),
                         _calendar_period("Co lich nao gan toi han?", self.temporal))

    def test_uncertain_personal_finance_widens_to_read_only_tools(self):
        route = _route_tools("Tình hình tài chính của tui thế nào?")
        self.assertEqual("uncertain", route.request_type)
        self.assertTrue(route.available_tools)
        self.assertTrue(all(TOOLS[name].mode == "READ" for name in route.available_tools))

    def test_router_preserves_write_tools_for_creation_intent(self):
        transaction = _route_tools("Tạo giao dịch chi 50 nghìn")
        budget = _route_tools("Lập ngân sách ăn uống tháng này")
        self.assertIn("create_transaction", transaction.available_tools)
        self.assertIn("create_budget", budget.available_tools)

    @patch("action_agent._model")
    @patch("action_agent.BackendToolClient")
    def test_group_fund_request_resolves_real_groups_and_never_offers_personal_write(self, backend, model):
        prompt = "Tạo cho tôi chi tiêu nhóm 50k ăn tối bằng quỹ nhóm."
        route = _route_tools(prompt)
        self.assertIn("create_group_transaction", route.available_tools)
        self.assertNotIn("create_transaction", route.available_tools)
        backend.return_value.execute_read.return_value = {
            "status": "SUCCESS", "data": {"content": [{"id": "group-1", "name": "Phòng trọ"}]},
        }
        reply = run_action_chat(prompt, "context", self.temporal.model_dump())
        self.assertEqual([], reply["proposals"])
        self.assertEqual("groupId", reply["draft"]["field"])
        self.assertEqual([{"id": "group-1", "label": "Phòng trọ"}], reply["draft"]["options"])
        model.assert_not_called()

    @patch("action_agent._model")
    @patch("action_agent.BackendToolClient")
    def test_missing_amount_then_multiple_wallets_preserves_amount_and_narrative(self, backend, model):
        first = run_action_chat("Ghi cho tôi giao dịch ăn trưa.", "context", self.temporal.model_dump())
        self.assertEqual("amount", first["draft"]["field"])
        self.assertFalse(first["proposals"])
        backend.return_value.execute_read.return_value = {
            "status": "SUCCESS", "data": {"accounts": [
                {"id": "a", "name": "Tiền mặt"}, {"id": "b", "name": "Vietcombank"},
            ]},
        }
        next_turn = run_action_chat("50k", "context", self.temporal.model_dump(), draft=first["draft"])
        self.assertEqual("accountId", next_turn["draft"]["field"])
        self.assertEqual(["Ghi cho tôi giao dịch ăn trưa.", "50k"], next_turn["draft"]["turns"])
        self.assertEqual(["a", "b"], [choice["id"] for choice in next_turn["draft"]["options"]])
        self.assertFalse(next_turn["proposals"])
        model.assert_not_called()

    @patch("action_agent._model")
    @patch("action_agent.BackendToolClient")
    def test_transfer_wallet_choices_exclude_explicit_destination(self, backend, model):
        backend.return_value.execute_read.return_value = {
            "status": "SUCCESS", "data": {"accounts": [
                {"id": "dest", "name": "Vietcombank"}, {"id": "cash", "name": "Tiền mặt"}, {"id": "momo", "name": "MoMo"},
            ]},
        }
        result = run_action_chat("Chuyển 500k sang Vietcombank", "context", self.temporal.model_dump())
        self.assertEqual({"toAccountId": "dest"}, result["draft"]["slots"])
        self.assertEqual(["cash", "momo"], [option["id"] for option in result["draft"]["options"]])
        self.assertFalse(result["proposals"])
        model.assert_not_called()

    @patch("action_agent._model")
    @patch("action_agent.BackendToolClient")
    def test_text_followup_can_supply_amount_and_wallet_or_replace_previous_values(self, backend, model):
        from langchain_core.messages import AIMessage

        cash = "10000000-0000-4000-8000-000000000001"
        bank = "10000000-0000-4000-8000-000000000002"
        category = "10000000-0000-4000-8000-000000000003"
        responses = {
            "get_accounts": {"accounts": [{"id": cash, "name": "Tiền mặt"}, {"id": bank, "name": "Vietcombank"}]},
            "get_categories": [{"id": category, "name": "Ăn uống"}],
        }
        backend.return_value.execute_read.side_effect = lambda tool, args, deadline: {"data": responses[tool]}
        initial = run_action_chat("Ghi giao dịch ăn trưa.", "context", self.temporal.model_dump())
        for amount, wallet, prompt, draft in (
            (50000, cash, "50k từ ví Tiền mặt", initial["draft"]),
            (70000, bank, "Đổi thành 70k từ ví Vietcombank", {
                "route": "transaction_write", "field": "categoryId",
                "turns": ["Ghi giao dịch ăn trưa.", "50k từ ví Tiền mặt"], "slots": {"accountId": cash},
            }),
        ):
            with self.subTest(prompt=prompt):
                model.return_value.invoke.side_effect = [
                    AIMessage(content="", tool_calls=[{"name": "get_categories", "args": {"kind": "EXPENSE"}, "id": "cat"}]),
                    AIMessage(content="", tool_calls=[{"name": "create_transaction", "id": "write", "args": {
                        "transactionType": "EXPENSE", "accountId": cash, "categoryId": category,
                        "amount": amount, "currencyCode": "VND", "transactionDate": self.temporal.currentDate,
                    }}]),
                    AIMessage(content="Xem lại giao dịch trước khi xác nhận."),
                ]
                reply = run_action_chat(prompt, "context", self.temporal.model_dump(), draft=draft)
                proposal = reply["proposals"][0]["arguments"]
                self.assertEqual((amount, wallet), (proposal["amount"], proposal["accountId"]))

    @patch("action_agent._model")
    @patch("action_agent.BackendToolClient")
    def test_cancel_draft_has_no_model_call_or_proposal(self, backend, model):
        initial = run_action_chat("Ghi giao dịch ăn trưa.", "context", self.temporal.model_dump())
        result = run_action_chat("Hủy yêu cầu", "context", self.temporal.model_dump(), draft=initial["draft"])
        self.assertFalse(result["proposals"])
        self.assertNotIn("draft", result)
        model.assert_not_called()
        backend.assert_not_called()

    @patch("action_agent._model")
    @patch("action_agent.BackendToolClient")
    def test_short_draft_fragments_and_ordinal_remain_in_context(self, backend, model):
        from langchain_core.messages import AIMessage

        context = self.temporal.model_dump()
        draft = run_action_chat("Ghi giao dịch ăn trưa.", "context", context)["draft"]
        for fragment in ("Hôm qua", "Đúng rồi"):
            reply = run_action_chat(fragment, "context", context, draft=draft)
            self.assertFalse(reply["proposals"])
            draft = reply["draft"]
            self.assertEqual("amount", draft["field"])
            self.assertEqual(fragment, draft["turns"][-1])
        backend.return_value.execute_read.return_value = {"data": {"accounts": [
            {"id": "a", "name": "Tiền mặt"}, {"id": "b", "name": "Vietcombank"},
        ]}}
        reply = run_action_chat("1 triệu", "context", context, draft=draft)
        self.assertEqual("accountId", reply["draft"]["field"])
        model.return_value.invoke.return_value = AIMessage(content="", tool_calls=[
            {"name": "request_clarification", "args": {"field": "categoryId", "question": "Bạn muốn chọn danh mục nào?"}, "id": "category"},
        ])
        reply = run_action_chat("Cái thứ hai", "context", context, draft=reply["draft"])
        self.assertFalse(reply["proposals"])
        self.assertEqual("categoryId", reply["draft"]["field"])
        self.assertEqual("b", reply["draft"]["slots"]["accountId"])

    @patch("action_agent._model")
    def test_advice_can_be_adopted_by_an_explicit_budget_request(self, model):
        from langchain_core.messages import AIMessage

        advice = "Bạn có thể đặt hạn mức 2 triệu cho ăn uống."
        model.return_value.invoke.return_value = AIMessage(content=advice)
        prompt = "Tôi nên lập ngân sách ăn uống thế nào?"
        result = run_action_chat(prompt, "context", self.temporal.model_dump())
        self.assertFalse(result["proposals"])
        model.assert_called_once_with(())
        model.return_value.invoke.return_value = AIMessage(content="", tool_calls=[{
            "name": "create_budget", "id": "budget", "args": {
                "name": "Ăn uống", "totalAmount": 2000000, "periodType": "MONTHLY",
                "startDate": "2026-11-01", "endDate": "2026-11-30", "currencyCode": "VND",
                "items": [{"categoryId": "10000000-0000-4000-8000-000000000003", "amount": 2000000}],
            },
        }])
        result = run_action_chat("Tạo ngân sách theo gợi ý vừa đề xuất.", "context", self.temporal.model_dump(),
                                 history=[{"role": "user", "content": prompt}, {"role": "assistant", "content": advice}])
        self.assertEqual(1, len(result["proposals"]))
        self.assertEqual(2000000, result["proposals"][0]["arguments"]["totalAmount"])

    @patch("action_agent._model")
    @patch("action_agent.BackendToolClient")
    def test_personal_spending_profile_uses_actual_amounts_and_no_write(self, backend, model):
        backend.return_value.execute_read.return_value = {"data": {
            "status": "SUCCESS", "summary": {"total_income": 10000000, "total_expense": 9000000},
            "rule_50_30_20": {"needs_pct": 55, "wants_pct": 35}, "metrics": {"observation_days": 30},
        }}
        result = run_action_chat("Đánh giá chi tiêu của tôi theo quy tắc 50/30/20 và cho lời khuyên tiết kiệm.",
                                 "context", self.temporal.model_dump())
        self.assertIn("10.000.000", result["message"])
        self.assertIn("55,0%", result["message"])
        self.assertIn("chưa phản ánh số tiền đã tiết kiệm", result["message"])
        self.assertFalse(result["proposals"])
        self.assertNotIn("draft", result)
        model.assert_not_called()
        self.assertEqual("get_spending_profile", backend.return_value.execute_read.call_args.args[0])

    @patch("action_agent._model")
    def test_empty_casual_response_is_an_error_not_a_proposal(self, model):
        model.return_value.invoke.return_value = Mock(content="", tool_calls=[], invalid_tool_calls=[], usage_metadata={})
        with self.assertRaises(ToolRequiredError):
            run_action_chat("Bạn khỏe không?", "context", self.temporal.model_dump())

    def test_capability_questions_never_expose_write_tools(self):
        questions = (
            "Bạn có thể tạo khoản chi tiêu hay là tạo khoản nợ được k",
            "FinAI có hỗ trợ tạo khoản nợ không?",
            "Bạn có tạo được khoản nợ không?",
            "Tạo khoản chi tiêu được không?",
            "Can you create an expense?",
            "Do you create debts?",
        )
        for question in questions:
            route = _route_tools(question)
            self.assertTrue(_is_write_capability_question(question), question)
            self.assertEqual("write_capability_question", route.reason, question)
            self.assertEqual((), route.available_tools, question)
            self.assertEqual("casual", route.request_type, question)

    @patch("action_agent._model")
    def test_capability_answer_is_deterministic_and_creates_no_proposal(self, model_factory):
        result = run_action_chat(
            "Bạn có thể tạo khoản chi tiêu hay là tạo khoản nợ được k",
            "unused-context-token", self.temporal.model_dump(),
        )
        self.assertEqual([], result["proposals"])
        self.assertIn("Có.", result["message"])
        self.assertIn("khoản chi tiêu và khoản nợ", result["message"])
        model_factory.assert_not_called()

    def test_polite_but_concrete_creation_request_remains_a_write(self):
        message = "Bạn có thể tạo khoản chi 50 nghìn hôm nay giúp mình không?"
        route = _route_tools(message)
        self.assertFalse(_is_write_capability_question(message))
        self.assertEqual("transaction_write", route.reason)
        self.assertIn("create_transaction", route.available_tools)

    def test_router_supports_wave_one_write_intents(self):
        self.assertEqual(("create_goal",), _route_tools("Tao muc tieu mua xe 30 trieu").available_tools)
        self.assertEqual(("create_debt",), _route_tools("Them khoan no 2 trieu cua Minh").available_tools)
        self.assertEqual("goal_contribution_write", _route_tools("Dong gop 500 nghin vao muc tieu mua xe").reason)
        self.assertEqual("debt_payment_write", _route_tools("Ghi nhan da tra no Minh 500 nghin").reason)
        self.assertEqual(("get_budgets", "update_budget"),
                         _route_tools("Tang ngan sach an uong len 3 trieu").available_tools)

    def test_installment_debt_uses_explicit_day_for_first_and_last_payment(self):
        enriched = _enrich_create_debt_schedule(
            "Tạo khoản nợ mua ô tô 6 triệu, trả 3 kỳ vào ngày 5 hàng tháng",
            {"debtType": "BORROWING", "counterpartyName": "Mua ô tô",
             "principalAmount": 6_000_000, "currencyCode": "VND", "startDate": "2026-11-19"},
            self.temporal,
        )
        self.assertEqual("MONTHLY", enriched["paymentFrequency"])
        self.assertEqual(2_000_000, enriched["paymentAmount"])
        self.assertEqual("2026-12-05", enriched["nextPaymentDate"])
        self.assertEqual("2027-02-05", enriched["dueDate"])
        self.assertEqual("2026-11-19", enriched["startDate"])

    def test_installment_day_uses_current_month_when_still_upcoming(self):
        context = self.temporal.model_copy(update={"currentDate": "2026-11-02"})
        enriched = _enrich_create_debt_schedule(
            "Tạo khoản vay trả ba kỳ vào ngày 5",
            {"principalAmount": 900_000, "startDate": "2026-11-02"}, context,
        )
        self.assertEqual("2026-11-05", enriched["nextPaymentDate"])
        self.assertEqual("2027-01-05", enriched["dueDate"])

    def test_router_supports_wave_two_write_intents(self):
        self.assertEqual("schedule_write", _route_tools("Tao lich nhac dong tien nha hang thang").reason)
        self.assertEqual(("get_schedules", "update_schedule"),
                         _route_tools("Cap nhat lich tien nha thanh ngay 5").available_tools)
        self.assertEqual(("get_accounts", "create_account"),
                         _route_tools("Tao vi tien mat moi so du 500 nghin").available_tools)
        self.assertEqual("transaction_write",
                         _route_tools("Tao giao dich chi 50 nghin tu tai khoan chinh").reason)

    def test_router_supports_wave_three_write_intents(self):
        self.assertEqual("group_expense_write",
                         _route_tools("Tao khoan chi nhom 300 nghin chia deu").reason)
        self.assertEqual("group_fund_write",
                         _route_tools("Nop quy nhom 500 nghin tu vi chinh").reason)

    def test_group_routing_varied_vietnamese_phrasing(self):
        for prompt in (
            "Chi tiêu nhóm 50k ăn tối bằng quỹ nhóm.",
            "Lay 50 nghin tu quy phong tro de tra tien an.",
            "Ghi tiền ăn tối của cả nhóm, dùng tiền quỹ.",
            "Tôi ứng tiền cá nhân 200k mua đồ cho nhóm.",
            "Hôm nay cả phòng ăn hết 300k, ghi vào nhóm giúp tôi.",
        ):
            with self.subTest(prompt=prompt):
                route = _route_tools(prompt)
                self.assertEqual("group_expense_write", route.reason)
                self.assertNotIn("create_transaction", route.available_tools)
        self.assertEqual("group_fund_write", _route_tools("Góp thêm 500k vào quỹ phòng trọ.").reason)
        self.assertEqual("transaction_write", _route_tools("Ghi chi 50k ăn tối từ ví cá nhân.").reason)

    def test_group_acceptance_prompts_are_routed_by_business_purpose(self):
        from action_agent import _fold_text, _group_expense_purpose, _group_source
        for prompt in (
            "Tháng này tôi còn phải đóng bao nhiêu tiền quỹ gia đình?",
            "Ai chưa đóng quỹ phòng trọ?",
            "Nhóm du lịch hiện tại ai đang nợ ai?",
            "Quỹ gia đình còn phải hoàn trả tôi bao nhiêu?",
        ):
            with self.subTest(prompt=prompt):
                route = _route_tools(prompt)
                self.assertEqual("group_read", route.request_type)
                self.assertEqual(("get_groups", "get_group_finances"), route.available_tools)
        self.assertEqual("group_fund_write", _route_tools("Tôi muốn nộp thêm 500 nghìn vào quỹ gia đình.").reason)
        for prompt, expected in (
            ("Tôi chi 300 nghìn tiền ăn từ quỹ cặp đôi.", "FUND_EXPENSE"),
            ("Tôi tự nguyện trả 300 nghìn tiền ăn cho gia đình bằng ví cá nhân.", "VOLUNTARY_SPEND"),
            ("Tôi ứng 500 nghìn mua đồ gia đình, quỹ hoàn trả cho tôi.", "FUND_REIMBURSEMENT"),
            ("Tôi ứng 600 nghìn cho nhóm du lịch, chia đều bốn người.", "MEMBER_SPLIT"),
        ):
            with self.subTest(prompt=prompt):
                self.assertEqual("group_expense_write", _route_tools(prompt).reason)
                self.assertEqual(expected, _group_expense_purpose(_group_source(prompt, prompt), _fold_text(prompt)))

    @patch("action_agent._model")
    @patch("action_agent.BackendToolClient")
    def test_group_source_requires_explicit_choice(self, backend, model):
        backend.return_value.execute_read.return_value = {
            "status": "SUCCESS", "data": {"content": [{"id": "room", "name": "Phòng trọ"}]},
        }
        reply = run_action_chat("Ghi vào nhóm Phòng trọ 300k ăn tối", "context", self.temporal.model_dump())
        self.assertEqual("paymentSource", reply["draft"]["field"])
        self.assertEqual(["GROUP_FUND", "PERSONAL_ACCOUNT"], [item["id"] for item in reply["draft"]["options"]])
        self.assertEqual([], reply["proposals"])
        selected = run_action_chat("Ví cá nhân", "context", self.temporal.model_dump(),
                                   draft=reply["draft"], selected_option="PERSONAL_ACCOUNT")
        self.assertEqual("financialPurpose", selected["draft"]["field"])
        self.assertEqual("room", selected["draft"]["slots"]["groupId"])
        self.assertEqual("PERSONAL_ACCOUNT", selected["draft"]["slots"]["paymentSource"])
        self.assertEqual([], selected["proposals"])
        model.assert_not_called()

    def test_exact_shares_must_match_named_members_and_stated_amounts(self):
        from action_agent import _guard_proposal
        prompt = "Chi nhóm 50k bằng ví cá nhân, chia An 30k, Bình 20k"
        results = [
            ("get_group_finances", {"data": [{"userId": "a", "name": "An"}, {"userId": "b", "name": "Bình"}]}),
            ("get_categories", {"data": [{"id": "food", "name": "Ăn uống"}]}),
        ]
        args = {"groupId": "room", "categoryId": "food", "amount": 50000, "splitMethod": "EXACT",
                "splits": [{"userId": "a", "amount": 30000}, {"userId": "b", "amount": 20000}]}
        slots = {"groupId": "room"}
        self.assertIsNone(_guard_proposal("create_group_transaction", args, prompt, prompt, results, slots, self.temporal))
        args["splits"] = [{"userId": "a", "amount": 20000}, {"userId": "b", "amount": 30000}]
        self.assertEqual(("splits", []),
                         _guard_proposal("create_group_transaction", args, prompt, prompt, results, slots, self.temporal))
        args["splitMethod"] = "EQUAL"
        args["splits"] = [{"userId": "a", "amount": 25000}, {"userId": "b", "amount": 25000}]
        self.assertEqual(("splits", []),
                         _guard_proposal("create_group_transaction", args, prompt, prompt, results, slots, self.temporal))

    @patch("action_agent._model")
    @patch("action_agent.BackendToolClient")
    def test_multi_intent_write_requests_which_should_be_done_first(self, backend, model):
        result = run_action_chat("Chi nhóm 50k ăn tối bằng quỹ nhóm và chuyển 100k sang MoMo",
                                 "context", self.temporal.model_dump())
        self.assertEqual([], result["proposals"])
        self.assertIn("yêu cầu nào trước", result["message"])
        backend.assert_not_called()
        model.assert_not_called()

    @patch("action_agent._model")
    @patch("action_agent.BackendToolClient")
    def test_duplicate_named_wallets_are_disambiguated_in_choices(self, backend, model):
        backend.return_value.execute_read.return_value = {"status": "SUCCESS", "data": {"accounts": [
            {"id": "wallet-a", "name": "Tiền mặt"}, {"id": "wallet-b", "name": "Tién măt"},
        ]}}
        result = run_action_chat("Ghi chi 50k ăn tối từ Tiền mặt", "context", self.temporal.model_dump())
        self.assertEqual("accountId", result["draft"]["field"])
        choices = result["draft"]["options"]
        self.assertEqual(["wallet-a", "wallet-b"], [choice["id"] for choice in choices])
        self.assertEqual(2, len({choice["label"] for choice in choices}))
        self.assertTrue(all("mã wallet-" in choice["label"] for choice in choices))
        model.assert_not_called()

    def test_router_uses_recent_context_for_ambiguous_follow_up(self):
        route = _route_tools("Còn cái đó thì sao?", [
            {"role": "user", "content": "Ngân sách tháng này của tui"},
            {"role": "assistant", "content": "..."},
        ])
        self.assertEqual(("get_budgets",), route.available_tools)

    def test_combined_overview_does_not_inherit_schedule_period(self):
        args = _apply_overview_authoritative_filters(
            "Tổng hợp tháng này và lịch thanh toán tuần sau", {}, self.temporal)
        self.assertEqual(("2026-11-01", "2026-11-19"), (args["fromDate"], args["toDate"]))

    def test_structured_fast_path_only_handles_certain_result_shapes(self):
        overview = {
            "status": "SUCCESS", "tool": "get_financial_overview", "data": {
                "period": {"fromDate": "2026-11-01", "toDate": "2026-11-19"},
                "cashflow": {"summary": {"totalExpense": 1500000}, "byCategory": [
                    {"categoryName": "Ăn uống", "totalAmount": 1200000}
                ]},
            },
        }
        answer = _simple_read_fast_path("Tháng này tui tiêu bao nhiêu?", "get_financial_overview", overview)
        self.assertIn("1.500.000đ", answer)
        self.assertIsNone(_simple_read_fast_path("Cho tui tổng quan", "get_financial_overview", overview))
        self.assertIn("chưa có ngân sách", _simple_read_fast_path(
            "Ngân sách?", "get_budgets",
            {"status": "SUCCESS", "tool": "get_budgets", "data": {"budgets": []}},
        ))

    def test_category_enrichment_uses_unique_authorized_read_candidate_only(self):
        cached = [{"data": {"content": [
            {"category": {"id": "food-id", "name": "Ăn uống"}},
            {"category": {"id": "travel-id", "name": "Di chuyển"}},
        ]}}]
        self.assertEqual("food-id", _resolve_category_id("Chi tiền ăn trưa", cached))
        english_cached = [{"data": {"content": [
            {"category": {"id": "food-id", "name": "Food"}},
            {"category": {"id": "travel-id", "name": "Transport"}},
        ]}}]
        self.assertEqual("food-id", _resolve_category_id("Chi tiền ăn trưa", english_cached))
        self.assertIsNone(_resolve_category_id("Chi tiền hôm nay", cached))

    @patch("action_agent.BackendToolClient")
    @patch("action_agent._model")
    def test_duplicate_read_call_is_served_from_request_cache(self, model_factory, client_factory):
        from langchain_core.messages import AIMessage

        model_factory.return_value.invoke.side_effect = [
            AIMessage(content="", tool_calls=[{"name": "get_budgets", "args": {}, "id": "one"}]),
            AIMessage(content="", tool_calls=[{"name": "get_budgets", "args": {}, "id": "two"}]),
            AIMessage(content="Done", tool_calls=[]),
        ]
        client_factory.return_value.execute_read.return_value = {"status": "ok", "tool": "get_budgets", "data": {}}

        result = run_action_chat("Ngân sách và mục tiêu hiện tại?", "context", self.temporal.model_dump())

        self.assertEqual("Done", result["message"])
        self.assertEqual(1, client_factory.return_value.execute_read.call_count)

    @patch("action_agent.BackendToolClient")
    @patch("action_agent._model")
    def test_calendar_answer_waits_until_both_sources_are_read(self, model_factory, client_factory):
        from langchain_core.messages import AIMessage

        model_factory.return_value.invoke.side_effect = [
            AIMessage(content="", tool_calls=[{"name": "get_schedules", "args": {}, "id": "s"}]),
            AIMessage(content="Co 1 lich.", tool_calls=[]),
            AIMessage(content="", tool_calls=[{"name": "get_debts", "args": {}, "id": "d"}]),
            AIMessage(content="Co 2 lich, gom 1 lich dinh ky va 1 ky tra no.", tool_calls=[]),
        ]
        client_factory.return_value.execute_read.side_effect = [
            {"status": "SUCCESS", "tool": "get_schedules", "data": {"content": [{"id": 1}]}},
            {"status": "SUCCESS", "tool": "get_debts", "data": {
                "calendarOccurrenceCount": 1, "calendarOccurrences": [{"debtId": "d1"}]
            }},
        ]

        result = run_action_chat("Thang nay co bao nhieu lich tai chinh?", "context", self.temporal.model_dump())

        self.assertIn("2 lich", result["message"])
        calls = client_factory.return_value.execute_read.call_args_list
        self.assertEqual(["get_schedules", "get_debts"], [call.args[0] for call in calls])
        for call in calls:
            self.assertEqual("2026-11-01", call.args[1]["fromDate"])
            self.assertEqual("2026-11-30", call.args[1]["toDate"])

    @patch("action_agent.BackendToolClient")
    @patch("action_agent._model")
    def test_write_loop_stops_at_valid_proposal_without_executing_it(self, model_factory, client_factory):
        from langchain_core.messages import AIMessage

        model_factory.return_value.invoke.side_effect = [
            AIMessage(content="", tool_calls=[
                {"name": "get_accounts", "args": {}, "id": "accounts"},
                {"name": "get_transactions", "args": {}, "id": "transactions"},
            ]),
            AIMessage(content="", tool_calls=[{"name": "create_transaction", "id": "write", "args": {
                "transactionType": "EXPENSE", "accountId": "account", "categoryId": "hallucinated",
                "amount": 50000, "currencyCode": "VND", "transactionDate": "2026-11-19",
            }}]),
        ]
        client_factory.return_value.execute_read.side_effect = [
            {"status": "SUCCESS", "tool": "get_accounts", "data": {"accounts": [{"id": "account", "name": "Ví A"}]}},
            {"status": "SUCCESS", "tool": "get_transactions", "data": {
                "content": [{"category": {"id": "food", "name": "Ăn uống"}}]
            }},
        ]

        result = run_action_chat("Tạo giao dịch chi 50 nghìn tiền ăn", "context", self.temporal.model_dump())

        self.assertEqual(1, len(result["proposals"]))
        self.assertEqual("create_transaction", result["proposals"][0]["toolName"])
        self.assertEqual("food", result["proposals"][0]["arguments"]["categoryId"])
        self.assertEqual(2, client_factory.return_value.execute_read.call_count)
        self.assertEqual(2, model_factory.return_value.invoke.call_count)
        transaction_lookup = client_factory.return_value.execute_read.call_args_list[1].args[1]
        self.assertEqual(50, transaction_lookup["pageSize"])
        self.assertNotIn("fromDate", transaction_lookup)
        self.assertNotIn("toDate", transaction_lookup)

    @patch("action_agent.BackendToolClient")
    @patch("action_agent._model")
    def test_goal_contribution_reads_owned_resources_then_returns_proposal(self, model_factory, client_factory):
        from langchain_core.messages import AIMessage

        model_factory.return_value.invoke.side_effect = [
            AIMessage(content="", tool_calls=[
                {"name": "get_accounts", "args": {}, "id": "accounts"},
                {"name": "get_goals", "args": {}, "id": "goals"},
            ]),
            AIMessage(content="", tool_calls=[{"name": "contribute_to_goal", "id": "write", "args": {
                "goalId": "goal-owned", "amount": 500000, "sourceAccountId": "account-owned",
                "note": "Đóng góp mục tiêu mua xe",
            }}]),
        ]
        client_factory.return_value.execute_read.side_effect = [
            {"status": "SUCCESS", "tool": "get_accounts", "data": [{"id": "account-owned"}]},
            {"status": "SUCCESS", "tool": "get_goals", "data": [{"id": "goal-owned", "name": "Mua xe"}]},
        ]

        result = run_action_chat("Đóng góp 500 nghìn từ ví chính vào mục tiêu mua xe", "context",
                                 self.temporal.model_dump())

        self.assertEqual("contribute_to_goal", result["proposals"][0]["toolName"])
        self.assertEqual("goal-owned", result["proposals"][0]["arguments"]["goalId"])
        self.assertEqual(2, client_factory.return_value.execute_read.call_count)
        self.assertEqual(2, model_factory.return_value.invoke.call_count)

    @patch("action_agent.time.sleep", return_value=None)
    def test_gemini_429_is_retried_with_a_small_bound(self, _sleep):
        class Model:
            calls = 0
            def invoke(self, _messages):
                self.calls += 1
                if self.calls < 2:
                    raise RuntimeError("429 RESOURCE_EXHAUSTED")
                return "ok"
        model = Model()
        self.assertEqual("ok", _invoke_with_controlled_retry(model, []))
        self.assertEqual(2, model.calls)

    @patch("action_agent.time.sleep")
    def test_gemini_rate_limit_honors_retry_after_and_budget(self, sleep):
        import time
        failure = RuntimeError("429 RESOURCE_EXHAUSTED")
        failure.response = Mock(headers={"Retry-After": "60"})
        model = Mock()
        model.invoke.side_effect = failure
        with self.assertRaises(GeminiRateLimitError) as result:
            _invoke_with_controlled_retry(model, [], deadline=time.monotonic() + 30)
        self.assertEqual(60, result.exception.retry_after_seconds)
        model.invoke.assert_called_once()
        sleep.assert_not_called()

    @patch("action_agent.time.sleep")
    def test_daily_limit_is_not_retried(self, sleep):
        model = Mock()
        model.invoke.side_effect = RuntimeError("429 quota metric GenerateRequestsPerDayPerProject")
        with self.assertRaises(GeminiQuotaError):
            _invoke_with_controlled_retry(model, [])
        model.invoke.assert_called_once()
        sleep.assert_not_called()

    @patch("action_agent.time.sleep")
    def test_provider_500_and_503_have_a_bounded_retry(self, sleep):
        for status in (500, 503):
            with self.subTest(status=status):
                failure = RuntimeError("provider discarded request")
                failure.status_code = status
                model = Mock()
                model.invoke.side_effect = failure
                with self.assertRaises(GeminiNetworkError):
                    _invoke_with_controlled_retry(model, [])
                self.assertEqual(2, model.invoke.call_count)
        self.assertEqual(2, sleep.call_count)

    @patch("action_agent.time.sleep", return_value=None)
    def test_gemini_timeout_stops_after_two_attempts(self, _sleep):
        class Model:
            calls = 0
            def invoke(self, _messages):
                self.calls += 1
                raise TimeoutError("deadline timeout")
        model = Model()
        with self.assertRaises(GeminiTimeoutError):
            _invoke_with_controlled_retry(model, [])
        self.assertEqual(2, model.calls)

    @patch("action_agent._model")
    def test_financial_question_without_successful_tool_fails_closed(self, model_factory):
        class DummyAIMessage:
            def __init__(self, content):
                self.content = content
                self.tool_calls = []
        model_factory.return_value.invoke.return_value = DummyAIMessage(content="Bạn đã tiêu 0đ.")
        with self.assertRaises(ToolRequiredError):
            run_action_chat("Tháng này tui tiêu bao nhiêu?", "context", self.temporal.model_dump())

    @patch("action_agent.BackendToolClient")
    @patch("action_agent._model")
    def test_write_request_without_valid_proposal_fails_closed(self, model_factory, backend):
        class DummyAIMessage:
            content = "Mình không tạo được."
            tool_calls = []
            usage_metadata = {}

        model_factory.return_value.invoke.return_value = DummyAIMessage()
        backend.return_value.execute_read.return_value = {
            "status": "SUCCESS", "data": {"accounts": [{"id": "a", "name": "Tiền mặt"}]},
        }
        with self.assertRaises(ToolRequiredError):
            run_action_chat("Tạo giao dịch chi 50 nghìn", "context", self.temporal.model_dump())

    def test_non_retryable_sdk_error_is_not_retried(self):
        class Model:
            calls = 0
            def invoke(self, _messages):
                self.calls += 1
                raise RuntimeError("invalid function schema")
        model = Model()
        with self.assertRaises(RuntimeError):
            _invoke_with_controlled_retry(model, [])
        self.assertEqual(1, model.calls)

    def test_invalid_deadline_request_is_not_misclassified_as_timeout(self):
        class InvalidRequest(RuntimeError):
            status_code = 400

        class Model:
            calls = 0
            def invoke(self, _messages):
                self.calls += 1
                raise InvalidRequest("INVALID_ARGUMENT: manually set deadline is too short")

        model = Model()
        with self.assertRaises(InvalidRequest):
            _invoke_with_controlled_retry(model, [])
        self.assertEqual(1, model.calls)

    @patch.dict("os.environ", {"FINAI_MODEL_TIMEOUT_SECONDS": "10"})
    def test_turn_is_not_started_when_request_deadline_cannot_fit_it(self):
        import time

        class Model:
            calls = 0
            def invoke(self, _messages):
                self.calls += 1
                raise TimeoutError("deadline timeout")

        model = Model()
        with self.assertRaises(GeminiTimeoutError):
            _invoke_with_controlled_retry(model, [], deadline=time.monotonic() + 1)
        self.assertEqual(0, model.calls)


if __name__ == "__main__":
    unittest.main()
