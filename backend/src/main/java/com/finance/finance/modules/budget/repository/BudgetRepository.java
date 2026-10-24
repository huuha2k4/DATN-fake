package com.finance.finance.modules.budget.repository;

import com.finance.finance.common.enums.BudgetPeriodType;
import com.finance.finance.common.enums.BudgetStatus;
import com.finance.finance.modules.budget.entity.Budget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, UUID> {

    /**
     * Tìm budget theo ID và userId
     */
    @Query("SELECT b FROM Budget b WHERE b.id = :id AND b.userId = :userId AND b.deletedAt IS NULL")
    Optional<Budget> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);

    /**
     * Lấy tất cả budgets của user
     */
    @Query("SELECT b FROM Budget b WHERE b.userId = :userId AND b.deletedAt IS NULL " +
           "ORDER BY b.startDate DESC")
    List<Budget> findAllByUserId(@Param("userId") UUID userId);

    /**
     * Lấy budgets với filters
     */
    @Query("SELECT b FROM Budget b WHERE b.userId = :userId AND b.deletedAt IS NULL " +
           "AND (:status IS NULL OR b.status = :status) " +
           "AND (:periodType IS NULL OR b.periodType = :periodType) " +
           "ORDER BY b.startDate DESC")
    List<Budget> findByUserIdWithFilters(
        @Param("userId") UUID userId,
        @Param("status") BudgetStatus status,
        @Param("periodType") BudgetPeriodType periodType
    );

    /**
     * Tìm budget đang active (trong khoảng thời gian hiện tại)
     */
    @Query("SELECT b FROM Budget b WHERE b.userId = :userId " +
           "AND b.deletedAt IS NULL " +
           "AND :currentDate BETWEEN b.startDate AND b.endDate " +
           "ORDER BY b.startDate DESC")
    List<Budget> findActiveBudgets(@Param("userId") UUID userId, @Param("currentDate") LocalDate currentDate);

    /**
     * Tìm budget theo period
     */
    @Query("SELECT b FROM Budget b WHERE b.userId = :userId AND b.deletedAt IS NULL " +
           "AND (:periodType IS NULL OR b.periodType = :periodType) " +
           "AND YEAR(b.startDate) = :year " +
           "AND (:month IS NULL OR MONTH(b.startDate) = :month) " +
           "ORDER BY b.startDate DESC")
    List<Budget> findByPeriod(
        @Param("userId") UUID userId,
        @Param("periodType") BudgetPeriodType periodType,
        @Param("year") Integer year,
        @Param("month") Integer month
    );

    /**
     * Tìm budget current period (tháng hiện tại)
     */
    @Query("SELECT b FROM Budget b WHERE b.userId = :userId AND b.deletedAt IS NULL " +
           "AND :date BETWEEN b.startDate AND b.endDate " +
           "AND b.periodType = 'MONTHLY' " +
           "ORDER BY b.startDate DESC")
    Optional<Budget> findCurrentMonthBudget(@Param("userId") UUID userId, @Param("date") LocalDate date);

    /**
     * Tìm budget theo tháng và năm
     */
    @Query("SELECT b FROM Budget b WHERE b.userId = :userId AND b.deletedAt IS NULL " +
           "AND b.periodType = 'MONTHLY' " +
           "AND YEAR(b.startDate) = :year AND MONTH(b.startDate) = :month " +
           "ORDER BY b.startDate DESC")
    List<Budget> findBudgetForMonth(
        @Param("userId") UUID userId,
        @Param("year") Integer year,
        @Param("month") Integer month
    );

    /**
     * Kiểm tra budget đã tồn tại cho period chưa (tránh duplicate)
     */
    @Query("SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END FROM Budget b " +
           "WHERE b.userId = :userId AND b.deletedAt IS NULL " +
           "AND b.periodType = :periodType " +
           "AND ((b.startDate BETWEEN :startDate AND :endDate) " +
           "     OR (b.endDate BETWEEN :startDate AND :endDate) " +
           "     OR (:startDate BETWEEN b.startDate AND b.endDate)) " +
           "AND (:budgetId IS NULL OR b.id != :budgetId)")
    Boolean existsOverlappingBudget(
        @Param("userId") UUID userId,
        @Param("periodType") BudgetPeriodType periodType,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate,
        @Param("budgetId") UUID budgetId
    );

    /**
     * Cập nhật spent amount và các calculated fields
     */
    @Modifying
    @Query("UPDATE Budget b SET b.spentAmount = :spentAmount, " +
           "b.remainingAmount = b.totalAmount - :spentAmount, " +
           "b.percentageUsed = :percentageUsed, " +
           "b.status = :status, " +
           "b.lastCalculatedAt = CURRENT_TIMESTAMP " +
           "WHERE b.id = :budgetId")
    void updateCalculatedFields(
        @Param("budgetId") UUID budgetId,
        @Param("spentAmount") BigDecimal spentAmount,
        @Param("percentageUsed") Double percentageUsed,
        @Param("status") BudgetStatus status
    );

    /**
     * Đếm budgets theo status
     */
    @Query("SELECT b.status, COUNT(b) FROM Budget b " +
           "WHERE b.userId = :userId AND b.deletedAt IS NULL " +
           "GROUP BY b.status")
    List<Object[]> countByStatus(@Param("userId") UUID userId);

    /**
     * Lấy budgets cần recalculate (chưa tính hoặc tính lâu rồi)
     */
    @Query("SELECT b FROM Budget b WHERE b.userId = :userId " +
           "AND b.deletedAt IS NULL " +
           "AND :currentDate BETWEEN b.startDate AND b.endDate " +
           "AND (b.lastCalculatedAt IS NULL OR b.lastCalculatedAt < :threshold)")
    List<Budget> findBudgetsNeedingRecalculation(
        @Param("userId") UUID userId,
        @Param("currentDate") LocalDate currentDate,
        @Param("threshold") java.time.LocalDateTime threshold
    );

    /**
     * Lấy performance statistics (last N months)
     */
    @Query(value = 
           "SELECT " +
           "    COUNT(*) as total_budgets, " +
           "    SUM(CASE WHEN status IN ('ON_TRACK', 'COMPLETED') THEN 1 ELSE 0 END) as on_track_count, " +
           "    SUM(CASE WHEN status = 'EXCEEDED' THEN 1 ELSE 0 END) as exceeded_count, " +
           "    AVG(percentage_used) as avg_utilization " +
           "FROM budgets " +
           "WHERE user_id = :userId AND deleted_at IS NULL " +
           "    AND start_date >= :fromDate AND end_date <= :toDate",
           nativeQuery = true)
    Object[] getPerformanceStatistics(
        @Param("userId") UUID userId,
        @Param("fromDate") LocalDate fromDate,
        @Param("toDate") LocalDate toDate
    );

    /**
     * Lấy spending trends (compare periods)
     */
    @Query(value = 
           "SELECT " +
           "    b.start_date, " +
           "    b.end_date, " +
           "    b.total_amount, " +
           "    b.spent_amount, " +
           "    b.percentage_used " +
           "FROM budgets b " +
           "WHERE b.user_id = :userId AND b.deleted_at IS NULL " +
           "    AND b.period_type = :periodType " +
           "    AND b.start_date >= :fromDate " +
           "ORDER BY b.start_date DESC " +
           "LIMIT :limit",
           nativeQuery = true)
    List<Object[]> getSpendingTrends(
        @Param("userId") UUID userId,
        @Param("periodType") String periodType,
        @Param("fromDate") LocalDate fromDate,
        @Param("limit") Integer limit
    );
}
