package com.finance.finance.modules.admin.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAnalyticsResponse {
    private long totalUsers;
    private long activeUsersDAU;   // Hoạt động hôm nay
    private long activeUsersWAU;   // Hoạt động tuần này
    private long activeUsersMAU;   // Hoạt động tháng này
    private double retentionRate;  // Tỷ lệ quay lại (%)

    private long totalTransactions;
    private long totalGroups;
    private long totalReceipts;

    // Biểu đồ hoạt động giao dịch theo ngày (14 ngày gần nhất)
    private List<DailyActivityPoint> activityTrend;

    // Thống kê tính năng được sử dụng nhiều nhất
    private List<FeatureUsageMetric> featureUsages;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyActivityPoint {
        private String date;
        private long transactionCount;
        private long newUsers;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeatureUsageMetric {
        private String featureName;
        private String icon;
        private long totalEvents;
        private double percentage;
    }
}

