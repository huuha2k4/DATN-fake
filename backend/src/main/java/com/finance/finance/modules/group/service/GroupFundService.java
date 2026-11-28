package com.finance.finance.modules.group.service;

import com.finance.finance.modules.group.dto.response.GroupFundResponse;
import com.finance.finance.modules.group.dto.response.GroupFundContributionResponse;
import com.finance.finance.modules.group.dto.response.GroupMonthlyStatisticsResponse;
import com.finance.finance.modules.group.entity.GroupFund;
import com.finance.finance.modules.group.repository.GroupFundRepository;
import com.finance.finance.modules.group.repository.GroupMemberRepository;
import com.finance.finance.modules.group.repository.GroupFundContributionRepository;
import com.finance.finance.modules.group.repository.GroupExpenseRepository;
import com.finance.finance.modules.group.repository.GroupRepository;
import com.finance.finance.modules.group.repository.ContributionPeriodRepository;
import com.finance.finance.modules.group.repository.MemberContributionObligationRepository;
import com.finance.finance.modules.group.repository.GroupFinanceConfigRepository;
import com.finance.finance.modules.group.entity.GroupFundContribution;
import com.finance.finance.modules.group.entity.GroupExpense;
import com.finance.finance.modules.group.entity.Group;
import com.finance.finance.modules.group.dto.request.ContributeGroupFundRequest;
import com.finance.finance.modules.account.repository.AccountRepository;
import com.finance.finance.modules.transaction.dto.request.CreateTransactionRequest;
import com.finance.finance.modules.transaction.dto.response.TransactionResponse;
import com.finance.finance.modules.transaction.service.TransactionService;
import com.finance.finance.common.enums.TransactionType;
import com.finance.finance.modules.category.repository.CategoryRepository;
import com.finance.finance.modules.user.repository.UserRepository;
import com.finance.finance.modules.notification.service.NotificationService;
import com.finance.finance.common.enums.NotificationType;
import com.finance.finance.common.enums.NotificationPriority;
import com.finance.finance.common.enums.ContributionPeriodStatus;
import com.finance.finance.common.enums.ContributionSourceType;
import com.finance.finance.common.enums.ContributionStatus;
import com.finance.finance.common.enums.MemberRole;
import com.finance.finance.modules.group.entity.ContributionPeriod;
import com.finance.finance.modules.group.entity.GroupFinanceConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupFundService {
    private final GroupFinanceNotifications financeNotifications;
    private final GroupFundRepository groupFundRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupFundContributionRepository contributionRepository;
    private final GroupExpenseRepository groupExpenseRepository;
    private final GroupRepository groupRepository;
    private final AccountRepository accountRepository;
    private final TransactionService transactionService;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ContributionPeriodRepository contributionPeriodRepository;
    private final MemberContributionObligationRepository obligationRepository;
    private final GroupFinanceConfigRepository financeConfigRepository;

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
                .map(this::toContributionResponse)
                .toList();
    }

    @Transactional
    public GroupFundResponse contribute(UUID groupId, ContributeGroupFundRequest request, UUID currentUserId) {
        if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, currentUserId)) {
            throw new SecurityException("Bạn không phải thành viên của nhóm này");
        }
        requireFundEnabled(groupId);
        ContributionSourceType sourceType = parseSourceType(request.getSourceType());
        if (sourceType != ContributionSourceType.MANAGED_ACCOUNT) {
            throw new IllegalArgumentException("Khoản nộp bên ngoài phải được gửi qua luồng chờ xác nhận");
        }
        validatePeriod(groupId, request.getPeriodId(), currentUserId);
        GroupFund fund = groupFundRepository.findByGroupIdForUpdate(groupId)
                .orElseThrow(() -> new IllegalStateException("Nhóm chưa có quỹ chung"));
        validateContributionAmount(fund, request);
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhóm"));
        if (request.getSourceAccountId() == null) throw new IllegalArgumentException("Cần chọn ví nguồn");
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
                .personalTransactionId(transaction.getId()).periodId(request.getPeriodId())
                .sourceType(sourceType).status(ContributionStatus.CONFIRMED)
                .confirmedByUserId(currentUserId).confirmedAt(LocalDateTime.now()).amount(request.getAmount())
                .contributedAt(request.getContributedAt()).note(request.getNote()).build());
        fund.setBalance(fund.getBalance().add(request.getAmount()));
        groupFundRepository.save(fund);

        // Bắn thông báo nộp quỹ đến tất cả các thành viên khác trong nhóm (chưa tắt thông báo)
        try {
            String contributorName = userRepository.findById(currentUserId)
                    .map(u -> u.getFullName() != null && !u.getFullName().isBlank() ? u.getFullName() : (u.getUsername() != null ? u.getUsername() : "Một thành viên"))
                    .orElse("Một thành viên");
            String groupName = group.getName();
            String formattedAmount = String.format("%,d", request.getAmount().longValue()) + "đ";

            var members = groupMemberRepository.findByGroupId(groupId);
            for (var member : members) {
                if (!member.getUserId().equals(currentUserId) && Boolean.TRUE.equals(member.getNotificationEnabled())) {
                    notificationService.createNotification(
                            member.getUserId(),
                            NotificationType.GROUP_FUND_DEPOSIT,
                            NotificationPriority.NORMAL,
                            "Thành viên đã nộp quỹ",
                            contributorName + " đã nộp " + formattedAmount + " vào quỹ \"" + groupName + "\".",
                            "/groups?groupId=" + groupId + "&tab=BALANCES",
                            "Xem quỹ nhóm"
                    );
                }
            }
        } catch (Exception ex) {
            // Không làm gián đoạn transaction nộp quỹ nếu bắn notification gặp lỗi
        }

        return GroupFundResponse.builder().id(fund.getId()).groupId(groupId).currency(fund.getCurrency())
                .balance(fund.getBalance()).updatedAt(fund.getUpdatedAt()).build();
    }

    @Transactional
    public GroupFundContributionResponse submitExternalContribution(UUID groupId, ContributeGroupFundRequest request,
                                                                    UUID currentUserId, String idempotencyKey) {
        validateMember(groupId, currentUserId);
        requireFundEnabled(groupId);
        ContributionSourceType sourceType = parseSourceType(request.getSourceType());
        if (sourceType == ContributionSourceType.MANAGED_ACCOUNT) {
            throw new IllegalArgumentException("Nộp từ ví Finora phải dùng luồng nộp quỹ trực tiếp");
        }
        if (request.getSourceAccountId() != null) throw new IllegalArgumentException("Khoản nộp bên ngoài không dùng ví Finora");
        validatePeriod(groupId, request.getPeriodId(), currentUserId);
        GroupFund fund = groupFundRepository.findByGroupId(groupId)
                .orElseThrow(() -> new IllegalStateException("Nhóm chưa có quỹ chung"));
        validateContributionAmount(fund, request);
        GroupFundContribution contribution = contributionRepository.save(GroupFundContribution.builder()
                .fundId(fund.getId()).contributorUserId(currentUserId).periodId(request.getPeriodId())
                .sourceType(sourceType).status(ContributionStatus.PENDING).amount(request.getAmount())
                .contributedAt(request.getContributedAt()).note(request.getNote()).idempotencyKey(idempotencyKey).build());
        groupMemberRepository.findByGroupId(groupId).stream()
                .filter(member -> member.getRole() == MemberRole.OWNER || member.getRole() == MemberRole.ADMIN)
                .forEach(member -> financeNotifications.send(groupId, member.getUserId(), "OVERVIEW", "contributionId",
                        contribution.getId(), "pending", "Khoản nộp đang chờ xác nhận", "Kiểm tra khoản tiền thành viên đã khai báo."));
        return toContributionResponse(contribution);
    }

    @Transactional
    public GroupFundContributionResponse confirmContribution(UUID groupId, UUID contributionId, UUID actorId) {
        requireManager(groupId, actorId);
        GroupFundContribution contribution = contributionRepository.findByIdForUpdate(contributionId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy khoản nộp"));
        if (!groupFundRepository.existsByIdAndGroupId(contribution.getFundId(), groupId)) {
            throw new SecurityException("Khoản nộp không thuộc nhóm");
        }
        if (contribution.getStatus() == ContributionStatus.CONFIRMED) return toContributionResponse(contribution);
        if (contribution.getStatus() != ContributionStatus.PENDING) {
            throw new IllegalStateException("Chỉ khoản nộp đang chờ mới có thể xác nhận");
        }
        if (contribution.getPeriodId() != null) {
            ContributionPeriod period = contributionPeriodRepository.findLockedByIdAndGroupId(contribution.getPeriodId(), groupId)
                    .orElseThrow(() -> new IllegalStateException("Kỳ đóng quỹ không còn tồn tại"));
            if (period.getStatus() != ContributionPeriodStatus.ACTIVE) {
                throw new IllegalStateException("Kỳ đóng quỹ không còn nhận đóng góp");
            }
        }
        GroupFund fund = groupFundRepository.findByGroupIdForUpdate(groupId)
                .orElseThrow(() -> new IllegalStateException("Nhóm chưa có quỹ chung"));
        contribution.setStatus(ContributionStatus.CONFIRMED);
        contribution.setConfirmedByUserId(actorId);
        contribution.setConfirmedAt(LocalDateTime.now());
        fund.setBalance(fund.getBalance().add(contribution.getAmount()));
        groupFundRepository.save(fund);
        financeNotifications.send(groupId, contribution.getContributorUserId(), "OVERVIEW", "contributionId",
                contributionId, "confirmed", "Khoản nộp đã được xác nhận", "Số dư quỹ và tiến độ kỳ đã được cập nhật.");
        return toContributionResponse(contributionRepository.save(contribution));
    }

    @Transactional
    public GroupFundContributionResponse rejectContribution(UUID groupId, UUID contributionId, String reason, UUID actorId) {
        requireManager(groupId, actorId);
        if (reason == null || reason.isBlank()) throw new IllegalArgumentException("Cần nhập lý do từ chối");
        GroupFundContribution contribution = contributionRepository.findByIdForUpdate(contributionId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy khoản nộp"));
        GroupFund fund = groupFundRepository.findByGroupId(groupId)
                .orElseThrow(() -> new IllegalStateException("Nhóm chưa có quỹ chung"));
        if (!fund.getId().equals(contribution.getFundId())) throw new SecurityException("Khoản nộp không thuộc nhóm");
        if (contribution.getStatus() == ContributionStatus.REJECTED) return toContributionResponse(contribution);
        if (contribution.getStatus() != ContributionStatus.PENDING) {
            throw new IllegalStateException("Chỉ khoản nộp đang chờ mới có thể từ chối");
        }
        contribution.setStatus(ContributionStatus.REJECTED);
        contribution.setRejectedByUserId(actorId);
        contribution.setRejectedAt(LocalDateTime.now());
        contribution.setRejectionReason(reason);
        financeNotifications.send(groupId, contribution.getContributorUserId(), "OVERVIEW", "contributionId",
                contributionId, "rejected", "Khoản nộp bị từ chối", reason);
        return toContributionResponse(contributionRepository.save(contribution));
    }

    private void validatePeriod(UUID groupId, UUID periodId, UUID contributorId) {
        if (periodId == null) return;
        ContributionPeriod period = contributionPeriodRepository.findLockedByIdAndGroupId(periodId, groupId)
                .orElseThrow(() -> new IllegalArgumentException("Kỳ đóng quỹ không thuộc nhóm"));
        if (period.getStatus() != ContributionPeriodStatus.ACTIVE) {
            throw new IllegalStateException("Kỳ đóng quỹ không còn nhận đóng góp");
        }
        if (LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).isBefore(period.getStartDate())) {
            throw new IllegalStateException("Kỳ đóng quỹ chưa bắt đầu");
        }
        if (obligationRepository.findByPeriodIdAndUserId(periodId, contributorId).isEmpty()
                && period.getAllocationMethod() != com.finance.finance.common.enums.ContributionAllocationMethod.VOLUNTARY) {
            throw new SecurityException("Bạn không có nghĩa vụ trong kỳ đóng quỹ này");
        }
    }

    private void validateContributionAmount(GroupFund fund, ContributeGroupFundRequest request) {
        var amount = request.getAmount();
        if (amount == null || amount.signum() <= 0
                || ("VND".equalsIgnoreCase(fund.getCurrency()) && amount.stripTrailingZeros().scale() > 0)) {
            throw new IllegalArgumentException("Số tiền đóng góp không hợp lệ");
        }
    }

    private ContributionSourceType parseSourceType(String value) {
        try { return ContributionSourceType.valueOf(value == null ? "MANAGED_ACCOUNT" : value.toUpperCase()); }
        catch (IllegalArgumentException error) { throw new IllegalArgumentException("Nguồn tiền nộp quỹ không hợp lệ"); }
    }

    private void requireFundEnabled(UUID groupId) {
        if (!financeConfigRepository.findById(groupId).map(GroupFinanceConfig::isUseSharedFund).orElse(true)) {
            throw new IllegalStateException("Nhóm đã tắt quỹ chung");
        }
    }

    private void validateMember(UUID groupId, UUID userId) {
        if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, userId)) throw new SecurityException("Bạn không thuộc nhóm");
    }

    private void requireManager(UUID groupId, UUID userId) {
        var member = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new SecurityException("Bạn không thuộc nhóm"));
        if (member.getRole() != MemberRole.OWNER && member.getRole() != MemberRole.ADMIN) {
            throw new SecurityException("Bạn không có quyền xác nhận khoản nộp");
        }
    }

    private GroupFundContributionResponse toContributionResponse(GroupFundContribution item) {
        return GroupFundContributionResponse.builder().id(item.getId()).periodId(item.getPeriodId())
                .contributorUserId(item.getContributorUserId())
                .contributorName(userRepository.findById(item.getContributorUserId())
                        .map(user -> user.getFullName() != null ? user.getFullName() : user.getUsername())
                        .orElse("Thành viên"))
                .amount(item.getAmount()).contributedAt(item.getContributedAt()).createdAt(item.getCreatedAt())
                .note(item.getNote()).sourceType(item.getSourceType().name()).status(item.getStatus().name())
                .confirmedAt(item.getConfirmedAt()).rejectionReason(item.getRejectionReason()).build();
    }

    @Transactional(readOnly = true)
    public GroupMonthlyStatisticsResponse getMonthlyStatistics(UUID groupId, int year, int month, UUID currentUserId) {
        if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, currentUserId)) {
            throw new SecurityException("Bạn không phải thành viên của nhóm này");
        }
        GroupFund fund = groupFundRepository.findByGroupId(groupId)
                .orElseThrow(() -> new IllegalStateException("Nhóm chưa có quỹ chung"));

        YearMonth targetYm = YearMonth.of(year, month);
        LocalDate startDate = targetYm.atDay(1);
        LocalDate endDate = targetYm.atEndOfMonth();

        // 1. Thu (Contributed into fund during this month)
        List<GroupFundContribution> contributions = contributionRepository.findByFundIdAndDateRange(fund.getId(), startDate, endDate);
        BigDecimal totalIncome = contributions.stream()
                .map(GroupFundContribution::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 2. Chi (Expenses in this month)
        List<GroupExpense> expenses = groupExpenseRepository.findAllByGroupIdAndDateRange(groupId, startDate, endDate);
        BigDecimal totalExpense = expenses.stream()
                .map(GroupExpense::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 3. Transactions count & remaining
        long txCount = contributions.size() + expenses.size();
        BigDecimal remaining = totalIncome.subtract(totalExpense);

        // 4. So sánh số dư quỹ (Wallet Balance Trend) so với cuối tháng trước
        YearMonth prevYm = targetYm.minusMonths(1);
        LocalDate prevMonthEnd = prevYm.atEndOfMonth();

        // Số dư cuối tháng trước = (Tổng đóng góp vào quỹ tính đến hết tháng trước) - (Tổng chi tiêu từ quỹ tính đến hết tháng trước)
        BigDecimal prevTotalFundContributions = contributionRepository.findByFundIdAndContributedAtBeforeOrEqual(fund.getId(), prevMonthEnd)
                .stream().map(GroupFundContribution::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal prevTotalFundExpenses = groupExpenseRepository.findAllFundExpensesBeforeOrEqual(groupId, prevMonthEnd)
                .stream().map(GroupExpense::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal prevBalance = prevTotalFundContributions.subtract(prevTotalFundExpenses);
        if (prevBalance.compareTo(BigDecimal.ZERO) < 0) {
            prevBalance = BigDecimal.ZERO;
        }

        // Số dư hiện tại của quỹ
        BigDecimal currentBalance = fund.getBalance() != null ? fund.getBalance() : BigDecimal.ZERO;

        Double trendPercentage;
        if (prevBalance.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal diff = currentBalance.subtract(prevBalance);
            trendPercentage = diff.divide(prevBalance, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100)).doubleValue();
        } else if (currentBalance.compareTo(BigDecimal.ZERO) > 0) {
            // Tháng trước không có số dư (0đ) mà tháng này số dư > 0 -> Tăng 100%
            trendPercentage = 100.0;
        } else {
            // Cả tháng trước và tháng này số dư đều bằng 0
            trendPercentage = 0.0;
        }

        // 5. Group by category
        Map<UUID, List<GroupExpense>> byCat = expenses.stream()
                .collect(Collectors.groupingBy(e -> e.getCategoryId() != null ? e.getCategoryId() : new UUID(0L, 0L)));

        List<GroupMonthlyStatisticsResponse.CategoryStat> catStats = new ArrayList<>();
        for (Map.Entry<UUID, List<GroupExpense>> entry : byCat.entrySet()) {
            UUID catId = entry.getKey();
            List<GroupExpense> catExpenses = entry.getValue();
            BigDecimal catSum = catExpenses.stream().map(GroupExpense::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            double pct = totalExpense.compareTo(BigDecimal.ZERO) > 0
                    ? catSum.divide(totalExpense, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue()
                    : 0.0;

            String name = "Khác";
            String icon = "more";
            String color = "#94A3B8";

            if (!catId.equals(new UUID(0L, 0L))) {
                var catOpt = categoryRepository.findById(catId);
                if (catOpt.isPresent()) {
                    name = catOpt.get().getName();
                    icon = catOpt.get().getIcon();
                    color = catOpt.get().getColor();
                }
            }

            catStats.add(GroupMonthlyStatisticsResponse.CategoryStat.builder()
                    .categoryId(catId.equals(new UUID(0L, 0L)) ? null : catId)
                    .categoryName(name)
                    .icon(icon)
                    .color(color != null ? color : "#10B981")
                    .amount(catSum)
                    .percentage(pct)
                    .count(catExpenses.size())
                    .build());
        }

        catStats.sort((a, b) -> b.getAmount().compareTo(a.getAmount()));

        return GroupMonthlyStatisticsResponse.builder()
                .year(year)
                .month(month)
                .totalIncome(totalIncome)
                .totalExpense(totalExpense)
                .remaining(remaining)
                .fundBalance(fund.getBalance())
                .transactionCount(txCount)
                .trendPercentage(trendPercentage)
                .categoryStats(catStats)
                .build();
    }
}
