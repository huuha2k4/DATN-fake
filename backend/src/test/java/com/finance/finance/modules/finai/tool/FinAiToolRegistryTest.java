package com.finance.finance.modules.finai.tool;

import com.finance.finance.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class FinAiToolRegistryTest {
    private final FinAiToolRegistry registry = new FinAiToolRegistry();

    @Test
    void registersFullReadCatalogAndWriteWaves() {
        assertEquals(Set.of("get_transactions", "get_accounts", "get_financial_overview", "get_budgets",
                        "get_goals", "get_debts", "get_schedules", "get_groups", "get_group_finances",
                        "create_transaction", "create_budget", "create_goal", "contribute_to_goal",
                        "create_debt", "record_debt_payment", "update_budget", "create_schedule",
                        "update_schedule", "create_account", "create_group_transaction", "contribute_group_fund",
                        "create_child_spend", "deposit_child_wallet"),
                registry.all().stream().map(FinAiToolDefinition::name).collect(java.util.stream.Collectors.toSet()));
    }

    @Test
    void rejectsUnknownToolAndArguments() {
        assertThrows(BusinessException.class, () -> registry.require("run_sql"));
        assertThrows(BusinessException.class, () -> registry.validate("get_transactions", Map.of("userId", UUID.randomUUID()), FinAiToolMode.READ));
    }

    @Test
    void rejectsWriteInReadExecutionPath() {
        BusinessException error = assertThrows(BusinessException.class,
                () -> registry.validate("create_budget", Map.of(), FinAiToolMode.READ));
        assertEquals("FINAI_TOOL_MODE_INVALID", error.getErrorCode());
    }

    @Test
    void groupReadRequiresTrustedResourceArgumentsButNeverUserId() {
        assertThrows(BusinessException.class, () -> registry.validate("get_group_finances",
                Map.of("section", "overview"), FinAiToolMode.READ));
        assertDoesNotThrow(() -> registry.validate("get_group_finances",
                Map.of("groupId", UUID.randomUUID(), "section", "overview"), FinAiToolMode.READ));
        assertThrows(BusinessException.class, () -> registry.validate("get_group_finances",
                Map.of("groupId", UUID.randomUUID(), "section", "overview", "userId", UUID.randomUUID()), FinAiToolMode.READ));
    }
}

