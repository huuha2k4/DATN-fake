package com.finance.finance.modules.admin.repository;

import com.finance.finance.modules.admin.entity.SystemSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SystemSettingRepository extends JpaRepository<SystemSetting, String> {
    List<SystemSetting> findByGroupOrderByKeyAsc(String group);
}

