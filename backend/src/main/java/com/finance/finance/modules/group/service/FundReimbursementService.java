package com.finance.finance.modules.group.service;

import com.finance.finance.common.enums.*;
import com.finance.finance.modules.account.repository.AccountRepository;
import com.finance.finance.modules.category.repository.CategoryRepository;
import com.finance.finance.modules.group.dto.request.ReimburseFundRequest;
import com.finance.finance.modules.group.dto.response.FundReimbursementResponse;
import com.finance.finance.modules.group.entity.FundReimbursementPayment;
import com.finance.finance.modules.group.repository.*;
import com.finance.finance.modules.transaction.dto.request.CreateTransactionRequest;
import com.finance.finance.modules.transaction.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
public class FundReimbursementService {
    private final FundReimbursementRepository reimbursementRepository;
    private final FundReimbursementPaymentRepository paymentRepository;
    private final GroupFundRepository fundRepository;
    private final GroupMemberRepository memberRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;
    private final TransactionService transactionService;
    private final GroupFinanceNotifications financeNotifications;

    @Transactional(readOnly = true)
    public Page<FundReimbursementResponse> list(UUID groupId, Pageable pageable, UUID userId) {
        requireMember(groupId, userId);
        return reimbursementRepository.findByGroupId(groupId, pageable).map(item -> response(item, userId));
    }

