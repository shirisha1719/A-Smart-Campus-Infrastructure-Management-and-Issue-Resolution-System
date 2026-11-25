-- ==============================================================
-- FIX MY CAMPUS: Smart Campus Issue Reporting & Management System
-- Database Schema for MySQL 8.0+
-- ==============================================================

CREATE DATABASE IF NOT EXISTS fix_my_campus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fix_my_campus;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('student', 'staff', 'admin') NOT NULL DEFAULT 'student',
  identifier VARCHAR(50) DEFAULT NULL COMMENT 'Roll number or Employee ID',
  department VARCHAR(100) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  specialization VARCHAR(100) DEFAULT NULL COMMENT 'For maintenance staff: e.g. Electrical, Plumbing',
  avatar VARCHAR(255) DEFAULT '/assets/images/default-avatar.png',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_email (email),
  INDEX idx_user_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Campus Buildings Table
CREATE TABLE IF NOT EXISTS buildings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'Academic',
  floors INT NOT NULL DEFAULT 4,
  coordinates_x DECIMAL(5,2) NOT NULL DEFAULT 50.00 COMMENT 'Percentage 0-100 on campus map',
  coordinates_y DECIMAL(5,2) NOT NULL DEFAULT 50.00 COMMENT 'Percentage 0-100 on campus map',
  description VARCHAR(255) DEFAULT NULL,
  icon VARCHAR(50) DEFAULT 'fa-building',
  color VARCHAR(20) DEFAULT '#2563eb',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Specific Campus Locations & Zones Table
CREATE TABLE IF NOT EXISTS locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  building_id INT NOT NULL,
  floor_name VARCHAR(50) NOT NULL DEFAULT 'Ground Floor',
  room_or_zone VARCHAR(120) NOT NULL,
  zone_type VARCHAR(50) DEFAULT 'General',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
  INDEX idx_location_building (building_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Complaints / Issues Table
CREATE TABLE IF NOT EXISTS complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_number VARCHAR(30) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('Plumbing', 'Electrical', 'HVAC / AC', 'Furniture', 'WiFi / Network', 'Cleanliness', 'Safety & Security', 'Civil / Infrastructure', 'Other') NOT NULL,
  priority ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL DEFAULT 'Medium',
  status ENUM('Pending', 'Assigned', 'In Progress', 'Resolved', 'Rejected') NOT NULL DEFAULT 'Pending',
  building_id INT NOT NULL,
  location_id INT DEFAULT NULL,
  specific_location VARCHAR(200) DEFAULT NULL,
  user_id INT NOT NULL COMMENT 'Reporter (Student/Faculty)',
  assigned_to INT DEFAULT NULL COMMENT 'Assigned Maintenance Staff',
  image_url VARCHAR(255) DEFAULT NULL,
  resolution_notes TEXT DEFAULT NULL,
  resolution_image_url VARCHAR(255) DEFAULT NULL,
  resolved_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE RESTRICT,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_complaint_status (status),
  INDEX idx_complaint_category (category),
  INDEX idx_complaint_priority (priority),
  INDEX idx_complaint_user (user_id),
  INDEX idx_complaint_assigned (assigned_to),
  INDEX idx_complaint_building (building_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Complaint Status Timeline / History
CREATE TABLE IF NOT EXISTS complaint_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  user_id INT DEFAULT NULL COMMENT 'Actor who initiated the transition',
  action_title VARCHAR(120) NOT NULL,
  comment TEXT DEFAULT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_history_complaint (complaint_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Student Feedback & Rating Table
CREATE TABLE IF NOT EXISTS feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL UNIQUE,
  user_id INT NOT NULL,
  rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  complaint_id INT DEFAULT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'success', 'warning', 'danger') NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  INDEX idx_notify_user (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
