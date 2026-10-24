package com.finance.finance.modules.budget.repository;

import com.finance.finance.modules.budget.entity.BudgetItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BudgetItemRepository extends JpaRepository<BudgetItem, UUID> {

    /**
     * Tìm budget item theo ID và budget
     */
    @Query("SELECT bi FROM BudgetItem bi WHERE bi.id = :id AND bi.budget.id = :budgetId")
    Optional<BudgetItem> findByIdAndBudgetId(@Param("id") UUID id, @Param("budgetId") UUID budgetId);

    /**
     * Lấy tất cả items của budget
     */
    @Query("SELECT bi FROM BudgetItem bi WHERE bi.budget.id = :budgetId " +
           "ORDER BY bi.amount DESC")
    List<BudgetItem> findAllByBudgetId(@Param("budgetId") UUID budgetId);

    /**
     * Tìm budget item theo budget và category
     */
    @Query("SELECT bi FROM BudgetItem bi WHERE bi.budget.id = :budgetId " +
           "AND bi.categoryId = :categoryId")
    Optional<BudgetItem> findByBudgetIdAndCategoryId(
        @Param("budgetId") UUID budgetId,
        @Param("categoryId") UUID categoryId
    );

    /**
     * Kiểm tra category đã có trong budget chưa
     */
    @Query("SELECT CASE WHEN COUNT(bi) > 0 THEN true ELSE false END FROM BudgetItem bi " +
           "WHERE bi.budget.id = :budgetId AND bi.categoryId = :categoryId " +
           "AND (:itemId IS NULL OR bi.id != :itemId)")
    Boolean existsByBudgetIdAndCategoryId(
        @Param("budgetId") UUID budgetId,
        @Param("categoryId") UUID categoryId,
        @Param("itemId") UUID itemId
    );

    /**
     * Cập nhật spent amount và các calculated fields
     */
    @Modifying
    @Query("UPDATE BudgetItem bi SET bi.spentAmount = :spentAmount, " +
           "bi.remaining = bi.amount - :spentAmount, " +
           "bi.percentageUsed = :percentageUsed, " +
           "bi.alertLevel = :alertLevel, " +
           "bi.transactionCount = :transactionCount, " +
           "bi.lastCalculatedAt = CURRENT_TIMESTAMP " +
           "WHERE bi.id = :itemId")
    void updateCalculatedFields(
        @Param("itemId") UUID itemId,
        @Param("spentAmount") BigDecimal spentAmount,
        @Param("percentageUsed") Double percentageUsed,
        @Param("alertLevel") String alertLevel,
        @Param("transactionCount") Integer transactionCount
    );

    /**
     * Lấy items at risk (vượt hoặc sắp vượt threshold)
     */
    @Query("SELECT bi FROM BudgetItem bi WHERE bi.budget.id = :budgetId " +
           "AND bi.percentageUsed >= bi.alertThresholdPercentage " +
           "ORDER BY bi.percentageUsed DESC")
    List<BudgetItem> findItemsAtRisk(@Param("budgetId") UUID budgetId);

    /**
     * Đếm categories exceeded
     */
    @Query("SELECT COUNT(bi) FROM BudgetItem bi WHERE bi.budget.id = :budgetId " +
           "AND bi.percentageUsed > 100")
    Long countCategoriesExceeded(@Param("budgetId") UUID budgetId);

    /**
     * Tính tổng spent amount của tất cả items trong budget
     */
    @Query("SELECT COALESCE(SUM(bi.spentAmount), 0) FROM BudgetItem bi " +
           "WHERE bi.budget.id = :budgetId")
    BigDecimal calculateTotalSpent(@Param("budgetId") UUID budgetId);

    /**
     * Lấy budget items của user theo category (across all budgets)
     */
    @Query("SELECT bi FROM BudgetItem bi " +
           "WHERE bi.budget.userId = :userId AND bi.categoryId = :categoryId " +
           "AND bi.budget.deletedAt IS NULL " +
           "ORDER BY bi.budget.startDate DESC")
    List<BudgetItem> findByUserIdAndCategoryId(
        @Param("userId") UUID userId,
        @Param("categoryId") UUID categoryId
    );

    /**
     * Lấy category spending statistics across multiple budgets
     */
    @Query("SELECT bi.categoryId, " +
           "COUNT(bi), " +
           "COALESCE(SUM(bi.amount), 0) as totalBudgeted, " +
           "COALESCE(SUM(bi.spentAmount), 0) as totalSpent, " +
           "COALESCE(AVG(bi.percentageUsed), 0) as avgUtilization " +
           "FROM BudgetItem bi " +
           "WHERE bi.budget.userId = :userId AND bi.budget.deletedAt IS NULL " +
           "GROUP BY bi.categoryId " +
           "ORDER BY totalSpent DESC")
    List<Object[]> getCategorySpendingStatistics(@Param("userId") UUID userId);

    /**
     * Xóa tất cả items của budget
     */
    @Modifying
    @Query("DELETE FROM BudgetItem bi WHERE bi.budget.id = :budgetId")
    void deleteAllByBudgetId(@Param("budgetId") UUID budgetId);
}
