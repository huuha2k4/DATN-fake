package com.finance.finance.modules.audit.sanitizer;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuditDataSanitizerTest {

    private final AuditDataSanitizer sanitizer = new AuditDataSanitizer(new ObjectMapper(), "test-audit-hmac-secret");

    @Test
    void stripsForbiddenSensitiveFieldsEvenInsideAllowlistCheck() {
        Map<String, Object> raw = new LinkedHashMap<>();
        raw.put("amount", 150000);
        raw.put("password", "Secret123!");
        raw.put("accessToken", "eyJhbGciOiJIUzI1NiJ9.abc");
        raw.put("refreshToken", "rt-123");
        raw.put("otp", "123456");
        raw.put("totpSecret", "JBSWY3DPEHPK3PXP");
        raw.put("receiptUrl", "https://minio/signed?sig=xyz");
        raw.put("base64", "data:image/png;base64,AAA");
        raw.put("cardNumber", "4111111111111111");
        raw.put("stackTrace", "java.lang.RuntimeException...");

        Map<String, Object> sanitized = sanitizer.sanitizeMap(raw, null);
        assertThat(sanitized).containsEntry("amount", 150000);
        assertThat(sanitized).doesNotContainKeys(
                "password", "accessToken", "refreshToken", "otp", "totpSecret",
                "receiptUrl", "base64", "cardNumber", "stackTrace"
        );
    }

    @Test
    void enforcesAllowlistWhenProvided() {
        Map<String, Object> raw = Map.of(
                "amount", 50000,
                "accountId", "acc-1",
                "unexpectedField", "should-drop"
        );
        Map<String, Object> sanitized = sanitizer.sanitizeMap(raw, Set.of("amount", "accountId"));
        assertThat(sanitized).containsExactlyInAnyOrderEntriesOf(Map.of("amount", 50000, "accountId", "acc-1"));
    }

    @Test
    void stripsCrlfToPreventLogInjection() {
        String cleaned = sanitizer.sanitizeString("hello\r\nFAKE_LOG_LINE\tinjected");
        assertThat(cleaned).doesNotContain("\r", "\n", "\t");
    }

    @Test
    void rejectsOversizedJsonPayload() {
        Map<String, Object> huge = new LinkedHashMap<>();
        for (int i = 0; i < 40; i++) {
            huge.put("k" + i, "x".repeat(300));
        }
        // Key cap keeps map <= 25 keys, test actual oversized single payload via nested maps or long values
        Map<String, Object> nested = new LinkedHashMap<>();
        for (int i = 0; i < 20; i++) {
            Map<String, Object> inner = new LinkedHashMap<>();
            for (int j = 0; j < 20; j++) {
                inner.put("f" + j, "a".repeat(250));
            }
            nested.put("n" + i, inner);
        }
        assertThatThrownBy(() -> sanitizer.sanitizeMap(nested, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("maximum allowed JSONB size");
    }

    @Test
    void hmacIdentifierIsDeterministicAndDoesNotContainRawEmail() {
        String h1 = sanitizer.hmacIdentifier("User@Example.com ");
        String h2 = sanitizer.hmacIdentifier("user@example.com");
        assertThat(h1).isEqualTo(h2);
        assertThat(h1).startsWith("hmac_");
        assertThat(h1).doesNotContain("user", "example.com");
    }

    @Test
    void computeChangedFieldsOnlyIncludesModifiedAllowlistedFields() {
        Map<String, Object> before = Map.of("amount", new BigDecimal("100.00"), "note", "old", "ignored", "a");
        Map<String, Object> after = Map.of("amount", new BigDecimal("100"), "note", "new", "ignored", "b");

        AuditDataSanitizer.DiffResult diff = sanitizer.computeChangedFields(before, after, Set.of("amount", "note"));
        assertThat(diff.changedFields()).containsExactly("note");
        assertThat(diff.oldValues()).containsExactlyEntriesOf(Map.of("note", "old"));
        assertThat(diff.newValues()).containsExactlyEntriesOf(Map.of("note", "new"));
    }
}
