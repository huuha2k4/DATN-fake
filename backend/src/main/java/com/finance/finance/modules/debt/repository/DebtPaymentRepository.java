package com.finance.finance.modules.debt.repository;

import com.finance.finance.modules.debt.entity.DebtPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DebtPaymentRepository extends JpaRepository<DebtPayment, UUID> {

    /**
     * Tìm payment theo ID và debt ID
     */
    @Query("SELECT p FROM DebtPayment p WHERE p.id = :id AND p.debt.id = :debtId")
    Optional<DebtPayment> findByIdAndDebtId(@Param("id") UUID id, @Param("debtId") UUID debtId);

    /**
     * Lấy tất cả payments của một debt
     */
    @Query("SELECT p FROM DebtPayment p WHERE p.debt.id = :debtId " +
           "ORDER BY p.paymentDate DESC")
    List<DebtPayment> findByDebtId(@Param("debtId") UUID debtId);

    /**
     * Lấy payments của một debt trong khoảng thời gian
     */
    @Query("SELECT p FROM DebtPayment p WHERE p.debt.id = :debtId " +
           "AND p.paymentDate BETWEEN :fromDate AND :toDate " +
           "ORDER BY p.paymentDate DESC")
    List<DebtPayment> findByDebtIdAndDateRange(
            @Param("debtId") UUID debtId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );

    /**
     * Lấy payments của user trong khoảng thời gian (qua debt)
     */
    @Query("SELECT p FROM DebtPayment p WHERE p.debt.user.id = :userId " +
           "AND p.paymentDate BETWEEN :fromDate AND :toDate " +
           "ORDER BY p.paymentDate DESC")
    List<DebtPayment> findByUserIdAndDateRange(
            @Param("userId") UUID userId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );

    /**
     * Lấy payment gần nhất của một debt
     */
    @Query("SELECT p FROM DebtPayment p WHERE p.debt.id = :debtId " +
           "ORDER BY p.paymentDate DESC, p.createdAt DESC")
    List<DebtPayment> findLatestByDebtId(@Param("debtId") UUID debtId);

    /**
     * Đếm số lần payment của một debt
     */
    @Query("SELECT COUNT(p) FROM DebtPayment p WHERE p.debt.id = :debtId")
    Long countByDebtId(@Param("debtId") UUID debtId);

    /**
     * Tính tổng amount đã trả cho một debt
     */
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM DebtPayment p WHERE p.debt.id = :debtId")
    BigDecimal calculateTotalAmountByDebtId(@Param("debtId") UUID debtId);

    /**
     * Tính tổng principal đã trả cho một debt
     */
    @Query("SELECT COALESCE(SUM(p.principalPaid), 0) FROM DebtPayment p WHERE p.debt.id = :debtId")
    BigDecimal calculateTotalPrincipalByDebtId(@Param("debtId") UUID debtId);

    /**
     * Tính tổng interest đã trả cho một debt
     */
    @Query("SELECT COALESCE(SUM(p.interestPaid), 0) FROM DebtPayment p WHERE p.debt.id = :debtId")
    BigDecimal calculateTotalInterestByDebtId(@Param("debtId") UUID debtId);

    /**
     * Tìm payment theo transaction ID
     */
    @Query("SELECT p FROM DebtPayment p WHERE p.transactionId = :transactionId")
    Optional<DebtPayment> findByTransactionId(@Param("transactionId") UUID transactionId);

    /**
     * Lấy payment history grouped by month (cho analytics)
     */
    @Query("SELECT YEAR(p.paymentDate), MONTH(p.paymentDate), " +
           "COUNT(p), COALESCE(SUM(p.amount), 0), " +
           "COALESCE(SUM(p.principalPaid), 0), COALESCE(SUM(p.interestPaid), 0) " +
           "FROM DebtPayment p WHERE p.debt.user.id = :userId " +
           "AND p.paymentDate BETWEEN :fromDate AND :toDate " +
           "GROUP BY YEAR(p.paymentDate), MONTH(p.paymentDate) " +
           "ORDER BY YEAR(p.paymentDate), MONTH(p.paymentDate)")
    List<Object[]> getPaymentHistoryByMonth(
            @Param("userId") UUID userId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );

    /**
     * Lấy payment statistics cho một debt
     */
    @Query("SELECT COUNT(p), " +
           "COALESCE(SUM(p.amount), 0), " +
           "COALESCE(SUM(p.principalPaid), 0), " +
           "COALESCE(SUM(p.interestPaid), 0), " +
           "COALESCE(AVG(p.amount), 0), " +
           "MIN(p.paymentDate), " +
           "MAX(p.paymentDate) " +
           "FROM DebtPayment p WHERE p.debt.id = :debtId")
    Optional<Object[]> getPaymentStatistics(@Param("debtId") UUID debtId);
}
