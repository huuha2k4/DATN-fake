package com.finance.finance.modules.tag.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TagResponse {
    
    private UUID id;
    private String name;
    private String color;
    private String icon;
    
    private Integer transactionCount;
    private BigDecimal totalAmount;
    
    private Instant createdAt;
    private Instant updatedAt;
}
