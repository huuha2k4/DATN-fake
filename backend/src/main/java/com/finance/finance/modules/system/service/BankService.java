package com.finance.finance.modules.system.service;

import com.finance.finance.modules.system.entity.Bank;
import com.finance.finance.modules.system.repository.BankRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BankService {

    private final BankRepository bankRepository;

    /**
     * Get all active banks
     */
    @Transactional(readOnly = true)
    public List<Bank> getAllActiveBanks() {
        log.debug("Fetching all active banks");
        return bankRepository.findAllActive();
    }

    /**
     * Get banks by kind (BANK or E_WALLET)
     */
    @Transactional(readOnly = true)
    public List<Bank> getBanksByKind(String kind) {
        log.debug("Fetching banks by kind: {}", kind);
        return bankRepository.findByKind(kind);
    }

    /**
     * Get bank by ID
     */
    @Transactional(readOnly = true)
    public Optional<Bank> getBankById(UUID id) {
        log.debug("Fetching bank by id: {}", id);
        return bankRepository.findById(id);
    }

    /**
     * Get bank by code
     */
    @Transactional(readOnly = true)
    public Optional<Bank> getBankByCode(String code) {
        log.debug("Fetching bank by code: {}", code);
        return bankRepository.findByCode(code);
    }
}
