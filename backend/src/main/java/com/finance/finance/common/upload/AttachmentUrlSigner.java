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

    public String createReceiptUrl(String storedReceiptUrl, UUID ownerUserId) {
        if (storedReceiptUrl == null || storedReceiptUrl.isBlank() || ownerUserId == null) {
            return storedReceiptUrl;
        }
        if (storedReceiptUrl.startsWith("http://") || storedReceiptUrl.startsWith("https://")) {
            return storedReceiptUrl;
        }
        String canonical = stripQuery(storedReceiptUrl);
        int idx = canonical.lastIndexOf('/');
        String filename = idx >= 0 ? canonical.substring(idx + 1) : canonical;
        if (filename.isBlank()) {
            return storedReceiptUrl;
        }
        long expires = Instant.now().getEpochSecond() + ttlSeconds;
        String signature = signPayload("receipt:" + filename + ":" + ownerUserId + ":" + expires);
        return "/uploads/receipts/" + filename
                + "?uid=" + ownerUserId
                + "&expires=" + expires
                + "&signature=" + signature;
    }

    public boolean isValidReceipt(String filename, UUID ownerUserId, long expires, String signature) {
        if (filename == null || filename.isBlank() || ownerUserId == null
                || signature == null || signature.isBlank()
                || expires < Instant.now().getEpochSecond()) {
            return false;
        }
        byte[] expected = signPayload("receipt:" + filename + ":" + ownerUserId + ":" + expires)
                .getBytes(StandardCharsets.US_ASCII);
        byte[] actual = signature.getBytes(StandardCharsets.US_ASCII);
        return MessageDigest.isEqual(expected, actual);
    }

    public static String stripQuery(String url) {
        if (url == null) return null;
        int q = url.indexOf('?');
        return q >= 0 ? url.substring(0, q) : url;
    }

    private String sign(UUID groupId, UUID attachmentId, long expires) {
        return signPayload(groupId + ":" + attachmentId + ":" + expires);
    }

    private String signPayload(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Cannot sign attachment URL", e);
        }
    }
}
