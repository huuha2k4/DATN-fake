package com.finance.finance.modules.schedule.repository;

import com.finance.finance.common.enums.OccurrenceStatus;
import com.finance.finance.modules.schedule.entity.ScheduleOccurrence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository cho ScheduleOccurrence entity
 */
@Repository
public interface ScheduleOccurrenceRepository extends JpaRepository<ScheduleOccurrence, Long> {

    /**
     * Tìm occurrence theo ID và schedule ID
     */
    @Query("SELECT o FROM ScheduleOccurrence o WHERE o.id = :occurrenceId " +
            "AND o.schedule.id = :scheduleId")
    Optional<ScheduleOccurrence> findByIdAndScheduleId(
            @Param("occurrenceId") Long occurrenceId,
            @Param("scheduleId") Long scheduleId
    );

    /**
     * Tìm occurrence theo ID, schedule ID và user ID
     */
    @Query("SELECT o FROM ScheduleOccurrence o " +
            "WHERE o.id = :occurrenceId " +
            "AND o.schedule.id = :scheduleId " +
            "AND o.schedule.user.id = :userId")
    Optional<ScheduleOccurrence> findByIdAndScheduleIdAndUserId(
            @Param("occurrenceId") Long occurrenceId,
            @Param("scheduleId") Long scheduleId,
            @Param("userId") UUID userId
    );

    /**
     * Lấy tất cả occurrences của một schedule
     */
    @Query("SELECT o FROM ScheduleOccurrence o WHERE o.schedule.id = :scheduleId " +
            "ORDER BY o.scheduledDate DESC")
    List<ScheduleOccurrence> findByScheduleId(@Param("scheduleId") Long scheduleId);

    /**
     * Lấy occurrences theo status
     */
    @Query("SELECT o FROM ScheduleOccurrence o WHERE o.schedule.id = :scheduleId " +
            "AND o.status = :status ORDER BY o.scheduledDate DESC")
    List<ScheduleOccurrence> findByScheduleIdAndStatus(
            @Param("scheduleId") Long scheduleId,
            @Param("status") OccurrenceStatus status
    );

    /**
     * Lấy occurrences gần đây (giới hạn số lượng)
     */
    @Query("SELECT o FROM ScheduleOccurrence o WHERE o.schedule.id = :scheduleId " +
            "ORDER BY o.scheduledDate DESC LIMIT :limit")
    List<ScheduleOccurrence> findRecentOccurrences(
            @Param("scheduleId") Long scheduleId,
            @Param("limit") int limit
    );

    /**
     * Lấy occurrences trong khoảng thời gian
     */
    @Query("SELECT o FROM ScheduleOccurrence o WHERE o.schedule.id = :scheduleId " +
            "AND o.scheduledDate BETWEEN :startDate AND :endDate " +
            "ORDER BY o.scheduledDate ASC")
    List<ScheduleOccurrence> findByScheduleIdAndDateRange(
            @Param("scheduleId") Long scheduleId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    /**
     * Lấy occurrences sắp tới (pending và trong tương lai)
     */
    @Query("SELECT o FROM ScheduleOccurrence o WHERE o.schedule.id = :scheduleId " +
            "AND o.status = :status " +
            "AND o.scheduledDate >= :fromDate " +
            "ORDER BY o.scheduledDate ASC LIMIT :limit")
    List<ScheduleOccurrence> findUpcomingOccurrences(
            @Param("scheduleId") Long scheduleId,
            @Param("status") OccurrenceStatus status,
            @Param("fromDate") LocalDate fromDate,
            @Param("limit") int limit
    );

    /**
     * Đếm occurrences theo status
     */
    @Query("SELECT COUNT(o) FROM ScheduleOccurrence o WHERE o.schedule.id = :scheduleId " +
            "AND o.status = :status")
    Long countByScheduleIdAndStatus(
            @Param("scheduleId") Long scheduleId,
            @Param("status") OccurrenceStatus status
    );

    /**
     * Kiểm tra xem đã có occurrence cho ngày này chưa
     */
    @Query("SELECT COUNT(o) > 0 FROM ScheduleOccurrence o WHERE o.schedule.id = :scheduleId " +
            "AND o.scheduledDate = :date")
    boolean existsByScheduleIdAndDate(
            @Param("scheduleId") Long scheduleId,
            @Param("date") LocalDate date
    );

    /**
     * Lấy occurrence cuối cùng được execute
     */
    @Query("SELECT o FROM ScheduleOccurrence o WHERE o.schedule.id = :scheduleId " +
            "AND o.status = :status " +
            "ORDER BY o.executedAt DESC LIMIT 1")
    Optional<ScheduleOccurrence> findLastExecutedOccurrence(
            @Param("scheduleId") Long scheduleId,
            @Param("status") OccurrenceStatus status
    );

    /**
     * Tìm pending occurrences đã quá hạn
     */
    @Query("SELECT o FROM ScheduleOccurrence o WHERE o.schedule.id = :scheduleId " +
            "AND o.status = :status " +
            "AND o.scheduledDate < :currentDate " +
            "ORDER BY o.scheduledDate ASC")
    List<ScheduleOccurrence> findOverdueOccurrences(
            @Param("scheduleId") Long scheduleId,
            @Param("status") OccurrenceStatus status,
            @Param("currentDate") LocalDate currentDate
    );

    /**
     * Xóa occurrences cũ (để cleanup)
     */
    @Query("DELETE FROM ScheduleOccurrence o WHERE o.schedule.id = :scheduleId " +
            "AND o.scheduledDate < :beforeDate " +
            "AND o.status IN (:statuses)")
    void deleteOldOccurrences(
            @Param("scheduleId") Long scheduleId,
            @Param("beforeDate") LocalDate beforeDate,
            @Param("statuses") List<OccurrenceStatus> statuses
    );

    /**
     * Tính tổng số tiền đã execute (cho transaction schedules)
     */
    @Query("SELECT COALESCE(SUM(s.templateAmount), 0.0) " +
            "FROM ScheduleOccurrence o JOIN o.schedule s " +
            "WHERE o.schedule.id = :scheduleId " +
            "AND o.status = :status " +
            "AND s.templateAmount IS NOT NULL")
    Double calculateTotalExecutedAmount(
            @Param("scheduleId") Long scheduleId,
            @Param("status") OccurrenceStatus status
    );
}
