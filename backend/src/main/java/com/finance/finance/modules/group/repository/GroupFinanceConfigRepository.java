package com.finance.finance.modules.group.repository;

import com.finance.finance.modules.group.entity.GroupFinanceConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface GroupFinanceConfigRepository extends JpaRepository<GroupFinanceConfig, UUID> {
}
