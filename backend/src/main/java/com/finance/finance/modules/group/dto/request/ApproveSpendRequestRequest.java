package com.finance.finance.modules.group.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApproveSpendRequestRequest {
    private String notes;
    private String source; // PERSONAL_ACCOUNT hoặc GROUP_FUND
    private UUID sourceAccountId;
}
