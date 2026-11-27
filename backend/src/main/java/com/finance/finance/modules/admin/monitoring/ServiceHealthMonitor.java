package com.finance.finance.modules.admin.monitoring;

import jakarta.annotation.PreDestroy;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import java.io.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.sql.DriverManager;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

@Service
public class ServiceHealthMonitor {
    private static final Duration TTL = Duration.ofSeconds(20);
    private static final Duration TIMEOUT = Duration.ofSeconds(2);
    private final Environment env;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(TIMEOUT)
            .followRedirects(HttpClient.Redirect.NEVER).build();
    private final ExecutorService probes = new ThreadPoolExecutor(6, 6, 0, TimeUnit.SECONDS,
            new ArrayBlockingQueue<>(8), Thread.ofPlatform().daemon().name("service-health-", 0).factory());
    private final Map<String, Instant> lastSuccess = new ConcurrentHashMap<>();
    private volatile Snapshot cache;
    private CompletableFuture<Snapshot> refresh;

    public ServiceHealthMonitor(Environment env) {
        this.env = env;
    }

    public Snapshot snapshot() {
        var current = cache;
        if (current != null && current.checkedAt().plus(TTL).isAfter(Instant.now())) {
            return new Snapshot(current.status(), current.checkedAt(), false, true, current.services());
        }
        var pending = refreshOnce();
        if (current != null && !pending.isDone()) {
            return new Snapshot(current.status(), current.checkedAt(), true, true, current.services());
        }
        return pending.join();
    }

    private synchronized CompletableFuture<Snapshot> refreshOnce() {
        if (cache != null && cache.checkedAt().plus(TTL).isAfter(Instant.now())) {
            return CompletableFuture.completedFuture(cache);
        }
        if (refresh != null && !refresh.isDone()) return refresh;
        var checks = List.of(
                CompletableFuture.completedFuture(result("BACKEND","UP",null,null,"JVM phục vụ API")),
                queue("POSTGRESQL", "Kết nối JDBC riêng và SELECT 1", this::postgres),
                queue("REDIS", "RESP PING", this::redis),
                http("FINAI","/internal-health","Tiến trình HTTP. Gemini được theo dõi qua yêu cầu thực"),
                http("OCR","/internal-health","OCR pipeline đã được khởi tạo"),
                http("NGINX","/health","Phản hồi HTTP của reverse proxy"),
                http("FRONTEND","/health","Phản hồi HTTP của frontend"));
        refresh = CompletableFuture.allOf(checks.toArray(CompletableFuture[]::new)).thenApply(ignored -> {
            var results = checks.stream().map(CompletableFuture::join).toList();
            String status = results.stream().anyMatch(s -> "DOWN".equals(s.status()) || "DEGRADED".equals(s.status()))
                    ? "DEGRADED" : results.stream().anyMatch(s -> "UNKNOWN".equals(s.status())) ? "UNKNOWN" : "UP";
            var next = new Snapshot(status, Instant.now(), false, false, results);
            cache = next;
            return next;
        });
        return refresh;
    }

    private CompletableFuture<ServiceResult> http(String service, String path, String scope) {
        return queue(service, scope, () -> {
            String base = env.getProperty("app.monitoring." + service.toLowerCase(Locale.ROOT) + "-url", "");
            if (base.isBlank()) return "NOT_CONFIGURED";
            URI origin;
            try {
                origin = URI.create(base);
            } catch (IllegalArgumentException invalid) {
                return "NOT_CONFIGURED";
            }
            if (!("http".equals(origin.getScheme()) || "https".equals(origin.getScheme())) || origin.getHost() == null
                    || origin.getUserInfo() != null || origin.getQuery() != null || origin.getFragment() != null
                    || !(origin.getPath().isEmpty() || "/".equals(origin.getPath()))) {
                return "NOT_CONFIGURED";
            }
            var request = HttpRequest.newBuilder(origin.resolve(path)).timeout(TIMEOUT).GET().build();
            int status = http.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
            if (status == 200 || status == 204) return "UP";
            if (service.equals("OCR") && status == 503) return "DEGRADED";
            return "DOWN";
        });
    }

