/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ============================================================================
 * DIRECTORY ATURAN & FORMULASI PENILAIAN 7 KAIH SMAN 28 JAKARTA (SPESIFIKASI FINAL)
 * ============================================================================
 */

export const PRAYER_SCHEDULE = {
  subuh: {
    name: 'Subuh',
    adzanTime: '04:00',
    nextPrayerTime: '05:30',
    totalMinutes: 90,
  },
  zuhur: {
    name: 'Zuhur',
    adzanTime: '11:40',
    nextPrayerTime: '14:55',
    totalMinutes: 195,
  },
  asar: {
    name: 'Asar',
    adzanTime: '14:55',
    nextPrayerTime: '17:50',
    totalMinutes: 175,
  },
  magrib: {
    name: 'Maghrib',
    adzanTime: '17:50',
    nextPrayerTime: '19:05',
    totalMinutes: 75,
  },
  isya: {
    name: 'Isya',
    adzanTime: '19:05',
    nextPrayerTime: '04:00',
    totalMinutes: 535,
  },
};

export const SCORING_RULES = {
  version: 'v2.0-final-7kaih',

  // 1. Beribadah Islam — Shalat Wajib & Berhalangan (Perempuan)
  // Kategori waktu: Awal waktu (100), Tengah waktu (85), Akhir waktu (70)
  // Ibadah sunnah bonus: +5 poin
  // Saat Berhalangan (Perempuan): 5 komponen @ 20 poin = 100 poin
  shalat: {
    awalWaktu: 100,
    tengahWaktu: 85,
    akhirWaktu: 70,
    sunnahBonus: 5,
    toleranceDeductionMinutes: 15,
    minCapScore: 0,
    maxScore: 100,
    quranPageBonus: 1.0,
    missedPenalty: 0, // Tidak ada pengurangan nilai 5 poin karena fleksibel / terlambat
    halanganComponents: [
      { id: 'dzikir_doa', label: 'Berdzikir dan berdoa', score: 20 },
      { id: 'murajaah_quran', label: "Mendengar, membaca, atau muraja'ah Al-Qur'an", score: 20 },
      { id: 'berbuat_baik', label: 'Berbuat baik, contohnya bersedekah', score: 20 },
      { id: 'kajian_agama', label: 'Belajar ilmu agama atau mendengarkan kajian', score: 20 },
      { id: 'kebersihan_diri', label: 'Menjaga kebersihan dan kesehatan diri', score: 20 },
    ],
  },

  // Tri Sandhya Hindu (Pagi 06.00, Siang 12.00, Sore 18.00 @ maks 100 pt)
  // Awal (0-2 jam): 100, Tengah (2-4 jam): 85, Akhir (4-6 jam): 70
  // Membaca kitab suci Weda bonus: +5 poin
  triSandhya: {
    pagi: { startMin: 360, idealMin: 360, endMin: 720, label: 'Tri Sandhya Pagi (Ideal 06.00 WIB)' },
    siang: { startMin: 720, idealMin: 720, endMin: 1080, label: 'Tri Sandhya Siang (Ideal 12.00 WIB)' },
    sore: { startMin: 1080, idealMin: 1080, endMin: 1440, label: 'Tri Sandhya Sore (Ideal 18.00 WIB)' },
    awalWaktu: 100,   // 0 - 2 jam setelah waktu ideal
    tengahWaktu: 85,  // 2 - 4 jam setelah waktu ideal
    akhirWaktu: 70,   // 4 - 6 jam setelah waktu ideal
    wedaBonus: 5,
    otherWorshipBonus: 5,
    toleranceDeductionMinutes: 15,
    maxScore: 100,
    missedPenalty: 0,
  },

  // Kristen / Katolik (5 kebiasaan @ 20 poin = 100 poin)
  // Bonus membaca kitab suci: +5 poin
  doaKristen: {
    items: [
      { id: 'bangun', label: 'Doa bangun tidur', score: 20 },
      { id: 'alkitab', label: 'Membaca Alkitab', score: 20 },
      { id: 'makan', label: 'Doa saat makan', score: 20 },
      { id: 'kegiatan', label: 'Doa sebelum melakukan kegiatan', score: 20 },
      { id: 'tidur', label: 'Doa sebelum tidur', score: 20 },
    ],
    bangun: { startMin: 240, idealMin: 360, endMin: 450, label: 'Doa bangun tidur', score: 20 },
    pergi: { startMin: 360, idealMin: 405, endMin: 1320, label: 'Membaca Alkitab', score: 20 },
    makan: { startMin: 360, idealMin: 750, endMin: 1320, label: 'Doa saat makan', score: 20 },
    pulang: { startMin: 360, idealMin: 930, endMin: 1320, label: 'Doa sebelum melakukan kegiatan', score: 20 },
    tidur: { startMin: 1080, idealMin: 1260, endMin: 1439, label: 'Doa sebelum tidur', score: 20 },
    maxScore: 100,
    otherWorshipBonus: 5,
    missedPenalty: 0,
  },

  // 2. Bangun Pagi:
  // Ketepatan waktu bangun (Maks 75 Poin) + Kondisi saat bangun (Maks 25 Poin) = 100 Poin
  // Tidak ada pengurangan tambahan karena pengisian fleksibel / terlewat
  bangunPagi: {
    brackets: [
      { id: '04.00-04.20', label: '04.00 – 04.20 WIB', minMin: 240, maxMin: 260, score: 75 },
      { id: '04.21-04.40', label: '04.21 – 04.40 WIB', minMin: 261, maxMin: 280, score: 70 },
      { id: '04.41-05.00', label: '04.41 – 05.00 WIB', minMin: 281, maxMin: 300, score: 65 },
      { id: '05.01-06.20', label: '05.01 – 06.20 WIB', minMin: 301, maxMin: 380, score: 60 },
      { id: '06.21-06.40', label: '06.21 – 06.40 WIB', minMin: 381, maxMin: 400, score: 55 },
      { id: '>06.40', label: 'Lebih dari 06.40 WIB', minMin: 401, maxMin: 1440, score: 50 },
    ],
    kondisiLabels: {
      5: { label: 'Sangat segar', score: 25 },
      4: { label: 'Cukup segar', score: 20 },
      3: { label: 'Kurang segar', score: 15 },
      2: { label: 'Lemas atau masih mengantuk', score: 10 },
      1: { label: 'Pusing atau kelelahan', score: 5 },
    },
    conditionRatings: [
      { stars: 5, score: 25, label: 'Sangat segar' },
      { stars: 4, score: 20, label: 'Cukup segar' },
      { stars: 3, score: 15, label: 'Kurang segar' },
      { stars: 2, score: 10, label: 'Lemas atau masih mengantuk' },
      { stars: 1, score: 5, label: 'Pusing atau kelelahan' },
    ],
    kebugaran: {
      1: 5,
      2: 10,
      3: 15,
      4: 20,
      5: 25,
    },
    missedPenalty: 0,
  },

  // 3. Makan Bergizi
  // Sesi: Sarapan (ideal 06.00-08.00, batas 11.29), Makan siang (ideal 11.30-13.00, batas 17.49), Makan malam (ideal 18.00-19.30, batas 23.59)
  // Saat puasa: Sahur (ideal 03.30 - 10m sblm Subuh, batas 00.00 - Subuh), Makan malam (ideal 18.30-19.15, batas 23.59)
  // Komponen nilai per sesi:
  // Waktu makan: 15 (ideal) / 10 (di luar ideal tapi masih dalam batas)
  // Karbohidrat: 17.5, Lauk: 17.5, Sayur: 15, Buah: 15
  // Minum >=2 gelas: 20, 1 gelas: 15, 0 gelas: 0
  // Total dasar maksimal per sesi: 15 + 17.5 + 17.5 + 15 + 15 + 20 = 100
  // Bonus Adiwiyata: Kotak makan sendiri (+5), Tumbler sendiri (+5)
  makan: {
    sarapan: { onTimeMin: 360, onTimeMax: 480, limitMax: 689, onTimeScore: 15, lateScore: 10 },
    siang: { onTimeMin: 690, onTimeMax: 780, limitMax: 1069, onTimeScore: 15, lateScore: 10 },
    malam: { onTimeMin: 1080, onTimeMax: 1170, limitMax: 1439, onTimeScore: 15, lateScore: 10 },
    sahur: { onTimeMin: 210, onTimeMax: 230, limitMax: 240, onTimeScore: 15, lateScore: 10 },
    buka: { onTimeMin: 1110, onTimeMax: 1155, limitMax: 1439, onTimeScore: 15, lateScore: 10 },
    karbo: 17.5,
    lauk: 17.5,
    sayur: 15,
    buah: 15,
    air2Gelas: 20,
    air1Gelas: 15,
    air0Gelas: 0,
    kotakMakanEco: 5,
    tumblerEco: 5,
    missedPenalty: 0,
  },

  // 4. Berolahraga
  // Aktivitas: Mandiri (10), Kelompok/ekskul (10), Jalan kaki/tangga (10), Pemanasan/peregangan (10) -> Maks 40
  // Durasi: <15 menit (25), 15-30 menit (35), >30 menit (45)
  // Deskripsi: >=15 karakter (15), 10-15 karakter (10), <10 karakter/kosong (0)
  // Total dasar maksimal: 40 + 45 + 15 = 100
  // Bonus Adiwiyata: Jalan kaki atau bersepeda ke sekolah (+5)
  olahraga: {
    actMandiri: 10,
    actKelompok: 10,
    actJalanTangga: 10,
    actStretching: 10,
    actKeSekolahEco: 5, // Bonus Adiwiyata 5 poin
    durLess15: 25,
    dur15to30: 35,
    durOver30: 45,
    dur31to60: 45,
    durOver60: 45,
    descFull: 15,   // >= 15 karakter
    descBasic: 10,  // 10 - 14 karakter
    descEmpty: 0,   // < 10 karakter
    missedPenalty: 0,
  },

  // 5. Gemar Belajar
  // Durasi (Max 60): >3h (60), 2-3h (50), 1-2h (40), 30-60m (30), 15-30m (20), <15m (10), Tidak belajar (0)
  // Jumlah kegiatan (Max 30): >=3 (30), 2 (20), 1 (10), 0 (0)
  // Deskripsi hasil belajar (Max 10): >=15 karakter (10), 10-15 karakter (5), <10 karakter/kosong (0)
  belajar: {
    durOver3h: 60,
    dur2to3h: 50,
    dur1to2h: 40,
    dur30to60m: 30,
    dur15to30m: 20,
    durLess15m: 10,
    dur0m: 0,
    act3OrMore: 30,
    act2: 20,
    act1: 10,
    act0: 0,
    descDetailed: 10, // >= 15 karakter
    descShort: 5,     // 10 - 15 karakter
    descEmpty: 0,     // < 10 karakter
    missedPenalty: 0,
  },

  // 6. Bermasyarakat
  // Jumlah tindakan sosial (Max 90): >=4 (90), 3 (80), 2 (70), 1 (60), 0 (0)
  // Deskripsi (Max 10): >15 karakter (10), 10-15 karakter (5), <10 karakter/kosong (0)
  // Piket atau menjaga kebersihan lingkungan: Bonus Adiwiyata +5
  masyarakat: {
    act4OrMore: 90,
    act3: 80,
    act2: 70,
    act1: 60,
    act0: 0,
    piketEcoBonus: 5,
    descDetailed: 10, // > 15 karakter
    descShort: 5,     // 10 - 15 karakter
    descEmpty: 0,     // < 10 karakter
    missedPenalty: 0,
    socialActionsList: [
      { id: 'bantu_rumah', label: 'Membantu pekerjaan rumah atau anggota keluarga.' },
      { id: 'tolong_kesulitan', label: 'Menolong seseorang yang mengalami kesulitan.' },
      { id: 'tegur_sapa', label: 'Bertegur sapa dan bersikap santun kepada tetangga atau warga sekolah.' },
      { id: 'kegiatan_rt', label: 'Mengikuti kegiatan RT/RW, Karang Taruna, atau komunitas sekitar.' },
      { id: 'relawan_sosial', label: 'Menjadi relawan atau ikut serta dalam kegiatan kemanusiaan dan kepedulian sosial.' },
    ],
  },

  // 7. Tidur Cepat
  tidur: {
    before2130: 75,
    between2130_2230: 65,
    between2231_2330: 55,
    after2330: 45,
    matikanLampuEco: 5,
    kondisiLabels: {
      5: { label: 'Sangat rileks', score: 25 },
      4: { label: 'Rileks', score: 20 },
      3: { label: 'Cukup rileks', score: 15 },
      2: { label: 'Belum mengantuk', score: 10 },
      1: { label: 'Tidak mengantuk', score: 5 },
    },
    conditionRatings: [
      { stars: 1, score: 5, label: 'Tidak mengantuk' },
      { stars: 2, score: 10, label: 'Belum mengantuk' },
      { stars: 3, score: 15, label: 'Cukup rileks' },
      { stars: 4, score: 20, label: 'Rileks' },
      { stars: 5, score: 25, label: 'Sangat rileks' },
    ],
    brackets: [
      { id: '<21.30', label: 'Sebelum 21.30 WIB', score: 75 },
      { id: '21.30-22.30', label: '21.30 – 22.30 WIB', score: 65 },
      { id: '22.31-23.30', label: '22.31 – 23.30 WIB', score: 55 },
      { id: '>23.30', label: 'Setelah 23.30 WIB', score: 45 },
    ],
    quality5: 25,
    quality4: 20,
    quality3: 15,
    quality2: 10,
    quality1: 5,
    missedPenalty: 0,
  },
  tidurCepat: {
    before2130: 75,
    between2130_2230: 65,
    between2231_2330: 55,
    after2330: 45,
    matikanLampuEco: 5,
    kondisiLabels: {
      5: { label: 'Sangat rileks', score: 25 },
      4: { label: 'Rileks', score: 20 },
      3: { label: 'Cukup rileks', score: 15 },
      2: { label: 'Belum mengantuk', score: 10 },
      1: { label: 'Tidak mengantuk', score: 5 },
    },
    conditionRatings: [
      { stars: 1, score: 5, label: 'Tidak mengantuk' },
      { stars: 2, score: 10, label: 'Belum mengantuk' },
      { stars: 3, score: 15, label: 'Cukup rileks' },
      { stars: 4, score: 20, label: 'Rileks' },
      { stars: 5, score: 25, label: 'Sangat rileks' },
    ],
    brackets: [
      { id: '<21.30', label: 'Sebelum 21.30 WIB', score: 75 },
      { id: '21.30-22.30', label: '21.30 – 22.30 WIB', score: 65 },
      { id: '22.31-23.30', label: '22.31 – 23.30 WIB', score: 55 },
      { id: '>23.30', label: 'Setelah 23.30 WIB', score: 45 },
    ],
    quality5: 25,
    quality4: 20,
    quality3: 15,
    quality2: 10,
    quality1: 5,
    missedPenalty: 0,
  },

  // 8. Aktivitas Seru
  aktivitasSeru: {
    bonusPoints: 10,
  },
};

