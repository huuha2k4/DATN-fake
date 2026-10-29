package com.finance.finance.modules.ocr.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "receipts", schema = "core")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Receipt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "kind", nullable = false, length = 20)
    @Builder.Default
    private String kind = "unknown";

    @Column(name = "merchant_name", length = 500)
    private String merchantName;

    @Column(name = "transaction_date")
    private LocalDate transactionDate;

    @Column(name = "transaction_time")
    private LocalTime transactionTime;

    @Column(name = "total_amount")
    private Long totalAmount;

    @Column(name = "currency", nullable = false, length = 10)
    @Builder.Default
    private String currency = "VND";

    @Column(name = "raw_text", columnDefinition = "TEXT")
    private String rawText;

    @Column(name = "confidence", precision = 3, scale = 2)
    private BigDecimal confidence;

    @Column(name = "needs_review", nullable = false)
    @Builder.Default
    private Boolean needsReview = false;

    @Column(name = "ai_category_id", length = 100)
    private String aiCategoryId;

    @Column(name = "ai_category_name", length = 200)
    private String aiCategoryName;

    @Column(name = "ai_category_confidence", precision = 3, scale = 2)
    private BigDecimal aiCategoryConfidence;

    @Column(name = "ai_category_source", length = 50)
    private String aiCategorySource;

    @Column(name = "transaction_id")
    private UUID transactionId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
