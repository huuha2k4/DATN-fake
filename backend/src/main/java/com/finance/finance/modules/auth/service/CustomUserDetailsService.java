package com.finance.finance.modules.auth.service;

import com.finance.finance.modules.user.entity.User;
import com.finance.finance.modules.user.exception.UserNotFoundException;
import com.finance.finance.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {
    
    private final UserRepository userRepository;
    
    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // Username có thể là email hoặc UUID
        try {
            UUID userId = UUID.fromString(username);
            return userRepository.findActiveUserById(userId)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + userId));
        } catch (IllegalArgumentException e) {
            // Không phải UUID, coi như email
            return userRepository.findActiveUserByEmail(username)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + username));
        }
    }
    
    @Transactional(readOnly = true)
    public User loadUserById(UUID id) {
        return userRepository.findActiveUserById(id)
                .orElseThrow(() -> new UserNotFoundException(id));
    }
}
