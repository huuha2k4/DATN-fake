package com.finance.finance.modules.group.dto.request;

import com.finance.finance.common.enums.PrivacyLevel;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
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
public class UpdateChildWalletRequest {
    @Size(max = 150, message = "Tên con không được quá 150 ký tự")
    private String childName;
    
    private LocalDate dateOfBirth;

    private String avatarKey;

    @DecimalMin(value = "0.0", message = "Tiền tiêu vặt phải >= 0")
    private BigDecimal weeklyAllowance;

    private PrivacyLevel privacyLevel; // FULL_ACCESS, PARENT_SUPERVISED, VIEW_ONLY

    @DecimalMin(value = "0.0", message = "Hạn mức phải >= 0")
    private BigDecimal spendLimitDaily;

    @DecimalMin(value = "0.0", message = "Hạn mức phải >= 0")
    private BigDecimal spendLimitWeekly;

    private List<UUID> allowedCategories;

    @DecimalMin(value = "0.0", message = "Số tiền phải >= 0")
    private BigDecimal requireApprovalAbove;

    private CreateChildWalletRequest.WalletSettingsDto settings;
}
