package com.finance.finance.modules.transaction.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchCreateResponse {
    
    private Integer total;
    private Integer successful;
    private Integer failed;
    private List<ResultItem> results;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResultItem {
        private Integer index;
        private String status; // SUCCESS, FAILED
        private UUID transactionId;
        private Long syncSeq;
        private String errorMessage;
    }
}
