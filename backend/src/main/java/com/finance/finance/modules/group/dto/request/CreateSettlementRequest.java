package com.finance.finance.modules.group.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateSettlementRequest {
    @NotNull(message = "Người trả không được để trống")
    private UUID fromUserId;

    @NotNull(message = "Người nhận không được để trống")
    private UUID toUserId;

    @NotNull(message = "Số tiền không được để trống")
    @DecimalMin(value = "0.01", message = "Số tiền phải > 0")
    private BigDecimal amount;

    private String paymentMethod; // cash, bank_transfer, e_wallet, other

    @NotNull(message = "Ngày thanh toán không được để trống")
    private LocalDate settlementDate;

    private String notes;

    private String proofKey;
}
