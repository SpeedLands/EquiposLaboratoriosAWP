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

-- Tabla para los equipos de laboratorio con el esquema simplificado
CREATE TABLE IF NOT EXISTS equipos_laboratorios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion VARCHAR(255),
    fechaHoraIngreso DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Inserción de un usuario administrador por defecto
-- Contraseña: admin123 (hasheada con bcrypt)
INSERT INTO users (name, email, password, role) VALUES
('Administrador', 'admin@awp.com', '$2y$10$If6.g2f.s6o.1c.a1b5c4e.7d9e4a3c2b1f8c8d7e6f5g4h3i2j1k', 'admin');

-- Inserción de datos de ejemplo para equipos de laboratorio con el nuevo esquema
INSERT INTO equipos_laboratorios (nombre, descripcion, estado) VALUES
('Microscopio Óptico Avanzado', 'Microscopio para análisis celular.', 'Disponible'),
('Centrífuga Refrigerada', 'Equipo para separación de muestras.', 'En Mantenimiento'),
('Espectrofotómetro UV-Visible', 'Medición de absorbancia.', 'Ocupado'),
('Balanza Analítica', 'Precisión de 0.0001g.', 'Disponible'),
('Incubadora de CO2', 'Para cultivos celulares y microbiología.', 'Disponible');

-- Tabla para reseteo de contraseñas (funcionalidad opcional)
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
