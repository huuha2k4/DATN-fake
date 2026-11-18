package com.finance.finance.modules.group.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class GroupFundResponse {
    private UUID id;
    private UUID groupId;
    private String currency;
    private BigDecimal balance;
    private LocalDateTime updatedAt;
}
