package com.finance.finance.modules.finai.repository;
import com.finance.finance.modules.finai.entity.FinAiActionAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface FinAiActionAuditRepository extends JpaRepository<FinAiActionAuditLog, UUID> {}

