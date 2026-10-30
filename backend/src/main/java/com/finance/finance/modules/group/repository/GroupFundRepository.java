package com.finance.finance.modules.group.repository;

import com.finance.finance.modules.group.entity.GroupFund;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface GroupFundRepository extends JpaRepository<GroupFund, UUID> {
    Optional<GroupFund> findByGroupId(UUID groupId);
}
