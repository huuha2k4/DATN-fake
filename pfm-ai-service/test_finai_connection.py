import os
import time
import unittest
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient

from action_agent import GeminiNetworkError, GeminiQuotaError, GeminiRateLimitError, GeminiTimeoutError, _model
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
