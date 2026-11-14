package com.finance.finance.modules.feedback.exception;

import com.finance.finance.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

public class FeedbackNotFoundException extends BusinessException {
    
    public FeedbackNotFoundException(String message) {
        super(message, "FEEDBACK_NOT_FOUND", HttpStatus.NOT_FOUND);
    }
    
    public static FeedbackNotFoundException byId(java.util.UUID id) {
        return new FeedbackNotFoundException("Feedback not found with id: " + id);
    }
}
