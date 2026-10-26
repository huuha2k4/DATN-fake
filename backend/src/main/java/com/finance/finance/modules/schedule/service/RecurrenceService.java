package com.finance.finance.modules.schedule.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service xử lý iCalendar recurrence rules (RFC 5545)
 * Parse và tính toán các lần xuất hiện tiếp theo của lịch định kỳ
 */
@Service
@Slf4j
public class RecurrenceService {

    /**
     * Parse recurrence rule từ chuỗi iCalendar format
     */
    public RecurrenceRule parseRecurrenceRule(String ruleString) {
        RecurrenceRule rule = new RecurrenceRule();
        
        if (ruleString == null || ruleString.isBlank()) {
            throw new IllegalArgumentException("Recurrence rule cannot be empty");
        }

        String[] parts = ruleString.split(";");
        for (String part : parts) {
            String[] keyValue = part.split("=", 2);
            if (keyValue.length != 2) {
                continue;
            }

            String key = keyValue[0].trim();
            String value = keyValue[1].trim();

            switch (key) {
                case "FREQ":
                    rule.setFrequency(Frequency.valueOf(value));
                    break;
                case "INTERVAL":
                    rule.setInterval(Integer.parseInt(value));
                    break;
                case "BYMONTHDAY":
                    rule.setByMonthDay(parseIntList(value));
                    break;
                case "BYDAY":
                    rule.setByDay(parseDayList(value));
                    break;
                case "BYMONTH":
                    rule.setByMonth(parseIntList(value));
                    break;
                case "COUNT":
                    rule.setCount(Integer.parseInt(value));
                    break;
                case "UNTIL":
                    rule.setUntil(LocalDate.parse(value));
                    break;
            }
        }

        if (rule.getFrequency() == null) {
            throw new IllegalArgumentException("FREQ is required in recurrence rule");
        }

        return rule;
    }

    /**
     * Tính toán lần xuất hiện tiếp theo từ một ngày cho trước
     */
    public LocalDate calculateNextOccurrence(String ruleString, LocalDate fromDate, LocalDate startDate) {
        RecurrenceRule rule = parseRecurrenceRule(ruleString);
        LocalDate current = fromDate.isAfter(startDate) ? fromDate : startDate;
        
        return calculateNextOccurrence(rule, current);
    }

    /**
     * Tính toán lần xuất hiện tiếp theo theo rule
     */
    private LocalDate calculateNextOccurrence(RecurrenceRule rule, LocalDate fromDate) {
        int interval = rule.getInterval() > 0 ? rule.getInterval() : 1;
        
        switch (rule.getFrequency()) {
            case DAILY:
                return fromDate.plusDays(interval);
                
            case WEEKLY:
                return calculateNextWeekly(fromDate, rule.getByDay(), interval);
                
            case MONTHLY:
                return calculateNextMonthly(fromDate, rule.getByMonthDay(), rule.getByDay(), interval);
                
            case YEARLY:
                return calculateNextYearly(fromDate, rule.getByMonth(), rule.getByMonthDay(), interval);
                
            default:
                throw new IllegalArgumentException("Unsupported frequency: " + rule.getFrequency());
        }
    }

    /**
     * Tính toán N lần xuất hiện tiếp theo
     */
    public List<LocalDate> calculateNextOccurrences(String ruleString, LocalDate fromDate, LocalDate startDate, int count) {
        RecurrenceRule rule = parseRecurrenceRule(ruleString);
        List<LocalDate> occurrences = new ArrayList<>();
        LocalDate current = fromDate.isAfter(startDate) ? fromDate : startDate;
        
        for (int i = 0; i < count; i++) {
            current = calculateNextOccurrence(rule, current);
            if (rule.getUntil() != null && current.isAfter(rule.getUntil())) {
                break;
            }
            occurrences.add(current);
        }
        
        return occurrences;
    }

