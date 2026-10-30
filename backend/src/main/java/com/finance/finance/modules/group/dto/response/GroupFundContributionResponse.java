package com.finance.finance.modules.group.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class GroupFundContributionResponse {
    private UUID id;
    private UUID contributorUserId;
    private String contributorName;
    private BigDecimal amount;
    private LocalDate contributedAt;
    private LocalDateTime createdAt;
    private String note;
}
