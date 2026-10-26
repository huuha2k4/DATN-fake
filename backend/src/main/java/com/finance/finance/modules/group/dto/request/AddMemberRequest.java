package com.finance.finance.modules.group.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddMemberRequest {
    @NotNull(message = "User ID không được để trống")
    private UUID userId;

    @NotNull(message = "Vai trò không được để trống")
    private String role; // OWNER, ADMIN, MEMBER

    @DecimalMin(value = "0.0", message = "Tỷ lệ đóng góp phải >= 0")
    @DecimalMax(value = "100.0", message = "Tỷ lệ đóng góp phải <= 100")
    private BigDecimal contributionRatio;
}
