<?php
// api.php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *"); // Permite peticiones desde cualquier origen (útil para dev)

require_once 'db.php';

try {
    // Capturamos el parámetro de búsqueda si existe
    $busqueda = isset($_GET['q']) ? $_GET['q'] : '';

    if ($busqueda) {
        // Búsqueda con filtro (Sentencia Preparada)
        $sql = "SELECT * FROM equipos_laboratorios 
                WHERE nombre LIKE :busqueda OR descripcion LIKE :busqueda 
                ORDER BY id DESC";
        $stmt = $pdo->prepare($sql);
        $param = "%$busqueda%";
        $stmt->bindParam(':busqueda', $param, PDO::PARAM_STR);
        $stmt->execute();
    } else {
        // Consulta general
        $sql = "SELECT * FROM equipos_laboratorios ORDER BY id DESC";
        $stmt = $pdo->query($sql);
    }

    $resultados = $stmt->fetchAll();
    
    // Devolvemos los datos en formato JSON
    echo json_encode($resultados);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error en el servidor: " . $e->getMessage()]);
}
?>