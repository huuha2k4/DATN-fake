import os
import time
import unittest
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient

from action_agent import GeminiNetworkError, GeminiQuotaError, GeminiRateLimitError, GeminiTimeoutError, ToolExecutionError, _model
from main import app


class FinAiConnectionTests(unittest.TestCase):
    request = {
        "conversationId": "test-conversation",
        "message": "Hello FinAI",
        "contextToken": "test-context",
        "temporalContext": {},
    }
    headers = {
        "X-FinAI-Service-Secret": "finai-test-secret-not-a-real-secret",
        "X-Request-Id": "finai-connection-test",
    }

    def post(self, payload=None, headers=None):
        # Avoid service startup hooks and any live provider or DB call.
        with patch.dict(os.environ, {"FINAI_SERVICE_SECRET": self.headers["X-FinAI-Service-Secret"]}):
            return TestClient(app).post("/api/v1/agent/chat",
                                        json=self.request if payload is None else payload,
                                        headers=self.headers if headers is None else headers)

    @patch("main.run_action_chat", return_value={"message": "Hello", "proposals": []})
    def test_success_preserves_request_id(self, agent):
        response = self.post()
        self.assertEqual(200, response.status_code)
        self.assertEqual("Hello", response.json()["message"])
        self.assertEqual(self.headers["X-Request-Id"], response.headers["X-Request-Id"])
        self.assertEqual(self.headers["X-Request-Id"], agent.call_args.kwargs["request_id"])

    def test_safe_error_mapping(self):
        cases = [
            (GeminiRateLimitError("private provider response", 2.4), 429, "AI_RATE_LIMITED"),
            (GeminiQuotaError("private provider response"), 429, "AI_QUOTA_EXCEEDED"),
            (GeminiTimeoutError("private provider response"), 504, "AI_TIMEOUT"),
            (GeminiNetworkError("private provider response"), 503, "AI_PROVIDER_UNAVAILABLE"),
            (RuntimeError("private provider response"), 502, "AI_INTERNAL_ERROR"),
        ]
        for exception, status, code in cases:
            with self.subTest(code=code), patch("main.run_action_chat", side_effect=exception):
                response = self.post()
                self.assertEqual(status, response.status_code)
                self.assertEqual(code, response.json()["errorCode"])
                self.assertEqual(self.headers["X-Request-Id"], response.json()["requestId"])
                self.assertNotIn("private provider response", response.text)
                if isinstance(exception, GeminiRateLimitError):
                    self.assertEqual("3", response.headers["Retry-After"])

    @patch("main.run_action_chat")
    def test_invalid_and_unauthenticated_never_reach_agent(self, agent: Mock):
        self.assertEqual("AUTHENTICATION_ERROR", self.post(headers={}).json()["errorCode"])
        invalid = self.post(payload={})
        self.assertEqual(400, invalid.status_code)
        self.assertEqual("INVALID_REQUEST", invalid.json()["errorCode"])
        agent.assert_not_called()

    @patch.dict(os.environ, {"FINAI_REQUEST_BUDGET_SECONDS": "0.01"})
    @patch("main.run_action_chat", side_effect=lambda **_: time.sleep(0.05))
    def test_slow_worker_returns_timeout(self, agent):
        response = self.post()
        self.assertEqual(504, response.status_code)
        self.assertEqual("AI_TIMEOUT", response.json()["errorCode"])
        agent.assert_called_once()

    @patch.dict(os.environ, {"GEMINI_API_KEY": "test-key", "FINAI_MODEL_TIMEOUT_SECONDS": "18"})
    def test_sdk_uses_one_attempt_and_the_configured_timeout(self):
        model = _model(())
        self.assertEqual(1, model.max_retries)
        self.assertEqual(18, model.timeout)

    def conversation_payload(self, message, **fields):
        from test_action_agent import ActionAgentSchemaTests

        return {**self.request, "message": message, "temporalContext": ActionAgentSchemaTests.temporal.model_dump(), **fields}

    @patch("action_agent.BackendToolClient")
    @patch("action_agent._model")
    def test_plain_text_conversation_http_never_calls_financial_tools(self, model, backend):
        from langchain_core.messages import AIMessage

        cases = {
            "social": ("Xin chào.", "Chào buổi sáng.", "Bạn ăn cơm chưa?", "Bạn khỏe không?",
                       "Bạn bao nhiêu tuổi?", "Cảm ơn bạn.", "Tạm biệt.", "Ban an com chua?", "ban khoe ko?", "tks"),
            "capability": ("Bạn là ai?", "FinAI là gì?", "Bạn có thể giúp gì cho tôi?", "Bạn có những chức năng gì?",
                           "FinAI làm được gì?", "Tôi nên bắt đầu từ đâu?", "Bạn có tự ý tạo giao dịch không?",
                           "Bạn có thể giúp tôi quản lý tài chính không?", "Tôi có thể sử dụng bạn như thế nào?"),
            "out_of_scope": ("Viết code Java.", "Bạn có thể tạo một bài văn không?", "Giải bài tập vật lý.", "Viết bài văn.",
                             "Hôm nay thời tiết thế nào?", "Dịch truyện này.", "Có phim gì hay không?"),
            "knowledge": ("Ngân sách là gì?", "Lãi kép là gì?", "Giải thích quy tắc 50/30/20.",
                          "Làm thế nào để tiết kiệm tiền?", "Quỹ dự phòng khẩn cấp là gì?"),
            "advice": ("Tôi muốn tiết kiệm tiền mua laptop để lập trình.", "Lập ngân sách đi du lịch Đà Nẵng.",
                       "Tính chi phí học tiếng Anh.", "Tư vấn mua điện thoại trả góp.",
                       "Lập kế hoạch mua xe.", "Tôi đang gặp áp lực vì các khoản nợ."),
        }
        for intent, messages in cases.items():
            for message in messages:
                with self.subTest(intent=intent, message=message):
                    model.reset_mock()
                    expected = "Mình trả lời bằng văn bản."
                    model.return_value.invoke.return_value = AIMessage(content=[
                        {"type": "reasoning", "text": "private reasoning"},
                        {"type": "text", "text": expected},
                    ])
                    response = self.post(self.conversation_payload(message))
                    self.assertEqual(200, response.status_code, response.text)
                    data = response.json()
                    self.assertTrue(data["message"].strip())
                    self.assertEqual([], data["proposals"])
                    self.assertIsNone(data["draft"])
                    self.assertFalse(data["preserveDraft"])
                    if model.called:
                        model.assert_called_once_with(())
                        self.assertTrue(data["message"].startswith(expected))
                        self.assertNotIn("private reasoning", data["message"])
                    else:
                        self.assertEqual("social", intent)
                    backend.return_value.execute_read.assert_not_called()

    @patch("action_agent.BackendToolClient")
    @patch("action_agent._model")
    def test_social_interrupt_preserves_draft_and_next_amount_continues(self, model, backend):
        first = self.post(self.conversation_payload("Ghi giao dịch ăn trưa."))
        self.assertEqual(200, first.status_code)
        draft = first.json()["draft"]
        self.assertEqual("amount", draft["field"])
        social = self.post(self.conversation_payload("Cảm ơn bạn", draft=draft))
        self.assertEqual(200, social.status_code)
        self.assertTrue(social.json()["preserveDraft"])
        self.assertIsNone(social.json()["draft"])
        self.assertEqual([], social.json()["proposals"])
        backend.return_value.execute_read.assert_not_called()
        backend.return_value.execute_read.return_value = {"data": {"accounts": [
            {"id": "a", "name": "Tiền mặt"}, {"id": "b", "name": "Vietcombank"},
        ]}}
        amount = self.post(self.conversation_payload("50k", draft=draft))
        self.assertEqual(200, amount.status_code)
        self.assertEqual([], amount.json()["proposals"])
        self.assertEqual(["Ghi giao dịch ăn trưa.", "50k"], amount.json()["draft"]["turns"])
        self.assertEqual("accountId", amount.json()["draft"]["field"])
        backend.return_value.execute_read.assert_called_once()
        model.assert_not_called()

    @patch("action_agent.BackendToolClient")
    def test_financial_read_failure_is_still_a_safe_http_error(self, backend):
        backend.return_value.execute_read.side_effect = ToolExecutionError("private internal detail")
        response = self.post(self.conversation_payload("Đánh giá chi tiêu của tôi theo quy tắc 50/30/20."))
        self.assertEqual(502, response.status_code)
        self.assertEqual("AI_INTERNAL_ERROR", response.json()["errorCode"])
        self.assertEqual(self.headers["X-Request-Id"], response.json()["requestId"])
        self.assertNotIn("private internal detail", response.text)
        backend.return_value.execute_read.assert_called_once()
