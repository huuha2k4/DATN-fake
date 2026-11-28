package com.finance.finance.modules.group.repository;

import com.finance.finance.modules.group.entity.GroupFundContribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.math.BigDecimal;
import com.finance.finance.common.enums.ContributionStatus;

public interface GroupFundContributionRepository extends JpaRepository<GroupFundContribution, UUID> {
    List<GroupFundContribution> findByFundIdOrderByCreatedAtDesc(UUID fundId);

    @Query("SELECT gfc FROM GroupFundContribution gfc " +
           "WHERE gfc.fundId = :fundId " +
           "AND gfc.status = 'CONFIRMED' " +
           "AND gfc.contributedAt BETWEEN :startDate AND :endDate " +
           "ORDER BY gfc.contributedAt DESC")
    List<GroupFundContribution> findByFundIdAndDateRange(@Param("fundId") UUID fundId,
                                                         @Param("startDate") LocalDate startDate,
                                                         @Param("endDate") LocalDate endDate);

    @Query("SELECT gfc FROM GroupFundContribution gfc " +
           "WHERE gfc.fundId = :fundId " +
           "AND gfc.status = 'CONFIRMED' " +
           "AND gfc.contributedAt <= :endDate")
    List<GroupFundContribution> findByFundIdAndContributedAtBeforeOrEqual(@Param("fundId") UUID fundId,
                                                                         @Param("endDate") LocalDate endDate);

    java.util.Optional<GroupFundContribution> findByPersonalTransactionId(UUID personalTransactionId);

    List<GroupFundContribution> findByPeriodIdOrderByCreatedAtDesc(UUID periodId);

    List<GroupFundContribution> findByPeriodIdAndStatus(UUID periodId, ContributionStatus status);

    @Query("""
            select c.contributorUserId, c.status, sum(c.amount) from GroupFundContribution c
            where c.periodId = :periodId and c.status in ('CONFIRMED', 'PENDING')
            group by c.contributorUserId, c.status
            """)
    List<Object[]> totalsForPeriod(@Param("periodId") UUID periodId);

    @Query("SELECT COALESCE(SUM(c.amount), 0) FROM GroupFundContribution c " +
           "WHERE c.periodId = :periodId AND c.contributorUserId = :userId AND c.status = 'CONFIRMED'")
    BigDecimal sumConfirmedByPeriodAndUser(@Param("periodId") UUID periodId, @Param("userId") UUID userId);

    @Query("SELECT COALESCE(SUM(c.amount), 0) FROM GroupFundContribution c " +
           "WHERE c.periodId = :periodId AND c.contributorUserId = :userId AND c.status = 'PENDING'")
    BigDecimal sumPendingByPeriodAndUser(@Param("periodId") UUID periodId, @Param("userId") UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM GroupFundContribution c WHERE c.id = :id")
    java.util.Optional<GroupFundContribution> findByIdForUpdate(@Param("id") UUID id);
}
