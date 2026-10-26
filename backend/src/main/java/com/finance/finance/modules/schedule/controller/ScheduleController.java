package com.finance.finance.modules.schedule.controller;

import com.finance.finance.modules.user.entity.User;
import com.finance.finance.modules.schedule.dto.request.*;
import com.finance.finance.modules.schedule.dto.response.*;
import com.finance.finance.modules.schedule.service.ScheduleService;
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
 * Controller cho Recurring Schedules & Reminders
 * Cung cấp 10 REST endpoints để quản lý lịch định kỳ
 */
@RestController
@RequestMapping("/api/v1/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;

    /**
     * 1. Tạo lịch định kỳ mới
     * POST /api/v1/schedules
     */
    @PostMapping
    public ResponseEntity<ScheduleResponse> createSchedule(
            @Valid @RequestBody CreateScheduleRequest request,
            @AuthenticationPrincipal User user
    ) {
        ScheduleResponse response = scheduleService.createSchedule(request, user.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * 2. Lấy danh sách lịch định kỳ với filter và pagination
     * GET /api/v1/schedules?schedule_type=TRANSACTION&status=ACTIVE&search=...
     */
    @GetMapping
    public ResponseEntity<Page<ScheduleListResponse>> getSchedules(
            @RequestParam(name = "schedule_type", required = false) String scheduleType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal User user
    ) {
        Page<ScheduleListResponse> schedules = scheduleService.getSchedules(
                user.getId(),
                status,
                scheduleType,
                search,
                pageable
        );
        return ResponseEntity.ok(schedules);
    }

    /**
     * 3. Lấy chi tiết một lịch định kỳ
     * GET /api/v1/schedules/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ScheduleDetailResponse> getScheduleById(
            @PathVariable Long id,
            @AuthenticationPrincipal User user
    ) {
        ScheduleDetailResponse response = scheduleService.getScheduleById(id, user.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * 4. Cập nhật lịch định kỳ
     * PUT /api/v1/schedules/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<ScheduleResponse> updateSchedule(
            @PathVariable Long id,
            @Valid @RequestBody UpdateScheduleRequest request,
            @AuthenticationPrincipal User user
    ) {
        ScheduleResponse response = scheduleService.updateSchedule(id, request, user.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * 5. Xóa lịch định kỳ (soft delete)
     * DELETE /api/v1/schedules/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSchedule(
            @PathVariable Long id,
            @AuthenticationPrincipal User user
    ) {
        scheduleService.deleteSchedule(id, user.getId());
        return ResponseEntity.noContent().build();
    }

    /**
     * 6. Tạm dừng lịch định kỳ
     * POST /api/v1/schedules/{id}/pause
     */
    @PostMapping("/{id}/pause")
    public ResponseEntity<ScheduleResponse> pauseSchedule(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) PauseScheduleRequest request,
            @AuthenticationPrincipal User user
    ) {
        if (request == null) {
            request = new PauseScheduleRequest();
        }
        ScheduleResponse response = scheduleService.pauseSchedule(id, request, user.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * 7. Tiếp tục lịch đã tạm dừng
     * POST /api/v1/schedules/{id}/resume
     */
    @PostMapping("/{id}/resume")
    public ResponseEntity<ScheduleResponse> resumeSchedule(
            @PathVariable Long id,
            @AuthenticationPrincipal User user
    ) {
        ScheduleResponse response = scheduleService.resumeSchedule(id, user.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * 8. Lấy các lần xuất hiện sắp tới
     * GET /api/v1/schedules/{id}/occurrences?months_ahead=3
     */
    @GetMapping("/{id}/occurrences")
    public ResponseEntity<OccurrenceResponse.UpcomingOccurrencesResponse> getUpcomingOccurrences(
            @PathVariable Long id,
            @RequestParam(name = "months_ahead", required = false, defaultValue = "3") Integer monthsAhead,
            @AuthenticationPrincipal User user
    ) {
        OccurrenceResponse.UpcomingOccurrencesResponse response = 
                scheduleService.getUpcomingOccurrences(id, user.getId(), monthsAhead);
        return ResponseEntity.ok(response);
    }

    /**
     * 9. Bỏ qua một lần trong lịch
     * POST /api/v1/schedules/{id}/occurrences/{occ_id}/skip
     */
    @PostMapping("/{id}/occurrences/{occ_id}/skip")
    public ResponseEntity<OccurrenceResponse> skipOccurrence(
            @PathVariable Long id,
            @PathVariable("occ_id") Long occurrenceId,
            @Valid @RequestBody(required = false) SkipOccurrenceRequest request,
            @AuthenticationPrincipal User user
    ) {
        if (request == null) {
            request = new SkipOccurrenceRequest();
        }
        OccurrenceResponse response = scheduleService.skipOccurrence(id, occurrenceId, request, user.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * 10. Thực hiện ngay lập tức (trước hạn)
     * POST /api/v1/schedules/{id}/occurrences/{occ_id}/execute
     */
    @PostMapping("/{id}/occurrences/{occ_id}/execute")
    public ResponseEntity<OccurrenceResponse> executeOccurrence(
            @PathVariable Long id,
            @PathVariable("occ_id") Long occurrenceId,
            @Valid @RequestBody ExecuteOccurrenceRequest request,
            @AuthenticationPrincipal User user
    ) {
        OccurrenceResponse response = scheduleService.executeOccurrence(id, occurrenceId, request, user.getId());
        return ResponseEntity.ok(response);
    }
}
