-- MySQL dump 10.13  Distrib 9.4.0, for macos15.4 (arm64)
--
-- Host: localhost    Database: lnmiit_lab_management
-- ------------------------------------------------------
-- Server version	9.4.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `approval_timeline`
--

DROP TABLE IF EXISTS `approval_timeline`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `approval_timeline` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_request_id` int NOT NULL,
  `stage` enum('faculty','staff','hod') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` enum('approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `approved_by` int NOT NULL,
  `approved_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `booking_request_id` (`booking_request_id`),
  KEY `approved_by` (`approved_by`),
  CONSTRAINT `approval_timeline_ibfk_1` FOREIGN KEY (`booking_request_id`) REFERENCES `booking_requests` (`id`),
  CONSTRAINT `approval_timeline_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `approval_timeline`
--

LOCK TABLES `approval_timeline` WRITE;
/*!40000 ALTER TABLE `approval_timeline` DISABLE KEYS */;
/*!40000 ALTER TABLE `approval_timeline` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `archived_attendance`
--

DROP TABLE IF EXISTS `archived_attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `archived_attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `original_id` int NOT NULL,
  `lab_id` int DEFAULT NULL,
  `student_id` int DEFAULT NULL,
  `faculty_id` int DEFAULT NULL,
  `attendance_date` date NOT NULL,
  `time_slot` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT NULL,
  `archived_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `archived_attendance`
--

LOCK TABLES `archived_attendance` WRITE;
/*!40000 ALTER TABLE `archived_attendance` DISABLE KEYS */;
/*!40000 ALTER TABLE `archived_attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `archived_item_issues`
--

DROP TABLE IF EXISTS `archived_item_issues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `archived_item_issues` (
  `id` int NOT NULL AUTO_INCREMENT,
  `original_id` int NOT NULL,
  `inventory_id` int DEFAULT NULL,
  `issued_to` int DEFAULT NULL,
  `issued_by` int DEFAULT NULL,
  `issue_date` datetime DEFAULT NULL,
  `expected_return_date` date DEFAULT NULL,
  `actual_return_date` datetime DEFAULT NULL,
  `quantity_issued` int DEFAULT NULL,
  `purpose` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `return_condition` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT NULL,
  `archived_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `archived_item_issues`
--

LOCK TABLES `archived_item_issues` WRITE;
/*!40000 ALTER TABLE `archived_item_issues` DISABLE KEYS */;
/*!40000 ALTER TABLE `archived_item_issues` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `archived_lab_bookings`
--

DROP TABLE IF EXISTS `archived_lab_bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `archived_lab_bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `original_id` int NOT NULL,
  `lab_id` int DEFAULT NULL,
  `booked_by` int DEFAULT NULL,
  `booking_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `purpose` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `expected_students` int DEFAULT NULL,
  `equipment_needed` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `approval_status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `approval_date` datetime DEFAULT NULL,
  `approval_remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `archived_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `archived_lab_bookings`
--

LOCK TABLES `archived_lab_bookings` WRITE;
/*!40000 ALTER TABLE `archived_lab_bookings` DISABLE KEYS */;
/*!40000 ALTER TABLE `archived_lab_bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `archived_marks`
--

DROP TABLE IF EXISTS `archived_marks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `archived_marks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `original_id` int NOT NULL,
  `student_id` int DEFAULT NULL,
  `lab_id` int DEFAULT NULL,
  `faculty_id` int DEFAULT NULL,
  `assessment_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assessment_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `marks_obtained` decimal(5,2) DEFAULT NULL,
  `total_marks` decimal(5,2) DEFAULT NULL,
  `assessment_date` date DEFAULT NULL,
  `academic_year` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `semester` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT NULL,
  `archived_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `archived_marks`
--

LOCK TABLES `archived_marks` WRITE;
/*!40000 ALTER TABLE `archived_marks` DISABLE KEYS */;
/*!40000 ALTER TABLE `archived_marks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `archived_system_logs`
--

DROP TABLE IF EXISTS `archived_system_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `archived_system_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `original_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `action` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` int DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `timestamp` datetime DEFAULT NULL,
  `archived_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `archived_system_logs`
--

LOCK TABLES `archived_system_logs` WRITE;
/*!40000 ALTER TABLE `archived_system_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `archived_system_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `archived_users`
--

DROP TABLE IF EXISTS `archived_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `archived_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `original_user_id` int NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `student_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employee_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `was_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `archived_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=102 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `archived_users`
--

LOCK TABLES `archived_users` WRITE;
/*!40000 ALTER TABLE `archived_users` DISABLE KEYS */;
INSERT INTO `archived_users` VALUES (100,131,'preeti@lnmiit.ac.in',NULL,'PREETI SINGH','faculty','CSE',NULL,NULL,NULL,1,'2025-11-10 23:56:32','2025-11-10 23:56:42','2025-11-10 23:56:58'),(101,128,'mohit@lnmiit.ac.in',NULL,'MOHIT  MAKKAR','student','MME',NULL,NULL,NULL,1,'2025-11-10 23:54:33',NULL,'2025-11-11 00:07:33');
/*!40000 ALTER TABLE `archived_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lab_id` int DEFAULT NULL,
  `student_id` int DEFAULT NULL,
  `faculty_id` int DEFAULT NULL,
  `attendance_date` date NOT NULL,
  `time_slot` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('present','absent','late') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'present',
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_attendance_lab` (`lab_id`),
  KEY `idx_attendance_student` (`student_id`),
  KEY `idx_attendance_date` (`attendance_date`),
  KEY `fk_attendance_faculty` (`faculty_id`),
  CONSTRAINT `fk_attendance_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attendance_lab` FOREIGN KEY (`lab_id`) REFERENCES `labs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attendance_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance`
--

LOCK TABLES `attendance` WRITE;
/*!40000 ALTER TABLE `attendance` DISABLE KEYS */;
/*!40000 ALTER TABLE `attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `booking_request_status_history`
--

DROP TABLE IF EXISTS `booking_request_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_request_status_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_request_id` int NOT NULL,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `previous_status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changed_by_id` int DEFAULT NULL,
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `booking_request_id` (`booking_request_id`),
  KEY `changed_by_id` (`changed_by_id`),
  CONSTRAINT `booking_request_status_history_ibfk_1` FOREIGN KEY (`booking_request_id`) REFERENCES `booking_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `booking_request_status_history_ibfk_2` FOREIGN KEY (`changed_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking_request_status_history`
--

LOCK TABLES `booking_request_status_history` WRITE;
/*!40000 ALTER TABLE `booking_request_status_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `booking_request_status_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `booking_requests`
--

DROP TABLE IF EXISTS `booking_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_type` enum('lab_booking','item_requisition') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `requested_by` int NOT NULL,
  `lab_id` int NOT NULL,
  `item_id` int DEFAULT NULL,
  `quantity_requested` int DEFAULT NULL,
  `faculty_supervisor_id` int DEFAULT NULL,
  `booking_date` date DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `purpose` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending_faculty','pending_lab_staff','pending_hod','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending_faculty',
  `faculty_approved_by` int DEFAULT NULL,
  `faculty_approved_at` timestamp NULL DEFAULT NULL,
  `faculty_remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `lab_staff_approved_by` int DEFAULT NULL,
  `lab_staff_approved_at` timestamp NULL DEFAULT NULL,
  `lab_staff_remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `hod_approved_by` int DEFAULT NULL,
  `hod_approved_at` timestamp NULL DEFAULT NULL,
  `hod_remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `rejected_by` int DEFAULT NULL,
  `rejected_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `item_id` (`item_id`),
  KEY `faculty_supervisor_id` (`faculty_supervisor_id`),
  KEY `faculty_approved_by` (`faculty_approved_by`),
  KEY `lab_staff_approved_by` (`lab_staff_approved_by`),
  KEY `hod_approved_by` (`hod_approved_by`),
  KEY `rejected_by` (`rejected_by`),
  KEY `idx_booking_requests_user` (`requested_by`),
  KEY `idx_booking_requests_lab` (`lab_id`),
  KEY `idx_booking_requests_status` (`status`),
  KEY `idx_booking_requests_date` (`booking_date`),
  CONSTRAINT `booking_requests_ibfk_1` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `booking_requests_ibfk_2` FOREIGN KEY (`lab_id`) REFERENCES `labs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `booking_requests_ibfk_3` FOREIGN KEY (`item_id`) REFERENCES `lab_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `booking_requests_ibfk_4` FOREIGN KEY (`faculty_supervisor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `booking_requests_ibfk_5` FOREIGN KEY (`faculty_approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `booking_requests_ibfk_6` FOREIGN KEY (`lab_staff_approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `booking_requests_ibfk_7` FOREIGN KEY (`hod_approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `booking_requests_ibfk_8` FOREIGN KEY (`rejected_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking_requests`
--

LOCK TABLES `booking_requests` WRITE;
/*!40000 ALTER TABLE `booking_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `booking_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `component_activity_logs`
--

DROP TABLE IF EXISTS `component_activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `component_activity_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entity_type` enum('component_request','component_loan') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` int DEFAULT NULL,
  `lab_id` int DEFAULT NULL,
  `actor_user_id` int DEFAULT NULL,
  `actor_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actor_email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actor_role` enum('student','faculty','lab_staff','hod','admin','others','non_teaching') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `entity_snapshot` json DEFAULT NULL,
  `changes_made` json DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_component_logs_entity` (`entity_type`,`entity_id`),
  KEY `idx_component_logs_lab` (`lab_id`),
  KEY `idx_component_logs_actor` (`actor_user_id`),
  KEY `idx_component_logs_action` (`action`),
  KEY `idx_component_logs_created` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Activity logs for component requests and loans - preserves history even after deletions';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `component_activity_logs`
--

LOCK TABLES `component_activity_logs` WRITE;
/*!40000 ALTER TABLE `component_activity_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `component_activity_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `component_loan_items`
--

DROP TABLE IF EXISTS `component_loan_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `component_loan_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `loan_id` int NOT NULL,
  `component_id` int NOT NULL,
  `quantity` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `loan_id` (`loan_id`),
  KEY `component_id` (`component_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `component_loan_items`
--

LOCK TABLES `component_loan_items` WRITE;
/*!40000 ALTER TABLE `component_loan_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `component_loan_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `component_loans`
--

DROP TABLE IF EXISTS `component_loans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `component_loans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lab_id` int NOT NULL,
  `requester_id` int NOT NULL,
  `initiator_role` enum('student','faculty') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `purpose` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending_lab_staff','issued','return_requested','returned','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending_lab_staff',
  `due_date` date NOT NULL,
  `issued_at` datetime DEFAULT NULL,
  `returned_at` datetime DEFAULT NULL,
  `lab_staff_approver_id` int DEFAULT NULL,
  `lab_staff_remarks` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `extension_requested_due_date` date DEFAULT NULL,
  `extension_requested_reason` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `extension_status` enum('none','pending','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  `delay_days` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `lab_id` (`lab_id`),
  KEY `requester_id` (`requester_id`),
  KEY `status` (`status`),
  KEY `due_date` (`due_date`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `component_loans`
--

LOCK TABLES `component_loans` WRITE;
/*!40000 ALTER TABLE `component_loans` DISABLE KEYS */;
/*!40000 ALTER TABLE `component_loans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `component_request_items`
--

DROP TABLE IF EXISTS `component_request_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `component_request_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `component_id` int NOT NULL,
  `quantity_requested` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `request_id` (`request_id`),
  KEY `component_id` (`component_id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `component_request_items`
--

LOCK TABLES `component_request_items` WRITE;
/*!40000 ALTER TABLE `component_request_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `component_request_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `component_requests`
--

DROP TABLE IF EXISTS `component_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `component_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lab_id` int NOT NULL,
  `requester_id` int NOT NULL,
  `initiator_role` enum('student','faculty') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mentor_faculty_id` int DEFAULT NULL,
  `purpose` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `return_date` date DEFAULT NULL,
  `status` enum('pending_faculty','pending_lab_staff','pending_hod','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending_faculty',
  `faculty_approver_id` int DEFAULT NULL,
  `faculty_approved_at` datetime DEFAULT NULL,
  `faculty_remarks` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lab_staff_approver_id` int DEFAULT NULL,
  `lab_staff_approved_at` datetime DEFAULT NULL,
  `lab_staff_remarks` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hod_approver_id` int DEFAULT NULL,
  `hod_approved_at` datetime DEFAULT NULL,
  `issued_at` datetime DEFAULT NULL,
  `return_requested_at` datetime DEFAULT NULL,
  `returned_at` datetime DEFAULT NULL,
  `return_approved_by` int DEFAULT NULL,
  `return_approved_at` datetime DEFAULT NULL,
  `return_remarks` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actual_return_date` date DEFAULT NULL,
  `hod_remarks` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rejected_by_id` int DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `rejection_reason` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `extension_requested_at` datetime DEFAULT NULL,
  `extension_requested_until` date DEFAULT NULL,
  `extension_approved_by` int DEFAULT NULL,
  `extension_approved_at` datetime DEFAULT NULL,
  `extension_remarks` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `lab_id` (`lab_id`),
  KEY `requester_id` (`requester_id`),
  KEY `status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `component_requests`
--

LOCK TABLES `component_requests` WRITE;
/*!40000 ALTER TABLE `component_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `component_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `components`
--

DROP TABLE IF EXISTS `components`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `components` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lab_id` int NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `condition_status` enum('working','dead','consumable') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'working',
  `quantity_total` int NOT NULL DEFAULT '0',
  `quantity_available` int NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `lab_id` (`lab_id`)
) ENGINE=InnoDB AUTO_INCREMENT=82 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `components`
--

LOCK TABLES `components` WRITE;
/*!40000 ALTER TABLE `components` DISABLE KEYS */;
/*!40000 ALTER TABLE `components` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `hod_id` int DEFAULT NULL,
  `hod_email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_departments_code` (`code`),
  KEY `idx_departments_hod` (`hod_id`),
  CONSTRAINT `fk_departments_hod` FOREIGN KEY (`hod_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES (36,'Computer Science and Engineering ','CSE','2025-11-10 23:50:10',129,'hodcse@lnmiit.ac.in'),(37,'Computer and Communication Engineering ','CCE','2025-11-10 23:50:32',133,'hodcce@lnmiit.ac.in'),(38,'MME','MME','2025-11-10 23:50:44',142,'hod.mme@lnmiit.ac.in');
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lab_id` int NOT NULL,
  `item_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_available` int NOT NULL DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `item_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity_total` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_inventory_item_name` (`item_name`),
  KEY `idx_inventory_lab` (`lab_id`),
  CONSTRAINT `inventory_ibfk_1` FOREIGN KEY (`lab_id`) REFERENCES `labs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory`
--

LOCK TABLES `inventory` WRITE;
/*!40000 ALTER TABLE `inventory` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_issues`
--

DROP TABLE IF EXISTS `item_issues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_issues` (
  `id` int NOT NULL AUTO_INCREMENT,
  `inventory_id` int DEFAULT NULL,
  `issued_to` int DEFAULT NULL,
  `issued_by` int DEFAULT NULL,
  `issue_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `expected_return_date` date DEFAULT NULL,
  `actual_return_date` datetime DEFAULT NULL,
  `quantity_issued` int DEFAULT '1',
  `purpose` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('issued','returned','overdue','lost','damaged') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'issued',
  `return_condition` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_item_issues_inventory` (`inventory_id`),
  KEY `idx_item_issues_issued_to` (`issued_to`),
  KEY `idx_item_issues_status` (`status`),
  KEY `fk_item_issues_issued_by` (`issued_by`),
  CONSTRAINT `fk_item_issues_inventory` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_item_issues_issued_by` FOREIGN KEY (`issued_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_item_issues_issued_to` FOREIGN KEY (`issued_to`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_issues`
--

LOCK TABLES `item_issues` WRITE;
/*!40000 ALTER TABLE `item_issues` DISABLE KEYS */;
/*!40000 ALTER TABLE `item_issues` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lab_booking_activity_logs`
--

DROP TABLE IF EXISTS `lab_booking_activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lab_booking_activity_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int DEFAULT NULL,
  `lab_id` int DEFAULT NULL,
  `actor_user_id` int DEFAULT NULL,
  `actor_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actor_email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actor_role` enum('student','faculty','lab_staff','hod','admin','others','non_teaching') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `booking_snapshot` json DEFAULT NULL,
  `changes_made` json DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lab_booking_logs_booking` (`booking_id`),
  KEY `idx_lab_booking_logs_lab` (`lab_id`),
  KEY `idx_lab_booking_logs_actor` (`actor_user_id`),
  KEY `idx_lab_booking_logs_action` (`action`),
  KEY `idx_lab_booking_logs_created` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=82 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Activity logs for lab bookings - preserves history even after deletions';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lab_booking_activity_logs`
--

LOCK TABLES `lab_booking_activity_logs` WRITE;
/*!40000 ALTER TABLE `lab_booking_activity_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `lab_booking_activity_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lab_bookings`
--

DROP TABLE IF EXISTS `lab_bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lab_bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lab_id` int NOT NULL,
  `booked_by` int NOT NULL,
  `booking_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `purpose` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expected_students` int DEFAULT NULL,
  `equipment_needed` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `approval_status` enum('pending','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `approved_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `booked_by` (`booked_by`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_lab_bookings_lab_date` (`lab_id`,`booking_date`),
  KEY `idx_lab_bookings_time` (`start_time`,`end_time`),
  KEY `idx_lab_bookings_status` (`approval_status`),
  CONSTRAINT `lab_bookings_ibfk_1` FOREIGN KEY (`lab_id`) REFERENCES `labs` (`id`),
  CONSTRAINT `lab_bookings_ibfk_2` FOREIGN KEY (`booked_by`) REFERENCES `users` (`id`),
  CONSTRAINT `lab_bookings_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lab_bookings`
--

LOCK TABLES `lab_bookings` WRITE;
/*!40000 ALTER TABLE `lab_bookings` DISABLE KEYS */;
/*!40000 ALTER TABLE `lab_bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lab_items`
--

DROP TABLE IF EXISTS `lab_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lab_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lab_id` int NOT NULL,
  `item_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `quantity_available` int NOT NULL DEFAULT '0',
  `quantity_total` int NOT NULL DEFAULT '0',
  `item_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` enum('available','maintenance','out_of_stock') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'available',
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lab_items_lab_id` (`lab_id`),
  KEY `idx_lab_items_code` (`item_code`),
  CONSTRAINT `lab_items_ibfk_1` FOREIGN KEY (`lab_id`) REFERENCES `labs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lab_items`
--

LOCK TABLES `lab_items` WRITE;
/*!40000 ALTER TABLE `lab_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `lab_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lab_staff_assignments`
--

DROP TABLE IF EXISTS `lab_staff_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lab_staff_assignments` (
  `lab_id` int NOT NULL,
  `staff_id` int NOT NULL,
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`lab_id`,`staff_id`),
  KEY `fk_lsa_staff` (`staff_id`),
  CONSTRAINT `fk_lsa_lab` FOREIGN KEY (`lab_id`) REFERENCES `labs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_lsa_staff` FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lab_staff_assignments`
--

LOCK TABLES `lab_staff_assignments` WRITE;
/*!40000 ALTER TABLE `lab_staff_assignments` DISABLE KEYS */;
INSERT INTO `lab_staff_assignments` VALUES (13,126,'2025-11-10 23:53:51'),(14,127,'2025-11-10 23:53:54'),(15,143,'2025-11-11 00:09:11');
/*!40000 ALTER TABLE `lab_staff_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lab_timetables`
--

DROP TABLE IF EXISTS `lab_timetables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lab_timetables` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lab_id` int NOT NULL,
  `day_of_week` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `subject` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `faculty_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `semester` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `section` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `batch` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_available` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lab_timetables_lab_day` (`lab_id`,`day_of_week`),
  KEY `idx_lab_timetables_time` (`start_time`,`end_time`),
  CONSTRAINT `lab_timetables_ibfk_1` FOREIGN KEY (`lab_id`) REFERENCES `labs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=273 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lab_timetables`
--

LOCK TABLES `lab_timetables` WRITE;
/*!40000 ALTER TABLE `lab_timetables` DISABLE KEYS */;
/*!40000 ALTER TABLE `lab_timetables` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `labs`
--

DROP TABLE IF EXISTS `labs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `labs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` int DEFAULT NULL,
  `staff_id` int DEFAULT NULL,
  `capacity` int DEFAULT '30',
  `location` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `staff_id` (`staff_id`),
  KEY `idx_labs_is_active` (`is_active`),
  KEY `idx_labs_department_id` (`department_id`),
  CONSTRAINT `labs_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
  CONSTRAINT `labs_ibfk_2` FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `labs`
--

LOCK TABLES `labs` WRITE;
/*!40000 ALTER TABLE `labs` DISABLE KEYS */;
INSERT INTO `labs` VALUES (13,'Computer Lab1 ','CP1',36,126,100,NULL,1),(14,'Computer Lab2 ','CP2',36,127,30,NULL,1),(15,'Computer Lab 3','CP3',36,NULL,30,NULL,1);
/*!40000 ALTER TABLE `labs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `marks`
--

DROP TABLE IF EXISTS `marks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int DEFAULT NULL,
  `lab_id` int DEFAULT NULL,
  `faculty_id` int DEFAULT NULL,
  `assessment_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assessment_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `marks_obtained` decimal(5,2) DEFAULT NULL,
  `total_marks` decimal(5,2) DEFAULT NULL,
  `assessment_date` date DEFAULT NULL,
  `academic_year` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `semester` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_marks_student` (`student_id`),
  KEY `idx_marks_lab` (`lab_id`),
  KEY `fk_marks_faculty` (`faculty_id`),
  CONSTRAINT `fk_marks_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_marks_lab` FOREIGN KEY (`lab_id`) REFERENCES `labs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_marks_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `marks`
--

LOCK TABLES `marks` WRITE;
/*!40000 ALTER TABLE `marks` DISABLE KEYS */;
/*!40000 ALTER TABLE `marks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('info','warning','error','success') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'info',
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user` (`user_id`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_resets`
--

DROP TABLE IF EXISTS `password_resets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_resets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  UNIQUE KEY `idx_password_resets_token` (`token`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `password_resets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_resets`
--

LOCK TABLES `password_resets` WRITE;
/*!40000 ALTER TABLE `password_resets` DISABLE KEYS */;
INSERT INTO `password_resets` VALUES (53,126,'5e498d69c41eff473da16b27b21e26690569631eac1882c5ad4314478f648024','2025-11-11 00:52:24',NULL,'2025-11-10 18:22:24'),(54,127,'32dd33270c5dfa75e9c1ec57e9ca4fc6ebb5cc74f9b3fb2b807d7c2a5066c696','2025-11-11 00:53:38',NULL,'2025-11-10 18:23:38'),(56,129,'4a7894fbe610852ac08a14f5647705cec6ce035d01fd704fedad96bb84e3896d','2025-11-11 00:55:16',NULL,'2025-11-10 18:25:16'),(57,130,'dc49cb53e9c27e58f88e715cb94ffc0c2dd7af833aa2a5aaecb5872b51766dcd','2025-11-11 00:56:07',NULL,'2025-11-10 18:26:07'),(59,132,'c2cbc3aa900c30fc13c43177661152a2baff87f3c6d0973d8ac80d318aa032ab','2025-11-11 00:57:16',NULL,'2025-11-10 18:27:16'),(60,133,'e6ea55e3829a1db7a021d96aed6339fcba61cf756fd6589bf5d955f232d0a019','2025-11-11 00:57:43',NULL,'2025-11-10 18:27:43'),(61,142,'2475a54e5f8b0a2a950567362e55e80c1d4815bc63f424b2bb3498c28b5a768a','2025-11-11 01:07:51',NULL,'2025-11-10 18:37:51'),(62,143,'ad1753735d4bca07a47c2c80c70f15dadae179e65ef55d512d8e17827afa1a98','2025-11-11 01:09:01',NULL,'2025-11-10 18:39:01'),(63,144,'3868d7407a043384835d18849bc6a70bfb8232a8f9b04563bd11e95ddf17c115','2025-11-11 01:12:27',NULL,'2025-11-10 18:42:27'),(64,145,'1801c68f8b8ec92cfde92449d9e39563b1a7fc09655d6437f298e6adc08528e6','2025-11-11 01:12:51',NULL,'2025-11-10 18:42:51');
/*!40000 ALTER TABLE `password_resets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_logs`
--

DROP TABLE IF EXISTS `system_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `action` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` int DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ip_address` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_system_logs_created_at` (`created_at`),
  CONSTRAINT `system_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=293 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_logs`
--

LOCK TABLES `system_logs` WRITE;
/*!40000 ALTER TABLE `system_logs` DISABLE KEYS */;
INSERT INTO `system_logs` VALUES (285,122,'CREATE_DEPARTMENT','department',36,'{\"code\": \"CSE\", \"name\": \"Computer Science and Engineering \"}','::1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36','2025-11-10 18:20:10'),(286,122,'CREATE_DEPARTMENT','department',37,'{\"code\": \"CCE\", \"name\": \"Computer and Communication Engineering \"}','::1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36','2025-11-10 18:20:32'),(287,122,'CREATE_DEPARTMENT','department',38,'{\"code\": \"MME\", \"name\": \"MME\"}','::1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36','2025-11-10 18:20:44'),(288,122,'HARD_DELETE_USER','user',131,'{\"archiveId\": 100}','::1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36','2025-11-10 18:26:58'),(289,122,'HARD_DELETE_USER','user',128,'{\"archiveId\": 101}','::1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36','2025-11-10 18:37:34'),(290,122,'SET_DEPARTMENT_HOD','department',37,'{\"hodId\": 133}','::1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36','2025-11-10 18:38:09'),(291,122,'SET_DEPARTMENT_HOD','department',36,'{\"hodId\": 129}','::1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36','2025-11-10 18:38:11'),(292,122,'SET_DEPARTMENT_HOD','department',38,'{\"hodId\": 142}','::1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36','2025-11-10 18:38:12');
/*!40000 ALTER TABLE `system_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `timetable_entries`
--

DROP TABLE IF EXISTS `timetable_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `timetable_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lab_id` int NOT NULL,
  `day_of_week` int NOT NULL,
  `time_slot_start` time NOT NULL,
  `time_slot_end` time NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_lab_day_time` (`lab_id`,`day_of_week`,`time_slot_start`,`time_slot_end`),
  KEY `idx_timetable_entries_lab_day` (`lab_id`,`day_of_week`),
  KEY `idx_timetable_entries_time` (`time_slot_start`,`time_slot_end`),
  CONSTRAINT `fk_timetable_entries_lab` FOREIGN KEY (`lab_id`) REFERENCES `labs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `timetable_entries_chk_1` CHECK ((`day_of_week` between 0 and 6))
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `timetable_entries`
--

LOCK TABLES `timetable_entries` WRITE;
/*!40000 ALTER TABLE `timetable_entries` DISABLE KEYS */;
INSERT INTO `timetable_entries` VALUES (33,13,1,'09:00:00','12:00:00','PPS',1,'2025-11-11 00:09:42','2025-11-11 00:09:42'),(34,14,1,'10:00:00','12:00:00','OOPS',1,'2025-11-11 00:10:08','2025-11-11 00:10:08'),(35,15,1,'14:00:00','17:00:00','OOPS',1,'2025-11-11 00:10:27','2025-11-11 00:10:27'),(36,13,1,'14:00:00','17:00:00','OOPS',1,'2025-11-11 00:10:48','2025-11-11 00:10:48');
/*!40000 ALTER TABLE `timetable_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `timetable_exceptions`
--

DROP TABLE IF EXISTS `timetable_exceptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `timetable_exceptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `exception_type` enum('holiday','exam','event','lab_closure') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `affects_all_labs` tinyint(1) DEFAULT '1',
  `affected_lab_ids` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_timetable_exceptions_date` (`date`),
  KEY `idx_timetable_exceptions_type` (`exception_type`),
  KEY `fk_timetable_exceptions_creator` (`created_by`),
  CONSTRAINT `fk_timetable_exceptions_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `timetable_exceptions`
--

LOCK TABLES `timetable_exceptions` WRITE;
/*!40000 ALTER TABLE `timetable_exceptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `timetable_exceptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `timetable_template_entries`
--

DROP TABLE IF EXISTS `timetable_template_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `timetable_template_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `timetable_entry_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_template_entry` (`template_id`,`timetable_entry_id`),
  KEY `fk_template_entries_entry` (`timetable_entry_id`),
  CONSTRAINT `fk_template_entries_entry` FOREIGN KEY (`timetable_entry_id`) REFERENCES `timetable_entries` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_template_entries_template` FOREIGN KEY (`template_id`) REFERENCES `timetable_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `timetable_template_entries`
--

LOCK TABLES `timetable_template_entries` WRITE;
/*!40000 ALTER TABLE `timetable_template_entries` DISABLE KEYS */;
/*!40000 ALTER TABLE `timetable_template_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `timetable_templates`
--

DROP TABLE IF EXISTS `timetable_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `timetable_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `academic_year` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `semester_type` enum('odd','even') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_active` tinyint(1) DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_timetable_templates_active` (`is_active`),
  KEY `idx_timetable_templates_created_by` (`created_by`),
  CONSTRAINT `fk_timetable_templates_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `timetable_templates`
--

LOCK TABLES `timetable_templates` WRITE;
/*!40000 ALTER TABLE `timetable_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `timetable_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `timetable_uploads`
--

DROP TABLE IF EXISTS `timetable_uploads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `timetable_uploads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uploaded_by` int NOT NULL,
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `upload_status` enum('processing','completed','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'processing',
  `records_processed` int DEFAULT '0',
  `error_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_timetable_uploads_user` (`uploaded_by`),
  CONSTRAINT `timetable_uploads_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `timetable_uploads`
--

LOCK TABLES `timetable_uploads` WRITE;
/*!40000 ALTER TABLE `timetable_uploads` DISABLE KEYS */;
/*!40000 ALTER TABLE `timetable_uploads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('student','faculty','lab_staff','hod','admin','others','non_teaching') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `student_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employee_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `salutation` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_auto_generated` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_active` (`is_active`),
  KEY `idx_users_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=146 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (122,'admin@lnmiit.ac.in','a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3','admin','admin','IT',NULL,NULL,NULL,1,'2025-11-10 18:16:32','2025-11-10 18:19:23',NULL,0),(123,'hodcse@lnmiit.ac.in',NULL,'RAJBIR KAUR','hod','Computer Science and Engineering ',NULL,NULL,NULL,1,'2025-11-10 18:20:10','2025-11-10 18:38:11','dr',0),(124,'hodcce@lnmiit.ac.in',NULL,'SUNIL KUMAR','hod','Computer and Communication Engineering ',NULL,NULL,NULL,1,'2025-11-10 18:20:32','2025-11-10 18:38:09','dr',0),(125,'hod.mme@lnmiit.ac.in',NULL,'MOHIT MAKKAR','hod','MME',NULL,NULL,NULL,1,'2025-11-10 18:20:44','2025-11-10 18:38:12','dr',0),(126,'shivam@lnmiit.ac.in',NULL,'Shivam Maheshwari','lab_staff','CSE',NULL,NULL,NULL,1,'2025-11-10 18:22:24',NULL,'mr',0),(127,'shivangi@lnmiit.ac.in',NULL,'Shivangi Singh','lab_staff','CSE',NULL,NULL,NULL,1,'2025-11-10 18:23:38',NULL,'mrs',0),(129,'rajbir@lnmiit.ac.in',NULL,'RAJBIR KAUR','faculty','CSE',NULL,NULL,NULL,1,'2025-11-10 18:25:16',NULL,'dr',0),(130,'saurabh@lnmiit.ac.in',NULL,'SAURABH  KUMAR','faculty','CSE',NULL,NULL,NULL,1,'2025-11-10 18:26:07',NULL,'dr',0),(132,'preeti@lnmiit.ac.in',NULL,'PREETI SINGH','faculty','CSE',NULL,NULL,NULL,1,'2025-11-10 18:27:16',NULL,'dr',0),(133,'sunil@lnmiit.ac.in',NULL,'SUNIL KUMAR','faculty','CCE',NULL,NULL,NULL,1,'2025-11-10 18:27:43','2025-11-10 18:27:52','dr',0),(142,'mohit@lnmiit.ac.in',NULL,'MOHIT MAKKAR','faculty','MME',NULL,NULL,NULL,1,'2025-11-10 18:37:51',NULL,'dr',0),(143,'manish@lnmiit.ac.in',NULL,'Manish mittal','lab_staff','CSE',NULL,NULL,NULL,1,'2025-11-10 18:39:01',NULL,'mr',0),(144,'23ucs507@lnmiit.ac.in',NULL,'ABHINAV DOGRA','student',NULL,NULL,NULL,NULL,1,'2025-11-10 18:42:27','2025-11-10 18:43:04','mr',0),(145,'23ucs508@lnmiit.ac.in',NULL,'ABHINAV  THULAL','student',NULL,NULL,NULL,NULL,1,'2025-11-10 18:42:51',NULL,'mr',0);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_password_backup`
--

DROP TABLE IF EXISTS `users_password_backup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_password_backup` (
  `id` int NOT NULL DEFAULT '0',
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `backup_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_password_backup`
--

LOCK TABLES `users_password_backup` WRITE;
/*!40000 ALTER TABLE `users_password_backup` DISABLE KEYS */;
/*!40000 ALTER TABLE `users_password_backup` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `year_config`
--

DROP TABLE IF EXISTS `year_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `year_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `academic_year` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `financial_year` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_current` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `year_config`
--

LOCK TABLES `year_config` WRITE;
/*!40000 ALTER TABLE `year_config` DISABLE KEYS */;
/*!40000 ALTER TABLE `year_config` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-11  0:14:04
