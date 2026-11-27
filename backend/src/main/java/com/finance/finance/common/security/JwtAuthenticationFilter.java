package com.finance.finance.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    private final JwtTokenProvider tokenProvider;
    private final UserDetailsService userDetailsService;
    private final com.finance.finance.modules.admin.service.SystemConfigService systemConfigService;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);
            
            if (StringUtils.hasText(jwt)) {
                var claims = tokenProvider.verifiedClaims(jwt);
                UUID userId = UUID.fromString(claims.getSubject());
                Number version = claims.get("sessionVersion", Number.class);
                
                UserDetails userDetails = userDetailsService.loadUserByUsername(userId.toString());
                if (userDetails instanceof com.finance.finance.modules.user.entity.User user
                        && user.isEnabled() && user.isAccountNonLocked()
                        && user.getSessionVersion() == (version == null ? 0 : version.longValue())) {
                    UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        } catch (io.jsonwebtoken.JwtException | IllegalArgumentException |
                 org.springframework.security.core.userdetails.UsernameNotFoundException ex) {
            log.debug("Bearer credentials rejected: {}", ex.getClass().getSimpleName());
        } catch (Exception ex) {
            log.error("Could not set user authentication in security context", ex);
        }
        
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.getPrincipal() instanceof com.finance.finance.modules.user.entity.User user
                && !user.isAdmin()
                && !request.getRequestURI().equals(request.getContextPath() + "/api/v1/auth/logout")
                && systemConfigService.maintenanceEnabled()) {
            response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"errorCode\":\"MAINTENANCE_MODE\",\"message\":\"Finora đang bảo trì. Vui lòng thử lại sau.\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }
    
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
