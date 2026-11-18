package com.finance.finance.modules.admin.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardOverviewResponse {
    // User metrics
    private long totalUsers;
    private long activeUsers;
    private long lockedUsers;
    private long pendingUsers;
    private long newUsersToday;
    private long newUsersThisMonth;

    // Subscription metrics
    private long freeUsers;
    private long premiumUsers;
    private long enterpriseUsers;

    // Engagement & system volume metrics (privacy-safe, NO financial balances)
    private long totalGroups;
    private long totalTransactions;
    private long transactionsToday;
    private long totalReceiptsScanned;

    // Growth charts data (last 7 days / last 30 days)
    private List<DailyMetricPoint> userGrowth;
    private List<DailyMetricPoint> transactionActivity;

    // Health / service status
    private Map<String, Object> systemHealth;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyMetricPoint {
        private String date; // YYYY-MM-DD
        private long count;
    }
}

