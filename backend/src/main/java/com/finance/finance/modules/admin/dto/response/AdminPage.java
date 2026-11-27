package com.finance.finance.modules.admin.dto.response;

import java.util.List;

public record AdminPage<T>(List<T> content, int number, int size, long totalElements, int totalPages) {
}
