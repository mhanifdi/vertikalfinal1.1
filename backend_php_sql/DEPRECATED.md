# STATUS: DEPRECATED / LEGACY ARCHIVE (`backend_php_sql`)

> **PERINGATAN ARSITEKTUR**: Folder `backend_php_sql/` ini adalah prototipe lama berbasis PHP + MySQL (`jawara28_db`) dan **TIDAK DIGUNAKAN** oleh sistem utama **VERTIKAL SMA JAWARA 28**.

## Mengapa Folder Ini Diarsipkan (Deprecated)?
Berdasarkan hasil Audit Menyeluruh Database & Backend:
1. **Ketidaksesuaian Stack & Skema**:
   - Prototipe ini menggunakan PHP PDO + MySQL dengan hanya 4 tabel sederhana (`students`, `teachers`, `habit_logs`, `admin_validations`).
   - Tidak memiliki tabel `users`, `roles`, `permissions`, `sessions`, `classes`, `rombels`, `student_class_memberships`, `student_rombel_memberships`, `journals`, `habit_entries`, `habit_sessions`, `habit_components`, `point_transactions`, `streak_records`, `data_corrections`, maupun `audit_logs`.
2. **Kelemahan Keamanan Kritis**:
   - `login.php` memeriksa password secara *plain text* (`$password === '123'`) tanpa *password hashing* kriptografis.
   - `submit_habit.php` tidak memverifikasi token sesi atau kepemilikan `student_id` (rentan terhadap *Insecure Direct Object Reference* / IDOR).
3. **Aturan Penilaian Kedaluwarsa**:
   - Masih menerapkan penalti `-5` poin untuk pengisian terlewat (bertentangan dengan **Spesifikasi Final 7 KAIH** yang menetapkan *tidak ada pengurangan nilai 5 poin*).
   - Masih menggunakan rumus kontinu lama untuk Beribadah dan Tidur Cepat.

## Sistem Backend Resmi yang Aktif
Seluruh layanan backend dan database aktif berada pada:
- **Entry Point Server**: [`/server.ts`](../server.ts) dan [`/server/src/app.ts`](../server/src/app.ts)
- **Arsitektur Modular**: [`/server/src/`](../server/src/)
- **Migrasi & Skema Database (PostgreSQL & Relational Engine)**: [`/server/src/database/migrations/`](../server/src/database/migrations/)
- **Dokumentasi Lengkap**: [`/docs/`](../docs/)
