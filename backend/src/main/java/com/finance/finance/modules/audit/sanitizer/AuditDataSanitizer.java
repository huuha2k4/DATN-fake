package com.finance.finance.modules.audit.sanitizer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Central sanitizer enforcing allowlists, sensitive-field stripping, CRLF injection protection,
 * JSONB depth/size limits, and HMAC pseudonymization for security correlation.
 */
@Component
public class AuditDataSanitizer {

    private static final int MAX_STRING_LEN = 255;
    private static final int MAX_CODE_LEN = 100;
    private static final int MAX_MAP_KEYS = 25;
    private static final int MAX_JSON_DEPTH = 3;
    private static final int MAX_JSON_BYTES = 8192;

    private static final Set<String> FORBIDDEN_KEYS = Set.of(
            "password", "passwordhash", "newpassword", "oldpassword", "confirmpassword",
            "token", "accesstoken", "refreshtoken", "jwt", "authorization", "cookie",
            "otp", "totp", "totpsecret", "secret", "recoverycode", "recoverycodes",
            "apikey", "internalSecret", "internalsecret", "hmacsecret", "encryptionkey",
            "receipturl", "imageurl", "signedurl", "base64", "rawtext", "ocrrawtext",
            "prompt", "systemprompt", "llmresponse", "chatcontent", "messagecontent",
            "cardnumber", "cvv", "pin", "rawbody", "requestbody", "responsebody", "stacktrace"
    );

    private final ObjectMapper objectMapper;
    private final byte[] hmacKeyBytes;

    public AuditDataSanitizer(
            ObjectMapper objectMapper,
            @Value("${app.audit.hmac-secret:${app.jwt.secret:dev-only-audit-hmac-secret-change-me}}") String hmacSecret) {
        this.objectMapper = objectMapper;
        this.hmacKeyBytes = hmacSecret.getBytes(StandardCharsets.UTF_8);
    }

    public String sanitizeCode(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        String cleaned = stripControlChars(code).trim();
        return cleaned.length() <= MAX_CODE_LEN ? cleaned : cleaned.substring(0, MAX_CODE_LEN);
    }

    public String sanitizeString(String value) {
        if (value == null) {
            return null;
        }
        String cleaned = stripControlChars(value).trim();
        return cleaned.length() <= MAX_STRING_LEN ? cleaned : cleaned.substring(0, MAX_STRING_LEN);
    }

    public String stripControlChars(String value) {
        if (value == null) {
            return null;
        }
        return value.replaceAll("[\\r\\n\\t\\p{Cntrl}]", " ");
    }

    /**
     * Keyed HMAC-SHA256 pseudonym for failed login identifiers (never stores raw email/username).
     */
    public String hmacIdentifier(String rawIdentifier) {
        if (rawIdentifier == null || rawIdentifier.isBlank()) {
            return null;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(hmacKeyBytes, "HmacSHA256"));
            byte[] digest = mac.doFinal(rawIdentifier.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(24);
            for (int i = 0; i < 12 && i < digest.length; i++) {
                hex.append(String.format("%02x", digest[i]));
            }
            return "hmac_" + hex;
        } catch (Exception ex) {
            return "hmac_unavailable";
        }
    }

