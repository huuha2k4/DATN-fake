package com.finance.finance.modules.group.service;

import com.finance.finance.common.enums.*;
import com.finance.finance.modules.group.dto.request.UpdateGroupFinanceConfigRequest;
import com.finance.finance.modules.group.dto.response.GroupFinanceConfigResponse;
import com.finance.finance.modules.group.entity.GroupFinanceConfig;
import com.finance.finance.modules.group.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GroupFinanceConfigService {
    private final GroupFinanceConfigRepository configRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository memberRepository;
    private final ContributionPeriodRepository periodRepository;
    private final GroupFundRepository fundRepository;
    private final FundReimbursementRepository reimbursementRepository;

    @Transactional
    public GroupFinanceConfigResponse get(UUID groupId, UUID userId) {
        requireMember(groupId, userId);
        return response(configRepository.findById(groupId).orElseGet(() -> createDefault(groupId)));
    }

    @Transactional
    public GroupFinanceConfigResponse update(UUID groupId, UpdateGroupFinanceConfigRequest request, UUID userId) {
        requireManager(groupId, userId);
        groupRepository.findByIdForUpdate(groupId).orElseThrow();
        if (request.getAllowDebtSimplification() && !request.getAllowMemberSplits()) {
            throw new IllegalArgumentException("Cân đối bù trừ yêu cầu bật chia tiền thành viên");
        }
        if (request.getUseContributionPeriods() && !request.getUseSharedFund()) {
            throw new IllegalArgumentException("Kỳ đóng quỹ yêu cầu bật quỹ chung");
        }
        if (request.getAllowFundReimbursements() && !request.getUseSharedFund()) {
            throw new IllegalArgumentException("Hoàn trả tiền ứng yêu cầu bật quỹ chung");
        }
        if (!request.getUseContributionPeriods()
                && periodRepository.findFirstByGroupIdAndStatus(groupId, ContributionPeriodStatus.ACTIVE).isPresent()) {
            throw new IllegalStateException("Hãy kết thúc kỳ đóng quỹ đang hoạt động trước khi tắt tính năng");
        }
        if (!request.getAllowFundReimbursements()
                && reimbursementRepository.existsByGroupIdAndStatusIn(groupId,
                    java.util.List.of(FundReimbursementStatus.PENDING, FundReimbursementStatus.PARTIAL))) {
            throw new IllegalStateException("Không thể tắt hoàn trả khi quỹ còn nghĩa vụ chưa hoàn tất");
        }
        if (!request.getUseSharedFund() && fundRepository.findByGroupIdForUpdate(groupId)
                .map(fund -> fund.getBalance().signum() != 0).orElse(false)) {
            throw new IllegalStateException("Hãy đối chiếu và xử lý số dư quỹ trước khi tắt quỹ chung");
        }

        GroupFinanceConfig config = configRepository.findById(groupId).orElseGet(() -> createDefault(groupId));
        config.setUseSharedFund(request.getUseSharedFund());
        config.setUseContributionPeriods(request.getUseContributionPeriods());
        config.setAllowMemberSplits(request.getAllowMemberSplits());
        config.setAllowDebtSimplification(request.getAllowDebtSimplification());
        config.setAllowFundReimbursements(request.getAllowFundReimbursements());
        return response(configRepository.save(config));
    }

    private GroupFinanceConfig createDefault(UUID groupId) {
        var group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nhóm"));
        boolean split = group.getGroupType() == GroupType.ROOMMATE || group.getGroupType() == GroupType.TRAVEL;
        return configRepository.save(GroupFinanceConfig.builder()
                .groupId(groupId).useSharedFund(true).useContributionPeriods(true)
                .allowMemberSplits(split).allowDebtSimplification(split)
                .allowFundReimbursements(true).build());
    }

    private void requireMember(UUID groupId, UUID userId) {
        if (!memberRepository.existsByGroupIdAndUserId(groupId, userId)) {
            throw new SecurityException("Bạn không phải thành viên của nhóm này");
        }
    }

    private void requireManager(UUID groupId, UUID userId) {
        var member = memberRepository.findByGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new SecurityException("Bạn không phải thành viên của nhóm này"));
        if (member.getRole() != MemberRole.OWNER && member.getRole() != MemberRole.ADMIN) {
            throw new SecurityException("Chỉ trưởng nhóm hoặc quản trị viên được thay đổi cấu hình tài chính");
        }
    }

    private GroupFinanceConfigResponse response(GroupFinanceConfig c) {
        return GroupFinanceConfigResponse.builder().groupId(c.getGroupId())
                .useSharedFund(c.isUseSharedFund()).useContributionPeriods(c.isUseContributionPeriods())
                .allowMemberSplits(c.isAllowMemberSplits()).allowDebtSimplification(c.isAllowDebtSimplification())
                .allowFundReimbursements(c.isAllowFundReimbursements()).version(c.getVersion()).build();
    }
}
