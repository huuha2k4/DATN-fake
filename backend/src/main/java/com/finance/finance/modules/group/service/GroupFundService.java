package com.finance.finance.modules.group.service;

import com.finance.finance.modules.group.dto.response.GroupFundResponse;
import com.finance.finance.modules.group.dto.response.GroupFundContributionResponse;
import com.finance.finance.modules.group.entity.GroupFund;
import com.finance.finance.modules.group.repository.GroupFundRepository;
import com.finance.finance.modules.group.repository.GroupMemberRepository;
import com.finance.finance.modules.group.repository.GroupFundContributionRepository;
import com.finance.finance.modules.group.repository.GroupRepository;
import com.finance.finance.modules.group.entity.GroupFundContribution;
import com.finance.finance.modules.group.entity.Group;
import com.finance.finance.modules.group.dto.request.ContributeGroupFundRequest;
import com.finance.finance.modules.account.repository.AccountRepository;
import com.finance.finance.modules.transaction.dto.request.CreateTransactionRequest;
import com.finance.finance.modules.transaction.dto.response.TransactionResponse;
import com.finance.finance.modules.transaction.service.TransactionService;
import com.finance.finance.common.enums.TransactionType;
import com.finance.finance.modules.category.repository.CategoryRepository;
import com.finance.finance.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;
import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GroupFundService {
    private final GroupFundRepository groupFundRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupFundContributionRepository contributionRepository;
    private final GroupRepository groupRepository;
    private final AccountRepository accountRepository;
    private final TransactionService transactionService;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public GroupFundResponse getFund(UUID groupId, UUID currentUserId) {
        if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, currentUserId)) {
            throw new SecurityException("Bạn không phải thành viên của nhóm này");
        }
        GroupFund fund = groupFundRepository.findByGroupId(groupId)
                .orElseThrow(() -> new IllegalStateException("Nhóm chưa có quỹ chung"));
        return GroupFundResponse.builder().id(fund.getId()).groupId(fund.getGroupId())
                .currency(fund.getCurrency()).balance(fund.getBalance()).updatedAt(fund.getUpdatedAt()).build();
    }

    @Transactional(readOnly = true)
    public List<GroupFundContributionResponse> getContributions(UUID groupId, UUID currentUserId) {
        if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, currentUserId)) {
            throw new SecurityException("Bạn không phải thành viên của nhóm này");
        }
        GroupFund fund = groupFundRepository.findByGroupId(groupId)
                .orElseThrow(() -> new IllegalStateException("Nhóm chưa có quỹ chung"));
        return contributionRepository.findByFundIdOrderByCreatedAtDesc(fund.getId()).stream()
                .map(item -> GroupFundContributionResponse.builder()
                        .id(item.getId()).contributorUserId(item.getContributorUserId())
                        .contributorName(userRepository.findById(item.getContributorUserId())
                                .map(user -> user.getFullName() != null ? user.getFullName() : user.getUsername())
                                .orElse("Thành viên"))
                        .amount(item.getAmount()).contributedAt(item.getContributedAt())
                        .createdAt(item.getCreatedAt()).note(item.getNote()).build())
                .toList();
    }

    @Transactional
    public GroupFundResponse contribute(UUID groupId, ContributeGroupFundRequest request, UUID currentUserId) {
        if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, currentUserId)) {
            throw new SecurityException("Bạn không phải thành viên của nhóm này");
        }
        GroupFund fund = groupFundRepository.findByGroupId(groupId)
                .orElseThrow(() -> new IllegalStateException("Nhóm chưa có quỹ chung"));
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhóm"));
        var account = accountRepository.findByIdAndUserId(request.getSourceAccountId(), currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy ví nguồn"));
        if (!fund.getCurrency().equalsIgnoreCase(account.getCurrencyCode())) {
            throw new IllegalArgumentException("Ví nguồn phải cùng loại tiền với quỹ nhóm");
        }

        UUID bookkeepingCategoryId = categoryRepository.findByCode("OTHER_EXPENSE")
                .orElseThrow(() -> new IllegalStateException("Thiếu danh mục hệ thống cho giao dịch nộp quỹ"))
                .getId();
        TransactionResponse transaction = transactionService.createTransaction(currentUserId,
                CreateTransactionRequest.builder().transactionType(TransactionType.EXPENSE)
                        .accountId(request.getSourceAccountId()).categoryId(bookkeepingCategoryId)
                        .amount(request.getAmount()).currencyCode(fund.getCurrency())
                        .transactionDate(request.getContributedAt())
                        .description("Nộp quỹ nhóm: " + group.getName()).note(request.getNote())
                        .isExcludedFromReport(true).build());

        contributionRepository.save(GroupFundContribution.builder().fundId(fund.getId())
                .contributorUserId(currentUserId).sourceAccountId(request.getSourceAccountId())
                .personalTransactionId(transaction.getId()).amount(request.getAmount())
                .contributedAt(request.getContributedAt()).note(request.getNote()).build());
        fund.setBalance(fund.getBalance().add(request.getAmount()));
        groupFundRepository.save(fund);
        return GroupFundResponse.builder().id(fund.getId()).groupId(groupId).currency(fund.getCurrency())
                .balance(fund.getBalance()).updatedAt(fund.getUpdatedAt()).build();
    }
}