    public Map<String, Object> sanitizeMap(Map<String, ?> input, Set<String> allowlistedKeys) {
        if (input == null || input.isEmpty()) {
            return null;
        }
        Map<String, Object> sanitized = sanitizeMapRecursive(input, allowlistedKeys, 1);
        if (sanitized == null || sanitized.isEmpty()) {
            return null;
        }
        try {
            byte[] bytes = objectMapper.writeValueAsBytes(sanitized);
            if (bytes.length > MAX_JSON_BYTES) {
                throw new IllegalArgumentException("Audit payload exceeds maximum allowed JSONB size of " + MAX_JSON_BYTES + " bytes");
            }
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Audit payload is not serializable", e);
        }
        return sanitized;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> sanitizeMapRecursive(Map<String, ?> input, Set<String> allowlistedKeys, int depth) {
        if (depth > MAX_JSON_DEPTH) {
            return Map.of("_truncated", "max_depth_exceeded");
        }
        Map<String, Object> out = new LinkedHashMap<>();
        int count = 0;
        for (Map.Entry<String, ?> entry : input.entrySet()) {
            if (count >= MAX_MAP_KEYS) {
                out.put("_truncated", "max_keys_exceeded");
                break;
            }
            String key = sanitizeCode(entry.getKey());
            if (key == null || isForbiddenKey(key)) {
                continue;
            }
            if (depth == 1 && allowlistedKeys != null && !allowlistedKeys.isEmpty() && !allowlistedKeys.contains(key)) {
                continue;
            }
            Object value = entry.getValue();
            if (value == null) {
                out.put(key, null);
            } else if (value instanceof Number || value instanceof Boolean) {
                out.put(key, value);
            } else if (value instanceof UUID || value instanceof Enum<?>) {
                out.put(key, value.toString());
            } else if (value instanceof String strVal) {
                out.put(key, sanitizeString(strVal));
            } else if (value instanceof Map<?, ?> nestedMap) {
                out.put(key, sanitizeMapRecursive((Map<String, ?>) nestedMap, null, depth + 1));
            } else if (value instanceof Collection<?> collection) {
                List<Object> list = new ArrayList<>();
                int items = 0;
                for (Object item : collection) {
                    if (items++ >= 20) break;
                    if (item == null || item instanceof Number || item instanceof Boolean) {
                        list.add(item);
                    } else {
                        list.add(sanitizeString(item.toString()));
                    }
                }
                out.put(key, list);
            } else {
                out.put(key, sanitizeString(value.toString()));
            }
            count++;
        }
        return out;
    }

    public boolean isForbiddenKey(String key) {
        String normalized = key.toLowerCase(Locale.ROOT).replaceAll("[_-]", "");
        if (FORBIDDEN_KEYS.contains(normalized)) {
            return true;
        }
        return normalized.contains("password")
                || normalized.contains("secret")
                || normalized.contains("token")
                || normalized.contains("otp")
                || normalized.contains("totp")
                || normalized.contains("cookie")
                || normalized.contains("base64")
                || normalized.contains("signedurl")
                || normalized.contains("cardnumber")
                || normalized.contains("stacktrace");
    }

    public DiffResult computeChangedFields(Map<String, Object> before, Map<String, Object> after, Set<String> allowlist) {
        Map<String, Object> oldChanged = new LinkedHashMap<>();
        Map<String, Object> newChanged = new LinkedHashMap<>();
        List<String> fields = new ArrayList<>();

        Set<String> keys = new LinkedHashSet<>();
        if (before != null) keys.addAll(before.keySet());
        if (after != null) keys.addAll(after.keySet());

        for (String key : keys) {
            if (isForbiddenKey(key)) continue;
            if (allowlist != null && !allowlist.isEmpty() && !allowlist.contains(key)) continue;
            Object oldVal = before != null ? before.get(key) : null;
            Object newVal = after != null ? after.get(key) : null;
            if (!Objects.equals(normalizeForCompare(oldVal), normalizeForCompare(newVal))) {
                fields.add(key);
                oldChanged.put(key, oldVal);
                newChanged.put(key, newVal);
            }
        }
        return new DiffResult(
                fields,
                sanitizeMap(oldChanged, allowlist),
                sanitizeMap(newChanged, allowlist)
        );
    }

    private Object normalizeForCompare(Object val) {
        if (val instanceof java.math.BigDecimal bd) {
            return bd.stripTrailingZeros();
        }
        return val;
    }

    public record DiffResult(List<String> changedFields, Map<String, Object> oldValues, Map<String, Object> newValues) {
    }
}
