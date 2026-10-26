package com.finance.finance.modules.group.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RejectSpendRequestRequest {
    @NotBlank(message = "Lý do từ chối không được để trống")
    private String reason;
}
