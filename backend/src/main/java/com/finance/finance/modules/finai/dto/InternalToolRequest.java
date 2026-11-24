package com.finance.finance.modules.finai.dto;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.*;
@Data
public class InternalToolRequest {
    @NotBlank private String contextToken;
    @NotNull private Map<String, Object> arguments;
}

