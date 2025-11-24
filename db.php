<?php
// db.php
// Configuración de conexión a base de datos usando PDO
$host = 'localhost';
$db   = 'inventario_lab';
$user = 'root'; // Cambiar si tienes contraseña
$pass = '';     // Cambiar si tienes contraseña
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Lanza excepciones en errores
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,     // Devuelve arrays asociativos
    PDO::ATTR_EMULATE_PREPARES   => false,                // Usa sentencias preparadas nativas
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // En producción, no mostrar el error directo al usuario, loguearlo.
    http_response_code(500);
    echo json_encode(["error" => "Error de conexión a base de datos: " . $e->getMessage()]);
    exit;
}
?>