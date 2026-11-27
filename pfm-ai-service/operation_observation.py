"""Bounded orchestration totals for the authenticated Spring adapter."""
import json
from collections import Counter
from contextvars import ContextVar

current = ContextVar("operation_observation", default=None)


class Observation:
    def __init__(self):
        self.calls = self.retries = self.rounds = self.ms = self.success = 0
        self.model = None
        self.errors = Counter()
        self.tools = Counter()
        self.tokens = {}

    def trace(self, event, fields):
        if event == "gemini_attempt":
            self.calls += 1
            self.retries += int(fields["attempt"] > 1)
            self.rounds = max(self.rounds, fields["modelRound"] or 0)
            self.ms += fields["latencyMs"]
            outcome = fields["outcome"]
            if outcome == "success":
                self.success += 1
            else:
                self.errors[outcome] += 1
        elif event == "model_round":
            # Allowed selections only, with no arguments or output.
            from action_agent import TOOLS
            for name in fields["selectedTools"]:
                if name in TOOLS and TOOLS[name].mode == "WRITE":
                    self.tools[f"{name}:write_selected"] += 1

    def header(self):
        return json.dumps(dict(calls=self.calls, retries=self.retries, rounds=self.rounds, ms=self.ms,
                               model=self.model, errors=self.errors, tools=self.tools, success=self.success,
                               **self.tokens), separators=(",", ":"), ensure_ascii=True)


def model_response(model, response):
    sample = current.get()
    if sample is None:
        return
    usage = getattr(response, "usage_metadata", None)
    if isinstance(usage, dict):
        for source, target in (("input_tokens", "input"), ("output_tokens", "output")):
            value = usage.get(source)
            if type(value) is int and 0 <= value <= 100_000_000:
                sample.tokens[target] = sample.tokens.get(target, 0) + value
    metadata = getattr(response, "response_metadata", None)
    model_name = metadata.get("model_name") if isinstance(metadata, dict) else None
    value = model_name or getattr(model, "model", None)
    if isinstance(value, str) and len(value) <= 80:
        sample.model = value


def model_started(model):
    sample = current.get()
    if sample is not None and sample.model is None:
        model_name = getattr(model, "model", None)
        if isinstance(model_name, str) and len(model_name) <= 80:
            sample.model = model_name


def read_result(name, succeeded, elapsed_ms):
    sample = current.get()
    if sample is not None:
        sample.tools[f"{name}:read_ok" if succeeded else f"{name}:read_error"] += 1
        sample.tools[f"{name}:read_ms"] += elapsed_ms
