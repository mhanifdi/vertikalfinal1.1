<?php
/**
 * VERTIKAL SMA JAWARA 28
 * Konfigurasi Koneksi Database MySQL / MariaDB via PDO
 * Lokasi File: /backend_php_sql/db_config.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$db_host = '127.0.0.1';
$db_name = 'vertikal_jawara28';
$db_user = 'root';
$db_pass = ''; // Sesuaikan dengan password database Anda (misal: kosong pada XAMPP)
$db_port = 3306;

try {
    $pdo = new PDO(
        "mysql:host={$db_host};port={$db_port};dbname={$db_name};charset=utf8mb4",
        $db_user,
        $db_pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Gagal terkoneksi ke database: ' . $e->getMessage()
    ]);
    exit();
}

/**
 * Helper untuk membaca JSON payload dari request body
 */
function getJsonInput() {
    $raw = file_get_contents('php://input');
    if (empty($raw)) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}
