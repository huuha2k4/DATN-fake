package com.finance.finance.modules.finai.dto;

import org.junit.jupiter.api.Test;
import java.time.Instant;
import static org.junit.jupiter.api.Assertions.*;

class FinAiTemporalContextTest {
    @Test
    void resolvesMonthBoundaryInUserTimezone() {
        FinAiTemporalContext context = FinAiTemporalContext.at(
                "Asia/Ho_Chi_Minh", Instant.parse("2026-10-31T17:30:00Z"));

        assertEquals("2026-11-01", context.currentDate());
        assertEquals("2026-11-01", context.currentMonthStart());
        assertEquals("2026-11-30", context.currentMonthEnd());
        assertEquals("2026-12-01", context.upcoming30DaysEnd());
        assertEquals("2026-10-01", context.previousMonthStart());
        assertEquals("2026-10-31", context.previousMonthEnd());
        assertEquals("2026-10-31", context.yesterday());
        assertEquals("2026-10-26", context.currentWeekStart());
        assertEquals("2026-11-02", context.nextWeekStart());
        assertEquals("2026-09-01", context.lastThreeMonthsStart());
        assertEquals("2026-10-01", context.currentQuarterStart());
        assertEquals("2026-01-01", context.currentYearStart());
    }

    @Test
    void fallsBackToHoChiMinhForInvalidTimezone() {
        FinAiTemporalContext context = FinAiTemporalContext.at(
                "not/a-zone", Instant.parse("2026-11-18T17:30:00Z"));

        assertEquals("Asia/Ho_Chi_Minh", context.timezone());
        assertEquals("2026-11-19", context.currentDate());
    }
}
