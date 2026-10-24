package com.finance.finance.modules.transaction.dto.request;

import com.finance.finance.common.enums.CategoryStatus;
import com.finance.finance.common.enums.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionFilter {
    
    // Pagination
    @Builder.Default
    private Integer page = 1;
    
    @Builder.Default
    private Integer pageSize = 20;
    
    // Date range
    private LocalDate fromDate;
    private LocalDate toDate;
    
    // Filters
    private UUID accountId;
    private UUID categoryId;
    private UUID merchantId;
    private List<UUID> tagIds;
    private TransactionType transactionType;
    
    // Amount range
    private BigDecimal minAmount;
    private BigDecimal maxAmount;
    
    // Search
    private String search;
    
    // Category status
    private CategoryStatus categoryStatus;
    
    // Sorting
    @Builder.Default
    private String sortBy = "occurred_date";
    
    @Builder.Default
    private String sortOrder = "desc";
    
    // Exclude from report
    private Boolean isExcludedFromReport;
    
    // Helper methods
    public int getOffset() {
        return (page - 1) * pageSize;
    }
    
    public int getLimit() {
        return Math.min(pageSize, 100); // Max 100 items per page
    }
}
