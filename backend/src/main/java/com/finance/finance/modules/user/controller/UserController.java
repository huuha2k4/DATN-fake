package com.finance.finance.modules.user.controller;

import com.finance.finance.modules.user.dto.request.ChangePasswordRequest;
import com.finance.finance.modules.user.dto.request.UpdateProfileRequest;
import com.finance.finance.modules.user.dto.response.UserResponse;
import com.finance.finance.modules.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {
    
    private final UserService userService;
    
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(Authentication authentication) {
        UserResponse user = userService.getCurrentUserByIdentifier(authentication.getName());
        return ResponseEntity.ok(user);
    }

    @GetMapping("/search")
    public ResponseEntity<java.util.List<UserResponse>> searchUsers(@RequestParam("q") String query) {
        java.util.List<UserResponse> users = userService.searchUsers(query);
        return ResponseEntity.ok(users);
    }
    
    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest request) {
        UserResponse updatedUser = userService.updateProfileByIdentifier(authentication.getName(), request);
        return ResponseEntity.ok(updatedUser);
    }
    
    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserResponse> uploadAvatar(
            Authentication authentication,
            @RequestParam("file") MultipartFile file) {
        try {
            UserResponse updatedUser = userService.uploadAvatarByIdentifier(authentication.getName(), file);
            return ResponseEntity.ok(updatedUser);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid avatar upload request for user {}: {}", authentication.getName(), e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Failed to upload avatar for user {}: ", authentication.getName(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @DeleteMapping("/me/avatar")
    public ResponseEntity<Void> deleteAvatar(Authentication authentication) {
        userService.deleteAvatarByIdentifier(authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/me/change-password")
    public ResponseEntity<?> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request) {
        try {
            userService.changePassword(authentication.getName(), request.getCurrentPassword(), request.getNewPassword());
            return ResponseEntity.ok().body(java.util.Map.of("message", "Đổi mật khẩu thành công!"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to change password: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("message", "Đổi mật khẩu thất bại, vui lòng thử lại sau."));
        }
    }
}
