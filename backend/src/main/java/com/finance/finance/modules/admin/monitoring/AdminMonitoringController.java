package com.finance.finance.modules.admin.monitoring;

import com.finance.finance.modules.admin.dto.request.AdminPaging;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedHashMap;

@RestController
@RequestMapping("/api/v1/admin/monitoring")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminMonitoringController {
    private final OperationMetricReader metrics;
    private final ServiceHealthMonitor health;

    @GetMapping("/{service}/summary")
    public ResponseEntity<?> summary(@PathVariable String service, @RequestParam LocalDate from, @RequestParam LocalDate to) {
        var data = metrics.summary(service, from, to);
        data.put("health", health.snapshot());
        return noStore(data);
    }

    @GetMapping("/{service}/requests")
    public ResponseEntity<?> requests(@PathVariable String service, @RequestParam LocalDate from, @RequestParam LocalDate to,
            @RequestParam(required = false) String search, @RequestParam(required = false) String outcome,
            @RequestParam(required = false) String operation, @RequestParam(required = false) String model,
            @RequestParam(required = false) String error,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "15") int size,
            @RequestParam(defaultValue = "newest") String sort) {
        return noStore(metrics.requests(service, from, to, search, outcome, operation, model, error,
                new AdminPaging(page, size, sort)));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard() {
        var data = new LinkedHashMap<String,Object>(metrics.dashboard());
        data.put("health", health.snapshot());
        return noStore(data);
    }

    private static ResponseEntity<?> noStore(Object value) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value);
    }
}
