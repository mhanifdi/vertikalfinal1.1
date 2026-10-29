/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Formulir Kebiasaan Bangun Pagi — Spesifikasi Final Section 3 & Aturan Umum 1.1–1.4
 * - Tepat Hari / Fleksibel (sebelum 00.00) & Formulir Terlewat (tanpa pengurangan -5 poin)
 * - Rentang waktu bangun:
 *   04.00–04.20 (75), 04.21–04.40 (70), 04.41–05.00 (65),
 *   05.01–06.20 (60), 06.21–06.40 (55), Lebih dari 06.40 (50)
 * - Kondisi saat bangun (1–5 bintang):
 *   Sangat segar (25), Cukup segar (20), Kurang segar (15),
 *   Lemas atau masih mengantuk (10), Pusing atau kelelahan (5)
 */

import React, { useState, useEffect } from 'react';
import { Sun, Check, Clock, ShieldCheck, Calendar, ChevronRight, ChevronLeft, Sparkles, Star } from 'lucide-react';
import { calculateBangunPagiScoreWithBreakdown } from '../../utils/scoring';
import { SCORING_RULES } from '../../config/scoringConfig';

interface BangunPagiFormProps {
  onSuccess: (score: number, payload: any) => void;
  onCancel: () => void;
  isAlreadySubmitted?: boolean;
  isMissedEntry?: boolean;
  targetDate?: string;
}

