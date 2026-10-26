-- =====================================================
-- SCRIPT RESET DATABASE HOÀN TOÀN
-- CẢNH BÁO: XÓA TOÀN BỘ DATA!
-- =====================================================

-- Kết nối vào database finance_db
\c finance_db

-- Bước 1: Xóa toàn bộ schema core và public
DROP SCHEMA IF EXISTS core CASCADE;
DROP SCHEMA IF EXISTS public CASCADE;

-- Bước 2: Tạo lại schema
CREATE SCHEMA core;
CREATE SCHEMA public;

-- Bước 3: Tạo extension UUID nếu chưa có
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Hoàn tất! Giờ restart backend để Flyway chạy toàn bộ migrations từ V1-V10
\echo 'Database đã reset xong! Restart backend để Flyway tạo lại schema.'
