package com.finance.finance.modules.analytics.controller;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.finance.finance.modules.analytics.client.AiAnalyticsClient;
import com.finance.finance.modules.user.entity.User;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/** Authenticated public adapter for AI 2-5; user identity always comes from JWT. */
@RestController
@RequestMapping({"/api", "/api/v1"})
@RequiredArgsConstructor
@Validated
public class AiAnalyticsController {
    private final AiAnalyticsClient client;

    @GetMapping("/behavior/profile")
    public Object behavior(@AuthenticationPrincipal User user) {
        return client.get("/api/behavior/profile", user.getId(), Map.of());
    }

    @GetMapping("/forecast/balance")
    public Object balance(@AuthenticationPrincipal User user,
                          @RequestParam(defaultValue = "30") @Min(1) @Max(365) int days) {
        return client.get("/api/forecast/balance", user.getId(), Map.of("days", days));
    }

    @GetMapping("/forecast/spending")
    public Object spending(@AuthenticationPrincipal User user,
                           @RequestParam(defaultValue = "30") @Min(1) @Max(365) int days) {
        return client.get("/api/forecast/spending", user.getId(), Map.of("days", days));
    }

    @GetMapping("/forecast/category")
    public Object category(@AuthenticationPrincipal User user,
                           @RequestParam(required = false) String category) {
        return client.get("/api/forecast/category", user.getId(),
                category == null || category.isBlank() ? Map.of() : Map.of("category", category));
    }

    @GetMapping("/forecast/categories")
    public Object categories(@AuthenticationPrincipal User user,
                             @RequestParam(defaultValue = "3") @Min(1) @Max(10) int limit) {
        return client.get("/api/forecast/categories", user.getId(), Map.of("limit", limit));
    }

    @GetMapping("/forecast/goals")
    public Object goals(@AuthenticationPrincipal User user,
                        @RequestParam(name = "goal_name", required = false) String goalName) {
        return client.get("/api/forecast/goals", user.getId(),
                goalName == null || goalName.isBlank() ? Map.of() : Map.of("goal_name", goalName));
    }

    @GetMapping("/anomalies")
    public Object anomalies(@AuthenticationPrincipal User user) {
        return client.get("/api/anomalies", user.getId(), Map.of());
    }

    @PostMapping("/anomalies/check")
    public Object check(@AuthenticationPrincipal User user, @Valid @RequestBody AnomalyCheck request) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("amount", request.amount);
        body.put("category_id", request.categoryId);
        body.put("hour", request.hour);
        return client.post("/api/anomalies/check", user.getId(), body);
    }

    @GetMapping("/recommendations")
    public Object recommendations(@AuthenticationPrincipal User user) {
        return client.get("/api/recommendations", user.getId(), Map.of());
    }

    @Data
    public static class AnomalyCheck {
        @Positive
        private double amount;
        @JsonProperty("category_id")
        private String categoryId;
        @Min(0) @Max(23)
        private Integer hour;
    }
}
