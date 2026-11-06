package com.finance.finance.modules.admin.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminFeedbackItem {
    private UUID id;
    private UUID userId;
    private String userFullName;
    private String userEmail;
    private String userAvatar;
    private String title;
    private String content;
    private String category; // BUG, FEATURE_REQUEST, GENERAL, PAYMENT
    private String status;   // PENDING, IN_PROGRESS, RESOLVED, REJECTED
    private String priority; // LOW, MEDIUM, HIGH, URGENT
    private String adminReply;
    private Instant repliedAt;
    private Instant createdAt;
}

