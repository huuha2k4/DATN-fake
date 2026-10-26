package com.finance.finance;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * Script để kiểm tra database
 */
public class CheckDatabase {
    
    private static final String DB_URL = "jdbc:postgresql://localhost:5432/finance_db";
    private static final String USER = "postgres";
    private static final String PASSWORD = "postgres";
    
    public static void main(String[] args) {
        System.out.println("=".repeat(60));
        System.out.println("KIỂM TRA DATABASE");
        System.out.println("=".repeat(60));
        
        try (Connection conn = DriverManager.getConnection(DB_URL, USER, PASSWORD);
             Statement stmt = conn.createStatement()) {
            
            // Liệt kê tất cả schemas
            System.out.println("\nSchemas:");
            ResultSet rs = stmt.executeQuery("SELECT schema_name FROM information_schema.schemata ORDER BY schema_name");
            while (rs.next()) {
                System.out.println("  - " + rs.getString(1));
            }
            
            // Kiểm tra bảng schedule_occurrences
            System.out.println("\nKiểm tra bảng schedule_occurrences:");
            rs = stmt.executeQuery(
                "SELECT column_name, data_type " +
                "FROM information_schema.columns " +
                "WHERE table_schema = 'core' AND table_name = 'schedule_occurrences' " +
                "ORDER BY ordinal_position"
            );
            
            boolean found = false;
            while (rs.next()) {
                found = true;
                System.out.println("  " + rs.getString(1) + ": " + rs.getString(2));
            }
            
            if (!found) {
                System.out.println("  Bảng KHÔNG tồn tại (OK - Flyway sẽ tạo!)");
            } else {
                System.out.println("  ⚠️  Bảng ĐÃ TỒN TẠI - cần xóa lại!");
            }
            
            // Đếm số bảng trong schema core
            System.out.println("\nSố bảng trong schema core:");
            rs = stmt.executeQuery("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'core'");
            if (rs.next()) {
                System.out.println("  " + rs.getInt(1) + " bảng");
            }
            
            System.out.println("\n" + "=".repeat(60));
            
        } catch (Exception e) {
            System.err.println("❌ LỖI: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
