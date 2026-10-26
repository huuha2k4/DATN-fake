package com.finance.finance.modules.group.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroupMemberId implements Serializable {
    private UUID groupId;
    private UUID userId;
}
