package com.finance.finance.modules.group.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateGroupRequest {
    @NotBlank(message = "Tên nhóm không được để trống")
    @Size(max = 120, message = "Tên nhóm không được quá 120 ký tự")
    private String name;

    @Size(max = 500, message = "Mô tả không được quá 500 ký tự")
    private String description;

    @NotBlank(message = "Loại nhóm không được để trống")
    private String groupType; // FAMILY, TRAVEL, ROOMMATE, COUPLE, PROJECT, OTHER

    @NotBlank(message = "Tiền tệ không được để trống")
    @Size(min = 3, max = 3, message = "Mã tiền tệ phải là 3 ký tự")
    private String baseCurrency;

    private String avatarKey;

    private GroupSettingsDto settings;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GroupSettingsDto {
        private String splitMethod; // EQUAL, PERCENTAGE, EXACT, SHARES
        private Boolean autoSettle;
        private Boolean requireReceipt;
        private Boolean enableChat;
        private Boolean enableChildWallets;
    }
}
