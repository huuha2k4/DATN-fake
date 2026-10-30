package com.finance.finance.modules.group.repository;

import com.finance.finance.modules.group.entity.GroupFundContribution;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface GroupFundContributionRepository extends JpaRepository<GroupFundContribution, UUID> {
    List<GroupFundContribution> findByFundIdOrderByCreatedAtDesc(UUID fundId);
}
