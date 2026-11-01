package com.finance.finance.modules.user.mapper;

import com.finance.finance.modules.group.repository.ChildWalletRepository;
import com.finance.finance.modules.user.dto.response.UserResponse;
import com.finance.finance.modules.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UserMapper {

    private final ChildWalletRepository childWalletRepository;

    public UserResponse toResponse(User user) {
        if (user == null) {
            return null;
        }

        UserResponse.UserResponseBuilder builder = UserResponse.builder()
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
                .createdAt(user.getCreatedAt());

        childWalletRepository.findByUserId(user.getId()).ifPresentOrElse(wallet -> {
            builder.childAccount(true);
            builder.childWalletId(wallet.getId());
            builder.childWalletGroupId(wallet.getGroupId());
            builder.childWalletName(wallet.getChildName());
        }, () -> builder.childAccount(false));

        return builder.build();
    }
}
