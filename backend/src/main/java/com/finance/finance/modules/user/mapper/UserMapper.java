package com.finance.finance.modules.user.mapper;

import com.finance.finance.modules.user.dto.response.UserResponse;
import com.finance.finance.modules.user.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {
    
    public UserResponse toResponse(User user) {
        if (user == null) {
            return null;
        }
        
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .emailVerified(user.isEmailVerified())
                .phone(user.getPhone())
                .mfaEnabled(user.isMfaEnabled())
                .userStatus(user.getUserStatus())
                .systemRole(user.getSystemRole())
                .subscriptionTier(user.getSubscriptionTier())
                .subscriptionExpiresAt(user.getSubscriptionExpiresAt())
                .preferredCurrency(user.getPreferredCurrency())
                .timezone(user.getTimezone())
                .language(user.getLanguage())
                .avatarUrl(user.getAvatarUrl())
                .lastLoginAt(user.getLastLoginAt())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
