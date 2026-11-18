package com.finance.finance.modules.admin.dto.request;

import com.finance.finance.common.enums.SubscriptionTier;
import com.finance.finance.common.enums.SystemRole;
import com.finance.finance.common.enums.UserStatus;
import lombok.Data;

@Data
public class AdminUpdateUserRequest {
    private String fullName;
    private UserStatus userStatus;
    private SystemRole systemRole;
    private SubscriptionTier subscriptionTier;
    private Integer extendSubscriptionDays; // Gia hạn số ngày (ví dụ: 30, 90, 365)
    private Boolean emailVerified;
    private String note;
}

