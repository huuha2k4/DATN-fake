package com.finance.finance.modules.group.dto.response;

import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data @Builder
public class GroupFinanceConfigResponse {
    private UUID groupId;
    private boolean useSharedFund;
    private boolean useContributionPeriods;
    private boolean allowMemberSplits;
    private boolean allowDebtSimplification;
    private boolean allowFundReimbursements;
    private long version;
}
