CREATE DATABASE IF NOT EXISTS inventario_lab;
USE inventario_lab;

CREATE TABLE IF NOT EXISTS equipos_laboratorios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    fechaHoraIngreso DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(50) DEFAULT 'Disponible'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5 Datos de ejemplo
INSERT INTO equipos_laboratorios (nombre, descripcion, estado) VALUES 
('Microscopio Óptico Zeiss', 'Microscopio binocular para muestras biológicas.', 'Disponible'),
('Centrífuga Refrigerada', 'Centrífuga de alta velocidad con control de temperatura.', 'En Mantenimiento'),
('Espectrofotómetro UV-Vis', 'Análisis de absorbancia de muestras líquidas.', 'Disponible'),
('Balanza Analítica', 'Precisión de 0.0001g para reactivos químicos.', 'Ocupado'),
('Incubadora de CO2', 'Cultivo celular con control de atmósfera.', 'Disponible');