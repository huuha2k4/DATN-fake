package com.finance.finance.modules.notification.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.finance.finance.common.enums.DeviceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterDeviceRequest {

    @NotBlank(message = "Device token is required")
    @Size(max = 500, message = "Device token must not exceed 500 characters")
    @JsonProperty("device_token")
    private String deviceToken;

    @NotNull(message = "Device type is required")
    @JsonProperty("device_type")
    private DeviceType deviceType;

    @Size(max = 255, message = "Device name must not exceed 255 characters")
    @JsonProperty("device_name")
    private String deviceName;

    @Size(max = 50, message = "App version must not exceed 50 characters")
    @JsonProperty("app_version")
    private String appVersion;
}
