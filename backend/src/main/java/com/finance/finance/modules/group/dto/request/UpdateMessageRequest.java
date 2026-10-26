package com.finance.finance.modules.group.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMessageRequest {
    @NotBlank(message = "Nội dung không được để trống")
    private String content;
}
