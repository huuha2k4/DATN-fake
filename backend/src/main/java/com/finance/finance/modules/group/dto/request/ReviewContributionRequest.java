package com.finance.finance.modules.group.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ReviewContributionRequest {
    @Size(max = 500) private String reason;
}
