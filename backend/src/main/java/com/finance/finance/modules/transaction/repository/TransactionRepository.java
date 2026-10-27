package com.finance.finance.modules.transaction.repository;

import com.finance.finance.common.enums.CategoryStatus;
import com.finance.finance.common.enums.TransactionType;
import com.finance.finance.modules.transaction.entity.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    
    /**
     * Find transaction by ID and user (ensure user owns the transaction)
     */
    @Query("SELECT t FROM Transaction t WHERE t.id = :id AND t.userId = :userId AND t.deletedAt IS NULL")
    Optional<Transaction> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);
    
    /**
     * Find all transactions by user with pagination
     */
    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId AND t.deletedAt IS NULL ORDER BY t.occurredDate DESC, t.occurredAt DESC")
    Page<Transaction> findByUserId(@Param("userId") UUID userId, Pageable pageable);
    
    /**
     * Find transactions by user and date range
     */
    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId " +
           "AND t.occurredDate BETWEEN :fromDate AND :toDate " +
           "AND t.deletedAt IS NULL " +
           "ORDER BY t.occurredDate DESC, t.occurredAt DESC")
    Page<Transaction> findByUserIdAndDateRange(
            @Param("userId") UUID userId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            Pageable pageable);
    
    /**
     * Find transactions with filters (complex query)
     */
    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId " +
           "AND (CAST(:fromDate AS java.time.LocalDate) IS NULL OR t.occurredDate >= :fromDate) " +
           "AND (CAST(:toDate AS java.time.LocalDate) IS NULL OR t.occurredDate <= :toDate) " +
           "AND (CAST(:accountId AS java.util.UUID) IS NULL OR t.accountId = :accountId) " +
           "AND (CAST(:categoryId AS java.util.UUID) IS NULL OR t.categoryId = :categoryId) " +
           "AND (CAST(:merchantId AS java.util.UUID) IS NULL OR t.merchantId = :merchantId) " +
           "AND (:type IS NULL OR t.type = :type) " +
           "AND (CAST(:minAmount AS java.math.BigDecimal) IS NULL OR t.amount >= :minAmount) " +
           "AND (CAST(:maxAmount AS java.math.BigDecimal) IS NULL OR t.amount <= :maxAmount) " +
           "AND (:categoryStatus IS NULL OR t.categoryStatus = :categoryStatus) " +
           "AND (CAST(:isExcluded AS boolean) IS NULL OR t.isExcludedFromReport = :isExcluded) " +
           "AND (CAST(:search AS string) IS NULL OR LOWER(COALESCE(t.descriptionRaw, '')) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) OR LOWER(COALESCE(t.note, '')) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%'))) " +
           "AND t.deletedAt IS NULL " +
           "ORDER BY t.occurredDate DESC, t.occurredAt DESC")
    Page<Transaction> findWithFilters(
            @Param("userId") UUID userId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("accountId") UUID accountId,
            @Param("categoryId") UUID categoryId,
            @Param("merchantId") UUID merchantId,
            @Param("type") TransactionType type,
            @Param("minAmount") BigDecimal minAmount,
            @Param("maxAmount") BigDecimal maxAmount,
            @Param("categoryStatus") CategoryStatus categoryStatus,
            @Param("isExcluded") Boolean isExcluded,
            @Param("search") String search,
            Pageable pageable);
    
    /**
     * Search transactions by description or note
     */
    @Query("SELECT t FROM Transaction t " +
           "WHERE t.userId = :userId " +
           "AND (LOWER(COALESCE(t.descriptionRaw, '')) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) " +
           "OR LOWER(COALESCE(t.note, '')) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%'))) " +
           "AND t.deletedAt IS NULL " +
           "ORDER BY t.occurredDate DESC, t.occurredAt DESC")
    Page<Transaction> searchTransactions(
            @Param("userId") UUID userId,
            @Param("search") String search,
            Pageable pageable);
    
    /**
     * Get summary by user and date range
     */
    @Query("SELECT " +
           "COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.baseAmount ELSE 0 END), 0) as totalIncome, " +
           "COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.baseAmount ELSE 0 END), 0) as totalExpense, " +
           "COUNT(t) as transactionCount " +
           "FROM Transaction t " +
           "WHERE t.userId = :userId " +
           "AND t.occurredDate BETWEEN :fromDate AND :toDate " +
           "AND (CAST(:isExcluded AS boolean) IS NULL OR t.isExcludedFromReport = :isExcluded) " +
           "AND t.deletedAt IS NULL")
    Object[] getSummary(
            @Param("userId") UUID userId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("isExcluded") Boolean isExcluded);
    
    /**
     * Group transactions by category
     */
    @Query("SELECT t.categoryId, " +
           "SUM(t.baseAmount) as totalAmount, " +
           "COUNT(t) as transactionCount, " +
           "AVG(t.baseAmount) as averageAmount " +
           "FROM Transaction t " +
           "WHERE t.userId = :userId " +
           "AND t.type = :type " +
           "AND t.occurredDate BETWEEN :fromDate AND :toDate " +
           "AND t.categoryId IS NOT NULL " +
           "AND t.deletedAt IS NULL " +
           "GROUP BY t.categoryId " +
           "ORDER BY totalAmount DESC")
    List<Object[]> groupByCategory(
            @Param("userId") UUID userId,
            @Param("type") TransactionType type,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);
    
    /**
     * Find largest expense in date range
     */
    @Query("SELECT t FROM Transaction t " +
           "WHERE t.userId = :userId " +
           "AND t.type = 'EXPENSE' " +
           "AND t.occurredDate BETWEEN :fromDate AND :toDate " +
           "AND t.deletedAt IS NULL " +
           "ORDER BY t.baseAmount DESC")
    List<Transaction> findLargestExpenses(
            @Param("userId") UUID userId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            Pageable pageable);
    
    /**
     * Count transactions by user
     */
    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.userId = :userId AND t.deletedAt IS NULL")
    long countByUserId(@Param("userId") UUID userId);
    
    /**
     * Check if user has any transactions for an account
     */
    @Query("SELECT COUNT(t) > 0 FROM Transaction t " +
           "WHERE (t.accountId = :accountId OR t.toAccountId = :accountId) " +
           "AND t.deletedAt IS NULL")
    boolean existsByAccountId(@Param("accountId") UUID accountId);
    
    /**
     * Check if user has any transactions for a category
     */
    @Query("SELECT COUNT(t) > 0 FROM Transaction t " +
           "WHERE t.categoryId = :categoryId AND t.deletedAt IS NULL")
    boolean existsByCategoryId(@Param("categoryId") UUID categoryId);
    
    /**
     * Get monthly trends for a category
     */
    @Query("SELECT " +
           "FUNCTION('TO_CHAR', t.occurredDate, 'YYYY-MM') as month, " +
           "SUM(t.baseAmount) as totalAmount, " +
           "COUNT(t) as transactionCount, " +
           "AVG(t.baseAmount) as avgAmount " +
           "FROM Transaction t " +
           "WHERE t.userId = :userId " +
           "AND t.categoryId = :categoryId " +
           "AND t.occurredDate >= :fromDate " +
           "AND t.deletedAt IS NULL " +
           "GROUP BY FUNCTION('TO_CHAR', t.occurredDate, 'YYYY-MM') " +
           "ORDER BY month ASC")
    List<Object[]> getMonthlyTrends(
            @Param("userId") UUID userId,
            @Param("categoryId") UUID categoryId,
            @Param("fromDate") LocalDate fromDate);

    /**
     * Get monthly income and expense flow across months
     */
    @Query("SELECT " +
           "FUNCTION('TO_CHAR', t.occurredDate, 'YYYY-MM') as month, " +
           "COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.baseAmount ELSE 0 END), 0) as income, " +
           "COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.baseAmount ELSE 0 END), 0) as expense, " +
           "COUNT(t) as transactionCount " +
           "FROM Transaction t " +
           "WHERE t.userId = :userId " +
           "AND t.occurredDate BETWEEN :fromDate AND :toDate " +
           "AND (CAST(:isExcluded AS boolean) IS NULL OR t.isExcludedFromReport = :isExcluded) " +
           "AND t.deletedAt IS NULL " +
           "GROUP BY FUNCTION('TO_CHAR', t.occurredDate, 'YYYY-MM') " +
           "ORDER BY month ASC")
    List<Object[]> getMonthlyFlow(
            @Param("userId") UUID userId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("isExcluded") Boolean isExcluded);

    /**
     * Get daily income and expense flow across days
     */
    @Query("SELECT " +
           "FUNCTION('TO_CHAR', t.occurredDate, 'YYYY-MM-DD') as day, " +
           "COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.baseAmount ELSE 0 END), 0) as income, " +
           "COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.baseAmount ELSE 0 END), 0) as expense, " +
           "COUNT(t) as transactionCount " +
           "FROM Transaction t " +
           "WHERE t.userId = :userId " +
           "AND t.occurredDate BETWEEN :fromDate AND :toDate " +
           "AND (CAST(:isExcluded AS boolean) IS NULL OR t.isExcludedFromReport = :isExcluded) " +
           "AND t.deletedAt IS NULL " +
           "GROUP BY FUNCTION('TO_CHAR', t.occurredDate, 'YYYY-MM-DD') " +
           "ORDER BY day ASC")
    List<Object[]> getDailyFlow(
            @Param("userId") UUID userId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("isExcluded") Boolean isExcluded);
    
    /**
     * Get most frequent category
     */
    @Query("SELECT t.categoryId, COUNT(t) as count " +
           "FROM Transaction t " +
           "WHERE t.userId = :userId " +
           "AND t.type = 'EXPENSE' " +
           "AND t.occurredDate BETWEEN :fromDate AND :toDate " +
           "AND t.categoryId IS NOT NULL " +
           "AND t.deletedAt IS NULL " +
           "GROUP BY t.categoryId " +
           "ORDER BY count DESC")
    List<Object[]> getMostFrequentCategories(
            @Param("userId") UUID userId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            Pageable pageable);
    
    /**
     * Delete (soft delete) transaction
     */
    @Query("UPDATE Transaction t SET t.deletedAt = CURRENT_TIMESTAMP " +
           "WHERE t.id = :id AND t.userId = :userId AND t.deletedAt IS NULL")
    int softDelete(@Param("id") UUID id, @Param("userId") UUID userId);
    
    /**
     * Move transactions from one account to another
     */
    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Transaction t SET t.accountId = :targetAccountId " +
           "WHERE t.accountId = :sourceAccountId AND t.deletedAt IS NULL")
    void moveTransactionsToAccount(@Param("sourceAccountId") UUID sourceAccountId, 
                                   @Param("targetAccountId") UUID targetAccountId);

    /**
     * Tính tổng chi tiêu thực tế của user theo danh mục trong khoảng thời gian
     */
    @Query("SELECT COALESCE(SUM(t.baseAmount), 0) FROM Transaction t " +
           "WHERE t.userId = :userId " +
           "AND t.categoryId = :categoryId " +
           "AND t.type = 'EXPENSE' " +
           "AND t.occurredDate BETWEEN :startDate AND :endDate " +
           "AND t.deletedAt IS NULL")
    BigDecimal sumSpentByUserIdAndCategoryAndDateRange(
        @Param("userId") UUID userId,
        @Param("categoryId") UUID categoryId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );

    /**
     * Đếm số giao dịch chi tiêu theo danh mục trong khoảng thời gian
     */
    @Query("SELECT COUNT(t) FROM Transaction t " +
           "WHERE t.userId = :userId " +
           "AND t.categoryId = :categoryId " +
           "AND t.type = 'EXPENSE' " +
           "AND t.occurredDate BETWEEN :startDate AND :endDate " +
           "AND t.deletedAt IS NULL")
    long countTransactionsByUserIdAndCategoryAndDateRange(
        @Param("userId") UUID userId,
        @Param("categoryId") UUID categoryId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
}