    @Transactional(readOnly = true)
    public List<FundReimbursementResponse.Payment> history(UUID groupId, UUID id, UUID userId) {
        requireMember(groupId, userId);
        reimbursementRepository.findByIdAndGroupId(id, groupId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy nghĩa vụ hoàn trả"));
        return paymentRepository.findByReimbursementIdOrderByPaidAtDesc(id).stream()
                .map(row -> new FundReimbursementResponse.Payment(row.getId(), row.getAmount(),
                        row.getPaidAt(), row.getNote(), row.getDestinationAccountId() != null))
                .toList();
    }

    @Transactional
    public FundReimbursementResponse authorizeWallet(UUID groupId, UUID id, UUID accountId, UUID actorId) {
        requireMember(groupId, actorId);
        var item = reimbursementRepository.findLockedByIdAndGroupId(id, groupId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy nghĩa vụ hoàn trả"));
        if (!actorId.equals(item.getBeneficiaryUserId())) throw new SecurityException("Chỉ người nhận được chọn ví");
        if (accountId != null) {
            var account = accountRepository.findByIdAndUserId(accountId, actorId)
                    .orElseThrow(() -> new SecurityException("Ví không thuộc người nhận"));
            var fund = fundRepository.findByGroupId(groupId).orElseThrow();
            if (!fund.getCurrency().equalsIgnoreCase(account.getCurrencyCode())) {
                throw new IllegalArgumentException("Ví nhận phải cùng loại tiền với quỹ");
            }
        }
        item.setAuthorizedAccountId(accountId);
        return response(item, actorId);
    }

    @Transactional
    public FundReimbursementResponse reimburse(UUID groupId, UUID reimbursementId, ReimburseFundRequest request,
                                                String idempotencyKey, UUID actorId) {
        requireManager(groupId, actorId);
        var reimbursement = reimbursementRepository.findLockedByIdAndGroupId(reimbursementId, groupId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy nghĩa vụ hoàn trả"));
        if (idempotencyKey != null && paymentRepository.existsByReimbursementIdAndIdempotencyKey(reimbursementId, idempotencyKey)) {
            return response(reimbursement, actorId);
        }
        if (reimbursement.getStatus() == FundReimbursementStatus.COMPLETED
                || reimbursement.getStatus() == FundReimbursementStatus.CANCELLED) {
            throw new IllegalStateException("Nghĩa vụ hoàn trả đã kết thúc");
        }
        if (request.getAmount() == null || request.getAmount().signum() <= 0) {
            throw new IllegalArgumentException("Số tiền hoàn trả phải lớn hơn 0");
        }
        BigDecimal remaining = reimbursement.getTotalAmount().subtract(reimbursement.getReimbursedAmount());
        if (request.getAmount().compareTo(remaining) > 0) {
            throw new IllegalArgumentException("Số tiền hoàn trả vượt nghĩa vụ còn lại");
        }
        var fund = fundRepository.findByGroupIdForUpdate(groupId)
                .orElseThrow(() -> new IllegalStateException("Nhóm chưa có quỹ chung"));
        if (fund.getBalance().compareTo(request.getAmount()) < 0) {
            throw new IllegalStateException("Số dư quỹ không đủ; nghĩa vụ hoàn trả vẫn được giữ nguyên");
        }

        UUID destinationId = request.isUseAuthorizedWallet() ? reimbursement.getAuthorizedAccountId() : null;
        if (request.isUseAuthorizedWallet() && destinationId == null) {
            throw new IllegalStateException("Người nhận chưa đồng ý nhận tiền vào ví");
        }
        if (request.getDestinationAccountId() != null && !request.getDestinationAccountId().equals(destinationId)) {
            throw new SecurityException("Chỉ có thể sử dụng ví do người nhận đã chọn");
        }
        if ("VND".equalsIgnoreCase(fund.getCurrency()) && request.getAmount().stripTrailingZeros().scale() > 0) {
            throw new IllegalArgumentException("Số tiền VND phải là số nguyên");
        }
        UUID personalTransactionId = null;
        if (destinationId != null) {
            var destination = accountRepository.findByIdAndUserId(destinationId, reimbursement.getBeneficiaryUserId())
                    .orElseThrow(() -> new SecurityException("Ví nhận không thuộc người được hoàn trả"));
            if (!fund.getCurrency().equalsIgnoreCase(destination.getCurrencyCode())) {
                throw new IllegalArgumentException("Ví nhận phải cùng loại tiền với quỹ");
            }
            UUID incomeCategory = categoryRepository.findByCode("OTHER_INCOME").filter(category -> !category.isDeleted())
                    .orElseThrow(() -> new IllegalStateException("Thiếu danh mục hệ thống")).getId();
            personalTransactionId = transactionService.createTransaction(reimbursement.getBeneficiaryUserId(),
                    CreateTransactionRequest.builder().transactionType(TransactionType.INCOME)
                            .accountId(destination.getId()).categoryId(incomeCategory).amount(request.getAmount())
                            .currencyCode(destination.getCurrencyCode()).transactionDate(java.time.LocalDate.now())
                            .description("Quỹ nhóm hoàn trả tiền ứng").note(request.getNote())
                            .isExcludedFromReport(true).build()).getId();
        }

        fund.setBalance(fund.getBalance().subtract(request.getAmount()));
        fundRepository.save(fund);
        reimbursement.setReimbursedAmount(reimbursement.getReimbursedAmount().add(request.getAmount()));
        reimbursement.setStatus(reimbursement.getReimbursedAmount().compareTo(reimbursement.getTotalAmount()) == 0
                ? FundReimbursementStatus.COMPLETED : FundReimbursementStatus.PARTIAL);
        reimbursementRepository.save(reimbursement);
        var payment = paymentRepository.save(FundReimbursementPayment.builder().reimbursementId(reimbursementId)
                .amount(request.getAmount()).destinationAccountId(destinationId)
                .personalTransactionId(personalTransactionId).paidByUserId(actorId)
                .note(request.getNote()).idempotencyKey(idempotencyKey).build());
        financeNotifications.send(groupId, reimbursement.getBeneficiaryUserId(), "OVERVIEW", "reimbursementId",
                reimbursementId, "paid-" + payment.getId(), "Quỹ đã hoàn trả tiền ứng",
                "Đã hoàn trả " + request.getAmount().stripTrailingZeros().toPlainString() + " đ.");
        return response(reimbursement, actorId);
    }

    private FundReimbursementResponse response(com.finance.finance.modules.group.entity.FundReimbursement item, UUID viewer) {
        return FundReimbursementResponse.builder().id(item.getId()).groupId(item.getGroupId())
                .expenseId(item.getExpenseId()).beneficiaryUserId(item.getBeneficiaryUserId())
                .totalAmount(item.getTotalAmount()).reimbursedAmount(item.getReimbursedAmount())
                .remainingAmount(item.getTotalAmount().subtract(item.getReimbursedAmount()))
                .status(item.getStatus().name()).createdAt(item.getCreatedAt())
                .walletAuthorized(item.getAuthorizedAccountId() != null)
                .authorizedAccountId(item.getBeneficiaryUserId().equals(viewer) ? item.getAuthorizedAccountId() : null)
                .build();
    }

    private void requireMember(UUID groupId, UUID userId) {
        if (!memberRepository.existsByGroupIdAndUserId(groupId, userId)) throw new SecurityException("Bạn không thuộc nhóm");
    }

    private void requireManager(UUID groupId, UUID userId) {
        var member = memberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new SecurityException("Bạn không thuộc nhóm"));
        if (member.getRole() != MemberRole.OWNER && member.getRole() != MemberRole.ADMIN) {
            throw new SecurityException("Bạn không có quyền sử dụng quỹ để hoàn trả");
        }
    }
}
