package com.finance.finance.modules.group.dto.response;

import com.finance.finance.modules.group.dto.request.CreateGroupRequest;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupDetailResponse {
    private UUID id;
    private String name;
    private String description;
    private String groupType;
    private String baseCurrency;
    private String avatarKey;
    private UUID ownerId;
    private String status;
    private Integer memberCount;
    private Integer childWalletCount;
    private BigDecimal totalExpenses;
    private BigDecimal totalSettlements;
    private CreateGroupRequest.GroupSettingsDto settings;
    private String myRole;
    private BigDecimal myBalance;
    private List<String> myPermissions;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long version;
}
