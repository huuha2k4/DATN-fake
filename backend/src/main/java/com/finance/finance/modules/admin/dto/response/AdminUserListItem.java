package com.finance.finance.modules.admin.dto.response;

import com.finance.finance.common.enums.SubscriptionTier;
import com.finance.finance.common.enums.SystemRole;
import com.finance.finance.common.enums.UserStatus;

import java.time.Instant;
import java.util.UUID;

public record AdminUserListItem(UUID id, String email, String username, String fullName, boolean emailVerified,
                                String phone, UserStatus userStatus, SystemRole systemRole,
                                SubscriptionTier subscriptionTier, Instant subscriptionExpiresAt,
                                String avatarUrl, Instant lastLoginAt, Instant createdAt) { }
