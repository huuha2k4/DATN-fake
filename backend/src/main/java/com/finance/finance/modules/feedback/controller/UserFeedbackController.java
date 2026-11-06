package com.finance.finance.modules.feedback.controller;

import com.finance.finance.modules.admin.entity.Feedback;
import com.finance.finance.modules.feedback.dto.request.SendFeedbackRequest;
import com.finance.finance.modules.feedback.service.UserFeedbackService;
import com.finance.finance.modules.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/feedbacks")
@RequiredArgsConstructor
public class UserFeedbackController {

    private final UserFeedbackService userFeedbackService;

    @PostMapping
    public ResponseEntity<Feedback> sendFeedback(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody SendFeedbackRequest request) {
        log.info("User {} submitting feedback: {}", user.getId(), request.getTitle());
        Feedback feedback = userFeedbackService.sendFeedback(user.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(feedback);
    }

    @GetMapping("/my")
    public ResponseEntity<List<Feedback>> getMyFeedbacks(@AuthenticationPrincipal User user) {
        log.info("User {} fetching feedback history", user.getId());
        List<Feedback> feedbacks = userFeedbackService.getMyFeedbacks(user.getId());
        return ResponseEntity.ok(feedbacks);
    }
}

