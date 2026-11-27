package com.finance.finance.modules.admin.dto.request;

import java.util.Locale;

public record AdminPaging(int page, int size, String sort) {
    public AdminPaging {
        if (page < 0 || size < 1 || size > 100 || (long) page * size > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("Invalid page or size (maximum size is 100)");
        }
        if (!"newest".equals(sort) && !"oldest".equals(sort)) {
            throw new IllegalArgumentException("Sort must be newest or oldest");
        }
    }


    public String direction() {
        return "oldest".equals(sort) ? "ASC" : "DESC";
    }

    public static String search(String value) {
        if (value == null || value.isBlank()) return "";
        if (value.length() > 200) throw new IllegalArgumentException("Search is too long");
        return value.trim().toLowerCase(Locale.ROOT);
    }
}
