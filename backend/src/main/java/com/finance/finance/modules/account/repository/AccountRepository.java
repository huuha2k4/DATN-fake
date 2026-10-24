package com.finance.finance.modules.account.repository;

import com.finance.finance.common.enums.AccountType;
import com.finance.finance.modules.account.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountRepository extends JpaRepository<Account, UUID> {

    /**
     * Tìm account theo ID và userId
     */
    @Query("SELECT a FROM Account a WHERE a.id = :id AND a.userId = :userId AND a.deletedAt IS NULL")
    Optional<Account> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);

    /**
     * Lấy tất cả accounts của user
     */
    @Query("SELECT a FROM Account a WHERE a.userId = :userId AND a.deletedAt IS NULL " +
           "ORDER BY a.displayOrder ASC, a.name ASC")
    List<Account> findAllByUserId(@Param("userId") UUID userId);

    /**
     * Lấy accounts với filter
     */
    @Query("SELECT a FROM Account a WHERE a.userId = :userId AND a.deletedAt IS NULL " +
           "AND (:includeInactive = true OR a.isActive = true) " +
           "AND (:accountType IS NULL OR a.accountType = :accountType) " +
           "AND (:currencyCode IS NULL OR a.currencyCode = :currencyCode) " +
           "ORDER BY a.displayOrder ASC, a.name ASC")
    List<Account> findByUserIdWithFilters(
        @Param("userId") UUID userId,
        @Param("includeInactive") Boolean includeInactive,
        @Param("accountType") AccountType accountType,
        @Param("currencyCode") String currencyCode
    );

    /**
     * Lấy accounts theo loại
     */
    @Query("SELECT a FROM Account a WHERE a.userId = :userId AND a.accountType = :accountType " +
           "AND a.deletedAt IS NULL AND a.isActive = true " +
           "ORDER BY a.displayOrder ASC, a.name ASC")
    List<Account> findByUserIdAndAccountType(@Param("userId") UUID userId, @Param("accountType") AccountType accountType);

    /**
     * Lấy active accounts
     */
    @Query("SELECT a FROM Account a WHERE a.userId = :userId AND a.isActive = true " +
           "AND a.deletedAt IS NULL ORDER BY a.displayOrder ASC, a.name ASC")
    List<Account> findActiveAccountsByUserId(@Param("userId") UUID userId);

    /**
     * Đếm số lượng transactions của account
     */
    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.accountId = :accountId AND t.deletedAt IS NULL")
    Long countTransactionsByAccountId(@Param("accountId") UUID accountId);

    /**
     * Kiểm tra account có thể xóa không (không có transaction)
     */
    @Query("SELECT CASE WHEN COUNT(t) = 0 THEN true ELSE false END " +
           "FROM Transaction t WHERE (t.accountId = :accountId OR t.toAccountId = :accountId) " +
           "AND t.deletedAt IS NULL")
    Boolean canDelete(@Param("accountId") UUID accountId);

    /**
     * Tính tổng assets (accounts có balance > 0)
     */
    @Query("SELECT COALESCE(SUM(a.balance), 0) FROM Account a " +
           "WHERE a.userId = :userId AND a.deletedAt IS NULL " +
           "AND a.isActive = true AND a.isIncludedInTotal = true " +
           "AND a.balance > 0")
    BigDecimal calculateTotalAssets(@Param("userId") UUID userId);

    /**
     * Tính tổng liabilities (accounts có balance < 0)
     */
    @Query("SELECT COALESCE(SUM(ABS(a.balance)), 0) FROM Account a " +
           "WHERE a.userId = :userId AND a.deletedAt IS NULL " +
           "AND a.isActive = true AND a.isIncludedInTotal = true " +
           "AND a.balance < 0")
    BigDecimal calculateTotalLiabilities(@Param("userId") UUID userId);

    /**
     * Tính net worth
     */
    @Query("SELECT COALESCE(SUM(a.balance), 0) FROM Account a " +
           "WHERE a.userId = :userId AND a.deletedAt IS NULL " +
           "AND a.isActive = true AND a.isIncludedInTotal = true")
    BigDecimal calculateNetWorth(@Param("userId") UUID userId);

    /**
     * Lấy summary theo account type
     */
    @Query("SELECT a.accountType, COUNT(a), COALESCE(SUM(a.balance), 0) " +
           "FROM Account a " +
           "WHERE a.userId = :userId AND a.deletedAt IS NULL " +
           "AND a.isActive = true AND a.isIncludedInTotal = true " +
           "GROUP BY a.accountType")
    List<Object[]> getSummaryByAccountType(@Param("userId") UUID userId);

    /**
     * Lấy summary theo currency
     */
    @Query("SELECT a.currencyCode, COUNT(a), COALESCE(SUM(a.balance), 0) " +
           "FROM Account a " +
           "WHERE a.userId = :userId AND a.deletedAt IS NULL " +
           "AND a.isActive = true " +
           "GROUP BY a.currencyCode")
    List<Object[]> getSummaryByCurrency(@Param("userId") UUID userId);

    /**
     * Lấy account statistics
     */
    @Query("SELECT " +
           "COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END), 0) as totalIncome, " +
           "COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END), 0) as totalExpense, " +
           "COUNT(t) as transactionCount, " +
           "COALESCE(AVG(t.amount), 0) as avgTransaction, " +
           "COALESCE(MAX(CASE WHEN t.type = 'INCOME' THEN t.amount END), 0) as largestIncome, " +
           "COALESCE(MAX(CASE WHEN t.type = 'EXPENSE' THEN t.amount END), 0) as largestExpense, " +
           "MIN(t.occurredDate) as firstTransactionDate, " +
           "MAX(t.occurredDate) as lastTransactionDate " +
           "FROM Transaction t " +
           "WHERE t.accountId = :accountId AND t.deletedAt IS NULL")
    Object[] getAccountStatistics(@Param("accountId") UUID accountId);

    /**
     * Lấy balance history (daily snapshots)
     */
    @Query(value = 
           "WITH RECURSIVE date_series AS ( " +
           "    SELECT :fromDate::date as date " +
           "    UNION ALL " +
           "    SELECT date + 1 " +
           "    FROM date_series " +
           "    WHERE date < :toDate::date " +
           "), " +
           "daily_changes AS ( " +
           "    SELECT " +
           "        t.occurred_date as date, " +
           "        SUM(CASE WHEN t.type = 'INCOME' OR t.to_account_id = :accountId THEN t.amount ELSE -t.amount END) as net_change " +
           "    FROM transactions t " +
           "    WHERE (t.account_id = :accountId OR t.to_account_id = :accountId) " +
           "        AND t.occurred_date BETWEEN :fromDate AND :toDate " +
           "        AND t.deleted_at IS NULL " +
           "    GROUP BY t.occurred_date " +
           ") " +
           "SELECT " +
           "    ds.date, " +
           "    COALESCE(dc.net_change, 0) as daily_change, " +
           "    SUM(COALESCE(dc.net_change, 0)) OVER (ORDER BY ds.date) + :startingBalance as balance " +
           "FROM date_series ds " +
           "LEFT JOIN daily_changes dc ON ds.date = dc.date " +
           "ORDER BY ds.date",
           nativeQuery = true)
    List<Object[]> getBalanceHistory(
        @Param("accountId") UUID accountId,
        @Param("fromDate") LocalDate fromDate,
        @Param("toDate") LocalDate toDate,
        @Param("startingBalance") BigDecimal startingBalance
    );

    /**
     * Cập nhật balance của account
     */
    @Modifying
    @Query("UPDATE Account a SET a.balance = a.balance + :amount, a.syncSeq = a.syncSeq + 1 " +
           "WHERE a.id = :accountId")
    void updateBalance(@Param("accountId") UUID accountId, @Param("amount") BigDecimal amount);

    /**
     * Cập nhật balance trực tiếp (for adjustment)
     */
    @Modifying
    @Query("UPDATE Account a SET a.balance = :newBalance, a.syncSeq = a.syncSeq + 1 " +
           "WHERE a.id = :accountId")
    void setBalance(@Param("accountId") UUID accountId, @Param("newBalance") BigDecimal newBalance);

    /**
     * Cập nhật sync info
     */
    @Modifying
    @Query("UPDATE Account a SET a.isSynced = :isSynced, a.lastSyncedAt = :lastSyncedAt, " +
           "a.syncSeq = a.syncSeq + 1 WHERE a.id = :accountId")
    void updateSyncInfo(
        @Param("accountId") UUID accountId,
        @Param("isSynced") Boolean isSynced,
        @Param("lastSyncedAt") LocalDateTime lastSyncedAt
    );

    /**
     * Kiểm tra tên account đã tồn tại chưa
     */
    @Query("SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END FROM Account a " +
           "WHERE LOWER(a.name) = LOWER(:name) AND a.userId = :userId " +
           "AND a.deletedAt IS NULL " +
           "AND (:accountId IS NULL OR a.id != :accountId)")
    Boolean existsByNameAndUserId(
        @Param("name") String name,
        @Param("userId") UUID userId,
        @Param("accountId") UUID accountId
    );

    /**
     * Lấy next display order
     */
    @Query("SELECT COALESCE(MAX(a.displayOrder), 0) + 1 FROM Account a " +
           "WHERE a.userId = :userId AND a.deletedAt IS NULL")
    Integer getNextDisplayOrder(@Param("userId") UUID userId);

    /**
     * Lấy accounts cần sync (chưa sync hoặc sync lâu rồi)
     */
    @Query("SELECT a FROM Account a WHERE a.userId = :userId " +
           "AND a.isSynced = true AND a.isActive = true AND a.deletedAt IS NULL " +
           "AND (a.lastSyncedAt IS NULL OR a.lastSyncedAt < :threshold) " +
           "ORDER BY a.lastSyncedAt ASC NULLS FIRST")
    List<Account> findAccountsNeedingSync(@Param("userId") UUID userId, @Param("threshold") LocalDateTime threshold);
}
