/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Formulir Kebiasaan Makan Bergizi — Spesifikasi Final Section 4 & Aturan Umum 1.1–1.4
 * - 3 Sesi makan:
 *   1. Sarapan: 06.00–08.00 (ideal 15 pt), batas akhir 11.29 (di luar ideal 10 pt)
 *   2. Makan siang: 11.30–13.00 (ideal 15 pt), batas akhir 17.49 (di luar ideal 10 pt)
 *   3. Makan malam: 18.00–19.30 (ideal 15 pt), batas akhir 23.59 (di luar ideal 10 pt)
 *   * Jika siswa berpuasa sunnah, sesi makan menyesuaikan menjadi Sahur dan Makan Malam.
 * - Komponen penilaian per sesi makan (Maksimal 100 poin):
 *   - Waktu makan: 15 (ideal) / 10 (di luar ideal dalam batas)
 *   - Karbohidrat: 17,5
 *   - Lauk: 17,5
 *   - Sayur: 15
 *   - Buah: 15
 *   - Minum >= 2 gelas: 20 | 1 gelas: 15 | 0 gelas / minuman manis: 0
 * - Bonus Adiwiyata:
 *   - Membawa kotak makan sendiri: +5 poin
 *   - Membawa tumbler sendiri: +5 poin
 * - Nilai Makan Bergizi harian = (Sarapan + Makan siang + Makan malam) / 3
 *   Satu sesi yang selesai tidak mengunci sesi makan lain yang belum diisi.
 */

