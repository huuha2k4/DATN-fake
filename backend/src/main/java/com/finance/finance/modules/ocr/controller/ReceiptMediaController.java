package com.finance.finance.modules.ocr.controller;

import com.finance.finance.common.upload.AttachmentUrlSigner;
import com.finance.finance.modules.ocr.repository.ReceiptRepository;
import com.finance.finance.modules.transaction.repository.TransactionRepository;
import com.finance.finance.modules.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * Serves private receipt and transaction attachment images under /uploads/receipts/**
 * with strict ownership or HMAC-signed URL verification, replacing static ResourceHandler access.
 */
@RestController
@RequiredArgsConstructor
public class ReceiptMediaController {

    private static final Path RECEIPT_ROOT = Paths.get("uploads", "receipts").toAbsolutePath().normalize();

    private final AttachmentUrlSigner attachmentUrlSigner;
    private final TransactionRepository transactionRepository;
    private final ReceiptRepository receiptRepository;

    @GetMapping("/uploads/receipts/{filename:.+}")
    public ResponseEntity<Resource> getReceiptMedia(
            @PathVariable String filename,
            @RequestParam(required = false) UUID uid,
            @RequestParam(required = false) Long expires,
            @RequestParam(required = false) String signature,
            @AuthenticationPrincipal User currentUser) throws IOException {

        if (filename == null || filename.isBlank()
                || filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            return ResponseEntity.badRequest().build();
        }

        String canonicalPath = "/uploads/receipts/" + filename;

        if (uid != null || expires != null || signature != null) {
            if (uid == null || expires == null || signature == null
                    || !attachmentUrlSigner.isValidReceipt(filename, uid, expires, signature)
                    || !isOwner(canonicalPath, uid)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        } else if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } else if (!isOwner(canonicalPath, currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        Path resolved = RECEIPT_ROOT.resolve(filename).normalize();
        if (!resolved.startsWith(RECEIPT_ROOT) || !Files.exists(resolved) || !Files.isRegularFile(resolved)) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new UrlResource(resolved.toUri());
        MediaType mediaType = MediaTypeFactory.getMediaType(filename)
                .orElse(MediaType.APPLICATION_OCTET_STREAM);

        return ResponseEntity.ok()
                .contentType(mediaType)
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.PRAGMA, "no-cache")
                .header("X-Content-Type-Options", "nosniff")
                .body(resource);
    }

    private boolean isOwner(String canonicalPath, UUID userId) {
        return transactionRepository.existsByReceiptUrlAndUserIdAndDeletedAtIsNull(canonicalPath, userId)
                || receiptRepository.existsByImageUrlAndUserId(canonicalPath, userId);
    }
}
