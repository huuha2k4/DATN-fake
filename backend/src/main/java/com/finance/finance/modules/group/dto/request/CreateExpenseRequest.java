package com.finance.finance.modules.group.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateExpenseRequest {
    @NotBlank(message = "Mô tả không được để trống")
    @Size(max = 300, message = "Mô tả không được quá 300 ký tự")
    private String description;

    @NotNull(message = "Số tiền không được để trống")
    @DecimalMin(value = "0.01", message = "Số tiền phải > 0")
    private BigDecimal amount;

    @NotNull(message = "Người trả tiền không được để trống")
    private UUID paidByUserId;

    private UUID categoryId;

    @NotBlank(message = "Phương thức chia không được để trống")
    private String splitMethod; // EQUAL, PERCENTAGE, EXACT, SHARES

    @NotNull(message = "Ngày chi phí không được để trống")
    private LocalDate expenseDate;

    private String notes;

    private String receiptKey;

    private LocationDto location;

    @Valid
    @NotEmpty(message = "Danh sách phân chia không được để trống")
    private List<ExpenseSplitDto> splits;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LocationDto {
        private Double lat;
        private Double lng;
        private String address;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExpenseSplitDto {
        @NotNull(message = "User ID không được để trống")
        private UUID userId;

        @NotNull(message = "Số tiền không được để trống")
        @DecimalMin(value = "0.0", message = "Số tiền phải >= 0")
        private BigDecimal amount;

        @DecimalMin(value = "0.0", message = "Phần trăm phải >= 0")
        @DecimalMax(value = "100.0", message = "Phần trăm phải <= 100")
        private BigDecimal percentage;

        @DecimalMin(value = "0.0", message = "Shares phải >= 0")
        private BigDecimal shares;
    }
}
