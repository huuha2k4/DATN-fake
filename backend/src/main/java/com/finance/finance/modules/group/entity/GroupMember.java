package com.finance.finance.modules.group.entity;

import com.finance.finance.common.enums.MemberRole;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "group_members", schema = "core")
@IdClass(GroupMemberId.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupMember {
    @Id
    @Column(name = "group_id")
    private UUID groupId;

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MemberRole role = MemberRole.MEMBER;

    @Column(name = "contribution_ratio", precision = 5, scale = 2)
    private BigDecimal contributionRatio;

    @Column(name = "joined_at", nullable = false)
    @Builder.Default
    private LocalDateTime joinedAt = LocalDateTime.now();
}
