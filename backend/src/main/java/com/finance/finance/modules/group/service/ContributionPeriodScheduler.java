package com.finance.finance.modules.group.service;

import com.finance.finance.common.enums.ContributionPeriodStatus;
import com.finance.finance.modules.group.repository.ContributionPeriodRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;

@Component
@RequiredArgsConstructor
@Slf4j
public class ContributionPeriodScheduler {
    private static final String ZONE = "Asia/Ho_Chi_Minh";
    private final ContributionPeriodRepository periods;
    private final ContributionPeriodService service;

    @Scheduled(cron = "0 5 8 * * *", zone = ZONE)
    public void advanceRecurringPeriods() {
        LocalDate today = LocalDate.now(ZoneId.of(ZONE));
        for (var period : periods.findRecurringDue(today)) {
            try {
                service.rollOver(period.getGroupId(), period.getId(), today);
            } catch (RuntimeException exception) {
                log.warn("Could not advance contribution period {}", period.getId(), exception);
            }
        }
    }

    @Scheduled(cron = "0 0 8 * * *", zone = ZONE)
    public void remindMembers() {
        LocalDate today = LocalDate.now(ZoneId.of(ZONE));
        for (var period : periods.findByStatusAndDueDateLessThanEqual(ContributionPeriodStatus.ACTIVE, today.plusDays(3))) {
            try {
                service.sendReminders(period.getGroupId(), period.getId(), today, false);
            } catch (RuntimeException exception) {
                log.warn("Could not send reminders for contribution period {}", period.getId(), exception);
            }
        }
    }
}
