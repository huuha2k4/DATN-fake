package com.finance.finance.modules.admin.dto.request;

import com.finance.finance.common.enums.SubscriptionTier;
import com.finance.finance.common.enums.SystemRole;
import com.finance.finance.common.enums.UserStatus;
import lombok.Data;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

@Data
public class AdminUpdateUserRequest {
    @Size(max = 100)
    private String fullName;
    private UserStatus userStatus;
    private SystemRole systemRole;
    private SubscriptionTier subscriptionTier;
    @Min(1)
    @Max(365)
    private Integer extendSubscriptionDays;
    private Boolean emailVerified;
    @Size(max = 500)
    private String note;

    @com.fasterxml.jackson.annotation.JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
        throw new IllegalArgumentException("Unexpected user update field");
    }
}

