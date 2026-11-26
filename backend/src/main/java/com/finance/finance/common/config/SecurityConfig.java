package com.finance.finance.common.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finance.finance.common.exception.ErrorResponse;
import com.finance.finance.common.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.Http403ForbiddenEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandlerImpl;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.io.IOException;
import java.time.Instant;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final UserDetailsService userDetailsService;
    private final com.finance.finance.common.filter.IdempotencyRateLimitFilter idempotencyRateLimitFilter;
    private final ObjectMapper objectMapper;
    
    @Value("${app.security.allowed-origins}")
    private String allowedOrigins;
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, exception) -> {
                            if (isAiEndpoint(request.getRequestURI().substring(request.getContextPath().length()))) {
                                writeSecurityError(response, HttpStatus.UNAUTHORIZED, "AUTHENTICATION_ERROR", "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
                            } else {
                                new Http403ForbiddenEntryPoint().commence(request, response, exception);
                            }
                        })
                        .accessDeniedHandler((request, response, exception) -> {
                            if (isAiEndpoint(request.getRequestURI().substring(request.getContextPath().length()))) {
                                writeSecurityError(response, HttpStatus.FORBIDDEN, "AUTHORIZATION_ERROR", "Bạn không có quyền thực hiện yêu cầu này.");
                            } else {
                                new AccessDeniedHandlerImpl().handle(request, response, exception);
                            }
                        }))
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers("/api/v1/public/**").permitAll()
                        // Authenticated service-to-service context is verified by the FinAI internal controller.
                        .requestMatchers("/api/internal/v1/finai/**").permitAll()
                        .requestMatchers("/api/v1/test/**").permitAll()  // Test endpoints
                        .requestMatchers(HttpMethod.GET, "/api/v1/health").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/accounts/types").permitAll()
                        .requestMatchers("/actuator/health/**").permitAll()  // Docker healthcheck
                        .requestMatchers("/error").permitAll()  // Error page
                        .requestMatchers("/uploads/avatars/**", "/uploads/receipts/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/groups/*/messages/attachments/*").permitAll()
                        
                        // Admin endpoints
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        
                        // All other endpoints require authentication
                        .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(idempotencyRateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        List<String> origins = new ArrayList<>(Arrays.asList(
            "http://localhost:*",
            "http://127.0.0.1:*",
            "https://*.ngrok-free.dev",
            "http://79.182.10.21:*",
            "https://finora.3congian.top",
            "https://finora.huuha.tech",
            "https://*.ngrok-free.app",
            "https://*.ngrok.io",
            "https://*.ngrok.app"
        ));
        
        if (allowedOrigins != null && !allowedOrigins.trim().isEmpty()) {
            Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty() && !origins.contains(origin))
                .forEach(origins::add);
        }
        
        configuration.setAllowedOriginPatterns(origins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setExposedHeaders(Arrays.asList("Authorization", "X-Total-Count", "X-Page-Number", "X-Request-Id", "Server-Timing", "Retry-After"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
    
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }
    
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    private void writeSecurityError(HttpServletResponse response, HttpStatus status, String code, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getOutputStream(), ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(status.value())
                .error(status.getReasonPhrase())
                .message(message)
                .errorCode(code)
                .build());
    }

    public static boolean isAiEndpoint(String path) {
        if (path == null || !path.startsWith("/api/")) return false;
        String route = path.substring(path.startsWith("/api/v1/") ? 8 : 5);
        return route.startsWith("finai/") || route.equals("chat") || route.startsWith("chat/")
                || route.startsWith("forecast/") || route.startsWith("behavior/")
                || route.equals("anomalies") || route.startsWith("anomalies/")
                || route.equals("recommendations");
    }
}
