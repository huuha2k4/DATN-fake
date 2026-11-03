package com.finance.finance.modules.auth.service;

import com.finance.finance.common.enums.SystemRole;
import com.finance.finance.common.enums.SubscriptionTier;
import com.finance.finance.common.enums.UserStatus;
import com.finance.finance.common.exception.BusinessException;
import com.finance.finance.common.security.JwtTokenProvider;
import com.finance.finance.common.service.EmailService;
import com.finance.finance.modules.auth.dto.request.*;
import com.finance.finance.modules.auth.dto.response.AuthResponse;
import com.finance.finance.modules.auth.dto.response.MessageResponse;
import com.finance.finance.modules.auth.entity.AuthToken;
import com.finance.finance.modules.auth.entity.RefreshToken;
import com.finance.finance.modules.auth.exception.*;
import com.finance.finance.modules.auth.repository.AuthTokenRepository;
import com.finance.finance.modules.user.entity.User;
import com.finance.finance.modules.user.dto.response.UserResponse;
import com.finance.finance.modules.user.exception.UserNotFoundException;
import com.finance.finance.modules.user.mapper.UserMapper;
import com.finance.finance.modules.user.repository.UserRepository;
import com.finance.finance.modules.group.repository.ChildWalletRepository;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Service for authentication operations
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final AuthTokenRepository authTokenRepository;
    private final TokenService tokenService;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final EmailService emailService;
    private final UserMapper userMapper;
    private final ChildWalletRepository childWalletRepository;
    private final com.finance.finance.modules.notification.service.NotificationService notificationService;
    private final com.finance.finance.modules.auth.repository.OAuthAccountRepository oauthAccountRepository;

    @Value("${app.oauth2.google.client-id:}")
    private String googleClientId;

    @Value("${app.security.max-login-attempts:5}")
    private int maxLoginAttempts;

    @Value("${app.security.lockout-duration-minutes:15}")
    private int lockoutDurationMinutes;

    private static final String PASSWORD_PATTERN = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$";

    /**
     * Register a new user
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        log.info("Registering new user: {}", request.getEmail());

        // Check if email already exists
        if (userRepository.existsByEmailAndDeletedAtIsNull(request.getEmail())) {
            throw new EmailAlreadyExistsException("Email đã được sử dụng");
        }
        
        // Check if username already exists (if provided)
        if (request.getUsername() != null && !request.getUsername().isEmpty()) {
            if (userRepository.existsByUsernameAndDeletedAtIsNull(request.getUsername())) {
                throw new BusinessException("Username đã được sử dụng");
            }
        }

        // Validate password
        validatePassword(request.getPassword());

        // Create new user
        User user = new User();
        user.setEmail(request.getEmail());
        user.setUsername(request.getUsername());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setPhone(request.getPhone());
        user.setPreferredCurrency(request.getPreferredCurrency() != null ? request.getPreferredCurrency() : "VND");
        user.setTimezone(request.getTimezone() != null ? request.getTimezone() : "Asia/Ho_Chi_Minh");
        user.setLanguage(request.getLanguage() != null ? request.getLanguage() : "vi-VN");
        user.setAvatarUrl("/default-avatar.png");
        user.setSystemRole(SystemRole.USER);
        user.setSubscriptionTier(SubscriptionTier.FREE);
        user.setUserStatus(UserStatus.ACTIVE);
        user.setEmailVerified(false);
        user.setMfaEnabled(false);
        user.setFailedLoginAttempts(0);

        user = userRepository.save(user);
        log.info("User registered successfully: {}", user.getId());

        // Send automatic welcome notification
        try {
            notificationService.createNotification(
                    user.getId(),
                    com.finance.finance.common.enums.NotificationType.SYSTEM,
                    com.finance.finance.common.enums.NotificationPriority.NORMAL,
                    "Chào mừng bạn đến với FinAI!",
                    "Hệ thống quản lý tài chính thông minh đã sẵn sàng. Hãy bắt đầu bằng cách thêm ví hoặc ghi nhận giao dịch đầu tiên của bạn.",
                    "/dashboard",
                    "Khám phá ngay"
            );
        } catch (Exception ex) {
            log.error("Failed to create welcome notification for user: {}", user.getId(), ex);
        }

        // Generate email verification token
        String verificationToken = generateVerificationToken(user);
        
        // Send verification email
        emailService.sendVerificationEmail(user.getEmail(), user.getFullName(), verificationToken);

        // Generate auth tokens
        String accessToken = jwtTokenProvider.generateAccessToken(user);
        RefreshToken refreshToken = tokenService.createRefreshToken(user, null, null);

        // Build response
        UserResponse userResponse = withChildWalletContext(userMapper.toResponse(user), user.getId());
        
        return AuthResponse.builder()
                .user(userResponse)
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getAccessTokenExpiration() / 1000) // Convert to seconds
                .message("Đăng ký thành công. Vui lòng kiểm tra email để xác thực.")
                .build();
    }

    /**
     * Login with email and password
     */
    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        log.info("User login attempt: {}", request.getLogin());

        // Find user by email or username
        User user = userRepository.findActiveUserByEmailOrUsername(request.getLogin())
                .orElseThrow(() -> new InvalidCredentialsException("Email/Username hoặc mật khẩu không đúng"));

        // Check if account is locked
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(Instant.now())) {
            throw new AccountLockedException("Tài khoản đã bị khóa do đăng nhập sai nhiều lần", user.getLockedUntil());
        }

        // Reset lock if lockout period has passed
        if (user.getLockedUntil() != null && user.getLockedUntil().isBefore(Instant.now())) {
            user.setLockedUntil(null);
            user.setFailedLoginAttempts(0);
            userRepository.save(user);
        }

        // Verify password
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            handleFailedLogin(user);
            throw new InvalidCredentialsException("Email/Username hoặc mật khẩu không đúng");
        }

        // Check if account is inactive
        if (user.getUserStatus() == UserStatus.INACTIVE) {
            throw new BusinessException("Tài khoản đã bị vô hiệu hóa");
        }

        // Reset failed attempts on successful login
        if (user.getFailedLoginAttempts() > 0) {
            user.setFailedLoginAttempts(0);
            userRepository.save(user);
        }

        // Update last login
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        // Get device info
        String deviceId = request.getDeviceId();
        String deviceName = request.getDeviceName();
        String ipAddress = getClientIP(httpRequest);

        // TODO: Check if MFA is enabled and return MFA challenge
        if (user.isMfaEnabled()) {
            // Return MFA required response
            // This will be implemented later
        }

        // Generate auth tokens
        String accessToken = jwtTokenProvider.generateAccessToken(user);
        RefreshToken refreshToken = tokenService.createRefreshToken(user, deviceId, deviceName);

        // Send login alert email if new device
        // TODO: Implement device tracking and send alert for new devices

        log.info("User logged in successfully: {}", user.getId());

        // Build response
        UserResponse userResponse = withChildWalletContext(userMapper.toResponse(user), user.getId());
        
        return AuthResponse.builder()
                .user(userResponse)
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getAccessTokenExpiration() / 1000)
                .build();
    }

    /**
     * Logout user
     */
    @Transactional
    public MessageResponse logout(User user, boolean allDevices) {
        log.info("User logout: userId={}, allDevices={}", user.getId(), allDevices);

        if (allDevices) {
            // Revoke all refresh tokens for this user
            tokenService.revokeAllUserTokens(user.getId());
        } else {
            // TODO: Revoke only current device token
            // For now, revoke all tokens
            tokenService.revokeAllUserTokens(user.getId());
        }

        return new MessageResponse("Đăng xuất thành công");
    }

    /**
     * Refresh access token
     */
    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request, HttpServletRequest httpRequest) {
        log.info("Refreshing access token");

        String refreshTokenStr = request.getRefreshToken();

        // Rotate refresh token and get new tokens
        RefreshToken newRefreshToken = tokenService.rotateRefreshToken(refreshTokenStr);
        User user = newRefreshToken.getUser();

        // Generate new access token
        String accessToken = jwtTokenProvider.generateAccessToken(user);

        log.info("Access token refreshed successfully for user: {}", user.getId());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(newRefreshToken.getToken())
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getAccessTokenExpiration() / 1000)
                .build();
    }

    /**
     * Forgot password - send reset email
     */
    @Transactional
    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail();
        log.info("Forgot password request for email: {}", email);

        // Find user by email (always return success to prevent email enumeration)
        userRepository.findByEmail(email).ifPresent(user -> {
            // Generate password reset token
            String resetToken = generatePasswordResetToken(user);
            
            // Send reset email
            emailService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), resetToken);
            
            log.info("Password reset email sent to: {}", email);
        });

        // Always return success message
        return new MessageResponse("Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư.");
    }

    /**
     * Reset password with token
     */
    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        log.info("Resetting password with token");

        // Find and validate reset token
        AuthToken authToken = authTokenRepository.findByTokenAndTokenType(
                request.getToken(), com.finance.finance.common.enums.TokenType.PASSWORD_RESET)
                .orElseThrow(() -> new InvalidTokenException("Token không hợp lệ hoặc đã hết hạn"));

        // Check if token is expired
        if (authToken.getExpiresAt().isBefore(Instant.now())) {
            throw new TokenExpiredException("Token đã hết hạn");
        }

        // Check if token is already used
        if (authToken.isUsed()) {
            throw new InvalidTokenException("Token đã được sử dụng");
        }

        // Validate new password
        validatePassword(request.getNewPassword());

        // Update user password
        User user = authToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordChangedAt(Instant.now());
        userRepository.save(user);

        // Mark token as used
        authToken.setUsed(true);
        authToken.setUsedAt(Instant.now());
        authTokenRepository.save(authToken);

        // Revoke all refresh tokens for security
        tokenService.revokeAllUserTokens(user.getId());

        log.info("Password reset successfully for user: {}", user.getId());

        return new MessageResponse("Mật khẩu đã được đặt lại thành công");
    }

    /**
     * Verify email with token
     */
    @Transactional
    public MessageResponse verifyEmail(VerifyEmailRequest request) {
        log.info("Verifying email with token");

        // Find and validate verification token
        AuthToken authToken = authTokenRepository.findByTokenAndTokenType(
                request.getToken(), com.finance.finance.common.enums.TokenType.EMAIL_VERIFICATION)
                .orElseThrow(() -> new InvalidTokenException("Token không hợp lệ hoặc đã hết hạn"));

        // Check if token is expired
        if (authToken.getExpiresAt().isBefore(Instant.now())) {
            throw new TokenExpiredException("Token đã hết hạn");
        }

        // Check if token is already used
        if (authToken.isUsed()) {
            throw new InvalidTokenException("Token đã được sử dụng");
        }

        // Update user email verification status
        User user = authToken.getUser();
        user.setEmailVerified(true);
        user.setEmailVerifiedAt(Instant.now());
        userRepository.save(user);

        // Mark token as used
        authToken.setUsed(true);
        authToken.setUsedAt(Instant.now());
        authTokenRepository.save(authToken);

        log.info("Email verified successfully for user: {}", user.getId());

        return new MessageResponse("Email đã được xác thực thành công");
    }

    /**
     * Resend verification email
     */
    @Transactional
    public MessageResponse resendVerification(String email) {
        log.info("Resending verification email to: {}", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("Không tìm thấy người dùng"));

        // Check if already verified
        if (user.isEmailVerified()) {
            throw new BusinessException("Email đã được xác thực");
        }

        // Invalidate old verification tokens
        authTokenRepository.invalidateUserTokensByType(user.getId(), com.finance.finance.common.enums.TokenType.EMAIL_VERIFICATION, Instant.now());

        // Generate new verification token
        String verificationToken = generateVerificationToken(user);
        
        // Send verification email
        emailService.sendVerificationEmail(user.getEmail(), user.getFullName(), verificationToken);

        log.info("Verification email resent to: {}", email);

        return new MessageResponse("Email xác thực đã được gửi lại");
    }

    // Helper methods

    /**
     * A child login is intentionally a reduced product surface.  Keep that fact in
     * the authentication payload so the client can enforce the same scope even on
     * a direct URL, rather than relying on a hidden menu item.
     */
    private UserResponse withChildWalletContext(UserResponse response, UUID userId) {
        childWalletRepository.findByUserId(userId).ifPresentOrElse(wallet -> {
            response.setChildAccount(true);
            response.setChildWalletId(wallet.getId());
            response.setChildWalletGroupId(wallet.getGroupId());
            response.setChildWalletName(wallet.getChildName());
        }, () -> response.setChildAccount(false));
        return response;
    }

    /**
     * Handle failed login attempt
     */
    private void handleFailedLogin(User user) {
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);

        if (attempts >= maxLoginAttempts) {
            // Lock account
            Instant lockedUntil = Instant.now().plus(lockoutDurationMinutes, ChronoUnit.MINUTES);
            user.setLockedUntil(lockedUntil);
            
            // Send lock notification email
            emailService.sendAccountLockedEmail(
                user.getEmail(), 
                user.getFullName(), 
                lockedUntil.toString()
            );
            
            log.warn("Account locked due to too many failed attempts: {}", user.getEmail());
        }

        userRepository.save(user);
    }

    /**
     * Validate password strength
     */
    private void validatePassword(String password) {
        if (password == null || password.length() < 8) {
            throw new BusinessException("Mật khẩu phải có ít nhất 8 ký tự");
        }

        if (!password.matches(PASSWORD_PATTERN)) {
            throw new BusinessException(
                "Mật khẩu phải chứa ít nhất một chữ hoa, một chữ thường, một số và một ký tự đặc biệt"
            );
        }
    }

    /**
     * Generate email verification token
     */
    private String generateVerificationToken(User user) {
        String token = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plus(24, ChronoUnit.HOURS);

        AuthToken authToken = new AuthToken();
        authToken.setUser(user);
        authToken.setToken(token);
        authToken.setTokenType(com.finance.finance.common.enums.TokenType.EMAIL_VERIFICATION);
        authToken.setExpiresAt(expiresAt);
        authToken.setUsed(false);

        authTokenRepository.save(authToken);
        return token;
    }

    /**
     * Generate password reset token
     */
    private String generatePasswordResetToken(User user) {
        String token = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plus(1, ChronoUnit.HOURS);

        // Invalidate old password reset tokens
        authTokenRepository.invalidateUserTokensByType(user.getId(), com.finance.finance.common.enums.TokenType.PASSWORD_RESET, Instant.now());

        AuthToken authToken = new AuthToken();
        authToken.setUser(user);
        authToken.setToken(token);
        authToken.setTokenType(com.finance.finance.common.enums.TokenType.PASSWORD_RESET);
        authToken.setExpiresAt(expiresAt);
        authToken.setUsed(false);

        authTokenRepository.save(authToken);
        return token;
    }

    /**
     * Authenticate with Google ID Token
     */
    @Transactional
    public AuthResponse authenticateWithGoogle(com.finance.finance.modules.auth.dto.request.GoogleAuthRequest request, HttpServletRequest httpRequest) {
        log.info("Processing Google authentication");

        com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier verifier =
                new com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier.Builder(
                        new com.google.api.client.http.javanet.NetHttpTransport(),
                        new com.google.api.client.json.gson.GsonFactory()
                )
                .setAudience(java.util.Collections.singletonList(googleClientId))
                .build();

        com.google.api.client.googleapis.auth.oauth2.GoogleIdToken idToken;
        try {
            idToken = verifier.verify(request.getIdToken());
        } catch (Exception e) {
            log.error("Failed to verify Google ID Token: {}", e.getMessage());
            throw new com.finance.finance.common.exception.BusinessException("Token Google không hợp lệ hoặc đã hết hạn");
        }

        if (idToken == null) {
            throw new com.finance.finance.common.exception.BusinessException("Xác thực Google thất bại");
        }

        com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload payload = idToken.getPayload();
        String googleUserId = payload.getSubject();
        String email = payload.getEmail();
        boolean emailVerified = Boolean.TRUE.equals(payload.getEmailVerified());
        String name = (String) payload.get("name");
        String pictureUrl = (String) payload.get("picture");

        if (email == null || email.isBlank()) {
            throw new com.finance.finance.common.exception.BusinessException("Không thể lấy email từ tài khoản Google");
        }

        // Tìm user theo email hoặc theo OAuth account
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            // Đăng ký mới qua Google
            String usernameCandidate = email.split("@")[0].replaceAll("[^a-zA-Z0-9_]", "");
            if (usernameCandidate.length() < 3) usernameCandidate = "user" + System.currentTimeMillis() % 10000;
            String uniqueUsername = usernameCandidate;
            int counter = 1;
            while (userRepository.existsByUsername(uniqueUsername)) {
                uniqueUsername = usernameCandidate + counter++;
            }

            user = User.builder()
                    .email(email)
                    .username(uniqueUsername)
                    .fullName(name != null && !name.isBlank() ? name : uniqueUsername)
                    .avatarUrl(pictureUrl)
                    .emailVerified(emailVerified)
                    .emailVerifiedAt(emailVerified ? Instant.now() : null)
                    .userStatus(com.finance.finance.common.enums.UserStatus.ACTIVE)
                    .systemRole(com.finance.finance.common.enums.SystemRole.USER)
                    .subscriptionTier(com.finance.finance.common.enums.SubscriptionTier.FREE)
                    .preferredCurrency("VND")
                    .timezone("Asia/Ho_Chi_Minh")
                    .language("vi-VN")
                    .failedLoginAttempts(0)
                    .lastLoginAt(Instant.now())
                    .build();

            user = userRepository.save(user);
            log.info("New user created via Google login: {}", user.getId());

            try {
                notificationService.createNotification(
                        user.getId(),
                        com.finance.finance.common.enums.NotificationType.SYSTEM,
                        com.finance.finance.common.enums.NotificationPriority.NORMAL,
                        "Chào mừng bạn đến với Finora!",
                        "Đăng nhập Google thành công. Hãy khám phá và quản lý tài chính thông minh cùng Finora ngay nhé!",
                        "/dashboard",
                        "Khám phá ngay"
                );
            } catch (Exception ex) {
                log.warn("Failed to create welcome notification: {}", ex.getMessage());
            }
        } else {
            // Cập nhật thông tin nếu có
            if (user.getAvatarUrl() == null && pictureUrl != null) {
                user.setAvatarUrl(pictureUrl);
            }
            if (!user.isEmailVerified() && emailVerified) {
                user.setEmailVerified(true);
                user.setEmailVerifiedAt(Instant.now());
            }
            user.setLastLoginAt(Instant.now());
            user.setFailedLoginAttempts(0);
            user = userRepository.save(user);
        }

        // Lưu / Cập nhật liên kết OAuth Account
        final UUID currentUserId = user.getId();
        oauthAccountRepository.findByProviderAndProviderUserId("GOOGLE", googleUserId)
                .orElseGet(() -> oauthAccountRepository.save(
                        com.finance.finance.modules.auth.entity.OAuthAccount.builder()
                                .userId(currentUserId)
                                .provider("GOOGLE")
                                .providerUserId(googleUserId)
                                .emailAtProvider(email)
                                .build()
                ));

        String deviceId = httpRequest != null ? httpRequest.getHeader("X-Device-Id") : null;
        String deviceName = httpRequest != null ? httpRequest.getHeader("X-Device-Name") : null;

        String accessToken = jwtTokenProvider.generateAccessToken(user);
        RefreshToken refreshToken = tokenService.createRefreshToken(user, deviceId, deviceName);

        UserResponse userResponse = withChildWalletContext(userMapper.toResponse(user), user.getId());

        return AuthResponse.builder()
                .user(userResponse)
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getAccessTokenExpiration() / 1000)
                .message("Đăng nhập bằng Google thành công")
                .build();
    }

    /**
     * Get client IP address from request
     */
    private String getClientIP(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
}
