package com.finance.finance.modules.group.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "group_expense_splits", schema = "core")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseSplit {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "expense_id", nullable = false)
    private UUID expenseId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(precision = 5, scale = 2)
    private BigDecimal percentage;

    @Column(precision = 10, scale = 2)
    private BigDecimal shares;
}
