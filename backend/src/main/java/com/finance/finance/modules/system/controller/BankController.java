package com.finance.finance.modules.system.controller;

import com.finance.finance.modules.system.entity.Bank;
import com.finance.finance.modules.system.service.BankService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/banks")
@RequiredArgsConstructor
public class BankController {

    private final BankService bankService;

    /**
     * GET /api/v1/banks - Get all active banks
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllBanks() {
        log.info("Fetching all active banks");
        List<Bank> banks = bankService.getAllActiveBanks();
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", banks);
        response.put("total", banks.size());
        
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/banks/kind/{kind} - Get banks by kind (BANK or E_WALLET)
     */
    @GetMapping("/kind/{kind}")
    public ResponseEntity<Map<String, Object>> getBanksByKind(@PathVariable String kind) {
        log.info("Fetching banks by kind: {}", kind);
        List<Bank> banks = bankService.getBanksByKind(kind.toUpperCase());
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", banks);
        response.put("total", banks.size());
        
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/banks/{id} - Get bank by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getBankById(@PathVariable UUID id) {
        log.info("Fetching bank by id: {}", id);
        
        return bankService.getBankById(id)
                .map(bank -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", true);
                    response.put("data", bank);
                    return ResponseEntity.ok(response);
                })
                .orElseGet(() -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", false);
                    response.put("message", "Bank not found");
                    return ResponseEntity.notFound().build();
                });
    }

    /**
     * GET /api/v1/banks/code/{code} - Get bank by code
     */
    @GetMapping("/code/{code}")
    public ResponseEntity<Map<String, Object>> getBankByCode(@PathVariable String code) {
        log.info("Fetching bank by code: {}", code);
        
        return bankService.getBankByCode(code)
                .map(bank -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", true);
                    response.put("data", bank);
                    return ResponseEntity.ok(response);
                })
                .orElseGet(() -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", false);
                    response.put("message", "Bank not found");
                    return ResponseEntity.notFound().build();
                });
    }
}
