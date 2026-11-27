package com.finance.finance.modules.admin.monitoring;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.time.Instant;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class ServiceHealthMonitorTest {
    @Test
    void parallelProbesShareCacheAndExposeStaleSnapshotWhileRefreshing() throws Exception {
        var server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        var finAiHits = new AtomicInteger();
        var refreshGate = new CountDownLatch(1);
        var attempts = new CountDownLatch(2);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            server.setExecutor(executor);
            server.createContext("/internal-health", exchange -> {
                int count = finAiHits.incrementAndGet();
                attempts.countDown();
                try {
                    if (count > 1) refreshGate.await(3, TimeUnit.SECONDS);
                    exchange.sendResponseHeaders(200, -1);
                } catch (InterruptedException error) {
                    Thread.currentThread().interrupt();
                } finally {
                    exchange.close();
                }
            });
            server.createContext("/health", exchange -> {
                try {
                    Thread.sleep(2500);
                    exchange.sendResponseHeaders(200, -1);
                } catch (InterruptedException error) {
                    Thread.currentThread().interrupt();
                } finally {
                    exchange.close();
                }
            });
            server.start();
            String base = "http://127.0.0.1:" + server.getAddress().getPort();
            var env = new MockEnvironment().withProperty("app.monitoring.finai-url", base)
                    .withProperty("app.monitoring.ocr-enabled", "false")
                    .withProperty("app.monitoring.nginx-url", base).withProperty("app.monitoring.frontend-url", "bad-config")
                    .withProperty("spring.data.redis.host", "127.0.0.1")
                    .withProperty("spring.data.redis.port", Integer.toString(server.getAddress().getPort()));
            var monitor = new ServiceHealthMonitor(env);
            try {
                long started = System.nanoTime();
                var one = executor.submit(monitor::snapshot);
                var two = executor.submit(monitor::snapshot);
                var snapshot = one.get(4, TimeUnit.SECONDS);
                assertThat(two.get(4, TimeUnit.SECONDS).checkedAt()).isEqualTo(snapshot.checkedAt());
                System.out.printf("PHASE3_HEALTH missMs=%.2f%n", (System.nanoTime() - started) / 1_000_000.0);
                assertThat(snapshot.status()).isEqualTo("DEGRADED");
                assertThat(snapshot.services()).hasSize(7);
                assertThat(status(snapshot, "FINAI")).isEqualTo("UP");
                assertThat(status(snapshot, "REDIS")).isEqualTo("DOWN");
                assertThat(status(snapshot, "OCR")).isEqualTo("DISABLED");
                assertThat(status(snapshot, "FRONTEND")).isEqualTo("NOT_CONFIGURED");
                assertThat(status(snapshot, "POSTGRESQL")).isEqualTo("NOT_CONFIGURED");
                assertThat(snapshot.services().stream().filter(s -> s.name().equals("NGINX"))
                        .findFirst().orElseThrow().errorCode()).isEqualTo("PROBE_TIMEOUT");
                assertThat(finAiHits).hasValue(1);
                started = System.nanoTime();
                assertThat(monitor.snapshot().cacheHit()).isTrue();
                System.out.printf("PHASE3_HEALTH hitMs=%.3f%n", (System.nanoTime() - started) / 1_000_000.0);
                ReflectionTestUtils.setField(monitor, "cache", new ServiceHealthMonitor.Snapshot(
                        snapshot.status(), Instant.now().minusSeconds(21), false, false, snapshot.services()));
                assertThat(monitor.snapshot().stale()).isTrue();
                assertThat(monitor.snapshot().stale()).isTrue();
                assertThat(attempts.await(2, TimeUnit.SECONDS)).isTrue();
                assertThat(finAiHits).hasValue(2);
            } finally {
                refreshGate.countDown();
                monitor.shutdown();
                server.stop(0);
            }
        }
    }

    private static String status(ServiceHealthMonitor.Snapshot snapshot, String name) {
        return snapshot.services().stream().filter(service -> service.name().equals(name)).findFirst().orElseThrow().status();
    }
}
