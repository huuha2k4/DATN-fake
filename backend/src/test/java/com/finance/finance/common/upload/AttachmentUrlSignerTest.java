package com.finance.finance.common.upload;

import org.junit.jupiter.api.Test;

import java.net.URI;
import java.time.Instant;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AttachmentUrlSignerTest {

    @Test
    void acceptsUntamperedShortLivedUrlAndRejectsAnotherGroup() {
        AttachmentUrlSigner signer = new AttachmentUrlSigner("test-secret-with-at-least-32-characters", 300);
        UUID groupId = UUID.randomUUID();
        UUID attachmentId = UUID.randomUUID();
        Map<String, String> query = query(signer.createUrl(groupId, attachmentId));
        long expires = Long.parseLong(query.get("expires"));

        assertTrue(signer.isValid(groupId, attachmentId, expires, query.get("signature")));
        assertFalse(signer.isValid(UUID.randomUUID(), attachmentId, expires, query.get("signature")));
    }

    @Test
    void rejectsExpiredUrl() {
        AttachmentUrlSigner signer = new AttachmentUrlSigner("test-secret-with-at-least-32-characters", 300);
        UUID groupId = UUID.randomUUID();
        UUID attachmentId = UUID.randomUUID();

        assertFalse(signer.isValid(groupId, attachmentId,
                Instant.now().minusSeconds(1).getEpochSecond(), "irrelevant"));
    }

    private Map<String, String> query(String url) {
        return Arrays.stream(URI.create(url).getQuery().split("&"))
                .map(item -> item.split("=", 2))
                .collect(Collectors.toMap(item -> item[0], item -> item[1]));
    }
}
