package com.finance.finance.modules.schedule.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO để bỏ qua một occurrence
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SkipOccurrenceRequest {

    @JsonProperty("skip_reason")
    @Size(max = 500, message = "Skip reason must not exceed 500 characters")
    private String skipReason;
}
