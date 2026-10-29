package com.finance.finance.modules.notification.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceRegistrationResponse {

    @JsonProperty("device_id")
    private UUID deviceId;

    @JsonProperty("device_token")
    private String deviceToken;

    @JsonProperty("registered_at")
    private LocalDateTime registeredAt;
}
