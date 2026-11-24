package com.finance.finance.common.upload;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

@Component
public class AttachmentUrlSigner {

    private final byte[] secret;
    private final long ttlSeconds;

    public AttachmentUrlSigner(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.attachments.url-ttl-seconds:300}") long ttlSeconds) {
        if (secret == null || secret.length() < 32) {
            throw new IllegalArgumentException("Attachment signing secret must contain at least 32 characters");
        }
        if (ttlSeconds < 30 || ttlSeconds > 3600) {
            throw new IllegalArgumentException("Attachment URL TTL must be between 30 and 3600 seconds");
        }
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.ttlSeconds = ttlSeconds;
    }

    public String createUrl(UUID groupId, UUID attachmentId) {
        long expires = Instant.now().getEpochSecond() + ttlSeconds;
        String signature = sign(groupId, attachmentId, expires);
        return "/api/v1/groups/" + groupId + "/messages/attachments/" + attachmentId
                + "?expires=" + expires + "&signature=" + signature;
    }

    public boolean isValid(UUID groupId, UUID attachmentId, long expires, String signature) {
        if (signature == null || signature.isBlank() || expires < Instant.now().getEpochSecond()) {
            return false;
        }
        byte[] expected = sign(groupId, attachmentId, expires).getBytes(StandardCharsets.US_ASCII);
        byte[] actual = signature.getBytes(StandardCharsets.US_ASCII);
        return MessageDigest.isEqual(expected, actual);
    }

    private String sign(UUID groupId, UUID attachmentId, long expires) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            String payload = groupId + ":" + attachmentId + ":" + expires;
            return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Cannot sign attachment URL", e);
        }
    }
}
