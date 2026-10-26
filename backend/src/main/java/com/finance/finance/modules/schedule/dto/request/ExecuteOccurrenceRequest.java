package com.finance.finance.modules.schedule.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Request DTO để thực hiện occurrence ngay lập tức
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExecuteOccurrenceRequest {

    @NotNull(message = "Execute date is required")
    @JsonProperty("execute_date")
    private LocalDate executeDate;
}
