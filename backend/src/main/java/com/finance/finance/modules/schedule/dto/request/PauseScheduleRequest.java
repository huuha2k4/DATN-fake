package com.finance.finance.modules.schedule.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO để tạm dừng lịch định kỳ
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PauseScheduleRequest {

    @Size(max = 500, message = "Reason must not exceed 500 characters")
    private String reason;
}
