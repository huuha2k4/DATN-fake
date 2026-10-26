package com.finance.finance.modules.schedule.exception;

/**
 * Exception khi không tìm thấy occurrence
 */
public class OccurrenceNotFoundException extends RuntimeException {
    
    public OccurrenceNotFoundException(String message) {
        super(message);
    }
    
    public OccurrenceNotFoundException(Long occurrenceId) {
        super("Occurrence not found with id: " + occurrenceId);
    }
}
