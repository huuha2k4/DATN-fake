package com.finance.finance.modules.admin.dto.response;

import java.time.Instant;
import java.util.UUID;

public record AdminAiSessionItem(UUID id, long messageCount, Instant createdAt, Instant updatedAt) { }
