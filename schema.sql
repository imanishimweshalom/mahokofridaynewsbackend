-- MFN News Database Schema
-- Run this file once to set up all tables

CREATE DATABASE IF NOT EXISTS mfn_news CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mfn_news;

-- Authors table
CREATE TABLE IF NOT EXISTS authors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  bio TEXT,
  profile_image VARCHAR(500) DEFAULT 'uploads/default_profile.png',
  email VARCHAR(255),
  twitter VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stories table
CREATE TABLE IF NOT EXISTS stories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(600) UNIQUE,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  description LONGTEXT,
  image VARCHAR(500) DEFAULT 'uploads/default.jpg',
  author VARCHAR(255),
  author_id INT,
  author_image VARCHAR(500),
  author_bio TEXT,
  tags VARCHAR(500),
  meta_description TEXT,
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  dislikes INT DEFAULT 0,
  status ENUM('published','draft','scheduled') DEFAULT 'published',
  scheduled_at DATETIME,
  featured TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE SET NULL
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  story_id INT NOT NULL,
  parent_id INT DEFAULT 0,
  name VARCHAR(255) DEFAULT 'BANYA',
  email VARCHAR(255),
  comment TEXT NOT NULL,
  status ENUM('pending','approved','spam') DEFAULT 'pending',
  likes INT DEFAULT 0,
  dislikes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
);

-- Ads table
CREATE TABLE IF NOT EXISTS ads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('image','video') DEFAULT 'image',
  file VARCHAR(500),
  link VARCHAR(500),
  position ENUM('top','sidebar','inline','popup') DEFAULT 'sidebar',
  text VARCHAR(255),
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscribers table
CREATE TABLE IF NOT EXISTS subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active','unsubscribed') DEFAULT 'active'
);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  youtube_url VARCHAR(500),
  video_url VARCHAR(500),
  thumbnail VARCHAR(500),
  category VARCHAR(100),
  views INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('Admin','Editor','Journalist','Moderator') DEFAULT 'Journalist',
  avatar VARCHAR(500),
  active TINYINT(1) DEFAULT 1,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255),
  action TEXT,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Breaking news / ticker table
CREATE TABLE IF NOT EXISTS breaking_news (
  id INT AUTO_INCREMENT PRIMARY KEY,
  text VARCHAR(500) NOT NULL,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_stories_category ON stories(category);
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_stories_created ON stories(created_at);
CREATE INDEX idx_stories_views ON stories(views);
CREATE INDEX idx_comments_story ON comments(story_id);

-- Default admin user (password: admin123 - CHANGE IN PRODUCTION)
INSERT INTO admin_users (username, email, password, role) VALUES (
  'Gerard banya',
  'admin@mfn.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Admin'
);

-- Sample author
INSERT INTO authors (name, bio, profile_image) VALUES (
  'MFN Editorial Team',
  'The editorial team of Mahoko Friday News, dedicated to bringing you the latest news from Rwanda and beyond.',
  'uploads/default_profile.png'
);
