package com.finance.finance.common.enums;

public enum TransactionSource {
    MANUAL,           // Nhập tay
    BANK_SYNC,        // Đồng bộ từ ngân hàng
    SMS_PARSE,        // Parse từ SMS
    EMAIL_PARSE,      // Parse từ email
    OCR_RECEIPT,      // OCR từ hóa đơn
    IMPORT_CSV,       // Import từ CSV
    IMPORT_EXCEL,     // Import từ Excel
    RECURRING,        // Từ giao dịch định kỳ
    API_INTEGRATION   // Từ API tích hợp
}
