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
public class UpdateNotificationTemplateRequest {
    @NotBlank(message = "Tiêu đề không được để trống")
    @jakarta.validation.constraints.Size(max = 255)
    private String title;

    @NotBlank(message = "Nội dung mẫu không được để trống")
    @jakarta.validation.constraints.Size(max = 8000)
    private String bodyTemplate;

    private String targetAudience;
    private String priority;
    private Boolean isActive;
    @jakarta.validation.constraints.Size(max = 50)
    private String scheduleCron;
}

