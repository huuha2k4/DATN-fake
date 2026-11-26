package com.finance.finance.modules.admin.controller;

import com.finance.finance.modules.audit.dto.SystemAuditViewItem;
import com.finance.finance.modules.audit.model.AuditCategory;
import com.finance.finance.modules.audit.model.AuditOutcome;
import com.finance.finance.modules.audit.model.AuditSeverity;
import com.finance.finance.modules.audit.service.SystemAuditViewerService;
import com.finance.finance.modules.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/system-audit")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class SystemAuditAdminController {

    public static final String HEADER_UNLOCK_TOKEN = "X-System-Audit-Token";

    private final SystemAuditViewerService viewerService;

    @PostMapping("/unlock")
    public ResponseEntity<SystemAuditViewerService.UnlockResult> unlock(
            Authentication authentication,
            @RequestBody Map<String, String> body) {
        UUID adminId = extractAdminId(authentication);
        String password = body != null ? body.get("password") : null;
        return ResponseEntity.ok(viewerService.unlock(adminId, password));
    }

    @GetMapping("/logs")
    public ResponseEntity<Page<SystemAuditViewItem>> listLogs(
            Authentication authentication,
            @RequestHeader(value = HEADER_UNLOCK_TOKEN, required = false) String unlockToken,
            @RequestParam(value = "category", required = false) AuditCategory category,
            @RequestParam(value = "outcome", required = false) AuditOutcome outcome,
            @RequestParam(value = "severity", required = false) AuditSeverity severity,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        UUID adminId = extractAdminId(authentication);
        return ResponseEntity.ok(viewerService.listLogs(adminId, unlockToken, category, outcome, severity, search, page, size));
    }

    private UUID extractAdminId(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof User user) {
            return user.getId();
        }
        return null;
    }
}
