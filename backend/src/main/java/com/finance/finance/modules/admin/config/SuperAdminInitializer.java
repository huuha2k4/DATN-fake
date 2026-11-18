package com.finance.finance.modules.admin.config;

import com.finance.finance.common.enums.SubscriptionTier;
import com.finance.finance.common.enums.SystemRole;
import com.finance.finance.common.enums.UserStatus;
import com.finance.finance.modules.user.entity.User;
import com.finance.finance.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Optional;

@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class SuperAdminInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username:admin}")
    private String adminUsername;

    @Value("${app.admin.email:admin@finance.com}")
    private String adminEmail;

    @Value("${app.admin.password:admin123}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        try {
            Optional<User> byEmail = userRepository.findByEmail(adminEmail);
            Optional<User> byUsername = userRepository.findByUsername(adminUsername);

            User adminUser = byEmail.or(() -> byUsername).orElse(null);

            if (adminUser == null) {
                log.info("Creating Super Admin account: username={}, email={}", adminUsername, adminEmail);
                adminUser = User.builder()
                        .username(adminUsername)
                        .email(adminEmail)
                        .fullName("Hệ Thống Admin")
                        .passwordHash(passwordEncoder.encode(adminPassword))
                        .systemRole(SystemRole.ADMIN)
                        .subscriptionTier(SubscriptionTier.FREE)
                        .userStatus(UserStatus.ACTIVE)
                        .preferredCurrency("VND")
                        .language("vi-VN")
                        .timezone("Asia/Ho_Chi_Minh")
                        .emailVerified(true)
                        .emailVerifiedAt(Instant.now())
                        .failedLoginAttempts(0)
                        .build();
                userRepository.save(adminUser);
                log.info("Super Admin account created successfully!");
            } else {
                boolean updated = false;
                if (!adminUsername.equals(adminUser.getUsername())) {
                    adminUser.setUsername(adminUsername);
                    updated = true;
                }
                if (adminUser.getSystemRole() != SystemRole.ADMIN) {
                    adminUser.setSystemRole(SystemRole.ADMIN);
                    updated = true;
                }
                if (adminUser.getUserStatus() != UserStatus.ACTIVE) {
                    adminUser.setUserStatus(UserStatus.ACTIVE);
                    updated = true;
                }
                if (adminUser.getSubscriptionTier() != SubscriptionTier.FREE) {
                    adminUser.setSubscriptionTier(SubscriptionTier.FREE);
                    updated = true;
                }
                if (updated) {
                    userRepository.save(adminUser);
                    log.info("Super Admin account privileges synchronized!");
                }
            }
        } catch (Exception e) {
            log.error("Failed to initialize Super Admin account: {}", e.getMessage(), e);
        }
    }
}
