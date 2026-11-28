package com.finance.finance.modules.group.repository;

import com.finance.finance.common.enums.ContributionPeriodStatus;
import com.finance.finance.modules.group.entity.ContributionPeriod;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;

public interface ContributionPeriodRepository extends JpaRepository<ContributionPeriod, UUID> {
    Page<ContributionPeriod> findByGroupIdOrderByDueDateDesc(UUID groupId, Pageable pageable);
    Optional<ContributionPeriod> findFirstByGroupIdAndStatus(UUID groupId, ContributionPeriodStatus status);
    Optional<ContributionPeriod> findByIdAndGroupId(UUID id, UUID groupId);
    java.util.List<ContributionPeriod> findByStatusAndDueDateLessThanEqual(ContributionPeriodStatus status, java.time.LocalDate day);
    @Query("""
            select p from ContributionPeriod p where p.status = 'ACTIVE'
                and p.frequency <> 'ONCE' and p.dueDate < :today
            order by p.dueDate, p.id
            """)
    java.util.List<ContributionPeriod> findRecurringDue(@Param("today") java.time.LocalDate today);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from ContributionPeriod p where p.id = :id and p.groupId = :groupId")
    Optional<ContributionPeriod> findLockedByIdAndGroupId(@Param("id") UUID id, @Param("groupId") UUID groupId);
}
