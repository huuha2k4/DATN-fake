package com.finance.finance.modules.group.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Request để gắn Child Wallet Profile cho thành viên đã có trong nhóm
 * Dùng khi con tự tạo tài khoản độc lập rồi gia nhập gia đình
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LinkChildWalletRequest {
    
    @NotBlank(message = "Tên con không được để trống")
    @Size(max = 150, message = "Tên con không được vượt quá 150 ký tự")
    private String childName;
    
    @NotNull(message = "Ngày sinh không được để trống")
    @Past(message = "Ngày sinh phải là ngày trong quá khứ")
    private LocalDate dateOfBirth;
    
    private String avatarKey;
    
    // Allowance settings
    private BigDecimal weeklyAllowance;
    private String allowanceSource;  // PERSONAL_ACCOUNT or GROUP_FUND
    private UUID allowanceAccountId;
    
    // Spending limits
    private BigDecimal spendLimitDaily;
    private BigDecimal spendLimitWeekly;
    
    private BigDecimal requireApprovalAbove;
}
