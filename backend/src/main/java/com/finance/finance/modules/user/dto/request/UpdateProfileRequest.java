package com.finance.finance.modules.user.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {
    
    @Size(max = 100, message = "Full name must not exceed 100 characters")
    private String fullName;
    
    @Size(max = 20, message = "Phone number must not exceed 20 characters")
    @Pattern(regexp = "^[0-9+\\-\\s()]*$", message = "Invalid phone number format")
    private String phone;
    
    @Size(min = 3, max = 3, message = "Currency code must be exactly 3 characters")
    @Pattern(regexp = "^[A-Z]{3}$", message = "Currency code must be in ISO 4217 format (e.g., USD, VND)")
    private String preferredCurrency;
    
    @Size(max = 50, message = "Timezone must not exceed 50 characters")
    private String timezone;
    
    @Size(max = 10, message = "Language code must not exceed 10 characters")
    @Pattern(regexp = "^[a-z]{2}-[A-Z]{2}$", message = "Language must be in format: xx-XX (e.g., vi-VN, en-US)")
    private String language;
}
