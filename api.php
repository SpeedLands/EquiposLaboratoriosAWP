<?php
session_start();
header('Content-Type: application/json');

require_once 'db.php';

// Determinar la acción a realizar
$action = $_REQUEST['action'] ?? '';

// --- RUTAS DE AUTENTICACIÓN ---
switch ($action) {
    case 'register':
        handle_register($pdo);
        break;
    case 'login':
        handle_login($pdo);
        break;
    case 'logout':
        handle_logout();
        break;
    case 'check_session':
        check_session();
        break;
}

// --- RUTAS PROTEGIDAS (Requieren autenticación) ---
$protected_routes = ['get_equipos', 'add_equipo', 'update_equipo', 'delete_equipo'];
if (in_array($action, $protected_routes)) {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Acceso no autorizado. Se requiere iniciar sesión.']);
        exit;
    }
}

switch ($action) {
    case 'get_equipos':
        get_equipos($pdo);
        break;
    case 'add_equipo':
        add_equipo($pdo);
        break;
    case 'update_equipo':
        update_equipo($pdo);
        break;
    case 'delete_equipo':
        delete_equipo($pdo);
        break;
}

// --- LÓGICA DE FUNCIONES ---

function handle_register($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    $name = $data['name'] ?? '';
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';

    if (empty($name) || empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Todos los campos son obligatorios.']);
        return;
    }

    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    try {
        $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')");
        $stmt->execute([$name, $email, $hashed_password]);
        echo json_encode(['success' => 'Usuario registrado con éxito.']);
    } catch (PDOException $e) {
        http_response_code(500);
        if ($e->errorInfo[1] == 1062) { // Error de entrada duplicada
            echo json_encode(['error' => 'El correo electrónico ya está registrado.']);
        } else {
            echo json_encode(['error' => 'Error al registrar el usuario.']);
        }
    }
}

function handle_login($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';

    if (empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Email y contraseña son obligatorios.']);
        return;
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_role'] = $user['role'];
        $_SESSION['user_name'] = $user['name'];
        echo json_encode([
            'success' => 'Inicio de sesión exitoso.',
            'user' => ['name' => $user['name'], 'role' => $user['role']]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Credenciales incorrectas.']);
    }
}

function handle_logout() {
    session_destroy();
    echo json_encode(['success' => 'Sesión cerrada con éxito.']);
}

function check_session() {
    if (isset($_SESSION['user_id'])) {
        echo json_encode([
            'loggedIn' => true,
            'user' => ['name' => $_SESSION['user_name'], 'role' => $_SESSION['user_role']]
        ]);
    } else {
        echo json_encode(['loggedIn' => false]);
    }
}

function get_equipos($pdo) {
    $busqueda = $_GET['q'] ?? '';
    if ($busqueda) {
        $stmt = $pdo->prepare("SELECT * FROM equipos_laboratorios WHERE nombre LIKE ? OR descripcion LIKE ? ORDER BY id DESC");
        $stmt->execute(["%$busqueda%", "%$busqueda%"]);
    } else {
        $stmt = $pdo->query("SELECT * FROM equipos_laboratorios ORDER BY id DESC");
    }
    $equipos = $stmt->fetchAll();
    echo json_encode($equipos);
}

function add_equipo($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    $sql = "INSERT INTO equipos_laboratorios (nombre, descripcion, estado) VALUES (?, ?, ?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $data['nombre'], $data['descripcion'], $data['estado']
    ]);
    echo json_encode(['success' => 'Equipo agregado correctamente.', 'id' => $pdo->lastInsertId()]);
}

function update_equipo($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? 0;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => "ID de equipo es obligatorio."]);
        return;
    }

    $sql = "UPDATE equipos_laboratorios SET nombre = ?, descripcion = ?, estado = ? WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $data['nombre'], $data['descripcion'], $data['estado'],
        $id
    ]);
    echo json_encode(['success' => 'Equipo actualizado correctamente.']);
}

function delete_equipo($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? 0;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => "ID de equipo es obligatorio."]);
        return;
    }
    
    $stmt = $pdo->prepare("DELETE FROM equipos_laboratorios WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['success' => 'Equipo eliminado correctamente.']);
}
?>
