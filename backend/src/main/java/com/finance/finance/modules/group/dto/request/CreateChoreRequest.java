package com.finance.finance.modules.group.dto.request;

import com.finance.finance.common.enums.ChoreFrequency;
import com.finance.finance.common.enums.ChoreDifficulty;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateChoreRequest {
    @NotBlank(message = "Tiêu đề không được để trống")
    @Size(max = 200, message = "Tiêu đề không được quá 200 ký tự")
    private String title;

    private String description;

    @NotNull(message = "Số tiền thưởng không được để trống")
    @DecimalMin(value = "0.0", message = "Số tiền thưởng phải >= 0")
    private BigDecimal rewardAmount;

    @NotNull(message = "Tần suất không được để trống")
    private ChoreFrequency frequency; // ONCE, DAILY, WEEKLY, MONTHLY

    private LocalDate dueDate;

    private ChoreDifficulty difficulty; // EASY, MEDIUM, HARD

    @Min(value = 0, message = "Thời gian ước tính phải >= 0")
    private Integer estimatedMinutes;

    @Size(max = 10, message = "Icon không được quá 10 ký tự")
    private String icon;
}
