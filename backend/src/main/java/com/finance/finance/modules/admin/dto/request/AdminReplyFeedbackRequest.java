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
    @NotBlank(message = "Nội dung phản hồi không được để trống")
    private String reply;

    private String status; // RESOLVED, IN_PROGRESS, REJECTED
}

