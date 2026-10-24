package com.finance.finance.modules.auth.controller;

import com.finance.finance.modules.auth.dto.request.*;
import com.finance.finance.modules.auth.dto.response.AuthResponse;
import com.finance.finance.modules.auth.dto.response.MessageResponse;
import com.finance.finance.modules.auth.service.AuthService;
import com.finance.finance.modules.user.entity.User;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller for authentication endpoints
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Register a new user
     * POST /api/v1/auth/register
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        log.info("Register request received for email: {}", request.getEmail());
        
        AuthResponse authResponse = authService.register(request);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", buildAuthData(authResponse));
        response.put("message", authResponse.getMessage());
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Login with email and password
     * POST /api/v1/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        log.info("Login request received for: {}", request.getLogin());
        
        AuthResponse authResponse = authService.login(request, httpRequest);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", buildAuthData(authResponse));
        
        return ResponseEntity.ok(response);
    }

    /**
     * Logout current user
     * POST /api/v1/auth/logout
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(
            @AuthenticationPrincipal User user,
            @RequestBody(required = false) Map<String, Boolean> body) {
        log.info("Logout request received for user: {}", user.getId());
        
        boolean allDevices = body != null && body.getOrDefault("all_devices", false);
        MessageResponse messageResponse = authService.logout(user, allDevices);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", messageResponse.getMessage());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Refresh access token
     * POST /api/v1/auth/refresh
     */
    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refresh(
            @Valid @RequestBody RefreshTokenRequest request,
            HttpServletRequest httpRequest) {
        log.info("Refresh token request received");
        
        AuthResponse authResponse = authService.refreshToken(request, httpRequest);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", buildTokenData(authResponse));
        
        return ResponseEntity.ok(response);
    }

    /**
     * Forgot password - send reset email
     * POST /api/v1/auth/forgot-password
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        log.info("Forgot password request received for email: {}", request.getEmail());
        
        MessageResponse messageResponse = authService.forgotPassword(request);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", messageResponse.getMessage());
        
        // Add masked email and expiration info
        Map<String, Object> data = new HashMap<>();
        data.put("email_sent_to", maskEmail(request.getEmail()));
        data.put("expires_in", 3600); // 1 hour in seconds
        response.put("data", data);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Reset password with token
     * POST /api/v1/auth/reset-password
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        log.info("Reset password request received");
        
        MessageResponse messageResponse = authService.resetPassword(request);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", messageResponse.getMessage());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Verify email with token
     * POST /api/v1/auth/verify-email
     */
    @PostMapping("/verify-email")
    public ResponseEntity<Map<String, Object>> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        log.info("Verify email request received");
        
        MessageResponse messageResponse = authService.verifyEmail(request);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", messageResponse.getMessage());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Resend verification email
     * POST /api/v1/auth/resend-verification
     */
    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, Object>> resendVerification(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        log.info("Resend verification request received for email: {}", email);
        
        MessageResponse messageResponse = authService.resendVerification(email);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", messageResponse.getMessage());
        
        return ResponseEntity.ok(response);
    }

    // Helper methods

    /**
     * Build auth response data with user and tokens
     */
    private Map<String, Object> buildAuthData(AuthResponse authResponse) {
        Map<String, Object> data = new HashMap<>();
        data.put("user", authResponse.getUser());
        data.put("tokens", buildTokenMap(authResponse));
        return data;
    }

    /**
     * Build token data for refresh response
     */
    private Map<String, Object> buildTokenData(AuthResponse authResponse) {
        return buildTokenMap(authResponse);
    }

    /**
     * Build tokens map
     */
    private Map<String, Object> buildTokenMap(AuthResponse authResponse) {
        Map<String, Object> tokens = new HashMap<>();
        tokens.put("access_token", authResponse.getAccessToken());
        tokens.put("refresh_token", authResponse.getRefreshToken());
        tokens.put("token_type", authResponse.getTokenType());
        tokens.put("expires_in", authResponse.getExpiresIn());
        return tokens;
    }

    /**
     * Mask email for privacy (e.g., u***@example.com)
     */
    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return email;
        }
        
        String[] parts = email.split("@");
        String localPart = parts[0];
        String domain = parts[1];
        
        if (localPart.length() <= 1) {
            return email;
        }
        
        String masked = localPart.charAt(0) + "***";
        return masked + "@" + domain;
    }
}
