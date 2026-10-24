package com.finance.finance.common.enums;

public enum AlertLevel {
    OK,         // Bình thường (< threshold)
    WARNING,    // Cảnh báo (>= threshold but <= 100%)
    CRITICAL    // Nghiêm trọng (> 100%)
}