export const BangunPagiForm: React.FC<BangunPagiFormProps> = ({
  onSuccess,
  onCancel,
  isMissedEntry = false,
  targetDate,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const displayDate = targetDate || todayStr;
  const isPastDay = displayDate < todayStr || isMissedEntry;

  const [currentPage, setCurrentPage] = useState<1 | 2>(1);
  const [fillMode, setFillMode] = useState<'tepat_hari_timestamp' | 'tepat_hari_fleksibel' | 'formulir_terlewat'>(
    isPastDay ? 'formulir_terlewat' : 'tepat_hari_fleksibel'
  );
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string>('04.00-04.20');
  const [kebugaranLevel, setKebugaranLevel] = useState<number>(5);
  const [notes, setNotes] = useState('');
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

  const wakeUpInput = fillMode === 'tepat_hari_timestamp' ? (currentTimeStr || '04:15') : selectedSlot;
  const breakdown = calculateBangunPagiScoreWithBreakdown(wakeUpInput, kebugaranLevel, isPastDay);
  const finalScore = breakdown.finalScore;

  const conditionOptions = SCORING_RULES.bangunPagi.conditionRatings;
  const selectedConditionObj = conditionOptions.find((c) => c.stars === kebugaranLevel) || conditionOptions[0];

  const handleConfirmHonesty = () => {
    setShowHonestyModal(false);
    onSuccess(finalScore, {
      entryMode: fillMode,
      waktuBangun: wakeUpInput,
      timeSlot: selectedSlot,
      kebugaranLevel,
      kondisiLabel: selectedConditionObj.label,
      notes,
      baseScore: breakdown.baseScore,
      bonusPoints: breakdown.bonusPoints,
      overflowBonus: breakdown.overflowBonus,
      score: finalScore,
      isMissed: isPastDay,
      journalDate: displayDate,
      timestamp: new Date().toLocaleTimeString('id-ID'),
      components: [
        { code: 'waktu_bangun', label: 'Rentang Waktu Bangun', value: wakeUpInput, score: breakdown.timePoints, maxScore: 75 },
        { code: 'kondisi_bangun', label: 'Kondisi Saat Bangun', value: selectedConditionObj.label, score: breakdown.conditionPoints, maxScore: 25 },
      ],
    });
  };

  return (
    <div className="modal-backdrop-blur fixed inset-0 w-screen h-screen z-50 bg-slate-900/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/80 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1c5ddc] text-white flex items-center justify-center shadow-xs">
              <Sun className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1c5ddc]">
                  Bangun Pagi • Halaman {currentPage} dari 2
                </span>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#1c5ddc]" /> Tanggal: {displayDate}
                </span>
                {isPastDay && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Formulir Terlewat
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-slate-900 text-base leading-tight mt-0.5">
                {currentPage === 1 ? 'Rentang Waktu Bangun Pagi' : 'Kondisi Saat Bangun & Konfirmasi'}
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
                  step === currentPage ? 'bg-[#1c5ddc]' : step < currentPage ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-black text-[#1c5ddc] bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
            Nilai: {finalScore} / 100
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
                    onClick={() => setFillMode('tepat_hari_fleksibel')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      fillMode === 'tepat_hari_fleksibel'
                        ? 'bg-white text-[#1c5ddc] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Tepat Hari — Fleksibel
                  </button>
                  <button
                    type="button"
                    onClick={() => setFillMode('tepat_hari_timestamp')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      fillMode === 'tepat_hari_timestamp'
                        ? 'bg-white text-[#1c5ddc] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Tepat Hari — Timestamp ({currentTimeStr})
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-extrabold block">Formulir Terlewat — Tanggal {displayDate}</span>
                    <span className="text-[11px] text-amber-800">
                      Melengkapi jurnal tanggal sebelumnya tanpa pengurangan poin.
                    </span>
                  </div>
                  <span className="font-black text-amber-700 bg-white px-2.5 py-1 rounded-lg border border-amber-200">
                    Tanpa Penalti
                  </span>
                </div>
              )}

              {fillMode === 'tepat_hari_timestamp' && !isPastDay ? (
                <div className="p-4 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-200 rounded-2xl text-center space-y-2.5">
                  <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1c5ddc]">
                    <Clock className="w-4 h-4 animate-pulse" />
                    Stempel Waktu Aktual Saat Ini (WIB)
                  </div>
                  <div className="text-4xl font-black text-slate-900 tracking-tight font-mono">
                    {currentTimeStr || '04:15'} <span className="text-sm font-semibold text-slate-500">WIB</span>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-blue-200 text-xs">
                    <span className="text-slate-500">Kategori:</span>
                    <strong className="text-[#1c5ddc]">{breakdown.timeLabel}</strong>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#19ae5d]" />
                    <strong className="text-[#19ae5d]">{breakdown.timePoints} / 75</strong>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Pilih Rentang Waktu Bangun Pagi Anda:
                    </label>
                    <span className="text-xs font-black text-[#1c5ddc]">
                      {breakdown.timePoints} / 75
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {SCORING_RULES.bangunPagi.brackets.map((b) => (
                      <label
                        key={b.id}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          selectedSlot === b.id
                            ? 'bg-blue-50/80 border-[#1c5ddc] ring-1 ring-[#1c5ddc]'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="bangun_slot"
                            checked={selectedSlot === b.id}
                            onChange={() => setSelectedSlot(b.id)}
                            className="w-4 h-4 text-[#1c5ddc] focus:ring-[#1c5ddc]"
                          />
                          <span className="text-xs font-bold text-slate-800">{b.label}</span>
                        </div>
                        <span className="text-xs font-black text-[#1c5ddc]">
                          {b.score} / 75
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentPage === 2 && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-600 block">Rentang Waktu Bangun:</span>
                  <span className="text-sm font-black text-[#1c5ddc]">
                    {breakdown.timeLabel}
                  </span>
                </div>
                <span className="text-xs font-black text-[#1c5ddc] bg-white px-2.5 py-1 rounded-lg border border-blue-200">
                  {breakdown.timePoints} / 75
                </span>
              </div>

              {/* Kondisi Saat Bangun (1-5 Bintang sesuai Spesifikasi Final Section 3) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-800">
                    Kondisi Saat Bangun (Bintang 1–5):
                  </label>
                  <span className="text-xs font-black text-[#1c5ddc]">
                    {breakdown.conditionPoints} / 25
                  </span>
                </div>

                <div className="space-y-2">
                  {conditionOptions.map((opt) => {
                    const isSelected = kebugaranLevel === opt.stars;
                    return (
                      <button
                        key={opt.stars}
                        type="button"
                        onClick={() => setKebugaranLevel(opt.stars)}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50 border-[#1c5ddc] ring-1 ring-[#1c5ddc]'
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
                        <span className="text-xs font-black text-[#1c5ddc]">
                          {opt.score} / 25
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Refleksi Pagi (Opsional):
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Merapikan tempat tidur dan bersiap ibadah pagi"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Total Score */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-100 block">
                    Nilai Capaian Bangun Pagi:
                  </span>
                  <span className="text-2xl font-black">{finalScore} / 100</span>
                  <span className="text-[11px] text-blue-100 block mt-0.5">
                    Waktu ({breakdown.timePoints}/75) + Kondisi ({breakdown.conditionPoints}/25)
                  </span>
                </div>
                <Sparkles className="w-8 h-8 text-blue-200" />
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
                className="px-4 py-2 bg-[#1c5ddc] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
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
            <div className="w-14 h-14 rounded-2xl bg-blue-100 text-[#1c5ddc] flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Pernyataan Kejujuran Siswa
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Jurnal tanggal {displayDate} • Nilai Capaian: {finalScore} / 100
              </p>
            </div>
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 font-medium text-left">
              "Saya menyatakan dengan sejujur-jujurnya bahwa data waktu bangun pagi ({breakdown.timeLabel}) dan kondisi ({selectedConditionObj.label}) ini diisi sesuai keadaan sebenarnya."
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowHonestyModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Kembali / Koreksi
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
