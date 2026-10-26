package com.finance.finance.modules.group.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCommentRequest {
    @NotBlank(message = "Nội dung không được để trống")
    @Size(max = 1000, message = "Nội dung không được quá 1000 ký tự")
    private String content;
}
