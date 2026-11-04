package com.finance.finance.modules.feedback.service;

import com.finance.finance.modules.admin.entity.Feedback;
import com.finance.finance.modules.admin.repository.FeedbackRepository;
import com.finance.finance.modules.feedback.dto.request.SendFeedbackRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserFeedbackService {

    private final FeedbackRepository feedbackRepository;

    @Transactional
    public Feedback sendFeedback(UUID userId, SendFeedbackRequest request) {
        log.info("User {} is submitting feedback: {}", userId, request.getTitle());

        String category = request.getCategory() != null && !request.getCategory().isBlank()
                ? request.getCategory().trim().toUpperCase() : "QUESTION";
        String priority = request.getPriority() != null && !request.getPriority().isBlank()
                ? request.getPriority().trim().toUpperCase() : "MEDIUM";

        Feedback feedback = Feedback.builder()
                .userId(userId)
                .title(request.getTitle().trim())
                .content(request.getContent().trim())
                .category(category)
                .priority(priority)
                .status("PENDING")
                .build();

        return feedbackRepository.save(feedback);
    }

    @Transactional(readOnly = true)
    public List<Feedback> getMyFeedbacks(UUID userId) {
        return feedbackRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
}

