package com.finance.finance.modules.goal.controller;

import com.finance.finance.modules.goal.dto.request.CompleteGoalRequest;
import com.finance.finance.modules.goal.dto.request.ContributeRequest;
import com.finance.finance.modules.goal.dto.request.CreateGoalRequest;
import com.finance.finance.modules.goal.dto.request.CreateMilestoneRequest;
import com.finance.finance.modules.goal.dto.request.UpdateGoalRequest;
import com.finance.finance.modules.goal.dto.response.ContributeResponse;
import com.finance.finance.modules.goal.dto.response.GoalListResponse;
import com.finance.finance.modules.goal.dto.response.GoalProgressResponse;
import com.finance.finance.modules.goal.dto.response.GoalResponse;
import com.finance.finance.modules.goal.dto.response.GoalSummaryResponse;
import com.finance.finance.modules.goal.service.GoalService;
import com.finance.finance.modules.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Controller cho quản lý mục tiêu tài chính
 * Cung cấp 10 REST endpoints để tạo, quản lý và theo dõi mục tiêu
 */
@RestController
@RequestMapping("/api/v1/goals")
@RequiredArgsConstructor
public class GoalController {

    private final GoalService goalService;

    /**
     * 1. Tạo mục tiêu mới
     * POST /api/goals
     */
    @PostMapping
    public ResponseEntity<GoalResponse> createGoal(
            @Valid @RequestBody CreateGoalRequest request,
            @AuthenticationPrincipal User user
    ) {
        GoalResponse response = goalService.createGoal(user.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * 2. Lấy danh sách mục tiêu
     * GET /api/goals
     */
    @GetMapping
    public ResponseEntity<GoalListResponse> getGoals(
            @RequestParam(required = false) com.finance.finance.common.enums.GoalStatus status,
            @AuthenticationPrincipal User user
    ) {
        GoalListResponse goals = goalService.getGoals(user.getId(), status);
        return ResponseEntity.ok(goals);
    }

    /**
     * 3. Lấy chi tiết một mục tiêu
     * GET /api/goals/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<GoalResponse> getGoalById(
            @PathVariable java.util.UUID id,
            @AuthenticationPrincipal User user
    ) {
        GoalResponse response = goalService.getGoalById(user.getId(), id);
        return ResponseEntity.ok(response);
    }

    /**
     * 4. Cập nhật mục tiêu
     * PUT /api/goals/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<GoalResponse> updateGoal(
            @PathVariable java.util.UUID id,
            @Valid @RequestBody UpdateGoalRequest request,
            @AuthenticationPrincipal User user
    ) {
        GoalResponse response = goalService.updateGoal(user.getId(), id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * 5. Xóa mục tiêu (soft delete)
     * DELETE /api/goals/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGoal(
            @PathVariable java.util.UUID id,
            @AuthenticationPrincipal User user
    ) {
        goalService.deleteGoal(user.getId(), id);
        return ResponseEntity.noContent().build();
    }

    /**
     * 6. Đóng góp vào mục tiêu
     * POST /api/goals/{id}/contribute
     */
    @PostMapping("/{id}/contribute")
    public ResponseEntity<ContributeResponse> contribute(
            @PathVariable java.util.UUID id,
            @Valid @RequestBody ContributeRequest request,
            @AuthenticationPrincipal User user
    ) {
        ContributeResponse response = goalService.contribute(user.getId(), id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * 7. Lấy tiến độ chi tiết của mục tiêu
     * GET /api/goals/{id}/progress
     */
    @GetMapping("/{id}/progress")
    public ResponseEntity<GoalProgressResponse> getGoalProgress(
            @PathVariable java.util.UUID id,
            @AuthenticationPrincipal User user
    ) {
        GoalProgressResponse response = goalService.getGoalProgress(user.getId(), id);
        return ResponseEntity.ok(response);
    }

    /**
     * 8. Tạo milestone cho mục tiêu
     * POST /api/goals/{id}/milestones
     */
    @PostMapping("/{id}/milestones")
    public ResponseEntity<GoalResponse.MilestoneInfo> createMilestone(
            @PathVariable java.util.UUID id,
            @Valid @RequestBody CreateMilestoneRequest request,
            @AuthenticationPrincipal User user
    ) {
        GoalResponse.MilestoneInfo response = goalService.createMilestone(user.getId(), id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * 9. Đánh dấu mục tiêu hoàn thành
     * PUT /api/goals/{id}/complete
     */
    @PutMapping("/{id}/complete")
    public ResponseEntity<GoalResponse> completeGoal(
            @PathVariable java.util.UUID id,
            @Valid @RequestBody CompleteGoalRequest request,
            @AuthenticationPrincipal User user
    ) {
        GoalResponse response = goalService.completeGoal(user.getId(), id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * 10. Lấy tổng quan các mục tiêu
     * GET /api/goals/summary
     */
    @GetMapping("/summary")
    public ResponseEntity<GoalSummaryResponse> getGoalsSummary(
            @AuthenticationPrincipal User user
    ) {
        GoalSummaryResponse response = goalService.getGoalsSummary(user.getId());
        return ResponseEntity.ok(response);
    }
}
