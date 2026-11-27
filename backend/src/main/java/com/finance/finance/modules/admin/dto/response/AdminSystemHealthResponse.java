package com.finance.finance.modules.admin.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSystemHealthResponse {
    private String status;
    private com.finance.finance.modules.admin.monitoring.ServiceHealthMonitor.Snapshot serviceHealth;
    private java.util.List<GcInfo> garbageCollectors;
    public record GcInfo(String name, Long collections, Long timeMs) {}
    public record HourlyTrafficPoint(String hourLabel, long requests, long failed, Double avgLatencyMs) {}
    public record PerformanceSample(String timeLabel, Double cpuPercent, Double ramPercent, Double latencyMs) {}
    public record TrafficSummary(long totalRequests, long failedRequests, Double errorRatePercent, Double avgLatencyMs) {}
    public record SystemEventItem(String severity, String message, String timestamp) {}

    private long uptimeSeconds;
    private String startTime;
    private java.util.List<HourlyTrafficPoint> hourlyTraffic;
    private java.util.List<PerformanceSample> performanceHistory;
    private TrafficSummary traffic24h;
    private Map<String, Double> serviceErrorRates24h;
    private java.util.List<SystemEventItem> recentEvents;

    // JVM & Bộ nhớ máy chủ thật từ ManagementFactory
    private MemoryInfo memory;

    // CPU & Luồng xử lý (Threads) thật
    private CpuInfo cpu;

    // Cơ sở dữ liệu PostgreSQL thật
    private DatabaseHealthInfo database;

    // Hệ thống file & Đĩa cứng thật
    private DiskInfo disk;

    // Thông tin môi trường Runtime
    private Map<String, String> runtime;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MemoryInfo {
        private long heapUsedMB;
        private Long heapMaxMB;
        private long heapCommittedMB;
        private Double heapUsagePercent;
        private long nonHeapUsedMB;
        private Long systemTotalMB;
        private Long systemUsedMB;
        private Double systemUsagePercent;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CpuInfo {
        private int availableProcessors;
        private Double systemLoadAverage;
        private Double processCpuPercent;
        private Double systemCpuPercent;
        private int activeThreadCount;
        private int peakThreadCount;
        private long totalLoadedClasses;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DatabaseHealthInfo {
        private String status;        // CONNECTED, ERROR
        private String databaseProductName;
        private String databaseProductVersion;
        private Long pingTimeMs;
        private Integer activeConnections;
        private Integer idleConnections;
        private Integer pendingConnections;
        private Integer maxPoolSize;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DiskInfo {
        private long totalSpaceGB;
        private long freeSpaceGB;
        private long usableSpaceGB;
        private Double diskUsagePercent;
    }
}

