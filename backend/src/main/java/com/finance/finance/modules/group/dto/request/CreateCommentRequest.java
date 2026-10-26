package com.finance.finance.modules.group.dto.request;

import com.finance.finance.common.enums.CommentableType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateCommentRequest {
    @NotNull(message = "Loại không được để trống")
    private CommentableType commentableType; // TRANSACTION, GROUP_EXPENSE

    @NotNull(message = "ID không được để trống")
    private UUID commentableId;

    @NotBlank(message = "Nội dung không được để trống")
    @Size(max = 1000, message = "Nội dung không được quá 1000 ký tự")
    private String content;

    private UUID parentCommentId;
}
