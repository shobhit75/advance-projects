CREATE DATABASE IF NOT EXISTS bagisto_mvp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE bagisto_mvp;

CREATE TABLE IF NOT EXISTS products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(80) NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(120) NOT NULL DEFAULT 'uncategorized',
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    original_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    stock INT NOT NULL DEFAULT 0,
    image VARCHAR(500) NULL,
    tag VARCHAR(60) NOT NULL DEFAULT 'new',
    rating DECIMAL(3,2) NOT NULL DEFAULT 0,
    reviews INT NOT NULL DEFAULT 0,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY products_sku_unique (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(40) NOT NULL,
    payment_method VARCHAR(60) NOT NULL,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(60) NOT NULL DEFAULT 'Processing',
    customer_name VARCHAR(255) NULL,
    customer_email VARCHAR(255) NULL,
    customer_phone VARCHAR(50) NULL,
    delivery_address TEXT NULL,
    items_json JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS otp_codes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    target VARCHAR(255) NOT NULL,
    code_hash VARCHAR(128) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX otp_target_index (type, target)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
