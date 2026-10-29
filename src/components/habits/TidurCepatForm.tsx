/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Formulir Kebiasaan Tidur Cepat — Spesifikasi Final Section 5 & Aturan Umum 1.1–1.4
 * - Pengisian hari ini (Tepat Hari — Timestamp): mencatat waktu aktual ketika tombol Simpan ditekan
 *   disertai kondisi sebelum tidur (1–5):
 *   Tidak mengantuk (5), Belum mengantuk (10), Cukup rileks (15), Rileks (20), Sangat rileks (25)
 * - Formulir Terlewat: memilih waktu tidur melalui dropdown tanpa pengurangan poin (-5 pt dihapus)
 * - Rentang waktu tidur:
 *   Sebelum 21.30 (75), 21.30–22.30 (65), 22.31–23.30 (55), Setelah 23.30 (45)
 * - Bonus Adiwiyata: Mematikan lampu sebelum tidur (+5 poin)
 */

import React, { useState, useEffect } from 'react';
import { Moon, Check, ShieldCheck, Clock, Calendar, ChevronRight, ChevronLeft, Sparkles, Star } from 'lucide-react';
import { calculateTidurCepatScoreWithBreakdown } from '../../utils/scoring';
import { SCORING_RULES } from '../../config/scoringConfig';

interface TidurCepatFormProps {
  onSuccess: (score: number, payload: any) => void;
  onCancel: () => void;
  isAlreadySubmitted?: boolean;
  isMissedEntry?: boolean;
  targetDate?: string;
}

