package com.finance.finance.modules.account.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.finance.finance.common.enums.AccountType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AccountResponse {
    
    private UUID id;
    private String name;
    private AccountType accountType;
    private String currencyCode;
    private BigDecimal balance;
    private String displayBalance; // Formatted balance
    
    // Bank/Institution info
    private BankInfo bank;
    private String accountNumberMasked;
    private String phoneNumber;
    private String cardNumberLast4;
    
    // Credit card specific
    private BigDecimal creditLimit;
    private BigDecimal creditUsed;
    private BigDecimal creditAvailable;
    private Double utilizationPercentage;
    private Integer billingCycleDay;
    private Integer paymentDueDay;
    private LocalDate nextPaymentDue;
    
    // Display
    private String icon;
    private String color;
    private String description;
    private Integer displayOrder;
    
    // Settings
    private Boolean isIncludedInTotal;
    private Boolean isActive;
    
    // Sync info
    private Boolean isSynced;
    private LocalDateTime lastSyncedAt;
    private Long syncSeq;
    
    // Stats (optional)
    private AccountStats stats;
    
    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer version;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class BankInfo {
        private String id;
        private String name;
        private String logoUrl;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class AccountStats {
        private BigDecimal totalIncome;
        private BigDecimal totalExpense;
        private Integer transactionCount;
        private BigDecimal averageTransaction;
        private BigDecimal largestIncome;
        private BigDecimal largestExpense;
        private LocalDate firstTransactionDate;
        private LocalDate lastTransactionDate;
    }
}
