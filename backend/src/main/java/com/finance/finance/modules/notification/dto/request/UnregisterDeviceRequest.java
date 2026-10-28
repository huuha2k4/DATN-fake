package com.finance.finance.modules.notification.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnregisterDeviceRequest {

    @NotBlank(message = "Device token is required")
    @JsonProperty("device_token")
    private String deviceToken;
}