    private CompletableFuture<ServiceResult> queue(String service, String scope, Probe probe) {
        if ("false".equalsIgnoreCase(env.getProperty("app.monitoring." + service.toLowerCase(Locale.ROOT)
                + "-enabled", "true"))) {
            return CompletableFuture.completedFuture(result(service, "DISABLED", null, null, scope));
        }
        try {
            return CompletableFuture.supplyAsync(() -> {
                long started = System.nanoTime();
                try {
                    String status = probe.check();
                    return result(service, status, status.equals("NOT_CONFIGURED") ? null : RequestObservation.elapsed(started),
                            status.equals("DOWN") || status.equals("DEGRADED") ? "PROBE_UNHEALTHY" : null, scope);
                } catch (HttpTimeoutException | SocketTimeoutException error) {
                    return result(service, "DOWN", RequestObservation.elapsed(started), "PROBE_TIMEOUT", scope);
                } catch (Exception error) {
                    return result(service, "DOWN", RequestObservation.elapsed(started), "PROBE_UNAVAILABLE", scope);
                }
            }, probes).completeOnTimeout(new ServiceResult(service, "DOWN", TIMEOUT.toMillis(),
                            Instant.now(), lastSuccess.get(service), "PROBE_TIMEOUT", scope), 2300, TimeUnit.MILLISECONDS);
        } catch (RejectedExecutionException unavailable) {
            return CompletableFuture.completedFuture(result(service, "UNKNOWN", null, "PROBE_BUSY", scope));
        }
    }

    private ServiceResult result(String service, String status, Long latency, String error, String scope) {
        Instant now = Instant.now();
        if ("UP".equals(status)) lastSuccess.put(service, now);
        return new ServiceResult(service, status, latency, now, lastSuccess.get(service), error, scope);
    }

    private String postgres() throws Exception {
        String url = env.getProperty("spring.datasource.url", "");
        if (url.isBlank()) return "NOT_CONFIGURED";
        var props = new Properties();
        props.setProperty("user", env.getProperty("spring.datasource.username", ""));
        props.setProperty("password", env.getProperty("spring.datasource.password", ""));
        props.setProperty("connectTimeout", "2");
        props.setProperty("socketTimeout", "2");
        try (var connection = DriverManager.getConnection(url, props); var statement = connection.createStatement()) {
            statement.setQueryTimeout(2);
            try (var rows = statement.executeQuery("SELECT 1")) {
                return rows.next() && rows.getInt(1) == 1 ? "UP" : "DOWN";
            }
        }
    }

    private String redis() throws Exception {
        String host = env.getProperty("spring.data.redis.host", "");
        if (host.isBlank()) return "NOT_CONFIGURED";
        int port = env.getProperty("spring.data.redis.port", Integer.class, 6379);
        String password = env.getProperty("spring.data.redis.password", "");
        try (var socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), 1500);
            socket.setSoTimeout(1500);
            var in = socket.getInputStream();
            var out = socket.getOutputStream();
            if (!password.isEmpty()) {
                redisCommand(out, "AUTH", password);
                if (!"+OK".equals(redisLine(in))) return "DOWN";
            }
            redisCommand(out, "PING");
            return "+PONG".equals(redisLine(in)) ? "UP" : "DOWN";
        }
    }

    private static void redisCommand(OutputStream out, String... arguments) throws IOException {
        out.write(("*" + arguments.length + "\r\n").getBytes(StandardCharsets.US_ASCII));
        for (String arg : arguments) {
            byte[] data = arg.getBytes(StandardCharsets.UTF_8);
            out.write(("$" + data.length + "\r\n").getBytes(StandardCharsets.US_ASCII));
            out.write(data);
            out.write(new byte[]{13, 10});
        }
        out.flush();
    }

    private static String redisLine(InputStream in) throws IOException {
        var bytes = new ByteArrayOutputStream();
        while (bytes.size() < 128) {
            int next = in.read();
            if (next < 0 || next == 10) break;
            if (next != 13) bytes.write(next);
        }
        return bytes.toString(StandardCharsets.US_ASCII);
    }

    @PreDestroy
    void shutdown() {
        probes.shutdownNow();
        http.shutdownNow();
    }

    @FunctionalInterface
    private interface Probe {
        String check() throws Exception;
    }

    public record ServiceResult(String name, String status, Long latencyMs, Instant checkedAt,
                                Instant lastSuccessAt, String errorCode, String scope) {}
    public record Snapshot(String status, Instant checkedAt, boolean stale, boolean cacheHit, List<ServiceResult> services) {}
}
