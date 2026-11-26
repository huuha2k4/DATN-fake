package com.finance.finance.modules.finai.controller;

import com.finance.finance.modules.finai.dto.InternalToolRequest;
import com.finance.finance.modules.finai.security.FinAiContextTokenService;
import com.finance.finance.modules.finai.tool.FinAiToolExecutor;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/internal/v1/finai/tools")
@RequiredArgsConstructor
@Slf4j
public class FinAiInternalToolController {
    private final FinAiContextTokenService tokens;
    private final FinAiToolExecutor executor;
    @PostMapping("/{toolName}")
    public ResponseEntity<Object> execute(@PathVariable String toolName, @Valid @RequestBody InternalToolRequest request) {
        long started = System.nanoTime();
        UUID userId = tokens.verify(request.getContextToken());
        try {
            return ResponseEntity.ok(executor.executeRead(userId, toolName, request.getArguments()));
        } finally {
            log.info("[FINAI_PIPELINE] stage=spring_tool_including_database durationMs={}",
                    (System.nanoTime() - started) / 1_000_000);
        }
    }
}
