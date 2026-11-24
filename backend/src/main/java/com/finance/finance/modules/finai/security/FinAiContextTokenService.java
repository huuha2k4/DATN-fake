package com.finance.finance.modules.finai.security;

import com.finance.finance.common.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@Service
public class FinAiContextTokenService {
    private final byte[] secret;
    public FinAiContextTokenService(@Value("${app.finai.internal-secret}") String secret) {
        if (secret == null || secret.length() < 32) throw new IllegalStateException("FINAI_INTERNAL_SECRET must contain at least 32 characters");
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }
    public String issue(UUID userId) {
        String payload = userId + "|" + Instant.now().plusSeconds(120).getEpochSecond() + "|" + UUID.randomUUID();
        return b64(payload.getBytes(StandardCharsets.UTF_8)) + "." + b64(sign(payload));
    }
    public UUID verify(String token) {
        try {
            String[] parts = token.split("\\.", 2);
            String payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
            byte[] supplied = Base64.getUrlDecoder().decode(parts[1]);
            if (!java.security.MessageDigest.isEqual(sign(payload), supplied)) throw new IllegalArgumentException();
            String[] values = payload.split("\\|", 3);
            if (Instant.now().getEpochSecond() > Long.parseLong(values[1]))
                throw new BusinessException("Internal context expired", "FINAI_CONTEXT_EXPIRED", HttpStatus.UNAUTHORIZED);
            return UUID.fromString(values[0]);
        } catch (BusinessException e) { throw e; }
        catch (Exception e) { throw new BusinessException("Invalid internal context", "FINAI_CONTEXT_INVALID", HttpStatus.UNAUTHORIZED); }
    }
    private byte[] sign(String value) {
        try { Mac mac = Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(secret, "HmacSHA256")); return mac.doFinal(value.getBytes(StandardCharsets.UTF_8)); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }
    private String b64(byte[] value) { return Base64.getUrlEncoder().withoutPadding().encodeToString(value); }
}
