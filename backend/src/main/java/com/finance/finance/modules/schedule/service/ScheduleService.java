package com.finance.finance.modules.schedule.service;

import com.finance.finance.common.enums.NotificationChannel;
import com.finance.finance.common.enums.OccurrenceStatus;
import com.finance.finance.common.enums.ScheduleStatus;
import com.finance.finance.common.enums.ScheduleType;
import com.finance.finance.modules.account.entity.Account;
import com.finance.finance.modules.account.repository.AccountRepository;
import com.finance.finance.modules.user.entity.User;
import com.finance.finance.modules.user.repository.UserRepository;
import com.finance.finance.modules.category.entity.Category;
import com.finance.finance.modules.category.repository.CategoryRepository;
import com.finance.finance.modules.merchant.entity.Merchant;
import com.finance.finance.modules.merchant.repository.MerchantRepository;
import com.finance.finance.modules.schedule.dto.TransactionTemplate;
import com.finance.finance.modules.schedule.dto.request.*;
import com.finance.finance.modules.schedule.dto.response.*;
import com.finance.finance.modules.schedule.entity.Schedule;
import com.finance.finance.modules.schedule.entity.ScheduleOccurrence;
import com.finance.finance.modules.schedule.exception.OccurrenceNotFoundException;
import com.finance.finance.modules.schedule.exception.ScheduleNotFoundException;
import com.finance.finance.modules.schedule.repository.ScheduleOccurrenceRepository;
import com.finance.finance.modules.schedule.repository.ScheduleRepository;
import com.finance.finance.modules.transaction.entity.Transaction;
import com.finance.finance.modules.transaction.repository.TransactionRepository;
import com.finance.finance.modules.transaction.dto.request.CreateTransactionRequest;
import com.finance.finance.modules.transaction.dto.response.TransactionResponse;
import com.finance.finance.modules.transaction.service.TransactionService;
import com.finance.finance.common.enums.TransactionType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service xử lý business logic cho Schedules
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final ScheduleOccurrenceRepository occurrenceRepository;
    private final RecurrenceService recurrenceService;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;
    private final MerchantRepository merchantRepository;
    private final TransactionRepository transactionRepository;
    private final TransactionService transactionService;
    private final com.finance.finance.modules.notification.service.NotificationService notificationService;

    /**
     * 1. Tạo schedule mới
     */
    @Transactional
    public ScheduleResponse createSchedule(CreateScheduleRequest request, UUID userId) {
        log.info("Creating schedule for user: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Validate recurrence rule
        String recurrenceText = recurrenceService.generateRecurrenceText(request.getRecurrenceRule());

        // Build schedule entity
        Schedule schedule = Schedule.builder()
                .user(user)
                .scheduleType(ScheduleType.valueOf(request.getScheduleType()))
                .name(request.getName())
                .recurrenceRule(request.getRecurrenceRule())
                .recurrenceText(recurrenceText)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .status(ScheduleStatus.ACTIVE)
                .autoExecute(request.getAutoExecute() != null ? request.getAutoExecute() : false)
                .notificationEnabled(request.getNotificationEnabled() != null ? request.getNotificationEnabled() : true)
                .notificationTimeBeforeMinutes(request.getNotificationTimeBeforeMinutes())
                .build();

        // Set notification channels
        if (request.getNotificationChannels() != null && !request.getNotificationChannels().isEmpty()) {
            String channels = request.getNotificationChannels().stream()
                    .map(Enum::name)
                    .collect(Collectors.joining(","));
            schedule.setNotificationChannels(channels);
        }

        // Populate transaction template or reminder
        if (request.isTransaction()) {
            populateTransactionTemplate(schedule, request.getTransactionTemplate());
        } else if (request.isReminder()) {
            schedule.setReminderMessage(request.getReminderMessage());
        }

        // Calculate next occurrence
        LocalDate today = LocalDate.now();
        LocalDate nextOccurrence = !request.getStartDate().isBefore(today)
                ? request.getStartDate()
                : recurrenceService.calculateNextOccurrence(
                        request.getRecurrenceRule(), today.minusDays(1), request.getStartDate());
        schedule.setNextOccurrenceDate(nextOccurrence);

        schedule = scheduleRepository.save(schedule);
        occurrenceRepository.save(ScheduleOccurrence.builder()
                .schedule(schedule)
                .scheduledDate(nextOccurrence)
                .status(OccurrenceStatus.PENDING)
                .build());

        log.info("Created schedule with id: {}", schedule.getId());
        return mapToScheduleResponse(schedule);
    }

    /**
     * 2. Lấy danh sách schedules với filter và pagination
     */
    @Transactional(readOnly = true)
    public Page<ScheduleListResponse> getSchedules(
            UUID userId,
            String status,
            String scheduleType,
            String search,
            Pageable pageable
    ) {
        Page<Schedule> schedulesPage;

        // Apply filters
        if (search != null && !search.isBlank()) {
            if (status != null) {
                schedulesPage = scheduleRepository.searchByNameAndStatus(
                        userId,
                        ScheduleStatus.valueOf(status),
                        search,
                        pageable
                );
            } else {
                schedulesPage = scheduleRepository.searchByName(userId, search, pageable);
            }
        } else if (status != null && scheduleType != null) {
            schedulesPage = scheduleRepository.findByUserIdAndStatusAndScheduleType(
                    userId,
                    ScheduleStatus.valueOf(status),
                    ScheduleType.valueOf(scheduleType),
                    pageable
            );
        } else if (status != null) {
            schedulesPage = scheduleRepository.findByUserIdAndStatus(
                    userId,
                    ScheduleStatus.valueOf(status),
                    pageable
            );
        } else if (scheduleType != null) {
            schedulesPage = scheduleRepository.findByUserIdAndScheduleType(
                    userId,
                    ScheduleType.valueOf(scheduleType),
                    pageable
            );
        } else {
            schedulesPage = scheduleRepository.findByUserId(userId, pageable);
        }

        List<ScheduleListResponse> responses = schedulesPage.getContent().stream()
                .map(this::mapToScheduleListResponse)
                .collect(Collectors.toList());

        return new PageImpl<>(responses, pageable, schedulesPage.getTotalElements());
    }

    /**
     * 3. Lấy chi tiết schedule
     */
    @Transactional(readOnly = true)
    public ScheduleDetailResponse getScheduleById(Long scheduleId, UUID userId) {
        Schedule schedule = scheduleRepository.findByIdWithOccurrences(scheduleId, userId)
                .orElseThrow(() -> new ScheduleNotFoundException(scheduleId));

        return mapToScheduleDetailResponse(schedule);
    }

    /**
     * 4. Cập nhật schedule
     */
    @Transactional
    public ScheduleResponse updateSchedule(Long scheduleId, UpdateScheduleRequest request, UUID userId) {
        Schedule schedule = scheduleRepository.findByIdAndUserId(scheduleId, userId)
                .orElseThrow(() -> new ScheduleNotFoundException(scheduleId));

        log.info("Updating schedule: {}", scheduleId);

        boolean needRecalculateNext = false;

        // Update schedule type if requested
        if (request.getScheduleType() != null) {
            ScheduleType newType = ScheduleType.valueOf(request.getScheduleType());
            schedule.setScheduleType(newType);
            if (newType == ScheduleType.REMINDER) {
                // Chuyển sang nhắc nhở: xóa thông tin template giao dịch
                schedule.setTemplateTransactionType(null);
                schedule.setTemplateAccountId(null);
                schedule.setTemplateToAccountId(null);
                schedule.setTemplateCategoryId(null);
                schedule.setTemplateMerchantId(null);
                schedule.setTemplateAmount(null);
                schedule.setTemplateCurrencyCode(null);
                schedule.setTemplateDescription(null);
                schedule.setTemplateNote(null);
                schedule.setAutoExecute(false);
            } else if (newType == ScheduleType.TRANSACTION) {
                // Chuyển sang giao dịch: xóa lời nhắc
                schedule.setReminderMessage(null);
            }
        }

        if (request.getName() != null) {
            schedule.setName(request.getName());
        }

        if (request.getRecurrenceRule() != null) {
            schedule.setRecurrenceRule(request.getRecurrenceRule());
            schedule.setRecurrenceText(recurrenceService.generateRecurrenceText(request.getRecurrenceRule()));
            needRecalculateNext = true;
        }

        if (request.getEndDate() != null) {
            schedule.setEndDate(request.getEndDate());
        }

        if (request.getTransactionTemplate() != null) {
            populateTransactionTemplate(schedule, request.getTransactionTemplate());
        }

        if (request.getReminderMessage() != null) {
            schedule.setReminderMessage(request.getReminderMessage());
        }

        if (request.getAutoExecute() != null) {
            schedule.setAutoExecute(request.getAutoExecute());
        }

        if (request.getNotificationEnabled() != null) {
            schedule.setNotificationEnabled(request.getNotificationEnabled());
        }

        if (request.getNotificationTimeBeforeMinutes() != null) {
            schedule.setNotificationTimeBeforeMinutes(request.getNotificationTimeBeforeMinutes());
        }

        if (request.getNotificationChannels() != null) {
            String channels = request.getNotificationChannels().stream()
                    .map(Enum::name)
                    .collect(Collectors.joining(","));
            schedule.setNotificationChannels(channels);
        }

        // Recalculate next occurrence if recurrence rule changed
        if (needRecalculateNext) {
            LocalDate nextOccurrence = recurrenceService.calculateNextOccurrence(
                    schedule.getRecurrenceRule(),
                    LocalDate.now(),
                    schedule.getStartDate()
            );
            schedule.setNextOccurrenceDate(nextOccurrence);
        }

        schedule = scheduleRepository.save(schedule);

        log.info("Updated schedule: {}", scheduleId);
        return mapToScheduleResponse(schedule);
    }

    /**
     * 5. Xóa schedule (soft delete)
     */
    @Transactional
    public void deleteSchedule(Long scheduleId, UUID userId) {
        Schedule schedule = scheduleRepository.findByIdAndUserId(scheduleId, userId)
                .orElseThrow(() -> new ScheduleNotFoundException(scheduleId));

        log.info("Deleting schedule: {}", scheduleId);
        schedule.softDelete();
        scheduleRepository.save(schedule);
    }

    /**
     * 6. Tạm dừng schedule
     */
    @Transactional
    public ScheduleResponse pauseSchedule(Long scheduleId, PauseScheduleRequest request, UUID userId) {
        Schedule schedule = scheduleRepository.findByIdAndUserId(scheduleId, userId)
                .orElseThrow(() -> new ScheduleNotFoundException(scheduleId));

        if (schedule.isPaused()) {
            throw new IllegalStateException("Schedule is already paused");
        }

        log.info("Pausing schedule: {}", scheduleId);
        schedule.pause(request.getReason());
        schedule = scheduleRepository.save(schedule);

        return mapToScheduleResponse(schedule);
    }

    /**
     * 7. Tiếp tục schedule
     */
    @Transactional
    public ScheduleResponse resumeSchedule(Long scheduleId, UUID userId) {
        Schedule schedule = scheduleRepository.findByIdAndUserId(scheduleId, userId)
                .orElseThrow(() -> new ScheduleNotFoundException(scheduleId));

        if (!schedule.isPaused()) {
            throw new IllegalStateException("Schedule is not paused");
        }

        log.info("Resuming schedule: {}", scheduleId);
        schedule.resume();

        // Recalculate next occurrence
        LocalDate nextOccurrence = recurrenceService.calculateNextOccurrence(
                schedule.getRecurrenceRule(),
                LocalDate.now(),
                schedule.getStartDate()
        );
        schedule.setNextOccurrenceDate(nextOccurrence);

        schedule = scheduleRepository.save(schedule);

        return mapToScheduleResponse(schedule);
    }

    /**
     * 8. Lấy các occurrences sắp tới
     */
    @Transactional(readOnly = true)
    public OccurrenceResponse.UpcomingOccurrencesResponse getUpcomingOccurrences(
            Long scheduleId,
            UUID userId,
            Integer monthsAhead
    ) {
        Schedule schedule = scheduleRepository.findByIdAndUserId(scheduleId, userId)
                .orElseThrow(() -> new ScheduleNotFoundException(scheduleId));

        int months = monthsAhead != null && monthsAhead > 0 ? monthsAhead : 3;

        // Calculate upcoming dates
        List<LocalDate> upcomingDates = recurrenceService.calculateNextOccurrences(
                schedule.getRecurrenceRule(),
                LocalDate.now(),
                schedule.getStartDate(),
                months * 5 // Estimate ~5 occurrences per month
        );

        // Filter by end date and months ahead
        LocalDate maxDate = LocalDate.now().plusMonths(months);
        List<OccurrenceResponse.UpcomingOccurrence> occurrences = upcomingDates.stream()
                .filter(date -> !date.isAfter(maxDate))
                .filter(date -> schedule.getEndDate() == null || !date.isAfter(schedule.getEndDate()))
                .map(date -> {
                    int daysUntil = (int) java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), date);
                    return OccurrenceResponse.UpcomingOccurrence.builder()
                            .scheduledDate(date)
                            .status(OccurrenceStatus.PENDING.name())
                            .daysUntil(daysUntil)
                            .build();
                })
                .collect(Collectors.toList());

        OccurrenceResponse.ScheduleInfo scheduleInfo = OccurrenceResponse.ScheduleInfo.builder()
                .id(schedule.getId())
                .name(schedule.getName())
                .build();

        return OccurrenceResponse.UpcomingOccurrencesResponse.builder()
                .schedule(scheduleInfo)
                .occurrences(occurrences)
                .build();
    }

    /**
     * 9. Bỏ qua một occurrence
     */
    @Transactional
    public OccurrenceResponse skipOccurrence(
            Long scheduleId,
            Long occurrenceId,
            SkipOccurrenceRequest request,
            UUID userId
    ) {
        Schedule schedule = scheduleRepository.findByIdAndUserId(scheduleId, userId)
                .orElseThrow(() -> new ScheduleNotFoundException(scheduleId));

        ScheduleOccurrence occurrence = occurrenceRepository.findByIdAndScheduleIdAndUserId(occurrenceId, scheduleId, userId)
                .orElseThrow(() -> new OccurrenceNotFoundException(occurrenceId));

        if (!occurrence.isPending()) {
            throw new IllegalStateException("Can only skip pending occurrences");
        }

        log.info("Skipping occurrence: {} for schedule: {}", occurrenceId, scheduleId);

        // Mark occurrence as skipped
        occurrence.markAsSkipped(request.getSkipReason());
        occurrence = occurrenceRepository.save(occurrence);

        // Update schedule statistics
        schedule.incrementSkipped();

        // Calculate next occurrence
        LocalDate nextOccurrence = recurrenceService.calculateNextOccurrence(
                schedule.getRecurrenceRule(),
                occurrence.getScheduledDate(),
                schedule.getStartDate()
        );
        schedule.setNextOccurrenceDate(nextOccurrence);

        scheduleRepository.save(schedule);

        return OccurrenceResponse.builder()
                .occurrenceId(occurrence.getId())
                .status(occurrence.getStatus().name())
                .skipReason(occurrence.getSkipReason())
                .skippedAt(occurrence.getSkippedAt())
                .nextOccurrence(nextOccurrence)
                .build();
    }

    /**
     * 10. Thực hiện occurrence ngay lập tức
     */
    @Transactional
    public OccurrenceResponse executeOccurrence(
            Long scheduleId,
            Long occurrenceId,
            ExecuteOccurrenceRequest request,
            UUID userId
    ) {
        Schedule schedule = scheduleRepository.findByIdAndUserId(scheduleId, userId)
                .orElseThrow(() -> new ScheduleNotFoundException(scheduleId));

        ScheduleOccurrence occurrence = occurrenceRepository.findByIdAndScheduleIdAndUserId(occurrenceId, scheduleId, userId)
                .orElseThrow(() -> new OccurrenceNotFoundException(occurrenceId));

        if (!occurrence.isPending()) {
            throw new IllegalStateException("Can only execute pending occurrences");
        }

        if (!schedule.isTransaction()) {
            throw new IllegalStateException("Can only execute transaction schedules");
        }

        log.info("Executing occurrence: {} for schedule: {}", occurrenceId, scheduleId);

        // Create transaction from template
        java.util.UUID transactionId = createTransactionFromTemplate(schedule, request.getExecuteDate(), userId);

        // Mark occurrence as executed
        occurrence.markAsExecuted(transactionId, request.getExecuteDate());
        occurrence = occurrenceRepository.save(occurrence);

        // Update schedule statistics
        schedule.incrementExecuted();

        // Calculate next occurrence
        LocalDate nextOccurrence = recurrenceService.calculateNextOccurrence(
                schedule.getRecurrenceRule(),
                occurrence.getScheduledDate(),
                schedule.getStartDate()
        );
        schedule.setNextOccurrenceDate(nextOccurrence);

        scheduleRepository.save(schedule);
        ensurePendingOccurrence(schedule, nextOccurrence);

        // Send recurring execution notification
        try {
            notificationService.createNotification(
                    userId,
                    com.finance.finance.common.enums.NotificationType.RECURRING_DUE,
                    com.finance.finance.common.enums.NotificationPriority.NORMAL,
                    "Lịch tài chính: " + schedule.getName(),
                    String.format("Giao dịch định kỳ '%s' đã được thực hiện thành công vào ngày %s.",
                            schedule.getName(), request.getExecuteDate().toString()),
                    "/schedules",
                    "Xem lịch tài chính"
            );
        } catch (Exception ex) {
            log.error("Failed to send schedule executed notification", ex);
        }

        return OccurrenceResponse.builder()
                .occurrenceId(occurrence.getId())
                .status(occurrence.getStatus().name())
                .transactionId(transactionId)
                .executedAt(occurrence.getExecutedAt())
                .nextOccurrence(nextOccurrence)
                .build();
    }

    /**
     * Runs from the background scheduler. Due schedules are materialised as
     * occurrences first, so a restart cannot create the same transaction twice.
     */
    @Transactional
    public void processDueSchedules(LocalDate today) {
        List<Schedule> schedules = scheduleRepository.findSchedulesDueOnOrBefore(
                ScheduleStatus.ACTIVE, today);
        for (Schedule schedule : schedules) {
            LocalDate dueDate = schedule.getNextOccurrenceDate();
            ScheduleOccurrence occurrence = ensurePendingOccurrence(schedule, dueDate);
            if (!schedule.isTransaction() || !Boolean.TRUE.equals(schedule.getAutoExecute())) {
                continue;
            }

            try {
                java.util.UUID transactionId = createTransactionFromTemplate(
                        schedule, dueDate, schedule.getUser().getId());
                occurrence.markAsExecuted(transactionId, dueDate);
                occurrenceRepository.save(occurrence);
                schedule.incrementExecuted();
                LocalDate nextDate = recurrenceService.calculateNextOccurrence(
                        schedule.getRecurrenceRule(), dueDate, schedule.getStartDate());
                schedule.setNextOccurrenceDate(nextDate);
                scheduleRepository.save(schedule);
                ensurePendingOccurrence(schedule, nextDate);
                sendNotification(schedule, "Lịch tài chính: " + schedule.getName(),
                        "Giao dịch định kỳ đã được thực hiện thành công.");
            } catch (Exception ex) {
                log.error("Automatic execution failed for schedule {}", schedule.getId(), ex);
                occurrence.markAsFailed(ex.getMessage());
                occurrenceRepository.save(occurrence);
                schedule.incrementFailed();
                scheduleRepository.save(schedule);
                sendNotification(schedule, "Không thể thực hiện lịch: " + schedule.getName(),
                        "Vui lòng kiểm tra tài khoản và thông tin giao dịch rồi thử lại.");
            }
        }
    }

    /** Send each configured upcoming reminder at most once per occurrence. */
    @Transactional
    public void sendUpcomingScheduleNotifications(LocalDate today) {
        List<Schedule> schedules = scheduleRepository.findSchedulesForNotification(
                ScheduleStatus.ACTIVE, today, today.plusDays(7));
        for (Schedule schedule : schedules) {
            int minutesBefore = schedule.getNotificationTimeBeforeMinutes() == null
                    ? 1440 : schedule.getNotificationTimeBeforeMinutes();
            long daysBefore = Math.max(1, (minutesBefore + 1439L) / 1440L);
            long daysUntil = java.time.temporal.ChronoUnit.DAYS.between(
                    today, schedule.getNextOccurrenceDate());
            if (daysUntil > daysBefore) {
                continue;
            }

            ScheduleOccurrence occurrence = ensurePendingOccurrence(
                    schedule, schedule.getNextOccurrenceDate());
            if (occurrence.getNotificationSentAt() != null) {
                continue;
            }
            sendNotification(schedule, "Sắp đến hạn: " + schedule.getName(),
                    schedule.isReminder() && schedule.getReminderMessage() != null
                            ? schedule.getReminderMessage()
                            : "Lịch tài chính sẽ đến hạn vào " + schedule.getNextOccurrenceDate() + ".");
            occurrence.setNotificationSentAt(LocalDateTime.now());
            occurrenceRepository.save(occurrence);
        }
    }

    private ScheduleOccurrence ensurePendingOccurrence(Schedule schedule, LocalDate date) {
        return occurrenceRepository.findByScheduleIdAndScheduledDate(schedule.getId(), date)
                .orElseGet(() -> occurrenceRepository.save(ScheduleOccurrence.builder()
                        .schedule(schedule)
                        .scheduledDate(date)
                        .status(OccurrenceStatus.PENDING)
                        .build()));
    }

    private void sendNotification(Schedule schedule, String title, String body) {
        if (!Boolean.TRUE.equals(schedule.getNotificationEnabled())) {
            return;
        }
        notificationService.createNotification(schedule.getUser().getId(),
                com.finance.finance.common.enums.NotificationType.RECURRING_DUE,
                com.finance.finance.common.enums.NotificationPriority.NORMAL,
                title, body, "/schedules", "Xem lịch tài chính");
    }

    // ==================== Helper Methods ====================

    /**
     * Populate transaction template vào schedule entity
     */
    private void populateTransactionTemplate(Schedule schedule, TransactionTemplate template) {
        schedule.setTemplateTransactionType(template.getTransactionType());
        schedule.setTemplateAccountId(template.getAccountId());
        schedule.setTemplateToAccountId(template.getToAccountId());
        schedule.setTemplateAmount(template.getAmount());
        schedule.setTemplateCurrencyCode(template.getCurrencyCode());
        schedule.setTemplateCategoryId(template.getCategoryId());
        schedule.setTemplateMerchantId(template.getMerchantId());
        schedule.setTemplateDescription(template.getDescription());
        schedule.setTemplateNote(template.getNote());
    }

    /**
     * Tạo transaction từ template
     */
    private java.util.UUID createTransactionFromTemplate(Schedule schedule, LocalDate transactionDate, UUID userId) {
        TransactionResponse transaction = transactionService.createTransaction(userId,
                CreateTransactionRequest.builder()
                        .transactionType(TransactionType.valueOf(schedule.getTemplateTransactionType()))
                        .accountId(schedule.getTemplateAccountId())
                        .toAccountId(schedule.getTemplateToAccountId())
                        .amount(schedule.getTemplateAmount())
                        .currencyCode(schedule.getTemplateCurrencyCode())
                        .categoryId(schedule.getTemplateCategoryId())
                        .merchantId(schedule.getTemplateMerchantId())
                        .description(schedule.getTemplateDescription())
                        .note(schedule.getTemplateNote())
                        .transactionDate(transactionDate)
                        .isRecurring(true)
                        .build());
        return transaction.getId();
    }

    /**
     * Map Schedule entity to ScheduleResponse
     */
    private ScheduleResponse mapToScheduleResponse(Schedule schedule) {
        ScheduleResponse response = ScheduleResponse.builder()
                .id(schedule.getId())
                .scheduleType(schedule.getScheduleType().name())
                .name(schedule.getName())
                .recurrenceRule(schedule.getRecurrenceRule())
                .recurrenceText(schedule.getRecurrenceText())
                .startDate(schedule.getStartDate())
                .endDate(schedule.getEndDate())
                .nextOccurrence(schedule.getNextOccurrenceDate())
                .status(schedule.getStatus().name())
                .autoExecute(schedule.getAutoExecute())
                .notificationEnabled(schedule.getNotificationEnabled())
                .notificationTimeBeforeMinutes(schedule.getNotificationTimeBeforeMinutes())
                .totalOccurrences(schedule.getTotalOccurrences())
                .executedCount(schedule.getExecutedCount())
                .skippedCount(schedule.getSkippedCount())
                .failedCount(schedule.getFailedCount())
                .lastExecutedAt(schedule.getLastExecutedAt())
                .pausedAt(schedule.getPausedAt())
                .pauseReason(schedule.getPauseReason())
                .createdAt(schedule.getCreatedAt())
                .updatedAt(schedule.getUpdatedAt())
                .build();

        // Set notification channels
        if (schedule.getNotificationChannels() != null) {
            response.setNotificationChannels(
                    List.of(schedule.getNotificationChannels().split(","))
            );
        }

        // Set transaction template or reminder
        if (schedule.isTransaction()) {
            response.setTransactionTemplate(mapTransactionTemplate(schedule));
        } else if (schedule.isReminder()) {
            response.setReminderMessage(schedule.getReminderMessage());
        }

        return response;
    }

    /**
     * Map to ScheduleListResponse
     */
    private ScheduleListResponse mapToScheduleListResponse(Schedule schedule) {
        ScheduleListResponse response = ScheduleListResponse.builder()
                .id(schedule.getId())
                .scheduleType(schedule.getScheduleType().name())
                .name(schedule.getName())
                .recurrenceText(schedule.getRecurrenceText())
                .recurrenceRule(schedule.getRecurrenceRule())
                .startDate(schedule.getStartDate())
                .endDate(schedule.getEndDate())
                .nextOccurrence(schedule.getNextOccurrenceDate())
                .status(schedule.getStatus().name())
                .totalExecuted(schedule.getExecutedCount())
                .lastExecuted(schedule.getLastExecutedAt() != null ? 
                        schedule.getLastExecutedAt().toLocalDate() : null)
                .createdAt(schedule.getCreatedAt())
                .build();

        // Set transaction summary
        if (schedule.isTransaction()) {
            ScheduleListResponse.TransactionSummary summary = ScheduleListResponse.TransactionSummary.builder()
                    .type(schedule.getTemplateTransactionType())
                    .amount(schedule.getTemplateAmount() != null ? 
                            schedule.getTemplateAmount().toString() : null)
                    .build();

            // Fetch category and account names
            if (schedule.getTemplateCategoryId() != null) {
                categoryRepository.findById(schedule.getTemplateCategoryId())
                        .ifPresent(cat -> summary.setCategory(cat.getName()));
            }
            if (schedule.getTemplateAccountId() != null) {
                accountRepository.findById(schedule.getTemplateAccountId())
                        .ifPresent(acc -> summary.setAccount(acc.getName()));
            }

            response.setTransactionTemplate(summary);
        }

        return response;
    }

    /**
     * Map to ScheduleDetailResponse
     */
    private ScheduleDetailResponse mapToScheduleDetailResponse(Schedule schedule) {
        ScheduleDetailResponse response = ScheduleDetailResponse.builder()
                .id(schedule.getId())
                .scheduleType(schedule.getScheduleType().name())
                .name(schedule.getName())
                .recurrenceRule(schedule.getRecurrenceRule())
                .recurrenceText(schedule.getRecurrenceText())
                .startDate(schedule.getStartDate())
                .endDate(schedule.getEndDate())
                .nextOccurrence(schedule.getNextOccurrenceDate())
                .status(schedule.getStatus().name())
                .autoExecute(schedule.getAutoExecute())
                .notificationEnabled(schedule.getNotificationEnabled())
                .notificationTimeBeforeMinutes(schedule.getNotificationTimeBeforeMinutes())
                .createdAt(schedule.getCreatedAt())
                .updatedAt(schedule.getUpdatedAt())
                .build();

        // Set notification channels
        if (schedule.getNotificationChannels() != null) {
            response.setNotificationChannels(
                    List.of(schedule.getNotificationChannels().split(","))
            );
        }

        // Set transaction template or reminder
        if (schedule.isTransaction()) {
            response.setTransactionTemplate(mapTransactionTemplateDetail(schedule));
        } else if (schedule.isReminder()) {
            response.setReminderMessage(schedule.getReminderMessage());
        }

        // Set statistics
        response.setStatistics(mapStatistics(schedule));

        // Set recent occurrences
        List<ScheduleOccurrence> recentOccurrences = occurrenceRepository.findRecentOccurrences(schedule.getId(), 10);
        response.setRecentOccurrences(
                recentOccurrences.stream()
                        .map(this::mapOccurrenceToHistoryItem)
                        .collect(Collectors.toList())
        );

        return response;
    }

    private ScheduleResponse.TransactionTemplateInfo mapTransactionTemplate(Schedule schedule) {
        ScheduleResponse.TransactionTemplateInfo info = ScheduleResponse.TransactionTemplateInfo.builder()
                .transactionType(schedule.getTemplateTransactionType())
                .accountId(schedule.getTemplateAccountId())
                .toAccountId(schedule.getTemplateToAccountId())
                .amount(schedule.getTemplateAmount() != null ? schedule.getTemplateAmount().toString() : null)
                .currencyCode(schedule.getTemplateCurrencyCode())
                .categoryId(schedule.getTemplateCategoryId())
                .merchantId(schedule.getTemplateMerchantId())
                .description(schedule.getTemplateDescription())
                .note(schedule.getTemplateNote())
                .build();

        // Fetch related entity names
        if (schedule.getTemplateAccountId() != null) {
            accountRepository.findById(schedule.getTemplateAccountId())
                    .ifPresent(acc -> info.setAccountName(acc.getName()));
        }
        if (schedule.getTemplateToAccountId() != null) {
            accountRepository.findById(schedule.getTemplateToAccountId())
                    .ifPresent(acc -> info.setToAccountName(acc.getName()));
        }
        if (schedule.getTemplateCategoryId() != null) {
            categoryRepository.findById(schedule.getTemplateCategoryId())
                    .ifPresent(cat -> info.setCategoryName(cat.getName()));
        }
        if (schedule.getTemplateMerchantId() != null) {
            merchantRepository.findById(schedule.getTemplateMerchantId())
                    .ifPresent(mer -> info.setMerchantName(mer.getName()));
        }

        return info;
    }

    private ScheduleDetailResponse.TransactionTemplateDetail mapTransactionTemplateDetail(Schedule schedule) {
        ScheduleDetailResponse.TransactionTemplateDetail detail = ScheduleDetailResponse.TransactionTemplateDetail.builder()
                .transactionType(schedule.getTemplateTransactionType())
                .accountId(schedule.getTemplateAccountId())
                .toAccountId(schedule.getTemplateToAccountId())
                .amount(schedule.getTemplateAmount() != null ? schedule.getTemplateAmount().toString() : null)
                .currencyCode(schedule.getTemplateCurrencyCode())
                .categoryId(schedule.getTemplateCategoryId())
                .merchantId(schedule.getTemplateMerchantId())
                .description(schedule.getTemplateDescription())
                .note(schedule.getTemplateNote())
                .build();

        // Fetch related entity names
        if (schedule.getTemplateAccountId() != null) {
            accountRepository.findById(schedule.getTemplateAccountId())
                    .ifPresent(acc -> detail.setAccountName(acc.getName()));
        }
        if (schedule.getTemplateToAccountId() != null) {
            accountRepository.findById(schedule.getTemplateToAccountId())
                    .ifPresent(acc -> detail.setToAccountName(acc.getName()));
        }
        if (schedule.getTemplateCategoryId() != null) {
            categoryRepository.findById(schedule.getTemplateCategoryId())
                    .ifPresent(cat -> detail.setCategoryName(cat.getName()));
        }
        if (schedule.getTemplateMerchantId() != null) {
            merchantRepository.findById(schedule.getTemplateMerchantId())
                    .ifPresent(mer -> detail.setMerchantName(mer.getName()));
        }

        return detail;
    }

    private ScheduleDetailResponse.Statistics mapStatistics(Schedule schedule) {
        Long pendingCount = occurrenceRepository.countByScheduleIdAndStatus(
                schedule.getId(),
                OccurrenceStatus.PENDING
        );

        String totalAmount = null;
        if (schedule.isTransaction() && schedule.getTemplateAmount() != null) {
            BigDecimal total = schedule.getTemplateAmount()
                    .multiply(BigDecimal.valueOf(schedule.getExecutedCount()));
            totalAmount = total.toString();
        }

        return ScheduleDetailResponse.Statistics.builder()
                .totalOccurrences(schedule.getTotalOccurrences())
                .executed(schedule.getExecutedCount())
                .skipped(schedule.getSkippedCount())
                .pending(pendingCount.intValue())
                .totalAmount(totalAmount)
                .build();
    }

    private ScheduleDetailResponse.OccurrenceHistoryItem mapOccurrenceToHistoryItem(ScheduleOccurrence occurrence) {
        return ScheduleDetailResponse.OccurrenceHistoryItem.builder()
                .id(occurrence.getId())
                .scheduledDate(occurrence.getScheduledDate())
                .status(occurrence.getStatus().name())
                .transactionId(occurrence.getTransactionId())
                .executedAt(occurrence.getExecutedAt())
                .skipReason(occurrence.getSkipReason())
                .skippedAt(occurrence.getSkippedAt())
                .failureReason(occurrence.getFailureReason())
                .failedAt(occurrence.getFailedAt())
                .build();
    }
}
