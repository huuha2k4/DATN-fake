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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

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

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getActiveDevices(User user) {
        return tokenService.getActiveSessions(user.getId()).stream()
                .filter(rt -> !rt.isExpired())
                .map(rt -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", rt.getId());
                    map.put("deviceId", rt.getDeviceId());
                    map.put("deviceName", rt.getDeviceName());
                    map.put("createdAt", rt.getCreatedAt());
                    map.put("expiresAt", rt.getExpiresAt());
                    return map;
                })
                .collect(Collectors.toList());
    }
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final EmailService emailService;
    private final UserMapper userMapper;
    private final com.finance.finance.modules.admin.service.SystemConfigService systemConfigService;
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
     * Send email verification OTP before registering
     */
    @Transactional
    public MessageResponse sendRegistrationOtp(String email) {
        String cleanEmail = email.trim().toLowerCase();
        log.info("Sending registration OTP to email: {}", cleanEmail);

        if (userRepository.existsByEmailAndDeletedAtIsNull(cleanEmail)) {
            throw new EmailAlreadyExistsException("Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.");
        }

        // Invalidate old tokens for this email
        authTokenRepository.invalidateTokensByEmailAndType(cleanEmail, com.finance.finance.common.enums.TokenType.EMAIL_VERIFICATION, Instant.now());

        // Generate 6-digit OTP
        int randomNum = new java.security.SecureRandom().nextInt(900000) + 100000;
        String otp = String.valueOf(randomNum);
        Instant expiresAt = Instant.now().plus(10, ChronoUnit.MINUTES);

        AuthToken authToken = new AuthToken();
        authToken.setEmail(cleanEmail);
        authToken.setToken(otp);
        authToken.setTokenType(com.finance.finance.common.enums.TokenType.EMAIL_VERIFICATION);
        authToken.setExpiresAt(expiresAt);
        authToken.setUsed(false);

        authTokenRepository.save(authToken);

        // Send email
        emailService.sendVerificationOtpEmail(cleanEmail, "bạn", otp);

        return new MessageResponse("Mã xác thực OTP đã được gửi đến email " + cleanEmail);
    }

    /**
     * Register a new user
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // Kiểm tra cấu hình hệ thống: Cho phép đăng ký mới
        boolean allowReg = systemConfigService.getBoolean("ALLOW_REGISTRATION", true);
        if (!allowReg) {
            throw new BusinessException("Hệ thống hiện đang tạm đóng tính năng đăng ký thành viên mới theo chính sách quản trị.");
        }

        String cleanEmail = request.getEmail().trim().toLowerCase();
        log.info("Registering new user: {}", cleanEmail);

        // Check if email already exists
        if (userRepository.existsByEmailAndDeletedAtIsNull(cleanEmail)) {
            throw new EmailAlreadyExistsException("Email đã được sử dụng");
        }

        // Validate OTP if provided or required
        if (request.getOtp() != null && !request.getOtp().isBlank()) {
            String otp = request.getOtp().trim();
            AuthToken authToken = authTokenRepository.findByEmailAndTokenAndTokenType(
                    cleanEmail, otp, com.finance.finance.common.enums.TokenType.EMAIL_VERIFICATION
            ).orElseThrow(() -> new InvalidTokenException("Mã OTP xác thực email không đúng hoặc đã hết hạn"));

            if (authToken.getExpiresAt().isBefore(Instant.now())) {
                throw new TokenExpiredException("Mã OTP đã hết hạn. Vui lòng nhấn gửi lại mã.");
            }
            if (authToken.isUsed()) {
                throw new InvalidTokenException("Mã OTP này đã được sử dụng.");
            }

            authToken.setUsed(true);
            authToken.setUsedAt(Instant.now());
            authTokenRepository.save(authToken);
        } else {
            throw new BusinessException("Vui lòng nhấn 'Gửi mã' và nhập mã OTP 6 số để xác thực email");
        }
        
        // Check if username already exists (if provided)
        if (request.getUsername() != null && !request.getUsername().isEmpty()) {
            if (userRepository.existsByUsernameAndDeletedAtIsNull(request.getUsername())) {
                throw new BusinessException("Username đã được sử dụng");
            }
        }

        // Validate password
        validatePassword(request.getPassword());

        // Create new user (Đã xác thực email thành công ngay khi đăng ký)
        User user = new User();
        user.setEmail(cleanEmail);
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
        user.setEmailVerified(true);
        user.setEmailVerifiedAt(Instant.now());
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
                .message("Đăng ký tài khoản thành công")
                .build();
    }

    /**
     * Login with email and password
     */
    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        log.info("User login attempt: {}", request.getLogin());

        // Kiểm tra chế độ bảo trì hệ thống (MAINTENANCE_MODE)
        boolean maintenanceMode = systemConfigService.getBoolean("MAINTENANCE_MODE", false);

        // Find user by email or username
        User user = userRepository.findActiveUserByEmailOrUsername(request.getLogin())
                .orElseThrow(() -> new InvalidCredentialsException("Email/Username hoặc mật khẩu không đúng"));

        if (maintenanceMode && user.getSystemRole() != com.finance.finance.common.enums.SystemRole.ADMIN) {
            throw new BusinessException("Hệ thống Finora hiện đang trong thời gian bảo trì nâng cấp. Vui lòng quay lại sau ít phút!");
        }

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

        // Check if MFA / 2FA is enabled
        if (user.isMfaEnabled()) {
            if (request.getOtp() == null || request.getOtp().isBlank()) {
                // Generate and send 2FA OTP via email
                String otp = generate6DigitOtp(user, com.finance.finance.common.enums.TokenType.PASSWORD_RESET);
                try {
                    emailService.sendVerificationOtpEmail(user.getEmail(), user.getFullName() != null ? user.getFullName() : "bạn", otp);
                } catch (Exception e) {
                    log.error("Failed to send 2FA OTP email", e);
                }
                return AuthResponse.builder()
                        .requires2fa(true)
                        .message("Mã xác thực 2 bước (2FA) đã được gửi đến email của bạn")
                        .build();
            } else {
                // Verify provided 2FA OTP
                String inputOtp = request.getOtp().trim();
                AuthToken authToken = authTokenRepository.findByEmailAndTokenAndTokenType(
                                user.getEmail().trim().toLowerCase(),
                                inputOtp,
                                com.finance.finance.common.enums.TokenType.PASSWORD_RESET
                        )
                        .filter(t -> !t.isUsed() && t.getExpiresAt().isAfter(Instant.now()))
                        .orElse(null);

                if (authToken == null) {
                    // Try finding by user ID
                    authToken = authTokenRepository.findByTokenAndTokenType(inputOtp, com.finance.finance.common.enums.TokenType.PASSWORD_RESET)
                            .filter(t -> t.getUser() != null && t.getUser().getId().equals(user.getId()) && !t.isUsed() && t.getExpiresAt().isAfter(Instant.now()))
                            .orElseThrow(() -> new BusinessException("Mã xác thực 2FA không đúng hoặc đã hết hạn"));
                }
                authToken.setUsed(true);
                authTokenRepository.save(authToken);
            }
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
     * Forgot password - send reset OTP email
     */
    @Transactional
    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        log.info("Forgot password request for email: {}", email);

        // Find user by email
        userRepository.findByEmail(email).ifPresent(user -> {
            // Invalidate old password reset tokens
            authTokenRepository.invalidateUserTokensByType(user.getId(), com.finance.finance.common.enums.TokenType.PASSWORD_RESET, Instant.now());

            // Generate 6-digit OTP
            String resetOtp = generate6DigitOtp(user, com.finance.finance.common.enums.TokenType.PASSWORD_RESET);
            
            // Send reset OTP email
            emailService.sendPasswordResetOtpEmail(user.getEmail(), user.getFullName(), resetOtp);
            
            log.info("Password reset OTP email sent to: {}", email);
        });

        // Always return success message
        return new MessageResponse("Mã xác thực 6 số đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.");
    }

    /**
     * Verify password reset OTP
     */
    @Transactional(readOnly = true)
    public MessageResponse verifyPasswordResetOtp(String email, String token) {
        log.info("Verifying password reset OTP for email: {}", email);
        String cleanToken = token.trim();
        AuthToken authToken = null;

        if (email != null && !email.isBlank()) {
            User user = userRepository.findByEmail(email.trim().toLowerCase()).orElse(null);
            if (user != null) {
                authToken = authTokenRepository.findByUserIdAndTokenAndTokenType(
                        user.getId(), cleanToken, com.finance.finance.common.enums.TokenType.PASSWORD_RESET
                ).orElse(null);
            }
        }

        if (authToken == null) {
            authToken = authTokenRepository.findByTokenAndTokenType(
                    cleanToken, com.finance.finance.common.enums.TokenType.PASSWORD_RESET
            ).orElseThrow(() -> new InvalidTokenException("Mã OTP không chính xác hoặc không tồn tại"));
        }

        if (authToken.getExpiresAt().isBefore(Instant.now())) {
            throw new TokenExpiredException("Mã xác thực OTP đã hết hạn. Vui lòng yêu cầu mã mới.");
        }

        if (authToken.isUsed()) {
            throw new InvalidTokenException("Mã xác thực OTP này đã được sử dụng");
        }

        return new MessageResponse("Mã xác thực OTP hợp lệ");
    }

    /**
     * Reset password with token/OTP
     */
    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        log.info("Resetting password with OTP/token");

        String token = request.getToken().trim();
        AuthToken authToken = null;

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase()).orElse(null);
            if (user != null) {
                authToken = authTokenRepository.findByUserIdAndTokenAndTokenType(
                        user.getId(), token, com.finance.finance.common.enums.TokenType.PASSWORD_RESET
                ).orElse(null);
            }
        }

        if (authToken == null) {
            authToken = authTokenRepository.findByTokenAndTokenType(
                    token, com.finance.finance.common.enums.TokenType.PASSWORD_RESET
            ).orElseThrow(() -> new InvalidTokenException("Mã OTP hoặc token không hợp lệ hoặc đã hết hạn"));
        }

        // Check if token is expired
        if (authToken.getExpiresAt().isBefore(Instant.now())) {
            throw new TokenExpiredException("Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.");
        }

        // Check if token is already used
        if (authToken.isUsed()) {
            throw new InvalidTokenException("Mã xác thực này đã được sử dụng");
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
     * Verify email with token/OTP
     */
    @Transactional
    public MessageResponse verifyEmail(VerifyEmailRequest request) {
        log.info("Verifying email with OTP/token");

        String token = request.getToken().trim();
        AuthToken authToken = null;

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase()).orElse(null);
            if (user != null) {
                authToken = authTokenRepository.findByUserIdAndTokenAndTokenType(
                        user.getId(), token, com.finance.finance.common.enums.TokenType.EMAIL_VERIFICATION
                ).orElse(null);
            }
        }

        if (authToken == null) {
            authToken = authTokenRepository.findByTokenAndTokenType(
                    token, com.finance.finance.common.enums.TokenType.EMAIL_VERIFICATION
            ).orElseThrow(() -> new InvalidTokenException("Mã xác thực OTP không chính xác hoặc đã hết hạn"));
        }

        // Check if token is expired
        if (authToken.getExpiresAt().isBefore(Instant.now())) {
            throw new TokenExpiredException("Mã xác thực đã hết hạn. Vui lòng nhấn gửi lại mã.");
        }

        // Check if token is already used
        if (authToken.isUsed()) {
            throw new InvalidTokenException("Mã xác thực đã được sử dụng");
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
     * Resend verification email (OTP)
     */
    @Transactional
    public MessageResponse resendVerification(String email) {
        log.info("Resending verification OTP email to: {}", email);

        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new UserNotFoundException("Không tìm thấy người dùng với email này"));

        // Check if already verified
        if (user.isEmailVerified()) {
            throw new BusinessException("Email này đã được xác thực trước đó");
        }

        // Invalidate old verification tokens
        authTokenRepository.invalidateUserTokensByType(user.getId(), com.finance.finance.common.enums.TokenType.EMAIL_VERIFICATION, Instant.now());

        // Generate new 6-digit OTP
        String verificationOtp = generate6DigitOtp(user, com.finance.finance.common.enums.TokenType.EMAIL_VERIFICATION);
        
        // Send verification OTP email
        emailService.sendVerificationOtpEmail(user.getEmail(), user.getFullName(), verificationOtp);

        log.info("Verification OTP email resent to: {}", email);

        return new MessageResponse("Mã xác thực 6 số mới đã được gửi vào email của bạn");
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
     * Generate 6-digit numeric OTP for email verification or password reset (valid for 10 minutes)
     */
    private String generate6DigitOtp(User user, com.finance.finance.common.enums.TokenType tokenType) {
        int randomNum = new java.security.SecureRandom().nextInt(900000) + 100000;
        String otp = String.valueOf(randomNum);
        Instant expiresAt = Instant.now().plus(10, ChronoUnit.MINUTES);

        AuthToken authToken = new AuthToken();
        authToken.setUser(user);
        authToken.setToken(otp);
        authToken.setTokenType(tokenType);
        authToken.setExpiresAt(expiresAt);
        authToken.setUsed(false);

        authTokenRepository.save(authToken);
        return otp;
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
