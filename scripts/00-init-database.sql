-- Lab Management System - Database Initialization Script
-- This script creates the database if it doesn't exist

-- Create database with proper charset and collation
CREATE DATABASE IF NOT EXISTS lnmiit_lab_management 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Use the database
USE lnmiit_lab_management;

-- Display success message
SELECT 'Database lnmiit_lab_management created successfully!' AS Status;
