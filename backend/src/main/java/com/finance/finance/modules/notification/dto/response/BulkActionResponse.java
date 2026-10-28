package com.finance.finance.modules.notification.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkActionResponse {

    @JsonProperty("marked_count")
    private Integer markedCount;

    @JsonProperty("deleted_count")
    private Integer deletedCount;
}
