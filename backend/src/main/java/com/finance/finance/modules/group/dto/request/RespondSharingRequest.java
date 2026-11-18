package com.finance.finance.modules.group.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request để con phản hồi yêu cầu chia sẻ dữ liệu từ bố mẹ
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RespondSharingRequest {
    
    @NotBlank(message = "Action không được để trống")
    private String action;  // APPROVE hoặc REJECT
    
    /**
     * Số ngày hết hạn đồng ý (chỉ dùng khi APPROVE)
     * Mặc định: 90 ngày (3 tháng)
     */
    @Min(value = 1, message = "Số ngày hết hạn phải >= 1")
    @Builder.Default
    private Integer expiresInDays = 90;
    
    /**
     * Lý do từ chối (chỉ dùng khi REJECT)
     */
    @Size(max = 500, message = "Lý do từ chối không được vượt quá 500 ký tự")
    private String rejectionReason;
}
