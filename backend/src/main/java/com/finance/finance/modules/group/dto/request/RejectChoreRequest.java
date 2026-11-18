package com.finance.finance.modules.group.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RejectChoreRequest {
    @NotBlank(message = "Lý do không được để trống")
    private String reason;
    private Boolean canRetry;
}
