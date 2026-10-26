package com.finance.finance.modules.schedule.repository;

import com.finance.finance.common.enums.ScheduleStatus;
import com.finance.finance.common.enums.ScheduleType;
import com.finance.finance.modules.schedule.entity.Schedule;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository cho Schedule entity
 */
@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    /**
     * Tìm schedule theo ID và user ID (soft delete aware)
     */
    @Query("SELECT s FROM Schedule s WHERE s.id = :id AND s.user.id = :userId AND s.deletedAt IS NULL")
    Optional<Schedule> findByIdAndUserId(@Param("id") Long id, @Param("userId") UUID userId);

    /**
     * Lấy tất cả schedule của user (soft delete aware)
     */
    @Query("SELECT s FROM Schedule s WHERE s.user.id = :userId AND s.deletedAt IS NULL")
    Page<Schedule> findByUserId(@Param("userId") UUID userId, Pageable pageable);

    /**
     * Lấy schedule theo status
     */
    @Query("SELECT s FROM Schedule s WHERE s.user.id = :userId AND s.status = :status AND s.deletedAt IS NULL")
    Page<Schedule> findByUserIdAndStatus(
            @Param("userId") UUID userId,
            @Param("status") ScheduleStatus status,
            Pageable pageable
    );

    /**
     * Lấy schedule theo type
     */
    @Query("SELECT s FROM Schedule s WHERE s.user.id = :userId AND s.scheduleType = :scheduleType AND s.deletedAt IS NULL")
    Page<Schedule> findByUserIdAndScheduleType(
            @Param("userId") UUID userId,
            @Param("scheduleType") ScheduleType scheduleType,
            Pageable pageable
    );

    /**
     * Lọc theo status và type
     */
    @Query("SELECT s FROM Schedule s WHERE s.user.id = :userId " +
            "AND s.status = :status AND s.scheduleType = :scheduleType " +
            "AND s.deletedAt IS NULL")
    Page<Schedule> findByUserIdAndStatusAndScheduleType(
            @Param("userId") UUID userId,
            @Param("status") ScheduleStatus status,
            @Param("scheduleType") ScheduleType scheduleType,
            Pageable pageable
    );

    /**
     * Tìm kiếm theo tên
     */
    @Query("SELECT s FROM Schedule s WHERE s.user.id = :userId " +
            "AND LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "AND s.deletedAt IS NULL")
    Page<Schedule> searchByName(
            @Param("userId") UUID userId,
            @Param("search") String search,
            Pageable pageable
    );

    /**
     * Tìm kiếm kết hợp status và tên
     */
    @Query("SELECT s FROM Schedule s WHERE s.user.id = :userId " +
            "AND s.status = :status " +
            "AND LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "AND s.deletedAt IS NULL")
    Page<Schedule> searchByNameAndStatus(
            @Param("userId") UUID userId,
            @Param("status") ScheduleStatus status,
            @Param("search") String search,
            Pageable pageable
    );

    /**
     * Tìm schedule cần auto-execute hôm nay
     */
    @Query("SELECT s FROM Schedule s WHERE s.status = :status " +
            "AND s.autoExecute = true " +
            "AND s.nextOccurrenceDate = :date " +
            "AND s.deletedAt IS NULL")
    List<Schedule> findSchedulesToExecuteToday(
            @Param("status") ScheduleStatus status,
            @Param("date") LocalDate date
    );

    /**
     * Tìm schedule có notification trước ngày thực hiện
     */
    @Query("SELECT s FROM Schedule s WHERE s.status = :status " +
            "AND s.notificationEnabled = true " +
            "AND s.nextOccurrenceDate BETWEEN :startDate AND :endDate " +
            "AND s.deletedAt IS NULL")
    List<Schedule> findSchedulesForNotification(
            @Param("status") ScheduleStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    /**
     * Tìm schedule đã quá hạn end_date
     */
    @Query("SELECT s FROM Schedule s WHERE s.status = :status " +
            "AND s.endDate IS NOT NULL " +
            "AND s.endDate < :currentDate " +
            "AND s.deletedAt IS NULL")
    List<Schedule> findExpiredSchedules(
            @Param("status") ScheduleStatus status,
            @Param("currentDate") LocalDate currentDate
    );

    /**
     * Đếm schedule theo status
     */
    @Query("SELECT COUNT(s) FROM Schedule s WHERE s.user.id = :userId " +
            "AND s.status = :status AND s.deletedAt IS NULL")
    Long countByUserIdAndStatus(@Param("userId") UUID userId, @Param("status") ScheduleStatus status);

    /**
     * Đếm schedule theo type
     */
    @Query("SELECT COUNT(s) FROM Schedule s WHERE s.user.id = :userId " +
            "AND s.scheduleType = :scheduleType AND s.deletedAt IS NULL")
    Long countByUserIdAndScheduleType(
            @Param("userId") UUID userId,
            @Param("scheduleType") ScheduleType scheduleType
    );

    /**
     * Lấy schedule với occurrences (eager loading)
     */
    @Query("SELECT DISTINCT s FROM Schedule s " +
            "LEFT JOIN FETCH s.occurrences " +
            "WHERE s.id = :id AND s.user.id = :userId AND s.deletedAt IS NULL")
    Optional<Schedule> findByIdWithOccurrences(@Param("id") Long id, @Param("userId") UUID userId);

    /**
     * Kiểm tra xem user có schedule nào với tên này không
     */
    @Query("SELECT COUNT(s) > 0 FROM Schedule s WHERE s.user.id = :userId " +
            "AND LOWER(s.name) = LOWER(:name) AND s.deletedAt IS NULL")
    boolean existsByUserIdAndName(@Param("userId") UUID userId, @Param("name") String name);

    /**
     * Kiểm tra xem user có schedule nào với tên này (exclude một ID)
     */
    @Query("SELECT COUNT(s) > 0 FROM Schedule s WHERE s.user.id = :userId " +
            "AND s.id != :excludeId " +
            "AND LOWER(s.name) = LOWER(:name) AND s.deletedAt IS NULL")
    boolean existsByUserIdAndNameExcludingId(
            @Param("userId") UUID userId,
            @Param("name") String name,
            @Param("excludeId") Long excludeId
    );
}
