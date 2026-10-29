# PANDUAN LENGKAP SETUP DATABASE SQL & BACKEND PHP
## Sistem VERTIKAL SMA JAWARA 28 (SMAN 28 Jakarta)

Selamat datang! Folder ini (`/backend_php_sql/`) berisi seluruh berkas SQL dan PHP lengkap yang dapat langsung Anda gunakan (copy-paste) ke lingkungan web server Anda (seperti XAMPP, Laragon, cPanel, atau VPS).

---

### 1. Struktur Berkas dalam Folder Ini
```
/backend_php_sql/
├── schema.sql              -> Script SQL lengkap membuat database, tabel, dan data demo akun
├── db_config.php           -> Konfigurasi koneksi database PDO MySQL/MariaDB
├── login.php               -> Script PHP otentikasi login (Siswa, Guru, Admin)
├── submit_habit.php        -> Script PHP pencatatan kebiasaan dengan validasi & limitasi
└── README.md               -> Panduan ini
```

---

### 2. Cara Import Database ke MySQL / phpMyAdmin

1. **Buka phpMyAdmin** di browser Anda: `http://localhost/phpmyadmin`
2. Klik tab **"Import"** di bagian atas.
3. Klik tombol **"Choose File"** lalu pilih berkas `/backend_php_sql/schema.sql`.
4. Klik tombol **"Go" / "Kirim"** di bagian bawah.
5. Database `vertikal_jawara28` beserta seluruh tabel (`students`, `teachers`, `habit_logs`, `admin_validations`) akan langsung terbentuk secara otomatis.

> **Atau via Terminal / Command Prompt:**
> ```bash
> mysql -u root -p < /backend_php_sql/schema.sql
> ```

---

### 3. Akun Resmi Default (Hanya 1 Akun per Peran)

Sesuai permintaan Anda, seluruh data demo lainnya telah dihapus. Hanya ada 3 akun resmi dengan kata sandi:

| Peran (Role) | Username / NISN / NIP | Password | Keterangan |
|---|---|---|---|
| **Siswa** | `siswa` | `123` | Siswa Jawara 28 (Kelas XI-MIPA-1) |
| **Guru** | `guru` | `123` | Dra. Hj. Nurhidayah, M.Pd. (Wali Kelas) |
| **Admin** | `admin` | `123` | Drs. H. Ubaidillah, M.M. (Admin Kesiswaan) |

---

### 4. Cara Menambah / Membuat Akun Baru

#### Cara A: Langsung di Aplikasi React AI Studio
Buka berkas:
`/src/config/accounts.ts`

Tambahkan akun siswa atau guru baru di array `USER_ACCOUNTS`:
```ts
{
  id: 'std-2025001',
  username: '1234567890', // NISN Siswa untuk login
  password: '123',        // Kata sandi siswa
  name: 'Ahmad Hanif',
  role: 'siswa',
  class_name: 'XI-MIPA-1',
  angkatan: '2025/2026',
  religion: 'Islam',
  gender: 'L',
  walas_name: 'Dra. Hj. Nurhidayah, M.Pd.',
  walas_nip: '197405101999032001',
}
```

#### Cara B: Langsung di Database MySQL
Jalankan perintah SQL ini di tab **SQL** phpMyAdmin:
```sql
-- Tambah Akun Siswa Baru
INSERT INTO `students` (`id`, `nisn`, `password`, `name`, `gender`, `class_name`, `angkatan`, `religion`, `walas_name`, `walas_nip`)
VALUES ('std-hanif', '0089123456', '123', 'Ahmad Hanif', 'L', 'XI-MIPA-1', '2025/2026', 'Islam', 'Dra. Hj. Nurhidayah, M.Pd.', '197405101999032001');

-- Tambah Akun Guru Baru
INSERT INTO `teachers` (`id`, `nip`, `password`, `name`, `class_name`, `subject`, `role`)
VALUES ('tch-budi', '198001012005011002', '123', 'Budi Santoso, S.Pd.', 'XI-MIPA-2', 'Matematika', 'Guru Wali Kelas');
```

---

### 5. Konfigurasi Koneksi PHP (`db_config.php`)

