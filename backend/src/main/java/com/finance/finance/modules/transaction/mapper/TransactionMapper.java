package com.finance.finance.modules.transaction.mapper;

import com.finance.finance.modules.transaction.dto.response.TransactionResponse;
import com.finance.finance.modules.transaction.entity.Transaction;
import org.springframework.stereotype.Component;

import java.time.LocalTime;

@Component
public class TransactionMapper {
    
    public TransactionResponse toResponse(Transaction transaction) {
        return toResponse(transaction, null, null, null, null, null, null, null, null);
    }

    public TransactionResponse toResponse(
            Transaction transaction,
            String accountName,
            String accountIcon,
            String toAccountName,
            TransactionResponse.CategoryDto category,
            java.math.BigDecimal balanceBefore,
            java.math.BigDecimal balanceAfter,
            TransactionResponse.MerchantDto merchant,
            java.util.List<TransactionResponse.TagDto> tags
    ) {
        if (transaction == null) {
            return null;
        }
        
        LocalTime transactionTime = transaction.getOccurredAt() != null ? 
                LocalTime.from(transaction.getOccurredAt().atZone(java.time.ZoneId.systemDefault())) : null;
        
        return TransactionResponse.builder()
                .id(transaction.getId())
                .transactionType(transaction.getType())
                .accountId(transaction.getAccountId())
                .accountName(accountName)
                .accountIcon(accountIcon)
                .toAccountId(transaction.getToAccountId())
                .toAccountName(toAccountName)
                .amount(transaction.getAmount())
                .currencyCode(transaction.getCurrencyCode())
                .displayAmount(formatAmount(transaction.getAmount(), transaction.getCurrencyCode()))
                .baseAmount(transaction.getBaseAmount())
                .feeAmount(transaction.getFeeAmount())
                .toAmount(transaction.getToAmount())
                .toCurrencyCode(null) // TODO: Get from to_account
                .description(transaction.getDescriptionRaw())
                .transactionDate(transaction.getOccurredDate())
                .transactionTime(transactionTime)
                .occurredAt(transaction.getOccurredAt())
                .category(category)
                .merchant(merchant)
                .tags(tags)
                .location(parseLocation(transaction.getLocation()))
                .note(transaction.getNote())
                .categoryStatus(transaction.getCategoryStatus())
                .confidenceScore(transaction.getAiConfidence())
                .aiSuggestion(null) // TODO: Build AI suggestion
                .balanceBefore(balanceBefore)
                .balanceAfter(balanceAfter)
                .receiptId(transaction.getReceiptId())
                .receiptUrl(transaction.getReceiptUrl())
                .hasAttachments(transaction.getReceiptUrl() != null || transaction.getReceiptId() != null)
                .isRecurring(false) // TODO: Link to recurring_transactions table if needed
                .recurringTemplateId(null)
                .isExcludedFromReport(transaction.isExcludedFromReport())
                .syncSeq(transaction.getSyncSeq())
                .createdAt(transaction.getCreatedAt())
                .updatedAt(transaction.getUpdatedAt())
                .version(transaction.getVersion())
                .build();
    }
    
    private String formatAmount(java.math.BigDecimal amount, String currencyCode) {
        if (amount == null) return null;
        
        String symbol = switch (currencyCode) {
            case "VND" -> "₫";
            case "USD" -> "$";
            case "EUR" -> "€";
            default -> currencyCode;
        };
        
        return String.format("%,.0f%s", amount, symbol);
    }
    
    private TransactionResponse.LocationDto parseLocation(String locationJson) {
        if (locationJson == null || locationJson.isBlank()) {
            return null;
        }
        
        // Location stored as JSON string, parse if needed in future
        // For now return null as location feature is not prioritized
        return null;
    }
}