export const TidurCepatForm: React.FC<TidurCepatFormProps> = ({
  onSuccess,
  onCancel,
  isMissedEntry = false,
  targetDate,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const displayDate = targetDate || todayStr;
  const isPastDay = displayDate < todayStr || isMissedEntry;

  const [currentPage, setCurrentPage] = useState<1 | 2>(1);
  const [fillMode, setFillMode] = useState<'timestamp' | 'dropdown'>(isPastDay ? 'dropdown' : 'timestamp');
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [bedtimeSlot, setBedtimeSlot] = useState<'<21.30' | '21.30-22.30' | '22.31-23.30' | '>23.30'>('<21.30');
  const [sleepConditionStars, setSleepConditionStars] = useState<number>(5);
  const [turnOffLightsEco, setTurnOffLightsEco] = useState<boolean>(true);
  const [reflection, setReflection] = useState('');
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
      setCurrentTimeStr(`${hh}:${mm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const sleepTimeInput = fillMode === 'timestamp' && !isPastDay ? (currentTimeStr || '21:15') : bedtimeSlot;
  const breakdown = calculateTidurCepatScoreWithBreakdown(
    sleepTimeInput,
    sleepConditionStars,
    isPastDay,
    turnOffLightsEco
  );
  const currentScore = breakdown.finalScore;

  const conditionOptions = SCORING_RULES.tidurCepat.conditionRatings;
  const selectedCondition = conditionOptions.find((c) => c.stars === sleepConditionStars) || conditionOptions[4];

  const handleConfirmHonesty = () => {
    const actualSaveTimestamp = new Date();
    const saveHHMM = `${String(actualSaveTimestamp.getHours()).padStart(2, '0')}:${String(actualSaveTimestamp.getMinutes()).padStart(2, '0')}`;
    const finalInputUsed = fillMode === 'timestamp' && !isPastDay ? saveHHMM : bedtimeSlot;
    const finalBreakdown = calculateTidurCepatScoreWithBreakdown(
      finalInputUsed,
      sleepConditionStars,
      isPastDay,
      turnOffLightsEco
    );

    setShowHonestyModal(false);
    onSuccess(finalBreakdown.finalScore, {
      entryMode: isPastDay ? 'formulir_terlewat' : (fillMode === 'timestamp' ? 'tepat_hari_timestamp' : 'tepat_hari_fleksibel'),
      waktuTidur: finalInputUsed,
      timeRecorded: saveHHMM,
      bedtimeSlot,
      turnOffLightsEco,
      sleepQuality: sleepConditionStars,
      kondisiLabel: selectedCondition.label,
      reasonOrReport: reflection,
      baseScore: finalBreakdown.baseScore,
      bonusPoints: finalBreakdown.bonusPoints,
      overflowBonus: finalBreakdown.overflowBonus,
      score: finalBreakdown.finalScore,
      isMissed: isPastDay,
      journalDate: displayDate,
      timestamp: actualSaveTimestamp.toLocaleTimeString('id-ID'),
      components: [
        { code: 'waktu_tidur', label: 'Waktu Tidur', value: finalBreakdown.timeLabel, score: finalBreakdown.timePoints, maxScore: 75 },
        { code: 'kondisi_tidur', label: 'Kondisi Sebelum Tidur', value: selectedCondition.label, score: finalBreakdown.conditionPoints, maxScore: 25 },
      ],
    });
  };

  return (
    <div className="modal-backdrop-blur fixed inset-0 w-screen h-screen z-50 bg-slate-900/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Moon className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                  Tidur Cepat • Halaman {currentPage} dari 2
                </span>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-indigo-600" /> Tanggal: {displayDate}
                </span>
                {isPastDay && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Formulir Terlewat
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-slate-900 text-base leading-tight mt-0.5">
                {currentPage === 1 ? 'Waktu Tidur & Bonus Adiwiyata' : 'Kondisi Sebelum Tidur & Konfirmasi'}
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

        {/* Step Indicator */}
        <div className="flex-shrink-0 px-6 pt-3 flex items-center justify-between gap-3">
          <div className="flex gap-1.5 flex-1">
            {[1, 2].map((step) => (
              <div
                key={step}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  step === currentPage ? 'bg-indigo-600' : step < currentPage ? 'bg-indigo-700' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
            Nilai: {currentScore} / 100
          </span>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          {currentPage === 1 && (
            <div className="space-y-4">
              {!isPastDay ? (
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFillMode('timestamp')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      fillMode === 'timestamp'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Tepat Hari — Timestamp
                  </button>
                  <button
                    type="button"
                    onClick={() => setFillMode('dropdown')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      fillMode === 'dropdown'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Pilih Rentang Waktu (Fleksibel)
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-extrabold block">Formulir Terlewat — Tanggal {displayDate}</span>
                    <span className="text-[11px] text-amber-800">
                      Pilih rentang waktu tidur dari dropdown di bawah ini tanpa pengurangan poin.
                    </span>
                  </div>
                  <span className="font-black text-amber-700 bg-white px-2.5 py-1 rounded-lg border border-amber-200">
                    Tanpa Penalti
                  </span>
                </div>
              )}

              {fillMode === 'timestamp' && !isPastDay ? (
                <div className="p-4 bg-gradient-to-r from-indigo-50/70 to-blue-50/70 border border-indigo-200 rounded-2xl text-center space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                    Waktu Aktual Saat Tombol Simpan Ditekan:
                  </span>
                  <div className="text-3xl font-black text-slate-900 font-mono">
                    {currentTimeStr || '21:15'} <span className="text-xs font-semibold text-slate-500">WIB</span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-indigo-200 text-xs font-bold text-indigo-700">
                    <span>Kategori: {breakdown.timeLabel}</span>
                    <span>•</span>
                    <span className="text-[#19ae5d]">{breakdown.timePoints} / 75</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800">
                      Pilih Rentang Waktu Tidur:
                    </label>
                    <span className="text-xs font-black text-indigo-600">
                      {breakdown.timePoints} / 75
                    </span>
                  </div>
                  <select
                    value={bedtimeSlot}
                    onChange={(e) => setBedtimeSlot(e.target.value as any)}
                    className="w-full p-3 rounded-xl border border-indigo-200 bg-indigo-50/50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {SCORING_RULES.tidurCepat.brackets.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label} ({b.score} / 75 poin)
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {SCORING_RULES.tidurCepat.brackets.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setBedtimeSlot(s.id as any)}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          bedtimeSlot === s.id
                            ? 'bg-indigo-50 border-indigo-600 ring-1 ring-indigo-600'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-900">{s.label}</span>
                        <span className="text-[11px] font-black text-indigo-600 mt-1">{s.score} / 75</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Bonus Adiwiyata: Mematikan lampu sebelum tidur (+5 poin) */}
              <label className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={turnOffLightsEco}
                    onChange={(e) => setTurnOffLightsEco(e.target.checked)}
                    className="w-4 h-4 rounded text-[#19ae5d] focus:ring-[#19ae5d]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Mematikan Lampu Sebelum Tidur (Bonus Adiwiyata)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Hemat energi listrik &amp; mendukung kualitas tidur sehat
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black text-[#19ae5d] shrink-0">+5 Poin Bonus</span>
              </label>
            </div>
          )}

          {currentPage === 2 && (
            <div className="space-y-4">
              {/* Kondisi Sebelum Tidur (Spesifikasi Final Section 5) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-800">
                    Kondisi Sebelum Tidur (Skala 1–5):
                  </label>
                  <span className="text-xs font-black text-indigo-600">
                    {breakdown.conditionPoints} / 25
                  </span>
                </div>
                <div className="space-y-2">
                  {conditionOptions.map((opt) => {
                    const isSelected = sleepConditionStars === opt.stars;
                    return (
                      <button
                        key={opt.stars}
                        type="button"
                        onClick={() => setSleepConditionStars(opt.stars)}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-600 ring-1 ring-indigo-600'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center gap-0.5 text-amber-400">
                            {Array.from({ length: opt.stars }).map((_, idx) => (
                              <Star key={idx} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                          <span className="text-xs font-bold text-slate-800">{opt.label}</span>
                        </div>
                        <span className="text-xs font-black text-indigo-600">
                          {opt.score} / 25
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Catatan / Persiapan Sebelum Tidur (Opsional):
                </label>
                <input
                  type="text"
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="Contoh: Berdoa, mematikan gawai, dan menyiapkan buku untuk esok hari"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Score summary */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-700 text-white shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-200 block">
                    Nilai Capaian Tidur Cepat:
                  </span>
                  <span className="text-2xl font-black">{currentScore} / 100</span>
                  <span className="text-[11px] text-indigo-100 block mt-0.5">
                    Waktu ({breakdown.timePoints}/75) + Kondisi ({breakdown.conditionPoints}/25)
                    {turnOffLightsEco ? ' + Bonus Lampu (+5)' : ''}
                  </span>
                  {breakdown.overflowBonus > 0 && (
                    <span className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full inline-block mt-1">
                      +{breakdown.overflowBonus} Poin Bonus masuk ke Poin Hebat
                    </span>
                  )}
                </div>
                <Sparkles className="w-8 h-8 text-amber-300" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div>
            {currentPage === 2 ? (
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
            {currentPage === 1 ? (
              <button
                type="button"
                onClick={() => setCurrentPage(2)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
              >
                Lanjut <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowHonestyModal(true)}
                className="px-5 py-2 bg-[#19ae5d] hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Simpan Jurnal
              </button>
            )}
          </div>
        </div>
      </div>

      {showHonestyModal && (
        <div className="honesty-backdrop-blur fixed inset-0 w-screen h-screen z-[100] bg-slate-950/75 backdrop-blur-lg flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Pernyataan Kejujuran Istirahat
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Jurnal tanggal {displayDate} • Nilai Capaian: {currentScore} / 100
              </p>
            </div>
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-950 font-medium text-left">
              "Saya menyatakan dengan sejujur-jujurnya bahwa waktu tidur ({breakdown.timeLabel}) dan kondisi sebelum tidur ({selectedCondition.label}) ini dicatat secara benar."
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowHonestyModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Koreksi
              </button>
              <button
                type="button"
                onClick={handleConfirmHonesty}
                className="flex-1 py-2.5 rounded-xl bg-[#19ae5d] hover:bg-emerald-700 text-white text-xs font-black shadow-sm cursor-pointer"
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
