package com.finance.finance.modules.admin.monitoring;

import com.finance.finance.modules.admin.dto.response.AdminSystemHealthResponse.PerformanceSample;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedDeque;

@Component
@RequiredArgsConstructor
public class SystemMetricsSampler {

    private static final int MAX_SAMPLES = 288;
    private static final ZoneId ZONE_VN = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private final ServiceHealthMonitor serviceHealthMonitor;
    private final Deque<PerformanceSample> samples = new ConcurrentLinkedDeque<>();

    @PostConstruct
    public void init() {
        recordSample();
    }

    @Scheduled(fixedRate = 60_000)
    public void recordSample() {
        var osBean = ManagementFactory.getOperatingSystemMXBean();
        MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();

        Double cpuPercent = null;
        Double ramPercent = null;
        if (osBean instanceof com.sun.management.OperatingSystemMXBean sunOs) {
            double sysCpu = sunOs.getCpuLoad();
            if (sysCpu < 0) {
                sysCpu = sunOs.getProcessCpuLoad();
            }
            if (sysCpu >= 0) {
                cpuPercent = Math.round(sysCpu * 1000.0) / 10.0;
            }
            long totalMem = sunOs.getTotalMemorySize();
            long freeMem = sunOs.getFreeMemorySize();
            if (totalMem > 0) {
                ramPercent = Math.round((double) (totalMem - freeMem) / totalMem * 1000.0) / 10.0;
            }
        }
        if (ramPercent == null && memoryBean.getHeapMemoryUsage().getMax() > 0) {
            ramPercent = Math.round((double) memoryBean.getHeapMemoryUsage().getUsed()
                    / memoryBean.getHeapMemoryUsage().getMax() * 1000.0) / 10.0;
        }

        Double avgLatency = null;
        try {
            var snap = serviceHealthMonitor.snapshot();
            var latencies = snap.services().stream()
                    .map(ServiceHealthMonitor.ServiceResult::latencyMs)
                    .filter(l -> l != null && l >= 0)
                    .mapToLong(Long::longValue)
                    .toArray();
            if (latencies.length > 0) {
                double sum = 0;
                for (long l : latencies) sum += l;
                avgLatency = Math.round((sum / latencies.length) * 10.0) / 10.0;
            }
        } catch (Exception ignored) {}

        String label = Instant.now().atZone(ZONE_VN).format(TIME_FMT);
        samples.addLast(new PerformanceSample(label, cpuPercent, ramPercent, avgLatency));
        while (samples.size() > MAX_SAMPLES) {
            samples.pollFirst();
        }
    }

    public List<PerformanceSample> history() {
        return new ArrayList<>(samples);
    }
}
