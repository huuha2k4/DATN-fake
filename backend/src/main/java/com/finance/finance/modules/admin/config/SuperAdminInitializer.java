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

@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class SuperAdminInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;

    @Value("${app.admin.username:}")
    private String adminUsername;

    @Value("${app.admin.email:}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void run(String... args) {
        jdbc.execute("SELECT pg_advisory_xact_lock(49281123061401)");
        if (userRepository.existsBySystemRoleAndDeletedAtIsNull(SystemRole.ADMIN)) {
            return;
        }
        if (adminUsername.isBlank() || adminEmail.isBlank() || adminPassword.length() < 12
                || adminPassword.isBlank()) {
            throw new IllegalStateException("Initial admin requires SUPER_ADMIN_USER, SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD (minimum 12 characters)");
        }
        if (userRepository.findByEmail(adminEmail).isPresent() || userRepository.findByUsername(adminUsername).isPresent()) {
            throw new IllegalStateException("Initial admin identity is already in use");
        }
        User adminUser = User.builder()
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
        log.info("Initial administrator created");
    }
}
