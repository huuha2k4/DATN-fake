import json
import unittest
from types import SimpleNamespace

from operation_observation import Observation, current, model_response, model_started, read_result


class OperationObservationTest(unittest.TestCase):
    def test_counts_model_attempts_tools_and_zero_without_capturing_payload(self):
        observation = Observation()
        token = current.set(observation)
        try:
            model = SimpleNamespace(model="gemini-configured")
            model_started(model)
            observation.trace("gemini_attempt", {"attempt": 1, "modelRound": 1, "latencyMs": 15, "outcome": "rate_limit"})
            self.assertEqual(json.loads(observation.header())["model"], "gemini-configured")
            observation.trace("gemini_attempt", {"attempt": 2, "modelRound": 1, "latencyMs": 21, "outcome": "success"})
            observation.trace("gemini_attempt", {"attempt": 1, "modelRound": 2, "latencyMs": 18, "outcome": "success"})
            observation.trace("model_round", {"selectedTools": ["get_accounts", "create_goal"], "prompt": "private-fixture"})
            model_response(model, SimpleNamespace(usage_metadata={"input_tokens": 0},
                                                 response_metadata={"model_name": "gemini-runtime"}))
            read_result("get_accounts", True, 9)
            read_result("get_accounts", False, 11)
            data = json.loads(observation.header())
            self.assertEqual((data["calls"], data["retries"], data["rounds"], data["ms"]), (3, 1, 2, 54))
            self.assertEqual(data["model"], "gemini-runtime")
            self.assertEqual(data["input"], 0)
            self.assertNotIn("output", data)
            self.assertEqual(data["errors"], {"rate_limit": 1})
            self.assertEqual(data["tools"], {
                "create_goal:write_selected": 1, "get_accounts:read_ok": 1,
                "get_accounts:read_error": 1, "get_accounts:read_ms": 20,
            })
            self.assertNotIn("private-fixture", observation.header())
        finally:
            current.reset(token)
