"""Opt-in smoke test for a configured, running legacy chat service."""
import os

import pytest
import requests


@pytest.mark.integration
@pytest.mark.skipif(
    not os.getenv("FINORA_LEGACY_CHAT_URL") or not os.getenv("FINORA_ANALYTICS_FIXTURE_USER"),
    reason="Requires FINORA_LEGACY_CHAT_URL and a seeded FINORA_ANALYTICS_FIXTURE_USER",
)
def test_live_legacy_chat():
    response = requests.post(
        os.environ["FINORA_LEGACY_CHAT_URL"],
        json={"question": "số dư của tôi còn bao nhiêu", "user_id": os.environ["FINORA_ANALYTICS_FIXTURE_USER"]},
        timeout=30,
    )
    response.raise_for_status()
    assert response.json().get("answer"), "The live chat returned an empty answer"

