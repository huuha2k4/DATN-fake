package com.finance.finance.modules.debt.repository;

import com.finance.finance.common.enums.DebtStatus;
import com.finance.finance.common.enums.DebtType;
import com.finance.finance.modules.debt.entity.Debt;
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
public interface DebtRepository extends JpaRepository<Debt, UUID> {

    /**
     * Tìm debt theo ID và user ID (không bao gồm deleted)
     */
    @Query("SELECT d FROM Debt d WHERE d.id = :id AND d.user.id = :userId AND d.deletedAt IS NULL")
    Optional<Debt> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);

    /**
     * Tìm debt theo ID và user ID (bao gồm payments)
     */
    @Query("SELECT d FROM Debt d LEFT JOIN FETCH d.payments p " +
           "WHERE d.id = :id AND d.user.id = :userId AND d.deletedAt IS NULL " +
           "ORDER BY p.paymentDate DESC")
    Optional<Debt> findByIdWithPayments(@Param("id") UUID id, @Param("userId") UUID userId);

    /**
     * Lấy tất cả debts của user
     */
    @Query("SELECT d FROM Debt d WHERE d.user.id = :userId AND d.deletedAt IS NULL " +
           "ORDER BY d.createdAt DESC")
    List<Debt> findAllByUserId(@Param("userId") UUID userId);

    /**
     * Lấy debts theo type (BORROWING/LENDING)
     */
    @Query("SELECT d FROM Debt d WHERE d.user.id = :userId " +
           "AND d.debtType = :type AND d.deletedAt IS NULL " +
           "ORDER BY d.createdAt DESC")
    List<Debt> findByUserIdAndType(@Param("userId") UUID userId, @Param("type") DebtType type);

    /**
     * Lấy debts theo status
     */
    @Query("SELECT d FROM Debt d WHERE d.user.id = :userId " +
           "AND d.status = :status AND d.deletedAt IS NULL " +
           "ORDER BY d.createdAt DESC")
    List<Debt> findByUserIdAndStatus(@Param("userId") UUID userId, @Param("status") DebtStatus status);

    /**
     * Lấy debts theo type và status
     */
    @Query("SELECT d FROM Debt d WHERE d.user.id = :userId " +
           "AND d.debtType = :type AND d.status = :status AND d.deletedAt IS NULL " +
           "ORDER BY d.createdAt DESC")
    List<Debt> findByUserIdAndTypeAndStatus(
            @Param("userId") UUID userId,
            @Param("type") DebtType type,
            @Param("status") DebtStatus status
    );

    /**
     * Lấy các debts có payment trong tương lai gần (cho reminder)
     */
    @Query("SELECT d FROM Debt d WHERE d.user.id = :userId " +
           "AND d.status = 'ACTIVE' AND d.deletedAt IS NULL " +
           "AND d.nextPaymentDate IS NOT NULL " +
           "AND d.nextPaymentDate BETWEEN :fromDate AND :toDate " +
           "ORDER BY d.nextPaymentDate ASC")
    List<Debt> findUpcomingPayments(
            @Param("userId") UUID userId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );

    /**
     * Lấy các debts quá hạn
     */
    @Query("SELECT d FROM Debt d WHERE d.user.id = :userId " +
           "AND d.status = 'ACTIVE' AND d.deletedAt IS NULL " +
           "AND d.dueDate IS NOT NULL AND d.dueDate < :currentDate " +
           "ORDER BY d.dueDate ASC")
    List<Debt> findOverdueDebts(@Param("userId") UUID userId, @Param("currentDate") LocalDate currentDate);

    /**
     * Đếm debts theo status
     */
    @Query("SELECT COUNT(d) FROM Debt d WHERE d.user.id = :userId " +
           "AND d.status = :status AND d.deletedAt IS NULL")
    Long countByStatus(@Param("userId") UUID userId, @Param("status") DebtStatus status);

    /**
     * Đếm debts theo type và status
     */
    @Query("SELECT COUNT(d) FROM Debt d WHERE d.user.id = :userId " +
           "AND d.debtType = :type AND d.status = :status AND d.deletedAt IS NULL")
    Long countByTypeAndStatus(
            @Param("userId") UUID userId,
            @Param("type") DebtType type,
            @Param("status") DebtStatus status
    );

    // ==================== Summary Calculations ====================

    /**
     * Tính tổng principal amount theo type
     */
    @Query("SELECT COALESCE(SUM(d.principalAmount), 0) FROM Debt d " +
           "WHERE d.user.id = :userId AND d.debtType = :type AND d.deletedAt IS NULL")
    BigDecimal calculateTotalPrincipalByType(@Param("userId") UUID userId, @Param("type") DebtType type);

    /**
     * Tính tổng paid amount theo type
     */
    @Query("SELECT COALESCE(SUM(d.paidAmount), 0) FROM Debt d " +
           "WHERE d.user.id = :userId AND d.debtType = :type AND d.deletedAt IS NULL")
    BigDecimal calculateTotalPaidByType(@Param("userId") UUID userId, @Param("type") DebtType type);

    /**
     * Tính tổng interest paid theo type
     */
    @Query("SELECT COALESCE(SUM(d.interestPaid), 0) FROM Debt d " +
           "WHERE d.user.id = :userId AND d.debtType = :type AND d.deletedAt IS NULL")
    BigDecimal calculateTotalInterestPaidByType(@Param("userId") UUID userId, @Param("type") DebtType type);

    /**
     * Tính tổng remaining amount theo type và status
     */
    @Query("SELECT COALESCE(SUM(d.principalAmount - (d.paidAmount - d.interestPaid)), 0) FROM Debt d " +
           "WHERE d.user.id = :userId AND d.debtType = :type " +
           "AND d.status = :status AND d.deletedAt IS NULL")
    BigDecimal calculateTotalRemainingByTypeAndStatus(
            @Param("userId") UUID userId,
            @Param("type") DebtType type,
            @Param("status") DebtStatus status
    );

    /**
     * Tính tổng monthly payment cho BORROWING debts
     */
    @Query("SELECT COALESCE(SUM(d.paymentAmount), 0) FROM Debt d " +
           "WHERE d.user.id = :userId AND d.debtType = 'BORROWING' " +
           "AND d.status = 'ACTIVE' AND d.deletedAt IS NULL " +
           "AND d.paymentFrequency = 'MONTHLY' " +
           "AND d.paymentAmount IS NOT NULL")
    BigDecimal calculateTotalMonthlyPayment(@Param("userId") UUID userId);

    /**
     * Lấy summary grouped by type
     */
    @Query("SELECT d.debtType, COUNT(d), " +
           "COALESCE(SUM(d.principalAmount), 0), " +
           "COALESCE(SUM(d.paidAmount), 0), " +
           "COALESCE(SUM(d.interestPaid), 0) " +
           "FROM Debt d WHERE d.user.id = :userId AND d.deletedAt IS NULL " +
           "GROUP BY d.debtType")
    List<Object[]> getSummaryByType(@Param("userId") UUID userId);

    /**
     * Lấy summary grouped by status
     */
    @Query("SELECT d.status, COUNT(d), " +
           "COALESCE(SUM(d.principalAmount), 0), " +
           "COALESCE(SUM(d.paidAmount), 0) " +
           "FROM Debt d WHERE d.user.id = :userId AND d.deletedAt IS NULL " +
           "GROUP BY d.status")
    List<Object[]> getSummaryByStatus(@Param("userId") UUID userId);

    /**
     * Kiểm tra debt name có tồn tại không (để validate unique)
     */
    @Query("SELECT CASE WHEN COUNT(d) > 0 THEN true ELSE false END FROM Debt d " +
           "WHERE d.user.id = :userId AND d.deletedAt IS NULL " +
           "AND d.debtType = :type " +
           "AND ((:type = 'BORROWING' AND LOWER(d.creditorName) = LOWER(:name)) OR " +
           "     (:type = 'LENDING' AND LOWER(d.debtorName) = LOWER(:name))) " +
           "AND (:debtId IS NULL OR d.id != :debtId)")
    Boolean existsByNameAndType(
            @Param("userId") UUID userId,
            @Param("type") DebtType type,
            @Param("name") String name,
            @Param("debtId") UUID debtId
    );

    /**
     * Tìm debts cần update status (ACTIVE -> OVERDUE)
     */
    @Query("SELECT d FROM Debt d WHERE d.status = 'ACTIVE' " +
           "AND d.dueDate IS NOT NULL AND d.dueDate < :currentDate " +
           "AND d.deletedAt IS NULL")
    List<Debt> findDebtsToUpdateToOverdue(@Param("currentDate") LocalDate currentDate);
}
