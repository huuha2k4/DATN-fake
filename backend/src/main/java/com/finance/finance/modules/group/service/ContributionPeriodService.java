package com.finance.finance.modules.group.service;

import com.finance.finance.common.enums.*;
import com.finance.finance.modules.group.dto.request.CreateContributionPeriodRequest;
import com.finance.finance.modules.group.dto.response.ContributionPeriodResponse;
import com.finance.finance.modules.group.entity.*;
import com.finance.finance.modules.group.repository.*;
import com.finance.finance.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.*;
import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ContributionPeriodService {
    private final ContributionPeriodRepository periodRepository;
    private final MemberContributionObligationRepository obligationRepository;
    private final GroupFundContributionRepository contributionRepository;
    private final GroupMemberRepository memberRepository;
    private final GroupFinanceConfigRepository configRepository;
    private final UserRepository userRepository;
    private final GroupFinanceNotifications financeNotifications;
    private final com.finance.finance.modules.audit.service.SystemAuditService audit;

    @Transactional
    public ContributionPeriodResponse create(UUID groupId, CreateContributionPeriodRequest request, UUID actorId) {
        var specification = preparePeriod(groupId, request, actorId);
        var method = specification.method();
        var frequency = specification.frequency();
        var unique = specification.members();
        var amounts = specification.preview().amounts();
        var requiredTotal = specification.preview().requiredTotal();
        ContributionPeriod period = periodRepository.save(ContributionPeriod.builder()
                .groupId(groupId).name(request.getName().trim()).description(request.getDescription())
                .startDate(request.getStartDate()).dueDate(request.getDueDate()).allocationMethod(method)
                .frequency(frequency).requiredTotal(requiredTotal).fundraisingTarget(request.getFundraisingTarget())
                .status(ContributionPeriodStatus.ACTIVE).createdByUserId(actorId).build());

        List<MemberContributionObligation> obligations = unique.values().stream().map(item ->
                MemberContributionObligation.builder().periodId(period.getId()).userId(item.getUserId())
                        .requiredAmount(item.isExempt() ? BigDecimal.ZERO : amounts.get(item.getUserId()))
                        .allocationPercentage(item.getPercentage()).exempt(item.isExempt())
                        .exemptionReason(item.getExemptionReason()).build()).toList();
        obligationRepository.saveAll(obligations);
        notifyPeriod(period, obligations, "opened", "Kỳ đóng quỹ mới");
        return build(period);
    }

    public record Preview(BigDecimal requiredTotal, Map<UUID, BigDecimal> amounts) {}

    private record PeriodSpecification(ContributionAllocationMethod method, ContributionFrequency frequency,
            Map<UUID, CreateContributionPeriodRequest.MemberObligation> members, Preview preview) {}

    @Transactional(readOnly = true)
    public Preview preview(UUID groupId, CreateContributionPeriodRequest request, UUID actorId) {
        return preparePeriod(groupId, request, actorId).preview();
    }

    private PeriodSpecification preparePeriod(UUID groupId, CreateContributionPeriodRequest request, UUID actorId) {
        requireManager(groupId, actorId);
        GroupFinanceConfig config = configRepository.findById(groupId)
                .orElseThrow(() -> new IllegalStateException("Nhóm chưa có cấu hình tài chính"));
        if (!config.isUseContributionPeriods()) throw new IllegalStateException("Nhóm chưa bật kỳ đóng quỹ");
        if (periodRepository.findFirstByGroupIdAndStatus(groupId, ContributionPeriodStatus.ACTIVE).isPresent()) {
            throw new IllegalStateException("Nhóm đã có kỳ đóng quỹ đang hoạt động");
        }
        if (request.getDueDate().isBefore(request.getStartDate())) {
            throw new IllegalArgumentException("Hạn đóng không được trước ngày bắt đầu");
        }
        ContributionAllocationMethod method;
        ContributionFrequency frequency;
        try {
            method = ContributionAllocationMethod.valueOf(request.getAllocationMethod().toUpperCase());
            frequency = ContributionFrequency.valueOf(request.getFrequency().toUpperCase());
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("Hình thức hoặc tần suất đóng quỹ không hợp lệ");
        }
        if (frequency != ContributionFrequency.ONCE
                && !request.getDueDate().isBefore(shift(request.getStartDate(), frequency, 1))) {
            throw new IllegalArgumentException("Hạn đóng phải trước ngày bắt đầu kỳ kế tiếp");
        }
        if (request.getFundraisingTarget() != null) wholeDong(request.getFundraisingTarget());
        Map<UUID, CreateContributionPeriodRequest.MemberObligation> unique = new LinkedHashMap<>();
        for (var item : request.getMembers()) {
            if (unique.putIfAbsent(item.getUserId(), item) != null) {
                throw new IllegalArgumentException("Danh sách nghĩa vụ có thành viên trùng lặp");
            }
            var member = memberRepository.findByGroupIdAndUserId(groupId, item.getUserId())
                    .orElseThrow(() -> new IllegalArgumentException("Thành viên không thuộc nhóm"));
            if (Boolean.TRUE.equals(member.getIsChildProfile()) && !item.isExempt()) {
                throw new IllegalArgumentException("Hồ sơ trẻ em phải được miễn nghĩa vụ đóng quỹ");
            }
        }

        Map<UUID, BigDecimal> amounts = allocate(method, request, unique);
        BigDecimal requiredTotal = amounts.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return new PeriodSpecification(method, frequency, unique, new Preview(requiredTotal, amounts));
    }

    @Transactional(readOnly = true)
    public ContributionPeriodResponse get(UUID groupId, UUID periodId, UUID userId) {
        requireMember(groupId, userId);
        return build(periodRepository.findByIdAndGroupId(periodId, groupId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy kỳ đóng quỹ")));
    }

    @Transactional(readOnly = true)
    public ContributionPeriodResponse getActive(UUID groupId, UUID userId) {
        requireMember(groupId, userId);
        return periodRepository.findFirstByGroupIdAndStatus(groupId, ContributionPeriodStatus.ACTIVE)
                .map(this::build).orElse(null);
    }

    @Transactional(readOnly = true)
    public Page<ContributionPeriodResponse> list(UUID groupId, Pageable pageable, UUID userId) {
        requireMember(groupId, userId);
        return periodRepository.findByGroupIdOrderByDueDateDesc(groupId, pageable).map(this::build);
    }

    @Transactional
    public ContributionPeriodResponse close(UUID groupId, UUID periodId, UUID actorId) {
        requireManager(groupId, actorId);
        ContributionPeriod period = periodRepository.findLockedByIdAndGroupId(periodId, groupId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy kỳ đóng quỹ"));
        if (period.getStatus() != ContributionPeriodStatus.ACTIVE) {
            throw new IllegalStateException("Chỉ kỳ đang hoạt động mới có thể kết thúc");
        }
        if (!contributionRepository.findByPeriodIdAndStatus(periodId, ContributionStatus.PENDING).isEmpty()) {
            throw new IllegalStateException("Hãy xử lý các khoản nộp đang chờ trước khi kết thúc kỳ");
        }
        period.setStatus(ContributionPeriodStatus.CLOSED);
        period.setClosedAt(LocalDateTime.now());
        notifyPeriod(period, obligationRepository.findByPeriodIdOrderByCreatedAtAsc(periodId), "closed", "Kỳ đóng quỹ đã kết thúc");
        return build(periodRepository.save(period));
    }

    @Transactional
    public void remind(UUID groupId, UUID periodId, UUID actorId) {
        requireManager(groupId, actorId);
        sendReminders(groupId, periodId, LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")), true);
    }

    @Transactional
    public ContributionPeriodResponse adjust(UUID groupId, UUID periodId, UUID memberId,
            com.finance.finance.modules.group.dto.request.AdjustContributionObligationRequest request, UUID actorId) {
        requireManager(groupId, actorId);
        var period = periodRepository.findLockedByIdAndGroupId(periodId, groupId).orElseThrow();
        if (period.getStatus() != ContributionPeriodStatus.ACTIVE) throw new IllegalStateException("Chỉ sửa nghĩa vụ của kỳ đang hoạt động");
        var member = memberRepository.findByGroupIdAndUserId(groupId, memberId)
                .orElseThrow(() -> new IllegalArgumentException("Thành viên không thuộc nhóm"));
        if (Boolean.TRUE.equals(member.getIsChildProfile()) && !request.exempt()) {
            throw new IllegalArgumentException("Hồ sơ trẻ em phải được miễn đóng");
        }
        BigDecimal next = request.exempt() ? BigDecimal.ZERO : wholeDong(request.amount());
        if (period.getAllocationMethod() == ContributionAllocationMethod.VOLUNTARY && next.signum() != 0) {
            throw new IllegalArgumentException("Kỳ tự nguyện không thể tạo nghĩa vụ bắt buộc");
        }
        var row = obligationRepository.findByPeriodIdAndUserId(periodId, memberId)
                .orElseGet(() -> MemberContributionObligation.builder().periodId(periodId).userId(memberId)
                        .requiredAmount(BigDecimal.ZERO).build());
        BigDecimal previous = row.getRequiredAmount();
        boolean wasExempt = row.isExempt();
        row.setRequiredAmount(next);
        row.setExempt(request.exempt());
        row.setExemptionReason(request.exempt() ? request.reason() : null);
        row.setAllocationPercentage(null);
        obligationRepository.saveAndFlush(row);
        period.setRequiredTotal(period.getRequiredTotal().subtract(previous).add(next));
        audit.record(com.finance.finance.modules.audit.service.AuditEventRequest.builder()
                .eventType(com.finance.finance.modules.audit.model.AuditEventType.GROUP_CONTRIBUTION_OBLIGATION_UPDATED)
                .actorId(actorId).subjectUserId(memberId).groupId(groupId)
                .resourceType("GROUP_CONTRIBUTION_OBLIGATION").resourceId(row.getId()).relatedResourceId(periodId)
                .oldValues(Map.of("amount", previous, "exempt", wasExempt))
                .newValues(Map.of("amount", next, "exempt", request.exempt(), "reason", request.reason())).build());
        financeNotifications.send(groupId, memberId, "OVERVIEW", "periodId", periodId,
                "adjustment-" + row.getVersion(), "Nghĩa vụ đóng quỹ đã thay đổi", request.reason());
        return build(period);
    }

    @Transactional
    public void sendReminders(UUID groupId, UUID periodId, LocalDate today, boolean manual) {
        var period = periodRepository.findLockedByIdAndGroupId(periodId, groupId).orElseThrow();
        if (period.getStatus() != ContributionPeriodStatus.ACTIVE
                || period.getAllocationMethod() == ContributionAllocationMethod.VOLUNTARY || today.isBefore(period.getStartDate())) return;
        long days = java.time.temporal.ChronoUnit.DAYS.between(today, period.getDueDate());
        String event;
        String title;
        if (manual) { event = "manual-" + today; title = "Nhắc đóng quỹ"; }
        else if (days < 0) { event = "overdue"; title = "Kỳ đóng quỹ quá hạn"; }
        else if (days == 0) { event = "due"; title = "Kỳ đóng quỹ đến hạn"; }
        else if (days <= 3) { event = "upcoming"; title = "Kỳ đóng quỹ sắp đến hạn"; }
        else return;
        for (var row : obligationRepository.findByPeriodIdOrderByCreatedAtAsc(periodId)) {
            if (row.isExempt()) continue;
            var remaining = row.getRequiredAmount().subtract(contributionRepository.sumConfirmedByPeriodAndUser(periodId, row.getUserId()));
            if (remaining.signum() <= 0) continue;
            financeNotifications.send(groupId, row.getUserId(), "OVERVIEW", "periodId", periodId,
                    event, title, period.getName() + " · Còn " + remaining.stripTrailingZeros().toPlainString() + " đ.");
        }
    }

    private void notifyPeriod(ContributionPeriod period, List<MemberContributionObligation> rows, String event, String title) {
        for (var row : rows) {
            financeNotifications.send(period.getGroupId(), row.getUserId(), "OVERVIEW", "periodId", period.getId(), event, title, period.getName());
        }
    }

    @Transactional
    public void rollOver(UUID groupId, UUID periodId, LocalDate today) {
        var period = periodRepository.findLockedByIdAndGroupId(periodId, groupId).orElse(null);
        if (period == null || period.getStatus() != ContributionPeriodStatus.ACTIVE
                || period.getFrequency() == ContributionFrequency.ONCE || !period.getDueDate().isBefore(today)) return;
        if (!configRepository.findById(groupId).map(GroupFinanceConfig::isUseContributionPeriods).orElse(false)
                || !contributionRepository.findByPeriodIdAndStatus(periodId, ContributionStatus.PENDING).isEmpty()) return;

        // Derive dates from the first occurrence to avoid month-end drift after February.
        String[] recurrence = period.getRecurrenceKey() == null ? null : period.getRecurrenceKey().split(":");
        UUID anchorId = recurrence == null ? periodId : UUID.fromString(recurrence[0]);
        long sequence = recurrence == null ? 1 : Long.parseLong(recurrence[1]) + 1;
        var anchor = periodRepository.findByIdAndGroupId(anchorId, groupId).orElseThrow();
        LocalDate start = shift(anchor.getStartDate(), period.getFrequency(), sequence);
        LocalDate due = shift(anchor.getDueDate(), period.getFrequency(), sequence);
        if (start.isAfter(today)) return;
        var members = new HashMap<UUID, GroupMember>();
        memberRepository.findByGroupId(groupId).forEach(member -> members.put(member.getUserId(), member));
        var snapshot = obligationRepository.findByPeriodIdOrderByCreatedAtAsc(periodId).stream()
                .filter(row -> members.containsKey(row.getUserId()))
                .map(row -> {
                    boolean child = Boolean.TRUE.equals(members.get(row.getUserId()).getIsChildProfile());
                    return MemberContributionObligation.builder().userId(row.getUserId())
                            .requiredAmount(child ? BigDecimal.ZERO : row.getRequiredAmount())
                            .allocationPercentage(row.getAllocationPercentage())
                            .exempt(child || row.isExempt())
                            .exemptionReason(child ? "Hồ sơ trẻ em" : row.getExemptionReason()).build();
                }).toList();
        if (snapshot.isEmpty()) return;
        period.setStatus(ContributionPeriodStatus.CLOSED);
        period.setClosedAt(LocalDateTime.now());
        periodRepository.saveAndFlush(period);
        BigDecimal total = snapshot.stream().map(MemberContributionObligation::getRequiredAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        var next = periodRepository.save(ContributionPeriod.builder().groupId(groupId)
                .name(period.getName()).description(period.getDescription()).startDate(start).dueDate(due)
                .allocationMethod(period.getAllocationMethod()).frequency(period.getFrequency())
                .requiredTotal(total).fundraisingTarget(period.getFundraisingTarget())
                .status(ContributionPeriodStatus.ACTIVE).recurrenceKey(anchorId + ":" + sequence)
                .createdByUserId(period.getCreatedByUserId()).build());
        snapshot.forEach(row -> row.setPeriodId(next.getId()));
        obligationRepository.saveAll(snapshot);
        notifyPeriod(period, snapshot, "closed", "Kỳ đóng quỹ đã kết thúc");
        notifyPeriod(next, snapshot, "opened", "Kỳ đóng quỹ mới");
    }

    static LocalDate shift(LocalDate date, ContributionFrequency frequency, long sequence) {
        return switch (frequency) {
            case ONCE -> date;
            case WEEKLY -> date.plusWeeks(sequence);
            case MONTHLY -> date.plusMonths(sequence);
            case QUARTERLY -> date.plusMonths(sequence * 3);
        };
    }

    private Map<UUID, BigDecimal> allocate(ContributionAllocationMethod method,
            CreateContributionPeriodRequest request,
            Map<UUID, CreateContributionPeriodRequest.MemberObligation> members) {
        List<UUID> liable = members.values().stream().filter(m -> !m.isExempt())
                .map(CreateContributionPeriodRequest.MemberObligation::getUserId).sorted().toList();
        Map<UUID, BigDecimal> result = new LinkedHashMap<>();
        members.keySet().forEach(id -> result.put(id, BigDecimal.ZERO));
        if (method == ContributionAllocationMethod.VOLUNTARY) return result;
        if (liable.isEmpty()) throw new IllegalArgumentException("Kỳ bắt buộc cần ít nhất một thành viên có nghĩa vụ");

        if (method == ContributionAllocationMethod.EXACT) {
            members.values().stream().filter(m -> !m.isExempt())
                    .forEach(m -> result.put(m.getUserId(), wholeDong(m.getAmount())));
            return result;
        }
        BigDecimal total = request.getFundraisingTarget();
        if (total == null || total.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Chia đều hoặc theo tỷ lệ cần tổng số tiền mục tiêu");
        }
        long totalDong = wholeDong(total).longValueExact();
        if (method == ContributionAllocationMethod.EQUAL) {
            long base = totalDong / liable.size();
            long remainder = totalDong % liable.size();
            for (int i = 0; i < liable.size(); i++) {
                result.put(liable.get(i), BigDecimal.valueOf(base + (i < remainder ? 1 : 0)));
            }
            return result;
        }
        BigDecimal percentageTotal = members.values().stream().filter(m -> !m.isExempt())
                .map(m -> m.getPercentage() == null ? BigDecimal.ZERO : m.getPercentage())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (percentageTotal.compareTo(new BigDecimal("100")) != 0) {
            throw new IllegalArgumentException("Tổng tỷ lệ đóng quỹ phải bằng 100%");
        }
        record Fraction(UUID id, long floor, BigDecimal remainder) {}
        List<Fraction> fractions = new ArrayList<>();
        long assigned = 0;
        for (UUID id : liable) {
            BigDecimal raw = BigDecimal.valueOf(totalDong)
                    .multiply(Optional.ofNullable(members.get(id).getPercentage()).orElse(BigDecimal.ZERO))
                    .divide(new BigDecimal("100"), 8, RoundingMode.DOWN);
            long floor = raw.setScale(0, RoundingMode.DOWN).longValueExact();
            assigned += floor;
            fractions.add(new Fraction(id, floor, raw.subtract(BigDecimal.valueOf(floor))));
        }
        fractions.sort(Comparator.comparing(Fraction::remainder).reversed().thenComparing(Fraction::id));
        long extra = totalDong - assigned;
        for (int i = 0; i < fractions.size(); i++) {
            Fraction f = fractions.get(i);
            result.put(f.id(), BigDecimal.valueOf(f.floor() + (i < extra ? 1 : 0)));
        }
        return result;
    }

    private ContributionPeriodResponse build(ContributionPeriod period) {
        var obligations = obligationRepository.findByPeriodIdOrderByCreatedAtAsc(period.getId());
        var confirmedAmounts = new HashMap<UUID, BigDecimal>();
        var pendingAmounts = new HashMap<UUID, BigDecimal>();
        for (Object[] totals : contributionRepository.totalsForPeriod(period.getId())) {
            var amounts = totals[1] == ContributionStatus.CONFIRMED ? confirmedAmounts : pendingAmounts;
            amounts.put((UUID) totals[0], (BigDecimal) totals[2]);
        }
        BigDecimal confirmedTotal = confirmedAmounts.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal pendingTotal = pendingAmounts.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        var names = userRepository.findAllById(obligations.stream().map(MemberContributionObligation::getUserId).toList())
                .stream().collect(java.util.stream.Collectors.toMap(user -> user.getId(), user -> user));
        BigDecimal completed = BigDecimal.ZERO, outstandingTotal = BigDecimal.ZERO, excessTotal = BigDecimal.ZERO;
        long completedMembers = 0;
        List<ContributionPeriodResponse.MemberProgress> memberRows = new ArrayList<>();
        for (var obligation : obligations) {
            BigDecimal confirmed = confirmedAmounts.getOrDefault(obligation.getUserId(), BigDecimal.ZERO);
            BigDecimal pending = pendingAmounts.getOrDefault(obligation.getUserId(), BigDecimal.ZERO);
            BigDecimal outstanding = obligation.isExempt() ? BigDecimal.ZERO
                    : obligation.getRequiredAmount().subtract(confirmed).max(BigDecimal.ZERO);
            BigDecimal excess = confirmed.subtract(obligation.getRequiredAmount()).max(BigDecimal.ZERO);
            completed = completed.add(confirmed.min(obligation.getRequiredAmount()));
            outstandingTotal = outstandingTotal.add(outstanding);
            excessTotal = excessTotal.add(excess);
            String status = obligation.isExempt() ? "EXEMPT" : confirmed.signum() == 0 ? "UNPAID"
                    : excess.signum() > 0 ? "OVERPAID" : outstanding.signum() == 0 ? "PAID" : "PARTIAL";
            if (obligation.isExempt() || outstanding.signum() == 0) completedMembers++;
            var user = names.get(obligation.getUserId());
            String fullName = user == null ? "Thành viên"
                    : Optional.ofNullable(user.getFullName()).orElse(Optional.ofNullable(user.getUsername()).orElse("Thành viên"));
            memberRows.add(ContributionPeriodResponse.MemberProgress.builder().userId(obligation.getUserId())
                    .fullName(fullName).avatarUrl(user == null ? null : user.getAvatarUrl())
                    .requiredAmount(obligation.getRequiredAmount()).confirmedAmount(confirmed)
                    .pendingAmount(pending).outstandingAmount(outstanding).excessAmount(excess)
                    .exempt(obligation.isExempt()).overdue(!obligation.isExempt() && outstanding.signum() > 0
                            && LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).isAfter(period.getDueDate())).status(status).build());
        }
        BigDecimal progress = period.getRequiredTotal().signum() == 0 ? BigDecimal.ZERO
                : completed.multiply(new BigDecimal("100")).divide(period.getRequiredTotal(), 2, RoundingMode.HALF_UP);
        BigDecimal targetProgress = period.getFundraisingTarget() == null || period.getFundraisingTarget().signum() <= 0 ? null
                : confirmedTotal.multiply(new BigDecimal("100")).divide(period.getFundraisingTarget(), 2, RoundingMode.HALF_UP);
        return ContributionPeriodResponse.builder().id(period.getId()).groupId(period.getGroupId())
                .name(period.getName()).description(period.getDescription()).startDate(period.getStartDate())
                .dueDate(period.getDueDate()).allocationMethod(period.getAllocationMethod().name())
                .frequency(period.getFrequency().name()).status(period.getStatus().name())
                .requiredTotal(period.getRequiredTotal()).fundraisingTarget(period.getFundraisingTarget())
                .confirmedAmount(confirmedTotal).completedObligationAmount(completed).pendingAmount(pendingTotal)
                .outstandingAmount(outstandingTotal).excessAmount(excessTotal).obligationProgressPercent(progress)
                .fundraisingProgressPercent(targetProgress)
                .completedMembers(completedMembers).incompleteMembers(obligations.size() - completedMembers)
                .members(memberRows).build();
    }

    private BigDecimal wholeDong(BigDecimal amount) {
        if (amount == null || amount.signum() < 0 || amount.stripTrailingZeros().scale() > 0) {
            throw new IllegalArgumentException("Số tiền VND phải là số nguyên không âm");
        }
        return amount.setScale(0, RoundingMode.UNNECESSARY);
    }

    private void requireMember(UUID groupId, UUID userId) {
        if (!memberRepository.existsByGroupIdAndUserId(groupId, userId)) throw new SecurityException("Bạn không thuộc nhóm");
    }

    private void requireManager(UUID groupId, UUID userId) {
        var member = memberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new SecurityException("Bạn không thuộc nhóm"));
        if (member.getRole() != MemberRole.OWNER && member.getRole() != MemberRole.ADMIN) {
            throw new SecurityException("Chỉ trưởng nhóm hoặc quản trị viên được quản lý kỳ đóng quỹ");
        }
    }
}
