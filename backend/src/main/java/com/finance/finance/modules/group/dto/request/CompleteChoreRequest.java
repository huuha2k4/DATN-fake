package com.finance.finance.modules.group.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompleteChoreRequest {
    private String proofImageKey;
    private String notes;
}