export const SCORING_CONFIG = {
  bangunPagi: {
    wakeTimePoints: {
      slot_0400_0420: 75,
      slot_0421_0440: 70,
      slot_0441_0500: 65,
      slot_0501_0620: 60,
      slot_0621_0640: 55,
      after_0640: 50,
    },
    conditionRatings: SCORING_RULES.bangunPagi.conditionRatings,
    brackets: SCORING_RULES.bangunPagi.brackets,
  },
  tidurCepat: {
    sleepTimePoints: {
      before_2130: 75,
      slot_2130_2230: 65,
      slot_2231_2330: 55,
      after_2330: 45,
    },
    conditionRatings: SCORING_RULES.tidur.conditionRatings,
    brackets: SCORING_RULES.tidur.brackets,
  },
  beribadah: {
    islam: {
      prayerPoints: {
        awal: 100,
        tengah: 85,
        akhir: 70,
      },
      halanganComponents: [
        { id: 'dzikir_doa', label: 'Berdzikir dan berdoa', points: 20, score: 20 },
        { id: 'murajaah_quran', label: "Mendengar, membaca, atau muraja'ah Al-Qur'an", points: 20, score: 20 },
        { id: 'berbuat_baik', label: 'Berbuat baik, contohnya bersedekah', points: 20, score: 20 },
        { id: 'kajian_agama', label: 'Belajar ilmu agama atau mendengarkan kajian', points: 20, score: 20 },
        { id: 'kebersihan_diri', label: 'Menjaga kebersihan dan kesehatan diri', points: 20, score: 20 },
      ],
      sunnahBonus: 5,
    },
    hindu: {
      triSandhyaPoints: {
        awal: 100,
        tengah: 85,
        akhir: 70,
      },
      defaultSchedule: {
        pagi: '06:00',
        siang: '12:00',
        sore: '18:00',
      },
      wedaBonus: 5,
    },
    kristenKatolik: {
      items: [
        { id: 'doa_bangun_tidur', label: 'Doa bangun tidur', points: 20, score: 20 },
        { id: 'baca_alkitab', label: 'Membaca Alkitab', points: 20, score: 20 },
        { id: 'doa_makan', label: 'Doa saat makan', points: 20, score: 20 },
        { id: 'doa_kegiatan', label: 'Doa sebelum melakukan kegiatan', points: 20, score: 20 },
        { id: 'doa_tidur', label: 'Doa sebelum tidur', points: 20, score: 20 },
      ],
      bonusKitabSuci: 5,
    },
  },
  makanBergizi: {
    sessionComponents: {
      waktuIdeal: 15,
      waktuDiluarIdeal: 10,
      karbohidrat: 17.5,
      lauk: 17.5,
      sayur: 15,
      buah: 15,
      minum2GelasAtauLebih: 20,
      minum1Gelas: 15,
      minum0Gelas: 0,
    },
    bonusAdiwiyata: {
      kotakMakan: 5,
      tumbler: 5,
    },
  },
  bermasyarakat: {
    socialActionOptions: [
      'Membantu pekerjaan rumah atau anggota keluarga.',
      'Menolong seseorang yang mengalami kesulitan.',
      'Bertegur sapa dan bersikap santun kepada tetangga atau warga sekolah.',
      'Mengikuti kegiatan RT/RW, Karang Taruna, atau komunitas sekitar.',
      'Menjadi relawan atau ikut serta dalam kegiatan kemanusiaan dan kepedulian sosial.',
    ],
  },
};
