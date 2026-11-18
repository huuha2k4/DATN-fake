package com.finance.finance.modules.feedback.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendFeedbackRequest {

    @NotBlank(message = "Tiêu đề phản hồi không được để trống")
    private String title;

    @NotBlank(message = "Nội dung phản hồi không được để trống")
    private String content;

    private String category; // BUG, FEATURE, QUESTION, OTHER

    private String priority; // LOW, MEDIUM, HIGH
}