import React, { useState, useEffect } from 'react';
import {
  Utensils,
  Check,
  Wheat,
  Drumstick,
  Carrot,
  Apple,
  Clock,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { applyBonusCapAndOverflow } from '../../utils/scoring';
import { SCORING_CONFIG } from '../../config/scoringConfig';
import { timeToMinutes } from '../../utils/timeClassifier';

interface MakanBergiziFormProps {
  onSuccess: (score: number, payload: any, isCounter?: boolean, subCategory?: string) => void;
  onCancel: () => void;
  todayLogs?: any[];
  isMissedEntry?: boolean;
  targetDate?: string;
  initialPuasaSunnah?: boolean;
}

export const MakanBergiziForm: React.FC<MakanBergiziFormProps> = ({
  onSuccess,
  onCancel,
  todayLogs = [],
  isMissedEntry = false,
  targetDate,
  initialPuasaSunnah = false,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const displayDate = targetDate || todayStr;
  const isPastDay = displayDate < todayStr || isMissedEntry;

  const [currentPage, setCurrentPage] = useState<1 | 2 | 3 | 4>(1);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [currentMinutes, setCurrentMinutes] = useState(0);

  const [isPuasa, setIsPuasa] = useState<boolean>(initialPuasaSunnah);
  const [selectedMeal, setSelectedMeal] = useState<'sarapan' | 'siang' | 'malam' | 'sahur'>('sarapan');
  const [waktuKategori, setWaktuKategori] = useState<'ideal' | 'diluar_ideal'>('ideal');

  // Nutrition state (Karbo 17.5, Lauk 17.5, Sayur 15, Buah 15 -> Max 65)
  const [gizi, setGizi] = useState({
    karbo: true,
    lauk: true,
    sayur: true,
    buah: true,
  });
  const [menuDescription, setMenuDescription] = useState('');

  // Water state (>=2 gelas = 20 pt, 1 gelas = 15 pt, 0_manis = 0 pt)
  const [waterGlasses, setWaterGlasses] = useState<'>=2' | '1' | '0_manis'>('>=2');

  // Adiwiyata Eco state (+5 kotak makan, +5 tumbler)
  const [kotakMakanEco, setKotakMakanEco] = useState(false);
  const [tumblerEco, setTumblerEco] = useState(false);

  const [showHonestyModal, setShowHonestyModal] = useState(false);

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

  // Check existing meal logs for this date
  const completedMealsMap: Record<string, any> = {};
  todayLogs.forEach((log) => {
    if (log.sub_category) {
      completedMealsMap[log.sub_category.toLowerCase()] = log;
    }
    try {
      const p = typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload;
      if (p?.isPuasa) setIsPuasa(true);
    } catch {}
  });

  const MEAL_SESSIONS = isPuasa
    ? [
        {
          key: 'sahur' as const,
          label: 'Makan Sahur (Puasa Sunnah)',
          idealRange: '03.00 – 04.30 WIB',
          limitStr: '05.30 WIB',
          startMin: 180,
          idealEndMin: 270,
          limitMin: 330,
        },
        {
          key: 'malam' as const,
          label: 'Berbuka & Makan Malam',
          idealRange: '18.00 – 19.30 WIB',
          limitStr: '23.59 WIB',
          startMin: 1070,
          idealEndMin: 1170,
          limitMin: 1439,
        },
      ]
    : [
        {
          key: 'sarapan' as const,
          label: 'Sarapan Pagi',
          idealRange: '06.00 – 08.00 WIB',
          limitStr: '11.29 WIB',
          startMin: 360,
          idealEndMin: 480,
          limitMin: 689,
        },
        {
          key: 'siang' as const,
          label: 'Makan Siang',
          idealRange: '11.30 – 13.00 WIB',
          limitStr: '17.49 WIB',
          startMin: 690,
          idealEndMin: 780,
          limitMin: 1069,
        },
        {
          key: 'malam' as const,
          label: 'Makan Malam',
          idealRange: '18.00 – 19.30 WIB',
          limitStr: '23.59 WIB',
          startMin: 1080,
          idealEndMin: 1170,
          limitMin: 1439,
        },
      ];

  const getMealSessionStatus = (session: typeof MEAL_SESSIONS[0]) => {
    const existing =
      completedMealsMap[session.key] ||
      (session.key === 'sarapan' ? completedMealsMap['pagi'] : null);
    if (existing) {
      return { status: 'done', score: existing.score };
    }
    if (isPastDay) {
      return { status: 'flexible', score: null };
    }
    if (currentMinutes < session.startMin) {
      return { status: 'upcoming', score: null };
    }
    if (currentMinutes >= session.startMin && currentMinutes <= session.idealEndMin) {
      return { status: 'ideal', score: null };
    }
    return { status: 'flexible', score: null };
  };

  const toggleGizi = (k: keyof typeof gizi) => {
    setGizi((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  // Calculate exact session score per Spesifikasi Final Section 4
  const cfg = SCORING_CONFIG.makanBergizi.sessionComponents;
  const waktuPts = waktuKategori === 'ideal' ? cfg.waktuIdeal : cfg.waktuDiluarIdeal;
  const karboPts = gizi.karbo ? cfg.karbohidrat : 0;
  const laukPts = gizi.lauk ? cfg.lauk : 0;
  const sayurPts = gizi.sayur ? cfg.sayur : 0;
  const buahPts = gizi.buah ? cfg.buah : 0;
  const nutritionPts = karboPts + laukPts + sayurPts + buahPts; // Max 65
  const waterPts =
    waterGlasses === '>=2'
      ? cfg.minum2GelasAtauLebih
      : waterGlasses === '1'
      ? cfg.minum1Gelas
      : cfg.minum0Gelas; // Max 20

  const sessionBaseScore = Math.min(100, waktuPts + nutritionPts + waterPts);
  const bonusPts =
    (kotakMakanEco ? SCORING_CONFIG.makanBergizi.bonusAdiwiyata.kotakMakan : 0) +
    (tumblerEco ? SCORING_CONFIG.makanBergizi.bonusAdiwiyata.tumbler : 0);

  const capped = applyBonusCapAndOverflow(sessionBaseScore, bonusPts);
  const currentScore = capped.finalScore;

  // Projected daily average across 3 sessions (or 2 if fasting)
  const totalSessionsCount = isPuasa ? 2 : 3;
  const otherSessionsSum = MEAL_SESSIONS.reduce((acc, s) => {
    if (s.key === selectedMeal) return acc;
    const done = completedMealsMap[s.key];
    return acc + (done ? Number(done.score) : 0);
  }, 0);
  const projectedDailyAverage =
    Math.round(((otherSessionsSum + currentScore) / totalSessionsCount) * 10) / 10;

  const handleSelectMealSession = (
    key: 'sarapan' | 'siang' | 'malam' | 'sahur',
    defaultTimeCat: 'ideal' | 'diluar_ideal'
  ) => {
    setSelectedMeal(key);
    setWaktuKategori(defaultTimeCat);
    setCurrentPage(2);
  };

  const handleConfirmHonesty = () => {
    setShowHonestyModal(false);
    onSuccess(
      currentScore,
      {
        entryMode: isPastDay ? 'formulir_terlewat' : 'tepat_hari_fleksibel',
        mealType: selectedMeal,
        subCategory: selectedMeal,
        waktuMakan: waktuKategori,
        waktuPoints: waktuPts,
        isPuasa,
        gizi,
        nutritionPoints: nutritionPts,
        waterGlasses,
        waterPoints: waterPts,
        kotakMakanEco,
        tumblerEco,
        menuDescription,
        baseScore: sessionBaseScore,
        bonusPoints: bonusPts,
        overflowBonus: capped.overflowBonus,
        score: currentScore,
        projectedDailyAverage,
        timeRecorded: currentTimeStr,
        isMissed: isPastDay,
        journalDate: displayDate,
        timestamp: new Date().toLocaleTimeString('id-ID'),
        components: [
          { code: 'waktu_makan', label: 'Waktu Makan', value: waktuKategori, score: waktuPts, maxScore: 15 },
          { code: 'karbohidrat', label: 'Karbohidrat', value: String(gizi.karbo), score: karboPts, maxScore: 17.5 },
          { code: 'lauk', label: 'Lauk Pauk', value: String(gizi.lauk), score: laukPts, maxScore: 17.5 },
          { code: 'sayur', label: 'Sayur', value: String(gizi.sayur), score: sayurPts, maxScore: 15 },
          { code: 'buah', label: 'Buah', value: String(gizi.buah), score: buahPts, maxScore: 15 },
          { code: 'air_minum', label: 'Air Minum', value: waterGlasses, score: waterPts, maxScore: 20 },
        ],
      },
      true,
      selectedMeal
    );
  };

  const completedSessionsCount = MEAL_SESSIONS.filter((s) => Boolean(completedMealsMap[s.key])).length;

  return (
    <div className="modal-backdrop-blur fixed inset-0 w-screen h-screen z-50 bg-slate-900/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/80 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Utensils className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">
                  Makan Bergizi • Halaman {currentPage} dari 4
                </span>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-600" /> Tanggal: {displayDate}
                </span>
                {isPastDay && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Formulir Terlewat
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-slate-900 text-base leading-tight mt-0.5">
                {currentPage === 1 && `Sesi Makan Harian (${completedSessionsCount}/${totalSessionsCount} Selesai)`}
                {currentPage === 2 && 'Komponen Gizi Seimbang (Isi Piringku)'}
                {currentPage === 3 && 'Asupan Air Minum Pendamping'}
                {currentPage === 4 && 'Bonus Adiwiyata & Konfirmasi'}
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

        {/* Step Progress Dots */}
        <div className="flex-shrink-0 px-6 pt-3 flex items-center justify-between gap-3">
          <div className="flex gap-1.5 flex-1">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  step === currentPage
                    ? 'bg-amber-500'
                    : step < currentPage
                    ? 'bg-emerald-500'
                    : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-black text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
            Sesi: {currentScore} / 100
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          {/* PAGE 1: SESI MAKAN & WAKTU */}
          {currentPage === 1 && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block">Jam Sekarang (WIB):</span>
                    <span className="text-sm font-mono font-black text-slate-900">{currentTimeStr} WIB</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 block">Progres Harian:</span>
                  <span className="text-xs font-black text-amber-600">
                    {completedSessionsCount} / {totalSessionsCount} Sesi Selesai
                  </span>
                </div>
              </div>

              {/* Opsi Puasa Sunnah Checkbox */}
              <label className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPuasa}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsPuasa(checked);
                    setSelectedMeal(checked ? 'sahur' : 'sarapan');
                  }}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <div className="text-xs">
                  <span className="font-extrabold text-amber-950 block">
                    Saya Sedang Berpuasa Sunnah (Sahur &amp; Makan Malam)
                  </span>
                  <span className="text-[11px] text-amber-800">
                    Sesi makan otomatis menyesuaikan menjadi Sahur dan Makan Malam.
                  </span>
                </div>
              </label>

              {/* Meal Cards */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                    Pilih Sesi Makan yang Akan Diisi
                  </h4>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    Rata-rata Harian = Total / {totalSessionsCount}
                  </span>
                </div>
                {MEAL_SESSIONS.map((session) => {
                  const status = getMealSessionStatus(session);
                  return (
                    <div
                      key={session.key}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        status.status === 'done'
                          ? 'bg-emerald-50/80 border-emerald-200'
                          : status.status === 'ideal'
                          ? 'bg-amber-50/80 border-amber-400 ring-1 ring-amber-400/40 shadow-xs'
                          : status.status === 'flexible'
                          ? 'bg-blue-50/60 border-blue-200'
                          : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                            status.status === 'done'
                              ? 'bg-[#19ae5d] text-white'
                              : status.status === 'ideal'
                              ? 'bg-amber-500 text-white'
                              : status.status === 'flexible'
                              ? 'bg-[#1c5ddc] text-white'
                              : 'bg-slate-300 text-slate-600'
                          }`}
                        >
                          {status.status === 'done' ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-slate-900 text-sm">
                              {session.label}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              (Ideal: {session.idealRange})
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold block mt-0.5">
                            {status.status === 'done' && (
                              <span className="text-[#19ae5d]">✓ Selesai • Nilai Sesi: {status.score} / 100 (Terkunci)</span>
                            )}
                            {status.status === 'ideal' && (
                              <span className="text-amber-700">Sedang dalam rentang ideal (15 / 15 poin waktu)</span>
                            )}
                            {status.status === 'flexible' && (
                              <span className="text-[#1c5ddc]">
                                Mode Fleksibel sebelum {session.limitStr} (Tanpa penalti -5 poin)
                              </span>
                            )}
                            {status.status === 'upcoming' && (
                              <span className="text-slate-400">Belum memasuki jadwal sesi ({session.idealRange})</span>
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
                        {status.status === 'ideal' && (
                          <button
                            type="button"
                            onClick={() => handleSelectMealSession(session.key, 'ideal')}
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                          >
                            Isi Sesi Ini
                          </button>
                        )}
                        {status.status === 'flexible' && (
                          <button
                            type="button"
                            onClick={() => handleSelectMealSession(session.key, 'ideal')}
                            className="px-3.5 py-1.5 bg-[#1c5ddc] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                          >
                            Isi Fleksibel
                          </button>
                        )}
                        {status.status === 'upcoming' && (
                          <button
                            type="button"
                            disabled
                            className="px-2.5 py-1.5 bg-slate-100 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed border border-slate-200"
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

          {/* PAGE 2: WAKTU & KELENGKAPAN GIZI ISI PIRINGKU */}
          {currentPage === 2 && (
            <div className="space-y-4">
              {/* Pilihan Ketepatan Waktu Makan Sesi Ini (15 / 10 poin) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Waktu Pelaksanaan Makan Sesi {selectedMeal.toUpperCase()}:
                  </label>
                  <span className="text-xs font-black text-amber-600">{waktuPts} / 15</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWaktuKategori('ideal')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      waktuKategori === 'ideal'
                        ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-900 block">Pada Rentang Ideal</span>
                    <span className="text-[11px] font-black text-amber-600">15 / 15 poin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaktuKategori('diluar_ideal')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      waktuKategori === 'diluar_ideal'
                        ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-900 block">Di Luar Rentang Ideal</span>
                    <span className="text-[11px] font-black text-amber-600">10 / 15 poin</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900 font-medium">
                <span>Komponen Gizi Seimbang (Isi Piringku):</span>
                <span className="font-black text-amber-700">
                  {nutritionPts} / 65
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => toggleGizi('karbo')}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    gizi.karbo ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Wheat className={`w-5 h-5 ${gizi.karbo ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-white text-amber-700">
                      {gizi.karbo ? '17,5' : '0'} / 17,5
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Karbohidrat</span>
                    <span className="text-[10px] text-slate-500">Nasi, roti, kentang, jagung, ubi</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => toggleGizi('lauk')}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    gizi.lauk ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Drumstick className={`w-5 h-5 ${gizi.lauk ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-white text-amber-700">
                      {gizi.lauk ? '17,5' : '0'} / 17,5
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Lauk Pauk</span>
                    <span className="text-[10px] text-slate-500">Ayam, ikan, telur, daging, tempe, tahu</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => toggleGizi('sayur')}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    gizi.sayur ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Carrot className={`w-5 h-5 ${gizi.sayur ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-white text-emerald-700">
                      {gizi.sayur ? '15' : '0'} / 15
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Sayur-sayuran</span>
                    <span className="text-[10px] text-slate-500">Bayam, sop sayur, brokoli, kangkung</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => toggleGizi('buah')}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    gizi.buah ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Apple className={`w-5 h-5 ${gizi.buah ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-white text-emerald-700">
                      {gizi.buah ? '15' : '0'} / 15
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Buah-buahan</span>
                    <span className="text-[10px] text-slate-500">Pisang, apel, jeruk, pepaya, melon</span>
                  </div>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Menu Makanan (Opsional):
                </label>
                <input
                  type="text"
                  value={menuDescription}
                  onChange={(e) => setMenuDescription(e.target.value)}
                  placeholder="Contoh: Nasi putih, ayam panggang, sayur bayam, buah pisang"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {/* PAGE 3: ASUPAN AIR MINUM (20 / 15 / 0 POIN) */}
          {currentPage === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-900 font-medium">
                <span>Asupan Air Putih Pendamping Makan:</span>
                <span className="font-black text-[#1c5ddc]">
                  {waterPts} / 20
                </span>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    val: '>=2',
                    label: 'Minum 2 gelas atau lebih (Air Putih)',
                    score: '20 / 20',
                    desc: 'Hidrasi optimal pendamping makan sehat',
                  },
                  {
                    val: '1',
                    label: 'Minum 1 gelas (Air Putih)',
                    score: '15 / 20',
                    desc: 'Cukup, disarankan menambah air putih setelah makan',
                  },
                  {
                    val: '0_manis',
                    label: '0 gelas atau hanya minuman manis kemasan',
                    score: '0 / 20',
                    desc: 'Kurang air putih pada sesi makan ini',
                  },
                ].map((item) => (
                  <label
                    key={item.val}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      waterGlasses === item.val
                        ? 'bg-blue-50 border-[#1c5ddc] ring-1 ring-[#1c5ddc]'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="water_glasses"
                        checked={waterGlasses === item.val}
                        onChange={() => setWaterGlasses(item.val as any)}
                        className="w-4 h-4 text-[#1c5ddc] focus:ring-[#1c5ddc]"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{item.label}</span>
                        <span className="text-[11px] text-slate-500">{item.desc}</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-[#1c5ddc]">{item.score}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* PAGE 4: BONUS ADIWIYATA & KONFIRMASI */}
          {currentPage === 4 && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 font-medium">
                <span>Bonus Adiwiyata Ramah Lingkungan:</span>
                <span className="font-black text-[#19ae5d]">
                  +{bonusPts} Poin Bonus
                </span>
              </div>

              <div className="space-y-2.5">
                <label className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={kotakMakanEco}
                      onChange={(e) => setKotakMakanEco(e.target.checked)}
                      className="w-4 h-4 rounded text-[#19ae5d] focus:ring-[#19ae5d]"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Membawa kotak makan sendiri
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Mengurangi kemasan plastik sekali pakai
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#19ae5d]">+5 Bonus</span>
                </label>

                <label className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={tumblerEco}
                      onChange={(e) => setTumblerEco(e.target.checked)}
                      className="w-4 h-4 rounded text-[#19ae5d] focus:ring-[#19ae5d]"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Membawa tumbler sendiri
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Mengurangi botol minuman plastik sekali pakai
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#19ae5d]">+5 Bonus</span>
                </label>
              </div>

              {/* Score Projection Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-100 block">
                    Nilai Sesi {selectedMeal.toUpperCase()}:
                  </span>
                  <span className="text-2xl font-black">{currentScore} / 100</span>
                  <span className="text-[11px] text-amber-100 block mt-0.5">
                    Waktu ({waktuPts}/15) + Gizi ({nutritionPts}/65) + Air ({waterPts}/20)
                    {bonusPts > 0 ? ` + Bonus (+${bonusPts})` : ''}
                  </span>
                  {capped.overflowBonus > 0 && (
                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full inline-block mt-1">
                      +{capped.overflowBonus} Poin Bonus masuk ke Poin Hebat
                    </span>
                  )}
                </div>
                <Sparkles className="w-8 h-8 text-amber-200" />
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="flex-shrink-0 px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div>
            {currentPage > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentPage((p) => (p - 1) as any)}
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
            {currentPage < 4 ? (
              <button
                type="button"
                onClick={() => setCurrentPage((p) => (p + 1) as any)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
              >
                Lanjut <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowHonestyModal(true)}
                className="px-5 py-2 bg-[#19ae5d] hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Simpan Sesi Makan
              </button>
            )}
          </div>
        </div>
      </div>

      {showHonestyModal && (
        <div className="honesty-backdrop-blur fixed inset-0 w-screen h-screen z-[100] bg-slate-950/75 backdrop-blur-lg flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Pernyataan Kejujuran Siswa
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Sesi {selectedMeal.toUpperCase()} ({displayDate}) • Nilai Sesi: {currentScore} / 100
              </p>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 italic leading-relaxed text-left">
              "Saya menyatakan dengan sejujur-jujurnya bahwa komponen gizi makan sesi {selectedMeal.toUpperCase()} ini diisi secara benar sesuai makanan dan minuman yang saya konsumsi."
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
