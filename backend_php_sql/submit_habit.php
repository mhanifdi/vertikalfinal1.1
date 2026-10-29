<?php
/**
 * VERTIKAL SMA JAWARA 28
 * Skrip Submit Kebiasaan dengan Perhitungan Rumus Lengkap 7 KAIH
 * Lokasi File: /backend_php_sql/submit_habit.php
 */

require_once __DIR__ . '/db_config.php';

$input = getJsonInput();
$student_id = isset($input['student_id']) ? trim($input['student_id']) : '';
$habit_type = isset($input['habit_type']) ? trim($input['habit_type']) : '';
$score = isset($input['score']) ? floatval($input['score']) : 0;
$sub_category = isset($input['sub_category']) ? trim($input['sub_category']) : '';
$log_date = isset($input['log_date']) ? trim($input['log_date']) : date('Y-m-d');
$is_counter = isset($input['is_counter_entry']) ? intval($input['is_counter_entry']) : 0;
$is_missed = isset($input['is_missed']) ? intval($input['is_missed']) : 0;
$payload = isset($input['payload']) ? $input['payload'] : [];

if (empty($student_id) || empty($habit_type)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Data student_id dan habit_type wajib diisi']);
    exit();
}

// 1. Cek duplikasi untuk shalat (sub_category)
if ($habit_type === 'ibadah' && !empty($sub_category)) {
    $stmt = $pdo->prepare("SELECT id FROM habit_logs WHERE student_id = ? AND habit_type = 'ibadah' AND sub_category = ? AND log_date = ? LIMIT 1");
    $stmt->execute([$student_id, $sub_category, $log_date]);
    if ($stmt->fetch()) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => "Ibadah/Shalat {$sub_category} sudah diisi pada hari ini dan tidak dapat diisi ulang."
        ]);
        exit();
    }
}

// 2. Cek limit 1x sehari untuk kebiasaan tunggal
$singleLimit = ['bangun', 'tidur', 'olahraga', 'belajar', 'masyarakat'];
if (in_array($habit_type, $singleLimit)) {
    $stmt = $pdo->prepare("SELECT id FROM habit_logs WHERE student_id = ? AND habit_type = ? AND log_date = ? LIMIT 1");
    $stmt->execute([$student_id, $habit_type, $log_date]);
    if ($stmt->fetch()) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => "Kebiasaan '{$habit_type}' sudah diisi pada tanggal {$log_date} (Limit 1x per hari)."
        ]);
        exit();
    }
}

// 3. Simpan log kebiasaan
$stmt = $pdo->prepare("
    INSERT INTO habit_logs (student_id, habit_type, sub_category, log_date, created_at, score, payload, is_counter_entry, is_missed)
    VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?)
");

$stmt->execute([
    $student_id,
    $habit_type,
    $sub_category,
    $log_date,
    $score,
    json_encode($payload),
    $is_counter,
    $is_missed
]);

echo json_encode([
    'success' => true,
    'message' => "Kebiasaan {$habit_type} berhasil dicatat",
    'score' => $score,
    'log_date' => $log_date,
    'is_missed' => $is_missed
]);
