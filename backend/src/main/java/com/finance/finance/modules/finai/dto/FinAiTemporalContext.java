package com.finance.finance.modules.finai.dto;

import java.time.*;

public record FinAiTemporalContext(
        String timezone,
        String currentDateTime,
        String currentDate,
        String yesterday,
        String currentWeekStart,
        String currentWeekEnd,
        String nextWeekStart,
        String nextWeekEnd,
        String currentMonthStart,
        String currentMonthEnd,
        String upcoming30DaysEnd,
        String previousMonthStart,
        String previousMonthEnd,
        String lastThreeMonthsStart,
        String currentQuarterStart,
        String currentYearStart
) {
    private static final ZoneId DEFAULT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    public static FinAiTemporalContext now(String requestedTimezone) {
        return at(requestedTimezone, Instant.now());
    }

    static FinAiTemporalContext at(String requestedTimezone, Instant instant) {
        ZoneId zone = validZone(requestedTimezone);
        ZonedDateTime current = instant.atZone(zone);
        LocalDate today = current.toLocalDate();
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate previousStart = monthStart.minusMonths(1);
        LocalDate weekStart = today.with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate nextWeekStart = weekStart.plusWeeks(1);
        int quarterMonth = ((today.getMonthValue() - 1) / 3) * 3 + 1;
        return new FinAiTemporalContext(
                zone.getId(), current.toOffsetDateTime().toString(), today.toString(), today.minusDays(1).toString(),
                weekStart.toString(), weekStart.plusDays(6).toString(), nextWeekStart.toString(), nextWeekStart.plusDays(6).toString(),
                monthStart.toString(), monthStart.with(java.time.temporal.TemporalAdjusters.lastDayOfMonth()).toString(),
                today.plusDays(30).toString(), previousStart.toString(), monthStart.minusDays(1).toString(),
                monthStart.minusMonths(2).toString(), LocalDate.of(today.getYear(), quarterMonth, 1).toString(),
                LocalDate.of(today.getYear(), 1, 1).toString());
    }

    private static ZoneId validZone(String value) {
        if (value == null || value.isBlank()) return DEFAULT_ZONE;
        try { return ZoneId.of(value); }
        catch (DateTimeException ignored) { return DEFAULT_ZONE; }
    }
}
