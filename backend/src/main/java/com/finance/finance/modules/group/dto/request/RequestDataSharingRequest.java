package com.finance.finance.modules.group.dto.request;

import com.finance.finance.common.enums.DataSharingLevel;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request để bố mẹ yêu cầu chia sẻ dữ liệu chi tiêu từ con
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RequestDataSharingRequest {
    
    @NotNull(message = "Mức độ chia sẻ không được để trống")
    private DataSharingLevel requestedLevel;
    
    @Size(max = 500, message = "Lý do yêu cầu không được vượt quá 500 ký tự")
    private String requestReason;
}
