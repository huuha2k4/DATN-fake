package com.finance.finance.modules.schedule.exception;

/**
 * Exception khi không tìm thấy schedule
 */
public class ScheduleNotFoundException extends RuntimeException {
    
    public ScheduleNotFoundException(String message) {
        super(message);
    }
    
    public ScheduleNotFoundException(Long scheduleId) {
        super("Schedule not found with id: " + scheduleId);
    }
}
