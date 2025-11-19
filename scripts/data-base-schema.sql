-- MySQL dump 10.13  Distrib 9.4.0, for macos15.4 (arm64)
--
-- Host: 127.0.0.1    Database: lnmiit_lab_management
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
) ENGINE=InnoDB AUTO_INCREMENT=103 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
-- Table structure for table `booking_reminders`
--

DROP TABLE IF EXISTS `booking_reminders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_reminders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_request_id` int NOT NULL,
  `reminder_type` enum('2_hours_before','1_day_before','on_day') COLLATE utf8mb4_unicode_ci DEFAULT '2_hours_before',
  `scheduled_time` datetime NOT NULL COMMENT 'When the reminder should be sent',
  `sent_at` datetime DEFAULT NULL COMMENT 'When the reminder was actually sent',
  `status` enum('pending','sent','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `recipients` json DEFAULT NULL COMMENT 'List of email addresses that received the reminder',
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reminder_booking` (`booking_request_id`),
  KEY `idx_reminder_scheduled` (`scheduled_time`,`status`),
  KEY `idx_reminder_status` (`status`),
  CONSTRAINT `fk_reminder_booking` FOREIGN KEY (`booking_request_id`) REFERENCES `booking_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores scheduled reminders for lab bookings (2 hours before slot)';
/*!40101 SET character_set_client = @saved_cs_client */;

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
  `reminder_sent` tinyint(1) DEFAULT '0',
  `faculty_approved_by` int DEFAULT NULL,
  `faculty_approved_at` timestamp NULL DEFAULT NULL,
  `faculty_remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `lab_staff_approved_by` int DEFAULT NULL,
  `lab_staff_approved_at` timestamp NULL DEFAULT NULL,
  `lab_staff_remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `hod_approved_by` int DEFAULT NULL,
  `hod_approved_at` timestamp NULL DEFAULT NULL,
  `final_approver_role` enum('hod','lab_coordinator') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hod_remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `rejected_by` int DEFAULT NULL,
  `rejected_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `responsible_person_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Person responsible for the lab(s) during booking',
  `responsible_person_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Email of responsible person (must end with @lnmiit.ac.in)',
  `is_multi_lab` tinyint(1) DEFAULT '0' COMMENT 'Flag to indicate if this is a multi-lab booking',
  `lab_ids` json DEFAULT NULL COMMENT 'Array of lab IDs for multi-lab bookings: ["1", "2", "3"]',
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
  KEY `idx_booking_date_time` (`booking_date`,`start_time`,`status`),
  KEY `idx_reminder_query` (`status`,`booking_date`,`start_time`,`reminder_sent`),
  CONSTRAINT `booking_requests_ibfk_1` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `booking_requests_ibfk_2` FOREIGN KEY (`lab_id`) REFERENCES `labs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `booking_requests_ibfk_3` FOREIGN KEY (`item_id`) REFERENCES `lab_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `booking_requests_ibfk_4` FOREIGN KEY (`faculty_supervisor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `booking_requests_ibfk_5` FOREIGN KEY (`faculty_approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `booking_requests_ibfk_6` FOREIGN KEY (`lab_staff_approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `booking_requests_ibfk_7` FOREIGN KEY (`hod_approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `booking_requests_ibfk_8` FOREIGN KEY (`rejected_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lab booking requests - supports both single and multi-lab bookings';
/*!40101 SET character_set_client = @saved_cs_client */;

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
  `actor_role` enum('student','faculty','lab_staff','hod','lab_coordinator','admin','others') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=79 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Activity logs for component requests and loans - preserves history even after deletions';
/*!40101 SET character_set_client = @saved_cs_client */;

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
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
  `final_approver_role` enum('hod','lab_coordinator') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
) ENGINE=InnoDB AUTO_INCREMENT=90 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
  `highest_approval_authority` enum('hod','lab_coordinator') COLLATE utf8mb4_unicode_ci DEFAULT 'hod',
  `lab_coordinator_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_departments_code` (`code`),
  KEY `idx_departments_hod` (`hod_id`),
  KEY `idx_lab_coordinator_id` (`lab_coordinator_id`),
  CONSTRAINT `fk_departments_hod` FOREIGN KEY (`hod_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_dept_lab_coordinator` FOREIGN KEY (`lab_coordinator_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
  `actor_role` enum('student','faculty','lab_staff','hod','lab_coordinator','admin','others') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=175 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Activity logs for lab bookings - preserves history even after deletions';
/*!40101 SET character_set_client = @saved_cs_client */;

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
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
-- Table structure for table `multi_lab_approvals`
--

DROP TABLE IF EXISTS `multi_lab_approvals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `multi_lab_approvals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_request_id` int NOT NULL COMMENT 'Reference to booking_requests table',
  `lab_id` int NOT NULL COMMENT 'Individual lab in multi-lab booking',
  `lab_staff_id` int DEFAULT NULL COMMENT 'Lab staff who approved for this lab',
  `lab_staff_approved_by` int DEFAULT NULL,
  `lab_staff_approved_at` datetime DEFAULT NULL,
  `lab_staff_remarks` text COLLATE utf8mb4_unicode_ci,
  `hod_approved_by` int DEFAULT NULL,
  `hod_approved_at` datetime DEFAULT NULL,
  `hod_remarks` text COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','approved_by_lab_staff','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `approved_at` datetime DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_multi_lab_booking` (`booking_request_id`),
  KEY `idx_multi_lab_lab` (`lab_id`),
  KEY `idx_multi_lab_staff` (`lab_staff_id`),
  KEY `idx_multi_lab_status` (`status`),
  KEY `fk_lab_staff_approved_by` (`lab_staff_approved_by`),
  KEY `fk_hod_approved_by` (`hod_approved_by`),
  KEY `idx_status_booking` (`status`,`booking_request_id`),
  CONSTRAINT `fk_hod_approved_by` FOREIGN KEY (`hod_approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_lab_staff_approved_by` FOREIGN KEY (`lab_staff_approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_multi_lab_booking` FOREIGN KEY (`booking_request_id`) REFERENCES `booking_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_multi_lab_lab` FOREIGN KEY (`lab_id`) REFERENCES `labs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_multi_lab_staff` FOREIGN KEY (`lab_staff_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tracks individual lab approval status in multi-lab bookings with detailed approval chain';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `multi_lab_responsible_persons`
--

DROP TABLE IF EXISTS `multi_lab_responsible_persons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `multi_lab_responsible_persons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_request_id` int NOT NULL,
  `lab_id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_booking_lab` (`booking_request_id`,`lab_id`),
  KEY `lab_id` (`lab_id`),
  KEY `idx_booking_id` (`booking_request_id`),
  KEY `idx_email` (`email`),
  CONSTRAINT `multi_lab_responsible_persons_ibfk_1` FOREIGN KEY (`booking_request_id`) REFERENCES `booking_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `multi_lab_responsible_persons_ibfk_2` FOREIGN KEY (`lab_id`) REFERENCES `labs` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
) ENGINE=InnoDB AUTO_INCREMENT=75 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
) ENGINE=InnoDB AUTO_INCREMENT=324 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
  `role` enum('student','faculty','lab_staff','hod','lab_coordinator','admin','others') COLLATE utf8mb4_unicode_ci NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=149 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

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
-- Temporary view structure for view `v_multi_lab_bookings`
--

DROP TABLE IF EXISTS `v_multi_lab_bookings`;
/*!50001 DROP VIEW IF EXISTS `v_multi_lab_bookings`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_multi_lab_bookings` AS SELECT 
 1 AS `booking_id`,
 1 AS `requested_by`,
 1 AS `booking_date`,
 1 AS `start_time`,
 1 AS `end_time`,
 1 AS `purpose`,
 1 AS `status`,
 1 AS `responsible_person_name`,
 1 AS `responsible_person_email`,
 1 AS `is_multi_lab`,
 1 AS `lab_ids`,
 1 AS `lab_approval_status`,
 1 AS `approved_count`,
 1 AS `pending_count`,
 1 AS `rejected_count`,
 1 AS `total_labs`*/;
SET character_set_client = @saved_cs_client;

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
-- Final view structure for view `v_multi_lab_bookings`
--

/*!50001 DROP VIEW IF EXISTS `v_multi_lab_bookings`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_multi_lab_bookings` AS select `br`.`id` AS `booking_id`,`br`.`requested_by` AS `requested_by`,`br`.`booking_date` AS `booking_date`,`br`.`start_time` AS `start_time`,`br`.`end_time` AS `end_time`,`br`.`purpose` AS `purpose`,`br`.`status` AS `status`,`br`.`responsible_person_name` AS `responsible_person_name`,`br`.`responsible_person_email` AS `responsible_person_email`,`br`.`is_multi_lab` AS `is_multi_lab`,`br`.`lab_ids` AS `lab_ids`,group_concat(concat(`l`.`name`,':',`mla`.`status`) order by `l`.`name` ASC separator ', ') AS `lab_approval_status`,count((case when (`mla`.`status` = 'approved') then 1 end)) AS `approved_count`,count((case when (`mla`.`status` = 'pending') then 1 end)) AS `pending_count`,count((case when (`mla`.`status` = 'rejected') then 1 end)) AS `rejected_count`,count(`mla`.`id`) AS `total_labs` from ((`booking_requests` `br` left join `multi_lab_approvals` `mla` on((`br`.`id` = `mla`.`booking_request_id`))) left join `labs` `l` on((`mla`.`lab_id` = `l`.`id`))) where (`br`.`is_multi_lab` = 1) group by `br`.`id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-19  5:32:00
