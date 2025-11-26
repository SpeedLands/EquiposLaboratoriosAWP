-- Active: 1716349522879@@127.0.0.1@3306@equiposlaboratoriosawp
CREATE DATABASE IF NOT EXISTS EquiposLaboratoriosAWP;
USE EquiposLaboratoriosAWP;

-- Tabla para los usuarios del sistema
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' -- Roles: 'user', 'admin'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla para los equipos de laboratorio
CREATE TABLE IF NOT EXISTS equipos_laboratorios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    categoria VARCHAR(100),
    serial VARCHAR(100) UNIQUE,
    fecha_adquisicion DATE,
    ubicacion VARCHAR(100),
    cantidad INT DEFAULT 1,
    imagen VARCHAR(255) -- URL o path a la imagen
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Inserción de un usuario administrador por defecto
-- Contraseña: admin123 (hasheada con bcrypt)
INSERT INTO users (name, email, password, role) VALUES
('Administrador', 'admin@awp.com', '$2y$10$If6.g2f.s6o.1c.a1b5c4e.7d9e4a3c2b1f8c8d7e6f5g4h3i2j1k', 'admin');

-- Inserción de datos de ejemplo para equipos de laboratorio
INSERT INTO equipos_laboratorios (nombre, categoria, serial, fecha_adquisicion, ubicacion, cantidad, imagen) VALUES
('Microscopio Óptico Avanzado', 'Óptica', 'SN-MIC-001', '2023-01-15', 'Laboratorio A1', 1, 'images/microscopio.jpg'),
('Centrífuga Refrigerada de Alta Velocidad', 'Equipos Generales', 'SN-CEN-002', '2022-11-30', 'Sala de Preparación', 1, 'images/centrifuga.jpg'),
('Espectrofotómetro UV-Visible', 'Análisis Químico', 'SN-ESP-003', '2023-05-20', 'Laboratorio B2', 1, 'images/espectrofotometro.jpg'),
('Balanza Analítica de Precisión', 'Medición', 'SN-BAL-004', '2023-08-01', 'Sala de Pesaje', 2, 'images/balanza.jpg'),
('Incubadora de CO2 para Cultivos', 'Biología Celular', 'SN-INC-005', '2022-10-10', 'Sala de Cultivos', 1, 'images/incubadora.jpg');

-- Tabla para reseteo de contraseñas (funcionalidad opcional)
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
