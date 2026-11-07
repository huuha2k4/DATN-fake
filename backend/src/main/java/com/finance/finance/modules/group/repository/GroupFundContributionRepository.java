package com.finance.finance.modules.group.repository;

import com.finance.finance.modules.group.entity.GroupFundContribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface GroupFundContributionRepository extends JpaRepository<GroupFundContribution, UUID> {
    List<GroupFundContribution> findByFundIdOrderByCreatedAtDesc(UUID fundId);

    @Query("SELECT gfc FROM GroupFundContribution gfc " +
           "WHERE gfc.fundId = :fundId " +
           "AND gfc.contributedAt BETWEEN :startDate AND :endDate " +
           "ORDER BY gfc.contributedAt DESC")
    List<GroupFundContribution> findByFundIdAndDateRange(@Param("fundId") UUID fundId,
                                                         @Param("startDate") LocalDate startDate,
                                                         @Param("endDate") LocalDate endDate);
}
