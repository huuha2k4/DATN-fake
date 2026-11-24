package com.finance.finance.common.upload;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;

@Component
public class FileUploadValidator {

    public enum Policy {
        AVATAR(5L * 1024 * 1024, Set.of("image/jpeg", "image/png", "image/gif", "image/webp")),
        RECEIPT(10L * 1024 * 1024, Set.of("image/jpeg", "image/png", "image/webp")),
        GROUP_IMAGE(10L * 1024 * 1024, Set.of("image/jpeg", "image/png", "image/gif", "image/webp"));

        private final long maxBytes;
        private final Set<String> allowedContentTypes;

        Policy(long maxBytes, Set<String> allowedContentTypes) {
            this.maxBytes = maxBytes;
            this.allowedContentTypes = allowedContentTypes;
        }
    }

    public ValidatedUpload validate(MultipartFile file, Policy policy) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File must not be empty");
        }
        if (file.getSize() > policy.maxBytes) {
            throw new IllegalArgumentException("File exceeds the " + (policy.maxBytes / 1024 / 1024) + "MB limit");
        }

        String detectedType = detectContentType(file);
        if (!policy.allowedContentTypes.contains(detectedType)) {
            throw new IllegalArgumentException("File content type is not allowed");
        }

        String declaredType = normalizeContentType(file.getContentType());
        if (declaredType == null || !declaredType.equals(detectedType)) {
            throw new IllegalArgumentException("Declared file type does not match file content");
        }

        return new ValidatedUpload(detectedType, extensionFor(detectedType));
    }

    private String detectContentType(MultipartFile file) throws IOException {
        byte[] header = new byte[12];
        int read;
        try (InputStream input = file.getInputStream()) {
            read = input.read(header);
        }
        if (read >= 3 && unsigned(header[0]) == 0xFF && unsigned(header[1]) == 0xD8 && unsigned(header[2]) == 0xFF) {
            return "image/jpeg";
        }
        if (read >= 8 && Arrays.equals(Arrays.copyOf(header, 8),
                new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A})) {
            return "image/png";
        }
        if (read >= 6) {
            String gif = new String(header, 0, 6, java.nio.charset.StandardCharsets.US_ASCII);
            if ("GIF87a".equals(gif) || "GIF89a".equals(gif)) {
                return "image/gif";
            }
        }
        if (read >= 12
                && asciiEquals(header, 0, "RIFF")
                && asciiEquals(header, 8, "WEBP")) {
            return "image/webp";
        }
        return "application/octet-stream";
    }

    private boolean asciiEquals(byte[] bytes, int offset, String expected) {
        byte[] value = expected.getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        if (bytes.length < offset + value.length) return false;
        for (int i = 0; i < value.length; i++) {
            if (bytes[offset + i] != value[i]) return false;
        }
        return true;
    }

    private int unsigned(byte value) {
        return value & 0xFF;
    }

    private String normalizeContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) return null;
        String normalized = contentType.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
        return "image/jpg".equals(normalized) ? "image/jpeg" : normalized;
    }

    private String extensionFor(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            default -> throw new IllegalArgumentException("Unsupported file content type");
        };
    }

    public record ValidatedUpload(String contentType, String extension) {
    }
}
