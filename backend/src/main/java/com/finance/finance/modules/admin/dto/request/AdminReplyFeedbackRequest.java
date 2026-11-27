package com.finance.finance.modules.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminReplyFeedbackRequest {
    @jakarta.validation.constraints.Size(max = 4000)
    private String reply;

    private String status; // RESOLVED, IN_PROGRESS, REJECTED
    private java.time.Instant expectedUpdatedAt;
}

