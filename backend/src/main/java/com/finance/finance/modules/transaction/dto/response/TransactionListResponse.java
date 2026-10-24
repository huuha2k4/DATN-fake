package com.finance.finance.modules.transaction.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionListResponse {
    
    private List<TransactionResponse> transactions;
    private SummaryDto summary;
    private PaginationDto pagination;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SummaryDto {
        private BigDecimal totalIncome;
        private BigDecimal totalExpense;
        private BigDecimal netCashFlow;
        private Integer transactionCount;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaginationDto {
        private Integer page;
        private Integer pageSize;
        private Long totalItems;
        private Integer totalPages;
        private Boolean hasNext;
        private Boolean hasPrevious;
    }
}
