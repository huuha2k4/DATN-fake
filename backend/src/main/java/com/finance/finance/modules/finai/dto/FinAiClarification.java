package com.finance.finance.modules.finai.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** The public portion of a conversational draft. An option is never a WRITE confirmation. */
public record FinAiClarification(UUID draftId, String field, Instant expiresAt, List<Option> options) {
    public record Option(String id, String label) {}
}
