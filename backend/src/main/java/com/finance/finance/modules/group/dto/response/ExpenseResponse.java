package com.finance.finance.modules.group.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseResponse {
    private UUID id;
    private UUID groupId;
    private String description;
    private BigDecimal amount;
    private String currency;
    private UUID paidByUserId;
    private String paymentSource;
    private UUID categoryId;
    private String splitMethod;
    private LocalDate expenseDate;
    private String notes;
    private String receiptKey;
    private LocationDto location;
    private UUID createdByUserId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long version;
    private PayerSummary payer;
    private CategorySummary category;
    private List<SplitSummary> splits;
    private Integer commentCount;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LocationDto {
        private Double lat;
        private Double lng;
        private String address;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PayerSummary {
        private String fullName;
        private String avatarKey;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CategorySummary {
        private UUID id;
        private String name;
        private String icon;
        private String color;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SplitSummary {
        private UUID id;
        private UUID userId;
        private BigDecimal amount;
        private BigDecimal percentage;
        private BigDecimal shares;
        private UserInfo user;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserInfo {
        private String fullName;
        private String avatarKey;
    }
}
