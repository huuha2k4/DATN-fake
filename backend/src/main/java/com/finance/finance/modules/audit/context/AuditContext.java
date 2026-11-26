package com.finance.finance.modules.audit.context;

import com.finance.finance.modules.audit.model.AuditActorType;
import com.finance.finance.modules.audit.model.AuditSource;
import lombok.Builder;
import lombok.Value;

import java.util.UUID;

@Value
@Builder(toBuilder = true)
public class AuditContext {
    String requestId;
    String correlationId;
    UUID actorId;
    AuditActorType actorType;
    String actorRole;
    AuditSource source;
    String ipAddress;
    String userAgent;
    String httpMethod;
    String endpoint;
}
