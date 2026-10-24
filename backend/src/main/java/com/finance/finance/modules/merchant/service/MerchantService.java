package com.finance.finance.modules.merchant.service;

import com.finance.finance.modules.merchant.dto.request.CreateMerchantRequest;
import com.finance.finance.modules.merchant.dto.request.UpdateMerchantRequest;
import com.finance.finance.modules.merchant.dto.response.MerchantResponse;
import com.finance.finance.modules.merchant.entity.Merchant;
import com.finance.finance.modules.merchant.exception.MerchantNotFoundException;
import com.finance.finance.modules.merchant.repository.MerchantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MerchantService {

    private final MerchantRepository merchantRepository;

    @Transactional
    public MerchantResponse createMerchant(UUID userId, CreateMerchantRequest request) {
        log.info("Creating merchant for user: {}, name: {}", userId, request.getName());

        String normalizedName = normalizeString(request.getName());

        // Check duplicate
        if (merchantRepository.findByNormalizedName(normalizedName, userId, null).isPresent()) {
            throw new IllegalArgumentException("Merchant '" + request.getName() + "' đã tồn tại");
        }

        Merchant merchant = Merchant.builder()
                .userId(userId)
                .name(request.getName())
                .normalizedName(normalizedName)
                .aliases(request.getAliases())
                .defaultCategoryId(request.getDefaultCategoryId())
                .mcc(request.getMcc())
                .logoUrl(request.getLogoUrl())
                .usageCount(0)
                .build();

        merchant = merchantRepository.save(merchant);
        log.info("Merchant created: {}", merchant.getId());

        return mapToResponse(merchant);
    }

    @Transactional(readOnly = true)
    public List<MerchantResponse> getMerchants(UUID userId) {
        log.info("Getting merchants for user: {}", userId);

        return merchantRepository.findAllByUserIdOrSystem(userId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MerchantResponse getMerchantById(UUID userId, UUID merchantId) {
        log.info("Getting merchant: {}", merchantId);

        Merchant merchant = merchantRepository.findByIdAndUserIdOrSystem(merchantId, userId)
                .orElseThrow(() -> new MerchantNotFoundException("Không tìm thấy merchant"));

        return mapToResponse(merchant);
    }

    @Transactional
    public MerchantResponse updateMerchant(UUID userId, UUID merchantId, UpdateMerchantRequest request) {
        log.info("Updating merchant: {}", merchantId);

        Merchant merchant = merchantRepository.findByIdAndUserIdOrSystem(merchantId, userId)
                .orElseThrow(() -> new MerchantNotFoundException("Không tìm thấy merchant"));

        // Check ownership
        if (merchant.getUserId() == null || !merchant.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Không có quyền chỉnh sửa merchant này");
        }

        if (request.getName() != null) {
            merchant.setName(request.getName());
            merchant.setNormalizedName(normalizeString(request.getName()));
        }
        if (request.getAliases() != null) merchant.setAliases(request.getAliases());
        if (request.getDefaultCategoryId() != null) merchant.setDefaultCategoryId(request.getDefaultCategoryId());
        if (request.getMcc() != null) merchant.setMcc(request.getMcc());
        if (request.getLogoUrl() != null) merchant.setLogoUrl(request.getLogoUrl());

        merchant = merchantRepository.save(merchant);
        return mapToResponse(merchant);
    }

    @Transactional
    public void deleteMerchant(UUID userId, UUID merchantId) {
        log.info("Deleting merchant: {}", merchantId);

        Merchant merchant = merchantRepository.findByIdAndUserIdOrSystem(merchantId, userId)
                .orElseThrow(() -> new MerchantNotFoundException("Không tìm thấy merchant"));

        if (merchant.getUserId() == null || !merchant.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Không có quyền xóa merchant này");
        }

        if (!merchantRepository.canDelete(merchantId)) {
            throw new IllegalArgumentException("Không thể xóa merchant đang được sử dụng");
        }

        merchantRepository.delete(merchant);
    }

    @Transactional(readOnly = true)
    public Page<MerchantResponse> searchMerchants(UUID userId, String keyword, Pageable pageable) {
        return merchantRepository.searchByName(keyword, userId, pageable)
                .map(this::mapToResponse);
    }

    private MerchantResponse mapToResponse(Merchant merchant) {
        Long transactionCount = merchantRepository.countTransactionsByMerchantId(merchant.getId());

        return MerchantResponse.builder()
                .id(merchant.getId())
                .name(merchant.getName())
                .aliases(merchant.getAliases())
                .defaultCategoryId(merchant.getDefaultCategoryId())
                .mcc(merchant.getMcc())
                .logoUrl(merchant.getLogoUrl())
                .usageCount(merchant.getUsageCount())
                .transactionCount(transactionCount.intValue())
                .isSystem(merchant.getUserId() == null)
                .createdAt(merchant.getCreatedAt())
                .build();
    }

    private String normalizeString(String input) {
        if (input == null) return null;
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{M}", "").toLowerCase().trim();
    }
}
