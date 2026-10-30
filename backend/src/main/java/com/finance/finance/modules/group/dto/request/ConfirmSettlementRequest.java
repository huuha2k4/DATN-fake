package com.finance.finance.modules.group.dto.request;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;
@Data public class ConfirmSettlementRequest { @NotNull private UUID receivingAccountId; }