    /**
     * Tính toán weekly recurrence
     */
    private LocalDate calculateNextWeekly(LocalDate fromDate, List<String> byDay, int interval) {
        if (byDay == null || byDay.isEmpty()) {
            // Không có BYDAY -> cùng thứ trong tuần, mỗi interval tuần
            return fromDate.plusWeeks(interval);
        }

        // Tìm ngày tiếp theo trong danh sách BYDAY
        LocalDate nextDate = fromDate.plusDays(1);
        List<DayOfWeek> targetDays = parseDaysOfWeek(byDay);
        
        // Tìm trong tuần hiện tại
        while (!nextDate.isAfter(fromDate.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY)))) {
            if (targetDays.contains(nextDate.getDayOfWeek())) {
                return nextDate;
            }
            nextDate = nextDate.plusDays(1);
        }
        
        // Không tìm thấy trong tuần này -> sang tuần tiếp theo
        nextDate = fromDate.plusWeeks(interval).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        while (true) {
            if (targetDays.contains(nextDate.getDayOfWeek())) {
                return nextDate;
            }
            nextDate = nextDate.plusDays(1);
        }
    }

    /**
     * Tính toán monthly recurrence
     */
    private LocalDate calculateNextMonthly(LocalDate fromDate, List<Integer> byMonthDay, List<String> byDay, int interval) {
        if (byMonthDay != null && !byMonthDay.isEmpty()) {
            // Theo ngày trong tháng (VD: ngày 1, 15)
            return calculateNextMonthlyByMonthDay(fromDate, byMonthDay, interval);
        } else if (byDay != null && !byDay.isEmpty()) {
            // Theo thứ trong tháng (VD: thứ 6 cuối cùng)
            return calculateNextMonthlyByDay(fromDate, byDay, interval);
        } else {
            // Không có BYMONTHDAY/BYDAY -> cùng ngày hàng tháng
            return fromDate.plusMonths(interval);
        }
    }

    /**
     * Tính monthly theo BYMONTHDAY
     */
    private LocalDate calculateNextMonthlyByMonthDay(LocalDate fromDate, List<Integer> byMonthDay, int interval) {
        Collections.sort(byMonthDay);
        
        // Tìm trong tháng hiện tại
        for (int day : byMonthDay) {
            if (day > fromDate.getDayOfMonth()) {
                try {
                    return LocalDate.of(fromDate.getYear(), fromDate.getMonth(), day);
                } catch (Exception e) {
                    // Ngày không hợp lệ cho tháng này (VD: 31/2)
                    continue;
                }
            }
        }
        
        // Không tìm thấy trong tháng này -> sang tháng tiếp theo
        LocalDate nextMonth = fromDate.plusMonths(interval).withDayOfMonth(1);
        for (int day : byMonthDay) {
            try {
                return LocalDate.of(nextMonth.getYear(), nextMonth.getMonth(), day);
            } catch (Exception e) {
                continue;
            }
        }
        
        // Fallback: ngày đầu tháng
        return nextMonth;
    }

    /**
     * Tính monthly theo BYDAY (VD: -1FR = thứ 6 cuối cùng)
     */
    private LocalDate calculateNextMonthlyByDay(LocalDate fromDate, List<String> byDay, int interval) {
        // Parse BYDAY (VD: -1FR, 1MO, 2TU)
        for (String day : byDay) {
            Pattern pattern = Pattern.compile("(-?\\d+)?([A-Z]{2})");
            Matcher matcher = pattern.matcher(day);
            
            if (matcher.matches()) {
                String posStr = matcher.group(1);
                String dayStr = matcher.group(2);
                
                int position = posStr != null ? Integer.parseInt(posStr) : 0;
                DayOfWeek dayOfWeek = parseDayOfWeek(dayStr);
                
                LocalDate candidate = findDayInMonth(fromDate.plusMonths(interval), dayOfWeek, position);
                if (candidate.isAfter(fromDate)) {
                    return candidate;
                }
            }
        }
        
        return fromDate.plusMonths(interval);
    }

    /**
     * Tìm thứ X trong tháng (VD: thứ 2 đầu tiên, thứ 6 cuối cùng)
     */
    private LocalDate findDayInMonth(LocalDate month, DayOfWeek dayOfWeek, int position) {
        LocalDate firstDay = month.withDayOfMonth(1);
        
        if (position > 0) {
            // Tìm occurrence thứ N (1 = đầu tiên, 2 = thứ hai, ...)
            LocalDate candidate = firstDay.with(TemporalAdjusters.nextOrSame(dayOfWeek));
            for (int i = 1; i < position && candidate.getMonth() == month.getMonth(); i++) {
                candidate = candidate.with(TemporalAdjusters.next(dayOfWeek));
            }
            return candidate;
        } else if (position < 0) {
            // Tìm occurrence từ cuối tháng (-1 = cuối cùng, -2 = áp chót, ...)
            LocalDate lastDay = month.with(TemporalAdjusters.lastDayOfMonth());
            LocalDate candidate = lastDay.with(TemporalAdjusters.previousOrSame(dayOfWeek));
            for (int i = -1; i > position; i--) {
                candidate = candidate.with(TemporalAdjusters.previous(dayOfWeek));
            }
            return candidate;
        } else {
            // position = 0 -> bất kỳ occurrence nào
            return firstDay.with(TemporalAdjusters.nextOrSame(dayOfWeek));
        }
    }

    /**
     * Tính toán yearly recurrence
     */
    private LocalDate calculateNextYearly(LocalDate fromDate, List<Integer> byMonth, List<Integer> byMonthDay, int interval) {
        int targetMonth = (byMonth != null && !byMonth.isEmpty()) ? byMonth.get(0) : fromDate.getMonthValue();
        int targetDay = (byMonthDay != null && !byMonthDay.isEmpty()) ? byMonthDay.get(0) : fromDate.getDayOfMonth();
        
        try {
            LocalDate candidate = LocalDate.of(fromDate.getYear(), targetMonth, targetDay);
            if (candidate.isAfter(fromDate)) {
                return candidate;
            }
        } catch (Exception e) {
            // Ngày không hợp lệ
        }
        
        // Sang năm sau
        try {
            return LocalDate.of(fromDate.getYear() + interval, targetMonth, targetDay);
        } catch (Exception e) {
            return LocalDate.of(fromDate.getYear() + interval, targetMonth, 1);
        }
    }

    /**
     * Tạo text mô tả dễ đọc từ recurrence rule
     */
    public String generateRecurrenceText(String ruleString) {
        try {
            RecurrenceRule rule = parseRecurrenceRule(ruleString);
            int interval = rule.getInterval() > 0 ? rule.getInterval() : 1;
            
            switch (rule.getFrequency()) {
                case DAILY:
                    return interval == 1 ? "Hàng ngày" : "Mỗi " + interval + " ngày";
                    
                case WEEKLY:
                    if (rule.getByDay() != null && !rule.getByDay().isEmpty()) {
                        String days = formatDayList(rule.getByDay());
                        return interval == 1 ? days + " hàng tuần" : days + " mỗi " + interval + " tuần";
                    }
                    return interval == 1 ? "Hàng tuần" : "Mỗi " + interval + " tuần";
                    
                case MONTHLY:
                    if (rule.getByMonthDay() != null && !rule.getByMonthDay().isEmpty()) {
                        String days = rule.getByMonthDay().toString();
                        return "Hàng tháng vào ngày " + days.substring(1, days.length() - 1);
                    } else if (rule.getByDay() != null && !rule.getByDay().isEmpty()) {
                        return "Hàng tháng vào " + formatDayPattern(rule.getByDay().get(0));
                    }
                    return interval == 1 ? "Hàng tháng" : "Mỗi " + interval + " tháng";
                    
                case YEARLY:
                    if (rule.getByMonth() != null && rule.getByMonthDay() != null) {
                        return "Hàng năm vào ngày " + rule.getByMonthDay().get(0) + "/" + rule.getByMonth().get(0);
                    }
                    return "Hàng năm";
                    
                default:
                    return ruleString;
            }
        } catch (Exception e) {
            log.error("Error generating recurrence text: {}", e.getMessage());
            return ruleString;
        }
    }

    // ==================== Helper Methods ====================

    private List<Integer> parseIntList(String value) {
        List<Integer> result = new ArrayList<>();
        for (String s : value.split(",")) {
            result.add(Integer.parseInt(s.trim()));
        }
        return result;
    }

    private List<String> parseDayList(String value) {
        return Arrays.asList(value.split(","));
    }

    private List<DayOfWeek> parseDaysOfWeek(List<String> byDay) {
        List<DayOfWeek> days = new ArrayList<>();
        for (String day : byDay) {
            days.add(parseDayOfWeek(day));
        }
        return days;
    }

    private DayOfWeek parseDayOfWeek(String day) {
        // Remove position prefix if exists (e.g., -1FR -> FR)
        String dayCode = day.replaceAll("-?\\d+", "");
        
        switch (dayCode) {
            case "MO": return DayOfWeek.MONDAY;
            case "TU": return DayOfWeek.TUESDAY;
            case "WE": return DayOfWeek.WEDNESDAY;
            case "TH": return DayOfWeek.THURSDAY;
            case "FR": return DayOfWeek.FRIDAY;
            case "SA": return DayOfWeek.SATURDAY;
            case "SU": return DayOfWeek.SUNDAY;
            default: throw new IllegalArgumentException("Invalid day: " + dayCode);
        }
    }

    private String formatDayList(List<String> byDay) {
        List<String> vietnameseDays = new ArrayList<>();
        for (String day : byDay) {
            vietnameseDays.add(formatVietnameseDay(day));
        }
        return String.join(", ", vietnameseDays);
    }

    private String formatVietnameseDay(String day) {
        String dayCode = day.replaceAll("-?\\d+", "");
        switch (dayCode) {
            case "MO": return "Thứ 2";
            case "TU": return "Thứ 3";
            case "WE": return "Thứ 4";
            case "TH": return "Thứ 5";
            case "FR": return "Thứ 6";
            case "SA": return "Thứ 7";
            case "SU": return "Chủ nhật";
            default: return day;
        }
    }

    private String formatDayPattern(String day) {
        Pattern pattern = Pattern.compile("(-?\\d+)?([A-Z]{2})");
        Matcher matcher = pattern.matcher(day);
        
        if (matcher.matches()) {
            String posStr = matcher.group(1);
            String dayStr = matcher.group(2);
            
            if (posStr != null) {
                int pos = Integer.parseInt(posStr);
                String vietnameseDay = formatVietnameseDay(dayStr);
                if (pos == -1) {
                    return vietnameseDay + " cuối cùng";
                } else if (pos == 1) {
                    return vietnameseDay + " đầu tiên";
                } else if (pos > 0) {
                    return vietnameseDay + " thứ " + pos;
                }
            }
            return formatVietnameseDay(dayStr);
        }
        
        return day;
    }

    // ==================== Data Classes ====================

    public static class RecurrenceRule {
        private Frequency frequency;
        private int interval = 1;
        private List<Integer> byMonthDay;
        private List<String> byDay;
        private List<Integer> byMonth;
        private Integer count;
        private LocalDate until;

        // Getters and Setters
        public Frequency getFrequency() { return frequency; }
        public void setFrequency(Frequency frequency) { this.frequency = frequency; }
        
        public int getInterval() { return interval; }
        public void setInterval(int interval) { this.interval = interval; }
        
        public List<Integer> getByMonthDay() { return byMonthDay; }
        public void setByMonthDay(List<Integer> byMonthDay) { this.byMonthDay = byMonthDay; }
        
        public List<String> getByDay() { return byDay; }
        public void setByDay(List<String> byDay) { this.byDay = byDay; }
        
        public List<Integer> getByMonth() { return byMonth; }
        public void setByMonth(List<Integer> byMonth) { this.byMonth = byMonth; }
        
        public Integer getCount() { return count; }
        public void setCount(Integer count) { this.count = count; }
        
        public LocalDate getUntil() { return until; }
        public void setUntil(LocalDate until) { this.until = until; }
    }

    public enum Frequency {
        DAILY, WEEKLY, MONTHLY, YEARLY
    }
}
