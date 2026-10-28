package com.finance.finance.modules.user.service;

import com.finance.finance.modules.user.dto.request.UpdateProfileRequest;
import com.finance.finance.modules.user.dto.response.UserResponse;
import com.finance.finance.modules.user.entity.User;
import com.finance.finance.modules.user.exception.UserNotFoundException;
import com.finance.finance.modules.user.mapper.UserMapper;
import com.finance.finance.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
    
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    
    private static final String UPLOAD_DIR = "uploads/avatars";
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    private static final String[] ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"};
    
    private User findUserByIdOrIdentifier(String identifier) {
        try {
            UUID userId = UUID.fromString(identifier);
            return userRepository.findById(userId)
                    .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + userId));
        } catch (IllegalArgumentException e) {
            return userRepository.findActiveUserByEmailOrUsername(identifier)
                    .orElseThrow(() -> new UserNotFoundException("User not found with identifier: " + identifier));
        }
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + userId));
        return userMapper.toResponse(user);
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUserByIdentifier(String identifier) {
        User user = findUserByIdOrIdentifier(identifier);
        return userMapper.toResponse(user);
    }

    @Transactional(readOnly = true)
    public java.util.List<UserResponse> searchUsers(String query) {
        if (query == null || query.trim().length() < 2) {
            return java.util.Collections.emptyList();
        }
        org.springframework.data.domain.Pageable limit = org.springframework.data.domain.PageRequest.of(0, 10);
        java.util.List<User> users = userRepository.searchUsersByKeyword(query.trim(), limit);
        return users.stream()
                .map(userMapper::toResponse)
                .collect(java.util.stream.Collectors.toList());
    }
    
    @Transactional
    public UserResponse updateProfileByIdentifier(String identifier, UpdateProfileRequest request) {
        User user = findUserByIdOrIdentifier(identifier);
        UUID userId = user.getId();
        
        // Update only non-null fields
        if (request.getFullName() != null) {
            user.setFullName(request.getFullName());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getPreferredCurrency() != null) {
            user.setPreferredCurrency(request.getPreferredCurrency());
        }
        if (request.getTimezone() != null) {
            user.setTimezone(request.getTimezone());
        }
        if (request.getLanguage() != null) {
            user.setLanguage(request.getLanguage());
        }
        
        User savedUser = userRepository.save(user);
        log.info("Profile updated for user: {}", userId);
        
        return userMapper.toResponse(savedUser);
    }
    
    @Transactional
    public UserResponse uploadAvatar(UUID userId, MultipartFile file) throws IOException {
        // Validate file
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds maximum allowed size of 5MB");
        }
        
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            throw new IllegalArgumentException("Invalid file name");
        }
        
        String fileExtension = getFileExtension(originalFilename);
        if (!isAllowedExtension(fileExtension)) {
            throw new IllegalArgumentException("File type not allowed. Allowed types: jpg, jpeg, png, gif, webp");
        }
        
        // Get user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + userId));
        
        // Delete old avatar if exists
        if (user.getAvatarUrl() != null) {
            deleteOldAvatar(user.getAvatarUrl());
        }
        
        // Create upload directory if not exists
        Path uploadPath = Paths.get(UPLOAD_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }
        
        // Generate unique filename
        String newFilename = userId + "_" + System.currentTimeMillis() + fileExtension;
        Path filePath = uploadPath.resolve(newFilename);
        
        // Save file
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
        
        // Update user avatar URL (relative path)
        String avatarUrl = "/" + UPLOAD_DIR + "/" + newFilename;
        user.setAvatarUrl(avatarUrl);
        User savedUser = userRepository.save(user);
        
        log.info("Avatar uploaded for user: {} at path: {}", userId, avatarUrl);
        
        return userMapper.toResponse(savedUser);
    }

    @Transactional
    public UserResponse uploadAvatarByIdentifier(String identifier, MultipartFile file) throws IOException {
        User user = findUserByIdOrIdentifier(identifier);
        return uploadAvatar(user.getId(), file);
    }
    
    @Transactional
    public void deleteAvatar(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + userId));
        
        if (user.getAvatarUrl() != null) {
            deleteOldAvatar(user.getAvatarUrl());
            user.setAvatarUrl(null);
            userRepository.save(user);
            log.info("Avatar deleted for user: {}", userId);
        }
    }

    @Transactional
    public void deleteAvatarByIdentifier(String identifier) {
        User user = findUserByIdOrIdentifier(identifier);
        deleteAvatar(user.getId());
    }

    @Transactional
    public void changePassword(String identifier, String currentPassword, String newPassword) {
        User user = findUserByIdOrIdentifier(identifier);
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("Mật khẩu hiện tại không chính xác");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        log.info("Password changed successfully for user: {}", identifier);
    }
    
    private void deleteOldAvatar(String avatarUrl) {
        try {
            // Remove leading slash and convert to path
            String relativePath = avatarUrl.startsWith("/") ? avatarUrl.substring(1) : avatarUrl;
            Path oldFilePath = Paths.get(relativePath);
            if (Files.exists(oldFilePath)) {
                Files.delete(oldFilePath);
                log.debug("Deleted old avatar file: {}", relativePath);
            }
        } catch (IOException e) {
            log.warn("Failed to delete old avatar file: {}", avatarUrl, e);
        }
    }
    
    private String getFileExtension(String filename) {
        int lastIndexOf = filename.lastIndexOf(".");
        if (lastIndexOf == -1) {
            return "";
        }
        return filename.substring(lastIndexOf).toLowerCase();
    }
    
    private boolean isAllowedExtension(String extension) {
        for (String allowed : ALLOWED_EXTENSIONS) {
            if (allowed.equalsIgnoreCase(extension)) {
                return true;
            }
        }
        return false;
    }
}
