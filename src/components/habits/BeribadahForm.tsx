/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Formulir Kebiasaan Beribadah — Spesifikasi Final Section 2 & Addendum B (Siswi Berhalangan)
 * 1. Islam — Shalat Wajib (5 kartu: Subuh 04.00, Zuhur 11.40, Asar 14.55, Maghrib 17.50, Isya 19.05)
 *    - Pilihan kategori waktu manual: Awal waktu (100), Tengah waktu (85), Akhir waktu (70)
 *    - Shalat yang belum memasuki waktu yang diizinkan tidak dapat diisi.
 *    - Ibadah sunnah menjadi bonus +5 poin (checkbox puasa sunnah + kolom kegiatan sunnah lain seperti tahajud/Al-Qur'an).
 * 2. Islam — Siswi Berhalangan (Addendum B, khusus studentGender === 'P'):
 *    - Checkbox "Saya sedang berhalangan" dengan transisi dinamis.
 *    - Ketika dicentang, 5 kartu shalat wajib disembunyikan dan digantikan 5 komponen ibadah/kebaikan pengganti @ 20 poin (Total maksimal 100):
 *      1. Berdzikir dan berdoa (20)
 *      2. Mendengar, membaca, atau muraja'ah Al-Qur'an (20)
 *      3. Berbuat baik, contohnya bersedekah (20)
 *      4. Belajar ilmu agama atau mendengarkan kajian (20)
 *      5. Menjaga kebersihan dan kesehatan diri (20)
 *    - Menampilkan progres "X/5 komponen" dan skor sementara "XX / 100".
 *    - Konfirmasi sebelum menimpa data jika berpindah antara mode shalat wajib dan mode berhalangan.
 * 3. Kristen & Katolik (Section 2.2):
 *    - 5 aktivitas ibadah @ 20 poin (Total maksimal 100):
 *      1. Doa bangun tidur
 *      2. Membaca Alkitab
 *      3. Doa saat makan
 *      4. Doa sebelum melakukan kegiatan
 *      5. Doa sebelum tidur
 *    - Bonus membaca kitab suci: +5 poin.
 * 4. Hindu — Tri Sandhya (Section 2.3):
 *    - 3 sesi: Pagi (06.00), Siang (12.00), Sore (18.00) @ maksimal 100 poin (dirata-ratakan / 3).
 *    - Kategori waktu: Awal waktu 0–2 jam (100), Tengah waktu 2–4 jam (85), Akhir waktu 4–6 jam (70).
 *    - Bonus membaca kitab suci Weda: +5 poin.
 */

import React, { useState, useEffect } from 'react';
import {
  Heart,
  Check,
  Clock,
  ShieldCheck,
  BookOpen,
  Calendar,
  Sparkles,
  Lock,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
} from 'lucide-react';
import {
  calculateIslamHalanganScore,
  applyBonusCapAndOverflow,
} from '../../utils/scoring';
import { SCORING_CONFIG } from '../../config/scoringConfig';
import { timeToMinutes } from '../../utils/timeClassifier';

interface BeribadahFormProps {
  studentReligion?: string;
  studentGender?: string;
  todayLogs?: any[];
  isMissedEntry?: boolean;
  targetDate?: string;
  initialHalangan?: boolean;
  onSuccess: (score: number, payload: any, isCounter?: boolean, subCategory?: string, overwrite?: boolean) => void;
  onCancel: () => void;
}

export const BeribadahForm: React.FC<BeribadahFormProps> = ({
  studentReligion = 'Islam',
  studentGender = 'L',
  todayLogs = [],
  isMissedEntry = false,
  targetDate,
  initialHalangan = false,
  onSuccess,
  onCancel,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const displayDate = targetDate || todayStr;
  const isPastDay = displayDate < todayStr || isMissedEntry;

  const isIslam = !studentReligion || studentReligion.toLowerCase().includes('islam');
  const isKristen =
    studentReligion?.toLowerCase().includes('kristen') ||
    studentReligion?.toLowerCase().includes('katolik');
  const isHindu = studentReligion?.toLowerCase().includes('hindu');

  const [currentPage, setCurrentPage] = useState<1 | 2>(1);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [currentMinutes, setCurrentMinutes] = useState(0);
  const [showHonestyModal, setShowHonestyModal] = useState(false);
  const [switchModeConfirm, setSwitchModeConfirm] = useState<'to_halangan' | 'to_shalat' | null>(null);

  // Extract existing logs for this date
  const completedPrayersMap: Record<string, any> = {};
  let existingHalanganLog: any = null;
  todayLogs.forEach((log) => {
    const sub = (log.sub_category || '').toLowerCase();
    if (sub) {
      completedPrayersMap[sub] = log;
    }
    if (sub === 'halangan') {
      existingHalanganLog = log;
    }
    try {
      const p = typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload;
      if (p?.isHalangan) existingHalanganLog = log;
    } catch {}
  });

  // Islam Regular State
  const [chosenPrayer, setChosenPrayer] = useState<'subuh' | 'zuhur' | 'asar' | 'magrib' | 'isya'>('subuh');
  const [chosenTimeCategory, setChosenTimeCategory] = useState<'awal' | 'tengah' | 'akhir'>('awal');
  const [puasaSunnah, setPuasaSunnah] = useState<boolean>(false);
  const [sunnahText, setSunnahText] = useState<string>('');

  // Islam Female "Saya sedang berhalangan" State (Addendum B)
  const [isHalangan, setIsHalangan] = useState<boolean>(
    studentGender === 'P' && (initialHalangan || Boolean(existingHalanganLog))
  );
  const [halanganItems, setHalanganItems] = useState<{
    dzikirDoa: boolean;
    murajaahQuran: boolean;
    berbuatBaik: boolean;
    kajianAgama: boolean;
    kebersihanDiri: boolean;
  }>(() => {
    if (existingHalanganLog?.parsedPayload?.halangan) {
      return existingHalanganLog.parsedPayload.halangan;
    }
    return {
      dzikirDoa: false,
      murajaahQuran: false,
      berbuatBaik: false,
      kajianAgama: false,
      kebersihanDiri: false,
    };
  });
  const [halanganNotes, setHalanganNotes] = useState<string>(
    existingHalanganLog?.parsedPayload?.notes || ''
  );

  // Kristen / Katolik State (5 checkboxes @ 20 pts + bonus kitab suci +5)
  const [kristenItems, setKristenItems] = useState<{
    doaBangunTidur: boolean;
    bacaAlkitab: boolean;
    doaMakan: boolean;
    doaKegiatan: boolean;
    doaTidur: boolean;
  }>(() => {
    const unified = completedPrayersMap['kristen_lengkap'];
    if (unified?.parsedPayload?.kristenItems) {
      return unified.parsedPayload.kristenItems;
    }
    return {
      doaBangunTidur: Boolean(completedPrayersMap['bangun'] || completedPrayersMap['doa_bangun_tidur']),
      bacaAlkitab: Boolean(completedPrayersMap['alkitab'] || completedPrayersMap['baca_alkitab']),
      doaMakan: Boolean(completedPrayersMap['makan'] || completedPrayersMap['doa_makan']),
      doaKegiatan: Boolean(completedPrayersMap['kegiatan'] || completedPrayersMap['pergi'] || completedPrayersMap['doa_kegiatan']),
      doaTidur: Boolean(completedPrayersMap['tidur'] || completedPrayersMap['doa_tidur']),
    };
  });
  const [kristenBonusKitabSuci, setKristenBonusKitabSuci] = useState<boolean>(false);
  const [kristenNotes, setKristenNotes] = useState<string>('');
  const [activeKristenDetail, setActiveKristenDetail] = useState<string | null>(null);

  // Hindu Tri Sandhya State (Pagi 06.00, Siang 12.00, Sore 18.00)
  const [chosenHinduSandhya, setChosenHinduSandhya] = useState<'pagi' | 'siang' | 'sore'>('pagi');
  const [hinduTimeCategory, setHinduTimeCategory] = useState<'awal' | 'tengah' | 'akhir'>('awal');
  const [bacaWeda, setBacaWeda] = useState<boolean>(false);
  const [hinduNote, setHinduNote] = useState<string>('');

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const timeStr = `${hh}:${mm}`;
      const min = timeToMinutes(timeStr);
      setCurrentTimeStr(timeStr);
      setCurrentMinutes(min);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Islam 5 Prayer cards definition (Spesifikasi Final Section 2.1)
  const PRAYER_LIST: {
    key: 'subuh' | 'zuhur' | 'asar' | 'magrib' | 'isya';
    label: string;
    startStr: string;
    startMin: number;
  }[] = [
    { key: 'subuh', label: 'Subuh', startStr: '04.00', startMin: 240 },
    { key: 'zuhur', label: 'Zuhur', startStr: '11.40', startMin: 700 },
    { key: 'asar', label: 'Asar', startStr: '14.55', startMin: 895 },
    { key: 'magrib', label: 'Maghrib', startStr: '17.50', startMin: 1070 },
    { key: 'isya', label: 'Isya', startStr: '19.05', startMin: 1145 },
  ];

  const getPrayerStatus = (p: typeof PRAYER_LIST[0]) => {
    if (completedPrayersMap[p.key]) {
      return { status: 'done' as const, score: completedPrayersMap[p.key].score };
    }
    if (isPastDay) {
      return { status: 'open' as const, score: null };
    }
    if (currentMinutes >= p.startMin) {
      return { status: 'open' as const, score: null };
    }
    return { status: 'locked' as const, score: null };
  };

  // Hindu Tri Sandhya list (Spesifikasi Final Section 2.3)
  const HINDU_LIST: {
    key: 'pagi' | 'siang' | 'sore';
    label: string;
    startStr: string;
    startMin: number;
  }[] = [
    { key: 'pagi', label: 'Tri Sandhya Pagi', startStr: '06.00', startMin: 360 },
    { key: 'siang', label: 'Tri Sandhya Siang', startStr: '12.00', startMin: 720 },
    { key: 'sore', label: 'Tri Sandhya Sore', startStr: '18.00', startMin: 1080 },
  ];

  const getHinduStatus = (s: typeof HINDU_LIST[0]) => {
    const found = completedPrayersMap[`hindu_${s.key}`] || completedPrayersMap[s.key];
    if (found) {
      return { status: 'done' as const, score: found.score };
    }
    if (isPastDay || currentMinutes >= s.startMin) {
      return { status: 'open' as const, score: null };
    }
    return { status: 'locked' as const, score: null };
  };

  // Calculations
  const shalatCategoryScore =
    chosenTimeCategory === 'awal' ? 100 : chosenTimeCategory === 'tengah' ? 85 : 70;
  const sunnahBonusPts = puasaSunnah || sunnahText.trim().length >= 3 ? 5 : 0;

  const halanganCalc = calculateIslamHalanganScore(halanganItems);

  const kristenSelectedCount = [
    kristenItems.doaBangunTidur,
    kristenItems.bacaAlkitab,
    kristenItems.doaMakan,
    kristenItems.doaKegiatan,
    kristenItems.doaTidur,
  ].filter(Boolean).length;
  const kristenBaseScore = kristenSelectedCount * 20;
  const kristenBonusPts = kristenBonusKitabSuci ? 5 : 0;
  const kristenCapped = applyBonusCapAndOverflow(kristenBaseScore, kristenBonusPts);

  const hinduSessionScore =
    hinduTimeCategory === 'awal' ? 100 : hinduTimeCategory === 'tengah' ? 85 : 70;
  const hinduBonusPts = bacaWeda ? 5 : 0;

  // Toggle female student Berhalangan mode with overwrite protection (Addendum B.6)
  const handleToggleHalanganCheckbox = (checked: boolean) => {
    const hasRegularPrayerLogs = PRAYER_LIST.some((p) => Boolean(completedPrayersMap[p.key]));
    if (checked && hasRegularPrayerLogs) {
      setSwitchModeConfirm('to_halangan');
      return;
    }
    if (!checked && existingHalanganLog) {
      setSwitchModeConfirm('to_shalat');
      return;
    }
    setIsHalangan(checked);
    setCurrentPage(1);
  };

  const confirmModeSwitch = () => {
    if (switchModeConfirm === 'to_halangan') {
      setIsHalangan(true);
    } else if (switchModeConfirm === 'to_shalat') {
      setIsHalangan(false);
    }
    setSwitchModeConfirm(null);
    setCurrentPage(1);
  };

  const handleConfirmHonesty = () => {
    setShowHonestyModal(false);

    if (isIslam && isHalangan) {
      // Save female student Berhalangan 5-component entry
      const compRecords = SCORING_CONFIG.beribadah.islam.halanganComponents.map((c) => {
        const keyMap: Record<string, keyof typeof halanganItems> = {
          dzikir_doa: 'dzikirDoa',
          murajaah_quran: 'murajaahQuran',
          berbuat_baik: 'berbuatBaik',
          kajian_agama: 'kajianAgama',
          kebersihan_diri: 'kebersihanDiri',
        };
        const isChecked = halanganItems[keyMap[c.id]];
        return {
          code: c.id,
          label: c.label,
          value: String(isChecked),
          score: isChecked ? c.points : 0,
          maxScore: c.points,
        };
      });

      onSuccess(
        halanganCalc.finalScore,
        {
          entryMode: isPastDay ? 'formulir_terlewat' : 'tepat_hari_fleksibel',
          isHalangan: true,
          subCategory: 'halangan',
          halangan: halanganItems,
          selectedComponents: halanganCalc.selectedComponents,
          completedCount: halanganCalc.completedCount,
          notes: halanganNotes,
          baseScore: halanganCalc.baseScore,
          bonusPoints: 0,
          overflowBonus: 0,
          score: halanganCalc.finalScore,
          isMissed: isPastDay,
          journalDate: displayDate,
          timestamp: new Date().toLocaleTimeString('id-ID'),
          components: compRecords,
        },
        false,
        'halangan',
        true
      );
      return;
    }

    if (isIslam) {
      // Regular prayer entry
      onSuccess(
        shalatCategoryScore,
        {
          entryMode: isPastDay ? 'formulir_terlewat' : 'tepat_hari_fleksibel',
          prayer: chosenPrayer,
          subCategory: chosenPrayer,
          kategoriWaktu: chosenTimeCategory,
          waktuShalat: chosenTimeCategory,
          puasaSunnah,
          sunnahText: sunnahText.trim(),
          bonusPoints: sunnahBonusPts,
          baseScore: shalatCategoryScore,
          score: shalatCategoryScore,
          isMissed: isPastDay,
          journalDate: displayDate,
          timestamp: new Date().toLocaleTimeString('id-ID'),
        },
        true,
        chosenPrayer,
        true
      );
      return;
    }

    if (isKristen) {
      const compRecords = SCORING_CONFIG.beribadah.kristenKatolik.items.map((c) => {
        const keyMap: Record<string, keyof typeof kristenItems> = {
          doa_bangun_tidur: 'doaBangunTidur',
          baca_alkitab: 'bacaAlkitab',
          doa_makan: 'doaMakan',
          doa_kegiatan: 'doaKegiatan',
          doa_tidur: 'doaTidur',
        };
        const isChecked = kristenItems[keyMap[c.id]];
        return {
          code: c.id,
          label: c.label,
          value: String(isChecked),
          score: isChecked ? c.points : 0,
          maxScore: c.points,
        };
      });

      onSuccess(
        kristenCapped.finalScore,
        {
          entryMode: isPastDay ? 'formulir_terlewat' : 'tepat_hari_fleksibel',
          subCategory: 'kristen_lengkap',
          kristenItems,
          completedCount: kristenSelectedCount,
          bonusKitabSuci: kristenBonusKitabSuci,
          notes: kristenNotes,
          baseScore: kristenBaseScore,
          bonusPoints: kristenBonusPts,
          overflowBonus: kristenCapped.overflowBonus,
          score: kristenCapped.finalScore,
          isMissed: isPastDay,
          journalDate: displayDate,
          timestamp: new Date().toLocaleTimeString('id-ID'),
          components: compRecords,
        },
        false,
        'kristen_lengkap',
        true
      );
      return;
    }

    // Hindu Tri Sandhya
    onSuccess(
      hinduSessionScore,
      {
        entryMode: isPastDay ? 'formulir_terlewat' : 'tepat_hari_fleksibel',
        sandhyaTime: chosenHinduSandhya,
        subCategory: chosenHinduSandhya,
        kategoriWaktu: hinduTimeCategory,
        bacaWeda,
        sandhyaNote: hinduNote,
        baseScore: hinduSessionScore,
        bonusPoints: hinduBonusPts,
        score: hinduSessionScore,
        isMissed: isPastDay,
        journalDate: displayDate,
        timestamp: new Date().toLocaleTimeString('id-ID'),
      },
      true,
      chosenHinduSandhya,
      true
    );
  };

  const completedPrayersCount = PRAYER_LIST.filter((p) => Boolean(completedPrayersMap[p.key])).length;

  return (
    <div className="modal-backdrop-blur fixed inset-0 w-screen h-screen z-50 bg-slate-900/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/80 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#19ae5d] text-white flex items-center justify-center shadow-xs">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#19ae5d]">
                  Beribadah ({studentReligion})
                </span>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#19ae5d]" /> Tanggal: {displayDate}
                </span>
                {isPastDay && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Formulir Terlewat
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-slate-900 text-base leading-tight mt-0.5">
                {isIslam && isHalangan
                  ? 'Formulir Ibadah & Kebaikan Pengganti (Siswi Berhalangan)'
                  : isIslam
                  ? `Shalat 5 Waktu (${completedPrayersCount}/5 Selesai)`
                  : isKristen
                  ? `5 Aktivitas Ibadah Harian (${kristenSelectedCount}/5)`
                  : 'Puja Tri Sandhya (Pagi, Siang, Sore)'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          {/* ================================================================= */}
          {/* ISLAM VIEW (REGULAR SHALAT OR FEMALE BERHALANGAN) */}
          {/* ================================================================= */}
          {isIslam && (
            <>
              {/* Checkbox "Saya sedang berhalangan" Khusus Siswi Perempuan (Addendum B) */}
              {studentGender === 'P' && (
                <label className="p-3.5 bg-pink-50/90 border border-pink-200 rounded-2xl flex items-center justify-between cursor-pointer transition-all hover:bg-pink-100/70">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isHalangan}
                      onChange={(e) => handleToggleHalanganCheckbox(e.target.checked)}
                      className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-extrabold text-pink-950 block">
                        Saya sedang berhalangan
                      </span>
                      <span className="text-[11px] text-pink-800">
                        Menggantikan kartu 5 shalat wajib dengan 5 komponen ibadah &amp; kebaikan pengganti (@ 20 poin)
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-pink-700 bg-white px-2.5 py-1 rounded-xl border border-pink-200 shrink-0">
                    {isHalangan ? `${halanganCalc.completedCount}/5 Komponen` : 'Mode Siswi'}
                  </span>
                </label>
              )}

              {/* MODE SISWI BERHALANGAN (ADDENDUM B) */}
              {isHalangan ? (
                <div className="space-y-4 transition-all duration-300">
                  <div className="p-3.5 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-2xl flex items-center justify-between shadow-sm">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-pink-100 block">
                        Progres Komponen Pengganti: {halanganCalc.completedCount}/5 Komponen
                      </span>
                      <span className="text-2xl font-black">
                        {halanganCalc.finalScore} / 100
                      </span>
                    </div>
                    <Sparkles className="w-7 h-7 text-pink-200" />
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800">
                        Pilih Kegiatan Ibadah &amp; Kebaikan Pengganti Hari Ini:
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        20 Poin / Komponen
                      </span>
                    </div>

                    {[
                      {
                        key: 'dzikirDoa' as const,
                        label: 'Berdzikir dan berdoa',
                        desc: 'Dzikir pagi/petang, istighfar, shalawat, dan doa harian',
                      },
                      {
                        key: 'murajaahQuran' as const,
                        label: "Mendengar, membaca, atau muraja'ah Al-Qur'an",
                        desc: 'Menyimak lantunan ayat suci atau mengulang hafalan/terjemahan',
                      },
                      {
                        key: 'berbuatBaik' as const,
                        label: 'Berbuat baik, contohnya bersedekah',
                        desc: 'Sedekah, membantu sesama, atau berbuat kebaikan tulus',
                      },
                      {
                        key: 'kajianAgama' as const,
                        label: 'Belajar ilmu agama atau mendengarkan kajian',
                        desc: 'Membaca buku keislaman atau menyimak tausiyah/kajian',
                      },
                      {
                        key: 'kebersihanDiri' as const,
                        label: 'Menjaga kebersihan dan kesehatan diri',
                        desc: 'Merawat kebersihan, kerapian, dan kebugaran tubuh sesuai sunnah',
                      },
                    ].map((item) => {
                      const checked = halanganItems[item.key];
                      return (
                        <label
                          key={item.key}
                          onClick={() =>
                            setHalanganItems((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                          }
                          className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                            checked
                              ? 'bg-pink-50/80 border-pink-500 ring-1 ring-pink-500'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded-lg flex items-center justify-center border ${
                                checked
                                  ? 'bg-pink-600 border-pink-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <div>
                              <span className="text-xs font-extrabold text-slate-900 block">
                                {item.label}
                              </span>
                              <span className="text-[11px] text-slate-500">{item.desc}</span>
                            </div>
                          </div>
                          <span className="text-xs font-black text-pink-600 shrink-0 ml-2">
                            {checked ? '20' : '0'} / 20
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Catatan Refleksi Kegiatan Pengganti (Opsional):
                    </label>
                    <textarea
                      rows={2}
                      value={halanganNotes}
                      onChange={(e) => setHalanganNotes(e.target.value)}
                      placeholder="Contoh: Dzikir pagi, menyimak murattal Surah Al-Mulk, dan bersedekah"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                    />
                  </div>
                </div>
              ) : (
                /* MODE SHALAT WAJIB 5 WAKTU (SPESIFIKASI FINAL SECTION 2.1) */
                <>
                  {currentPage === 1 && (
                    <div className="space-y-4">
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#19ae5d]" />
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">Jam Sekarang (WIB):</span>
                            <span className="text-sm font-mono font-black text-slate-900">{currentTimeStr} WIB</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-500 block">Progres Shalat Wajib:</span>
                          <span className="text-xs font-black text-[#19ae5d]">
                            {completedPrayersCount} / 5 Shalat Selesai
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                            5 Kartu Shalat Wajib
                          </h4>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            Rata-rata 5 Shalat (Maks 100 Poin)
                          </span>
                        </div>

                        {PRAYER_LIST.map((p) => {
                          const card = getPrayerStatus(p);
                          return (
                            <div
                              key={p.key}
                              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                card.status === 'done'
                                  ? 'bg-emerald-50/80 border-emerald-200'
                                  : card.status === 'open'
                                  ? 'bg-blue-50/70 border-[#1c5ddc]/40 shadow-2xs'
                                  : 'bg-slate-50 border-slate-200 opacity-60'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                                    card.status === 'done'
                                      ? 'bg-[#19ae5d] text-white'
                                      : card.status === 'open'
                                      ? 'bg-[#1c5ddc] text-white'
                                      : 'bg-slate-300 text-slate-600'
                                  }`}
                                >
                                  {card.status === 'done' ? (
                                    <Check className="w-4 h-4" />
                                  ) : card.status === 'locked' ? (
                                    <Lock className="w-3.5 h-3.5" />
                                  ) : (
                                    <Clock className="w-4 h-4" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-slate-900 text-sm">{p.label}</span>
                                    <span className="text-[11px] text-slate-500 font-medium">
                                      (Jadwal awal: {p.startStr} WIB)
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-semibold block mt-0.5">
                                    {card.status === 'done' && (
                                      <span className="text-[#19ae5d]">
                                        ✓ Selesai • Nilai: {card.score} / 100 (Terkunci)
                                      </span>
                                    )}
                                    {card.status === 'open' && (
                                      <span className="text-[#1c5ddc]">
                                        Sudah memasuki waktu • Pilih Awal (100), Tengah (85), atau Akhir (70)
                                      </span>
                                    )}
                                    {card.status === 'locked' && (
                                      <span className="text-slate-400">
                                        Belum memasuki jadwal waktu ({p.startStr} WIB)
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </div>

                              <div className="shrink-0">
                                {card.status === 'done' && (
                                  <span className="text-xs font-black text-[#19ae5d] bg-emerald-100 px-2.5 py-1 rounded-lg">
                                    Selesai
                                  </span>
                                )}
                                {card.status === 'open' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setChosenPrayer(p.key);
                                      setCurrentPage(2);
                                    }}
                                    className="px-3.5 py-1.5 bg-[#19ae5d] hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
                                  >
                                    Isi Shalat
                                  </button>
                                )}
                                {card.status === 'locked' && (
                                  <button
                                    type="button"
                                    disabled
                                    className="px-3 py-1.5 bg-slate-200 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed"
                                  >
                                    Belum Waktunya
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* PAGE 2 ISLAM: PILIH KATEGORI WAKTU MANUAL & IBADAH SUNNAH */}
                  {currentPage === 2 && (
                    <div className="space-y-4">
                      <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
                        <div>
                          <span className="text-[11px] font-bold text-slate-600 block">Shalat Wajib yang Diisi:</span>
                          <span className="text-base font-black text-emerald-800 uppercase">
                            Shalat {chosenPrayer}
                          </span>
                        </div>
                        <span className="text-xs font-black text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                          {shalatCategoryScore} / 100
                        </span>
                      </div>

                      {/* Pilihan Kategori Waktu Manual (Awal 100, Tengah 85, Akhir 70) */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-800">
                          Pilih Kategori Waktu Pelaksanaan Shalat {chosenPrayer.toUpperCase()}:
                        </label>
                        {[
                          {
                            key: 'awal' as const,
                            label: 'Awal Waktu',
                            score: 100,
                            desc: 'Dilaksanakan segera pada awal waktu shalat',
                          },
                          {
                            key: 'tengah' as const,
                            label: 'Tengah Waktu',
                            score: 85,
                            desc: 'Dilaksanakan pada pertengahan rentang waktu shalat',
                          },
                          {
                            key: 'akhir' as const,
                            label: 'Akhir Waktu',
                            score: 70,
                            desc: 'Dilaksanakan menjelang akhir waktu shalat',
                          },
                        ].map((cat) => (
                          <label
                            key={cat.key}
                            onClick={() => setChosenTimeCategory(cat.key)}
                            className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                              chosenTimeCategory === cat.key
                                ? 'bg-emerald-50 border-[#19ae5d] ring-1 ring-[#19ae5d]'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="shalat_time_category"
                                checked={chosenTimeCategory === cat.key}
                                onChange={() => setChosenTimeCategory(cat.key)}
                                className="w-4 h-4 text-[#19ae5d] focus:ring-[#19ae5d]"
                              />
                              <div>
                                <span className="text-xs font-bold text-slate-900 block">{cat.label}</span>
                                <span className="text-[11px] text-slate-500">{cat.desc}</span>
                              </div>
                            </div>
                            <span className="text-xs font-black text-[#19ae5d]">{cat.score} / 100</span>
                          </label>
                        ))}
                      </div>

                      {/* Ibadah Sunnah Bonus (+5 Poin) */}
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-[#19ae5d]" />
                            <span className="text-xs font-extrabold text-slate-900">
                              Ibadah Sunnah (Bonus +5 Poin)
                            </span>
                          </div>
                          <span className="text-xs font-black text-[#19ae5d]">
                            {sunnahBonusPts > 0 ? '+5 Bonus' : '0 Bonus'}
                          </span>
                        </div>

                        <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={puasaSunnah}
                            onChange={(e) => setPuasaSunnah(e.target.checked)}
                            className="w-4 h-4 rounded text-[#19ae5d] focus:ring-[#19ae5d]"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-slate-900 block">
                              Melaksanakan Puasa Sunnah Hari Ini
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Jika dipilih, formulir Makan Bergizi menyesuaikan ke Sahur &amp; Makan Malam
                            </span>
                          </div>
                        </label>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Kegiatan Sunnah Lain (Tahajud, Dhuha, Rawatib, atau Membaca Al-Qur'an):
                          </label>
                          <input
                            type="text"
                            value={sunnahText}
                            onChange={(e) => setSunnahText(e.target.value)}
                            placeholder="Contoh: Membaca Al-Qur'an Surah Al-Kahfi ayat 1-10 / Shalat Dhuha"
                            className="w-full p-2.5 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ================================================================= */}
          {/* KRISTEN / KATOLIK VIEW (5 CHECKBOX @ 20 POIN + BONUS KITAB SUCI +5) */}
          {/* ================================================================= */}
          {isKristen && (
            <div className="space-y-4">
              <div className="p-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-100 block">
                    Progres Ibadah Harian: {kristenSelectedCount}/5 Aktivitas
                  </span>
                  <span className="text-2xl font-black">
                    {kristenCapped.finalScore} / 100
                  </span>
                </div>
                <Sparkles className="w-7 h-7 text-blue-200" />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800">
                    5 Aktivitas Ibadah Kristen &amp; Katolik (20 Poin / Aktivitas):
                  </span>
                </div>

                {[
                  {
                    key: 'doaBangunTidur' as const,
                    label: 'Doa bangun tidur',
                    desc: 'Mengucap syukur saat bangun pagi sebelum memulai hari',
                  },
                  {
                    key: 'bacaAlkitab' as const,
                    label: 'Membaca Alkitab',
                    desc: 'Membaca dan merenungkan firman Tuhan hari ini',
                  },
                  {
                    key: 'doaMakan' as const,
                    label: 'Doa saat makan',
                    desc: 'Mengucap syukur atas berkat makanan harian',
                  },
                  {
                    key: 'doaKegiatan' as const,
                    label: 'Doa sebelum melakukan kegiatan',
                    desc: 'Berdoa sebelum belajar, berangkat sekolah, atau berkegiatan',
                  },
                  {
                    key: 'doaTidur' as const,
                    label: 'Doa sebelum tidur',
                    desc: 'Doa malam menyerahkan istirahat kepada Tuhan',
                  },
                ].map((item) => {
                  const checked = kristenItems[item.key];
                  return (
                    <div
                      key={item.key}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        checked
                          ? 'bg-blue-50/80 border-[#1c5ddc] ring-1 ring-[#1c5ddc]'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <label
                        onClick={() => {
                          setKristenItems((prev) => ({ ...prev, [item.key]: !prev[item.key] }));
                          setActiveKristenDetail(item.key);
                        }}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-lg flex items-center justify-center border ${
                              checked
                                ? 'bg-[#1c5ddc] border-[#1c5ddc] text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-slate-900 block">
                              {item.label}
                            </span>
                            <span className="text-[11px] text-slate-500">{item.desc}</span>
                          </div>
                        </div>
                        <span className="text-xs font-black text-[#1c5ddc] shrink-0 ml-2">
                          {checked ? '20' : '0'} / 20
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>

              {/* Bonus membaca kitab suci (+5 poin) */}
              <label className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={kristenBonusKitabSuci}
                    onChange={(e) => setKristenBonusKitabSuci(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <div>
                    <span className="text-xs font-bold text-purple-950 block">
                      Renungan / Pendalaman Kitab Suci Tambahan (Bonus +5 Poin)
                    </span>
                    <span className="text-[10px] text-purple-700">
                      Kelebihan di atas 100 poin otomatis masuk ke Poin Hebat
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black text-purple-700">+5 Bonus</span>
              </label>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pokok Doa / Ayat Renungan Hari Ini (Opsional):
                </label>
                <textarea
                  rows={2}
                  value={kristenNotes}
                  onChange={(e) => setKristenNotes(e.target.value)}
                  placeholder="Tuliskan pokok doa syukur atau pasal Alkitab yang dibaca hari ini..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1c5ddc]"
                />
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* HINDU VIEW (TRI SANDHYA PAGI 06.00, SIANG 12.00, SORE 18.00) */}
          {/* ================================================================= */}
          {isHindu && (
            <>
              {currentPage === 1 && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">Jam Sekarang (WIB):</span>
                        <span className="text-sm font-mono font-black text-slate-900">{currentTimeStr} WIB</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-500 block">Rata-rata Harian:</span>
                      <span className="text-xs font-black text-amber-700">
                        3 Sesi Tri Sandhya
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {HINDU_LIST.map((item) => {
                      const status = getHinduStatus(item);
                      return (
                        <div
                          key={item.key}
                          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            status.status === 'done'
                              ? 'bg-emerald-50/70 border-emerald-200'
                              : status.status === 'open'
                              ? 'bg-amber-50/80 border-amber-500/40 shadow-xs'
                              : 'bg-slate-50 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                                status.status === 'done'
                                  ? 'bg-[#19ae5d] text-white'
                                  : status.status === 'open'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-slate-300 text-slate-600'
                              }`}
                            >
                              {status.status === 'done' ? (
                                <Check className="w-4 h-4" />
                              ) : status.status === 'locked' ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <Clock className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-900 text-sm">{item.label}</span>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  (Jadwal awal: {item.startStr} WIB)
                                </span>
                              </div>
                              <span className="text-[10px] font-semibold block mt-0.5">
                                {status.status === 'done' && (
                                  <span className="text-[#19ae5d]">✓ Selesai • Nilai: {status.score} / 100 (Terkunci)</span>
                                )}
                                {status.status === 'open' && (
                                  <span className="text-amber-800">Sudah memasuki waktu • Siap diisi</span>
                                )}
                                {status.status === 'locked' && (
                                  <span className="text-slate-400">Belum memasuki jadwal ({item.startStr} WIB)</span>
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {status.status === 'done' && (
                              <span className="text-xs font-black text-[#19ae5d] bg-emerald-100 px-2.5 py-1 rounded-lg">
                                Selesai
                              </span>
                            )}
                            {status.status === 'open' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setChosenHinduSandhya(item.key);
                                  setCurrentPage(2);
                                }}
                                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                              >
                                Isi Sesi Ini
                              </button>
                            )}
                            {status.status === 'locked' && (
                              <button
                                type="button"
                                disabled
                                className="px-3 py-1.5 bg-slate-200 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed"
                              >
                                Belum Waktunya
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentPage === 2 && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block">Sesi Tri Sandhya:</span>
                      <span className="text-base font-black text-amber-800 uppercase">
                        Tri Sandhya {chosenHinduSandhya}
                      </span>
                    </div>
                    <span className="text-xs font-black text-amber-700 bg-white px-2.5 py-1 rounded-lg border border-amber-200">
                      {hinduSessionScore} / 100
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Pilih Kategori Waktu Pelaksanaan Tri Sandhya:
                    </label>
                    {[
                      { key: 'awal' as const, label: 'Awal Waktu (0–2 jam dari jadwal)', score: 100 },
                      { key: 'tengah' as const, label: 'Tengah Waktu (2–4 jam dari jadwal)', score: 85 },
                      { key: 'akhir' as const, label: 'Akhir Waktu (4–6 jam dari jadwal)', score: 70 },
                    ].map((cat) => (
                      <label
                        key={cat.key}
                        onClick={() => setHinduTimeCategory(cat.key)}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                          hinduTimeCategory === cat.key
                            ? 'bg-amber-50 border-amber-600 ring-1 ring-amber-600'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="hindu_time_cat"
                            checked={hinduTimeCategory === cat.key}
                            onChange={() => setHinduTimeCategory(cat.key)}
                            className="w-4 h-4 text-amber-600"
                          />
                          <span className="text-xs font-bold text-slate-900">{cat.label}</span>
                        </div>
                        <span className="text-xs font-black text-amber-700">{cat.score} / 100</span>
                      </label>
                    ))}
                  </div>

                  {/* Bonus membaca kitab suci Weda (+5 poin) */}
                  <label className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={bacaWeda}
                        onChange={(e) => setBacaWeda(e.target.checked)}
                        className="w-4 h-4 text-amber-600 rounded"
                      />
                      <span className="text-xs font-bold text-amber-950">
                        Membaca Kitab Suci Weda / Bhagavad Gita (Bonus +5 Poin)
                      </span>
                    </div>
                    <span className="text-xs font-black text-amber-700">+5 Bonus</span>
                  </label>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Catatan Persembahyangan (Opsional):
                    </label>
                    <textarea
                      rows={2}
                      value={hinduNote}
                      onChange={(e) => setHinduNote(e.target.value)}
                      placeholder="Tuliskan catatan doa / mantram Tri Sandhya..."
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Controls */}
        <div className="flex-shrink-0 px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div>
            {!isKristen && !isHalangan && currentPage === 2 ? (
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Kembali
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Batal
              </button>
            )}
          </div>
          <div>
            {(isKristen || (isIslam && isHalangan) || currentPage === 2) && (
              <button
                type="button"
                onClick={() => setShowHonestyModal(true)}
                className="px-5 py-2 bg-[#19ae5d] hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Simpan Ibadah
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal Before Overwriting Shalat <-> Berhalangan Data (Addendum B.6) */}
      {switchModeConfirm && (
        <div className="fixed inset-0 z-[110] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-amber-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-base">
              Konfirmasi Perubahan Mode Ibadah
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {switchModeConfirm === 'to_halangan'
                ? 'Anda sudah memiliki entri shalat pada tanggal ini. Mengaktifkan mode "Saya sedang berhalangan" akan menggantikan entri shalat pada tanggal ini agar tidak terjadi penilaian ganda. Lanjutkan?'
                : 'Menonaktifkan mode "Saya sedang berhalangan" akan mengembalikan formulir ke kartu 5 shalat wajib. Lanjutkan?'}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSwitchModeConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmModeSwitch}
                className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs cursor-pointer"
              >
                Ya, Ganti Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Honesty Confirmation Modal */}
      {showHonestyModal && (
        <div className="honesty-backdrop-blur fixed inset-0 w-screen h-screen z-[100] bg-slate-950/75 backdrop-blur-lg flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-[#19ae5d] flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Pernyataan Kejujuran Ibadah
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tanggal Jurnal: {displayDate}
              </p>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 italic leading-relaxed text-left">
              "Saya menyatakan dengan sejujur-jujurnya di hadapan Tuhan Yang Maha Esa bahwa data ibadah yang saya catat ini sesuai dengan pelaksanaan sebenarnya."
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowHonestyModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Kembali / Koreksi
              </button>
              <button
                type="button"
                onClick={handleConfirmHonesty}
                className="flex-1 py-2.5 rounded-xl bg-[#19ae5d] hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md cursor-pointer"
              >
                Simpan &amp; Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
