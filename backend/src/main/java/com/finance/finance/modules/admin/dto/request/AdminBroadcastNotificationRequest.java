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
public class AdminBroadcastNotificationRequest {
    @NotBlank(message = "Tiêu đề thông báo không được để trống")
    @jakarta.validation.constraints.Size(max = 255)
    private String title;

    @NotBlank(message = "Nội dung thông báo không được để trống")
    @jakarta.validation.constraints.Size(max = 8000)
    private String body;

    private String targetAudience; // ALL, PREMIUM_ONLY, FREE_ONLY
    private String priority;       // LOW, MEDIUM, HIGH, URGENT
    @jakarta.validation.constraints.Size(max = 500)
    private String actionUrl;
    @jakarta.validation.constraints.Size(max = 100)
    private String actionText;
}

