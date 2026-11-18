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
    // Trạng thái tổng thể
    private String status;           // UP, DEGRADED, DOWN
    private long uptimeSeconds;
    private String startTime;

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
        private long heapMaxMB;
        private long heapCommittedMB;
        private double heapUsagePercent;
        private long nonHeapUsedMB;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CpuInfo {
        private int availableProcessors;
        private double systemCpuLoad;
        private double processCpuLoad;
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
        private long pingTimeMs;
        private int activeConnections;
        private int maxPoolSize;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DiskInfo {
        private long totalSpaceGB;
        private long freeSpaceGB;
        private long usableSpaceGB;
        private double diskUsagePercent;
    }
}