Buka berkas `/backend_php_sql/db_config.php` dan sesuaikan parameter berikut:
```php
$db_host = '127.0.0.1';
$db_name = 'vertikal_jawara28';
$db_user = 'root';
$db_pass = ''; // Jika di hosting cPanel, isi password user MySQL Anda
$db_port = 3306;
```

---

### 6. Ringkasan Rumus Penilaian 7 KAIH SMAN 28 Jakarta

1. **Bangun Pagi**:
   - `04.00 – 04.20 WIB` = **100 Poin**
   - `04.21 – 04.40 WIB` = **90 Poin**
   - `04.41 – 05.00 WIB` = **80 Poin**
   - `05.01 – 06.20 WIB` = **70 Poin**
   - `06.21 – 06.40 WIB` = **60 Poin**
   - `> 06.40 WIB` = **50 Poin**
   - *Mode Terlewat*: Dikenakan penalti **-5 poin**.

2. **Beribadah (Islam, Kristen/Katolik, Hindu)**:
   - **Islam (Shalat 5 Waktu)**:
     - Rumus: `Poin = (Tsisa / Ttotal) * 100` (Cap min: 50 pt).
     - `Ttotal = Interval Adzan ke Shalat Berikutnya - 15 Menit`.
     - *Mengaji*: Additional +1 poin / halaman.
     - *Perempuan*: Opsi "Berhalangan / Haid" -> auto 100 poin.
     - *Shalat yang sudah diisi TIDAK BISA DIISI LAGI*.
   - **Kristen/Katolik**:
     - 5 Doa Harian (Bangun, Makan, Pergi, Pulang, Tidur) = 20 poin per doa (total 100).
     - Ibadah Lain (Gereja/Persekutuan) = additional +3 poin.
   - **Hindu**:
     - Tri Sandhya (Pagi, Siang, Sore) = 33.3 poin per waktu (total 100).
     - Ibadah Lain = additional +3 poin.

3. **Berolahraga**:
   - Aktivitas (Mandiri: 10, Kelompok: 10, Jalan kaki tangga: 10, Pemanasan: 10, Bersepeda/Jalan ke sekolah: +10).
   - Durasi (<15m: 25, 15-30m: 35, 31-60m: 45, >60m: 60).
   - Maksimal 100 poin.

4. **Makan Bergizi**:
   - 3 Sesi: Sarapan (06.00-08.00: 15 pt), Makan Siang (11.30-13.00: 15 pt), Makan Malam (18.00-19.30: 15 pt). Lewat jam: 5 pt.
   - Isi Piringku: Karbohidrat 10, Lauk 10, Sayur 10, Buah 10 (Total 40).
   - Air Minum: ≥2 Gelas = 15 pt, 1 Gelas = 5 pt, 0/Manis = 0 pt.
   - Eco-Friendly: Kotak makan (+5), Tumbler (+5).
   - Puasa: Checkbox "Saya Puasa" -> Menu Sahur, Buka, Malam.
   - Nilai akhir dirata-ratakan dari 3 sesi makan.

5. **Gemar Belajar**:
   - Durasi (>3h: 60, 2-3h: 50, 1-2h: 40, 30-60m: 30, 15-30m: 20, <15m: 10).
   - Kegiatan (≥3 bentuk: 30, 2 bentuk: 20, 1 bentuk: 10).
   - Output (≥10 karakter: 10, <10 karakter: 5, kosong: 0). Total 100.

6. **Bermasyarakat**:
   - Aksi (≥4 aksi: 90, 3 aksi: 80, 2 aksi: 70, 1 aksi: 60).
   - Piket / Adiwiyata SMAN 28: additional +5.
   - Deskripsi (≥10 karakter: 10, <10 karakter: 5, kosong: 0). Total 100.

7. **Tidur Cepat**:
   - Waktu (<21.30: 75, 21.30-22.30: 65, 22.31-23.30: 55, >23.30: 45).
   - Eco-Friendly: Matikan lampu (+5).
   - Kualitas Tidur (Skala 5: 25, Skala 4: 20, Skala 3: 15, Skala 2: 10, Skala 1: 5). Total 100.
