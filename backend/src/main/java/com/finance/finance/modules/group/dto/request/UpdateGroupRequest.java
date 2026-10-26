package com.finance.finance.modules.group.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateGroupRequest {
    @Size(max = 120, message = "Tên nhóm không được quá 120 ký tự")
    private String name;

    @Size(max = 500, message = "Mô tả không được quá 500 ký tự")
    private String description;

    private String avatarKey;

    private CreateGroupRequest.GroupSettingsDto settings;
}
