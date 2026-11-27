package com.finance.finance.modules.admin.monitoring;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

public final class RequestObservation {
    static final ThreadLocal<RequestObservation> CURRENT = new ThreadLocal<>();
    static final Set<String> ERRORS = Set.of("AI_TIMEOUT", "AI_RATE_LIMITED", "AI_QUOTA_EXCEEDED",
            "AI_PROVIDER_UNAVAILABLE", "AI_INTERNAL_ERROR", "AI_TOOL_ERROR", "INVALID_REQUEST",
            "INVALID_IMAGE", "FILE_TOO_LARGE", "OCR_TIMEOUT", "OCR_SERVICE_UNAVAILABLE",
            "OCR_PROCESSING_ERROR", "OCR_REJECTED_IMAGE", "INTERNAL_ERROR");
    private static final Set<String> TYPES = Set.of("MESSAGE", "CLARIFICATION", "ACTION_REQUIRED", "MULTI_ACTION_REQUIRED");

    final String operation;
    final String requestId;
    final UUID actor;
    final Instant startedAt = Instant.now();
    final long start = System.nanoTime();
    String key;
    boolean entered;
    String error;
    String responseType;
    JsonNode provider;
    String engine;
    Long engineMs;
    Double confidence;
    Boolean needsReview;
    Boolean receiptSaved;

    RequestObservation(String operation, String requestId, UUID actor) {
        this.operation = operation;
        this.requestId = requestId;
        this.actor = actor;
        this.entered = !"FINAI_ASSISTANT".equals(operation);
    }

    public static void businessRequest(String key) {
        var current = CURRENT.get();
        if (current != null) {
            current.entered = true;
            if (key != null && key.matches("[A-Za-z0-9_-]{1,64}")) current.key = key;
        }
    }

    public static void error(String code) {
        var current = CURRENT.get();
        if (current != null && code != null && ERRORS.contains(code)
                && (current.error == null || "AI_TOOL_ERROR".equals(code))) current.error = code;
    }

    public static void responseType(String type) {
        var current = CURRENT.get();
        if (current != null && type != null && TYPES.contains(type)) current.responseType = type;
    }

    public static void provider(JsonNode summary) {
        var current = CURRENT.get();
        if (current != null) current.provider = summary;
    }

    public static boolean isActive() {
        return CURRENT.get() != null;
    }

    public static String requestId() {
        var current = CURRENT.get();
        return current == null ? null : current.requestId;
    }

    public static void ocrEngine(String engine, long started) {
        var sample = CURRENT.get();
        if (sample == null) return;
        sample.engineMs = elapsed(started);
        if ("paddle_ocr".equals(engine) || "gemini_vision".equals(engine)) sample.engine = engine;
    }

    public static void ocrResult(Number confidence, Boolean review, boolean saved) {
        var sample = CURRENT.get();
        if (sample == null) return;
        if (confidence != null) {
            double number = confidence.doubleValue();
            if (number >= 0 && number <= 1) sample.confidence = number;
        }
        sample.needsReview = review;
        sample.receiptSaved = saved;
    }

    static long elapsed(long start) {
        return Math.max(0, (System.nanoTime() - start) / 1_000_000);
    }
}
