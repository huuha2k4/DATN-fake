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
public class AdminRoleStatResponse {
    private String role;
    private String name;
    private String description;
    private long totalAccounts;
    private List<String> permissions;
    private boolean isSystemProtected;
}

