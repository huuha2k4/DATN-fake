package com.finance.finance.modules.group.repository;

import com.finance.finance.modules.group.entity.MemberContributionObligation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MemberContributionObligationRepository extends JpaRepository<MemberContributionObligation, UUID> {
    List<MemberContributionObligation> findByPeriodIdOrderByCreatedAtAsc(UUID periodId);
    Optional<MemberContributionObligation> findByPeriodIdAndUserId(UUID periodId, UUID userId);
}
