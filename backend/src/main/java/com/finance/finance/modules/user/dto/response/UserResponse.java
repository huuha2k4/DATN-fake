package com.finance.finance.modules.user.dto.response;

import com.finance.finance.common.enums.SubscriptionTier;
import com.finance.finance.common.enums.SystemRole;
import com.finance.finance.common.enums.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private UUID id;
    private String email;
    private String username;
    private String fullName;
    private Boolean emailVerified;
    private String phone;
    private Boolean mfaEnabled;
    private UserStatus userStatus;
    private SystemRole systemRole;
    private SubscriptionTier subscriptionTier;
    private Instant subscriptionExpiresAt;
    private String preferredCurrency;
    private String timezone;
    private String language;
    private String avatarUrl;
    private Instant lastLoginAt;
    private Instant createdAt;
}
