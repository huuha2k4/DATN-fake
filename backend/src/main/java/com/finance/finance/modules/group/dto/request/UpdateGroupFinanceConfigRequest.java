package com.finance.finance.modules.group.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateGroupFinanceConfigRequest {
    @NotNull private Boolean useSharedFund;
    @NotNull private Boolean useContributionPeriods;
    @NotNull private Boolean allowMemberSplits;
    @NotNull private Boolean allowDebtSimplification;
    @NotNull private Boolean allowFundReimbursements;
}
