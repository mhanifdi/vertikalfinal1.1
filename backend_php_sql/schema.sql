-- ============================================================================
-- VERTIKAL SMA JAWARA 28 - SMAN 28 JAKARTA
-- DATABASE SCHEMA (MySQL / MariaDB / SQLite compatible)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `vertikal_jawara28` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `vertikal_jawara28`;

-- 1. TABEL SISWA
CREATE TABLE IF NOT EXISTS `students` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `nisn` VARCHAR(30) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL DEFAULT '123',
  `name` VARCHAR(150) NOT NULL,
  `gender` ENUM('L', 'P') NOT NULL DEFAULT 'L',
  `class_name` VARCHAR(50) NOT NULL DEFAULT 'XI-MIPA-1',
  `angkatan` VARCHAR(30) NOT NULL DEFAULT '2025/2026',
  `religion` VARCHAR(30) NOT NULL DEFAULT 'Islam',
  `avatar_seed` VARCHAR(50) DEFAULT 'Siswa28',
  `walas_name` VARCHAR(150) NOT NULL DEFAULT 'Dra. Hj. Nurhidayah, M.Pd.',
  `walas_nip` VARCHAR(50) NOT NULL DEFAULT '197405101999032001',
  `walas_notes` TEXT DEFAULT NULL,
  `walas_recommendation` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. TABEL GURU & ADMIN
CREATE TABLE IF NOT EXISTS `teachers` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `nip` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL DEFAULT '123',
  `name` VARCHAR(150) NOT NULL,
  `class_name` VARCHAR(50) NOT NULL DEFAULT 'XI-MIPA-1',
  `subject` VARCHAR(100) NOT NULL DEFAULT 'Wali Kelas & Pembimbing 7 KAIH',
  `role` VARCHAR(50) NOT NULL DEFAULT 'Guru Wali Kelas',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. TABEL CATATAN KEBIASAAN (HABIT LOGS)
CREATE TABLE IF NOT EXISTS `habit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` VARCHAR(50) NOT NULL,
  `habit_type` VARCHAR(50) NOT NULL,
  `sub_category` VARCHAR(50) DEFAULT '',
  `log_date` DATE NOT NULL,
  `created_at` DATETIME NOT NULL,
  `score` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `payload` JSON DEFAULT NULL,
  `is_counter_entry` TINYINT(1) DEFAULT 0,
  `is_missed` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. TABEL VALIDASI ADMIN KESISWAAN
CREATE TABLE IF NOT EXISTS `admin_validations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` VARCHAR(50) NOT NULL,
  `verified_by` VARCHAR(150) NOT NULL,
  `verification_score` INT NOT NULL,
  `notes` TEXT DEFAULT NULL,
  `verified_at` DATETIME NOT NULL,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- DATA AKUN RESMI (HANYA SATU AKUN DEMO PER PERAN SESUAI PERMINTAAN USER)
-- Semua password adalah '123'
-- ============================================================================

INSERT INTO `students` (`id`, `nisn`, `password`, `name`, `gender`, `class_name`, `angkatan`, `religion`, `avatar_seed`, `walas_name`, `walas_nip`, `walas_notes`, `walas_recommendation`)
VALUES (
  'std-siswa',
  'siswa',
  '123',
  'Siswa Jawara 28',
  'L',
  'XI-MIPA-1',
  '2025/2026',
  'Islam',
  'Siswa28',
  'Dra. Hj. Nurhidayah, M.Pd.',
  '197405101999032001',
  'Pertahankan konsistensi 7 kebiasaan unggul Jawara 28.',
  'Tingkatkan keterlibatan aktif dalam kegiatan Adiwiyata sekolah.'
) ON DUPLICATE KEY UPDATE `password` = '123';

INSERT INTO `teachers` (`id`, `nip`, `password`, `name`, `class_name`, `subject`, `role`)
VALUES 
(
  'tch-guru',
  'guru',
  '123',
  'Dra. Hj. Nurhidayah, M.Pd.',
  'XI-MIPA-1',
  'Wali Kelas & Guru Pembimbing',
  'Guru Wali Kelas'
),
(
  'adm-admin',
  'admin',
  '123',
  'Drs. H. Ubaidillah, M.M.',
  'Semua Kelas',
  'Kepala Sekolah / Tim Kesiswaan 7 KAIH',
  'Admin Kesiswaan'
) ON DUPLICATE KEY UPDATE `password` = '123';
