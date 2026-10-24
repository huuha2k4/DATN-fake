package com.finance.finance.modules.account.dto.response;

import com.finance.finance.common.enums.AccountType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountTypeMetadataResponse {
    private AccountType code;
    private String name;
    private String description;
    private String defaultIcon;
    private String defaultColor;
    private Boolean isLiability; // e.g. CREDIT_CARD is liability
    private List<String> requiredFields;
    private List<String> optionalFields;
}
