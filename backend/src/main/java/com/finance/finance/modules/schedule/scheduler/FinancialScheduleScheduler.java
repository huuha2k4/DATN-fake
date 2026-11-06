package com.finance.finance.modules.schedule.scheduler;

import com.finance.finance.modules.schedule.service.ScheduleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;

/** Executes due recurring transactions and creates their reminders. */
@Component
@RequiredArgsConstructor
@Slf4j
public class FinancialScheduleScheduler {

    private static final ZoneId ZONE_VN = ZoneId.of("Asia/Ho_Chi_Minh");
    private final ScheduleService scheduleService;

    @Scheduled(cron = "0 */5 * * * ?", zone = "Asia/Ho_Chi_Minh")
    public void executeDueSchedules() {
        scheduleService.processDueSchedules(LocalDate.now(ZONE_VN));
    }

    @Scheduled(cron = "0 0 * * * ?", zone = "Asia/Ho_Chi_Minh")
    public void sendUpcomingReminders() {
        scheduleService.sendUpcomingScheduleNotifications(LocalDate.now(ZONE_VN));
    }
}
