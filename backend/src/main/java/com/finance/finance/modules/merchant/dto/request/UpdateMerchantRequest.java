package com.finance.finance.modules.merchant.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMerchantRequest {
    
    @Size(max = 150, message = "Name must not exceed 150 characters")
    private String name;
    
    @Size(max = 100, message = "Category must not exceed 100 characters")
    private String category;
    
    private UUID defaultCategoryId;
    
    private String[] aliases;
    
    @Size(max = 4, message = "MCC must not exceed 4 characters")
    private String mcc;
    
    @Size(max = 500, message = "Logo URL must not exceed 500 characters")
    private String logoUrl;
}
