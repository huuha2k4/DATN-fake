package com.finance.finance.modules.group.repository;

import com.finance.finance.modules.group.entity.GroupFund;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;

public interface GroupFundRepository extends JpaRepository<GroupFund, UUID> {
    boolean existsByIdAndGroupId(UUID id, UUID groupId);
    Optional<GroupFund> findByGroupId(UUID groupId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select f from GroupFund f where f.groupId = :groupId")
    Optional<GroupFund> findByGroupIdForUpdate(@Param("groupId") UUID groupId);
}
