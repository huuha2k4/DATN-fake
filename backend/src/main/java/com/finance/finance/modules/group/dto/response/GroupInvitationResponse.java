package com.finance.finance.modules.group.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupInvitationResponse {
    private UUID id;
    private UUID groupId;
    private String groupName;
    private String groupType;
    private UUID inviterId;
    private String inviterName;
    private UUID inviteeId;
    private String role;
    private String status;
    private LocalDateTime createdAt;
}
