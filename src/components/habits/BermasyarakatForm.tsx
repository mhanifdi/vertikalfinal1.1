/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Formulir Kebiasaan Bermasyarakat — Spesifikasi Final Section 8 & Aturan Umum 1.1–1.4
 * - 5 Pilihan tindakan sosial resmi:
 *   1. Membantu orang tua atau saudara di rumah
 *   2. Berbagi makanan atau barang dengan teman
 *   3. Menjaga kebersihan lingkungan sekolah atau rumah
 *   4. Menolong teman yang mengalami kesulitan
 *   5. Mengikuti kegiatan sosial, kerja bakti, atau organisasi
 * - Skor jumlah tindakan: >=4 (90), 3 (80), 2 (70), 1 (60), 0 (0)
 * - Deskripsi tindakan sosial: >15 karakter (10), 10–15 karakter (5), <10 karakter (0)
 * - Bonus piket atau kebersihan: +5 poin
 */

import React, { useState, useEffect } from 'react';
import { Users, Check, ShieldCheck, ChevronRight, ChevronLeft, Sparkles, Calendar } from 'lucide-react';
import { calculateBermasyarakatScoreWithBreakdown } from '../../utils/scoring';
import { SCORING_CONFIG } from '../../config/scoringConfig';

interface BermasyarakatFormProps {
  onSuccess: (score: number, payload: any) => void;
  onCancel: () => void;
  isAlreadySubmitted?: boolean;
  isMissedEntry?: boolean;
  targetDate?: string;
}

export const BermasyarakatForm: React.FC<BermasyarakatFormProps> = ({
  onSuccess,
  onCancel,
  isMissedEntry = false,
  targetDate,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const displayDate = targetDate || todayStr;
  const isPastDay = displayDate < todayStr || isMissedEntry;

  const [currentPage, setCurrentPage] = useState<1 | 2>(1);
  const socialOptions = SCORING_CONFIG.bermasyarakat.socialActionOptions;
  const [actions, setActions] = useState<string[]>([socialOptions[0], socialOptions[2]]);
  const [bonusPiket, setBonusPiket] = useState<boolean>(true);
  const [description, setDescription] = useState('');
  const [showHonestyModal, setShowHonestyModal] = useState(false);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const toggleAction = (item: string) => {
    setActions((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  const breakdown = calculateBermasyarakatScoreWithBreakdown(
    {
      actions,
      deskripsi: description,
      bonusPiket,
    },
    isPastDay
  );
  const currentScore = breakdown.finalScore;

  const handleNextPage = () => {
    if (actions.length === 0) {
      setValidationWarning('Pilih minimal 1 tindakan sosial yang Anda lakukan.');
      return;
    }
    setCurrentPage(2);
  };

  const handleTriggerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 5) {
      setValidationWarning(
        'Deskripsi tindakan sosial minimal 5 karakter untuk dapat disimpan (10 karakter: 5 poin, 15+ karakter: 10 poin).'
      );
      return;
    }
    setShowHonestyModal(true);
  };

  const handleConfirmHonesty = () => {
    setShowHonestyModal(false);
    onSuccess(currentScore, {
      entryMode: isPastDay ? 'formulir_terlewat' : 'tepat_hari_fleksibel',
      actions,
      bonusPiket,
      description,
      deskripsi: description,
      baseScore: breakdown.baseScore,
      bonusPoints: breakdown.bonusPoints,
      overflowBonus: breakdown.overflowBonus,
      score: currentScore,
      isMissed: isPastDay,
      journalDate: displayDate,
      timestamp: new Date().toLocaleTimeString('id-ID'),
    });
  };

  return (
    <div className="modal-backdrop-blur fixed inset-0 w-screen h-screen z-50 bg-slate-900/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-50/80 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-600">
                  Bermasyarakat • Halaman {currentPage} dari 2
                </span>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-teal-600" /> Tanggal: {displayDate}
                </span>
                {isPastDay && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Formulir Terlewat
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-slate-900 text-base leading-tight mt-0.5">
                {currentPage === 1 ? 'Pilihan Tindakan Sosial & Piket' : 'Deskripsi Tindakan Sosial & Konfirmasi'}
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
                  step === currentPage ? 'bg-teal-600' : step < currentPage ? 'bg-teal-700' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-black text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200">
            Nilai: {currentScore} / 100
          </span>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          {currentPage === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-teal-50/60 rounded-2xl border border-teal-200">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Tindakan Sosial ({actions.length} dipilih)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    1=60 • 2=70 • 3=80 • ≥4=90 poin
                  </span>
                </div>
                <span className="text-xs font-black text-teal-700 bg-white px-2.5 py-1 rounded-lg border border-teal-200">
                  {breakdown.actionPoints} / 90
                </span>
              </div>

              <div className="space-y-2">
                {socialOptions.map((opt) => {
                  const isSelected = actions.includes(opt);
                  return (
                    <label
                      key={opt}
                      onClick={() => toggleAction(opt)}
                      className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-teal-50/80 border-teal-500 ring-1 ring-teal-500'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isSelected ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-semibold text-slate-800">{opt}</span>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Bonus Piket / Kebersihan (+5 poin) */}
              <label
                onClick={() => setBonusPiket(!bonusPiket)}
                className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  bonusPiket
                    ? 'bg-emerald-50 border-[#19ae5d] ring-1 ring-[#19ae5d]'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border ${
                      bonusPiket ? 'bg-[#19ae5d] border-[#19ae5d] text-white' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {bonusPiket && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Melaksanakan Piket Kelas / Kebersihan Lingkungan (Bonus Adiwiyata)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Menjaga kebersihan ruang belajar &amp; lingkungan sekolah
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black text-[#19ae5d] shrink-0 ml-2">+5 Bonus</span>
              </label>
            </div>
          )}

          {currentPage === 2 && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Deskripsi Tindakan Sosial:
                  </label>
                  <span className="text-xs font-black text-teal-600">
                    {breakdown.descriptionPoints} / 10
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Membantu ibu merapikan halaman rumah dan melaksanakan piket kebersihan kelas XI-MIPA-1"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  required
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  {description.trim().length >= 15
                    ? `✓ Deskripsi lengkap (${description.trim().length} karakter → 10 / 10 poin maksimal)`
                    : description.trim().length >= 10
                    ? `Deskripsi 10–14 karakter (${description.trim().length} karakter → 5 / 10 poin, tambah ${15 - description.trim().length} karakter untuk 10 poin)`
                    : description.trim().length >= 5
                    ? `Deskripsi 5–9 karakter (${description.trim().length} karakter → 0 poin, dapat disimpan. Tambah ${10 - description.trim().length} karakter untuk 5 poin)`
                    : `Minimal 5 karakter untuk menyimpan (0 poin). 10–14 karakter: 5 poin, 15+ karakter: 10 poin maksimal.`}
                </span>
              </div>

              {/* Score Preview */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-700 text-white shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-teal-200 block">
                    Nilai Capaian Bermasyarakat:
                  </span>
                  <span className="text-2xl font-black">{currentScore} / 100</span>
                  <span className="text-[11px] text-teal-100 block mt-0.5">
                    Tindakan ({breakdown.actionPoints}/90) + Deskripsi ({breakdown.descriptionPoints}/10)
                    {bonusPiket ? ' + Bonus Piket (+5)' : ''}
                  </span>
                  {breakdown.overflowBonus > 0 && (
                    <span className="text-[10px] bg-white/25 text-white font-bold px-2 py-0.5 rounded-full inline-block mt-1">
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
                onClick={handleNextPage}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
              >
                Lanjut <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleTriggerSubmit}
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
            <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Pernyataan Kejujuran Aksi Sosial
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Jurnal tanggal {displayDate} • Nilai Capaian: {currentScore} / 100
              </p>
            </div>
            <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl text-xs text-teal-950 font-medium text-left">
              "Saya menyatakan dengan sejujur-jujurnya bahwa saya benar telah melakukan kegiatan aksi sosial bermasyarakat: '{description}'."
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

      {validationWarning && (
        <div className="fixed inset-0 z-[110] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-red-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-teal-600 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-base">
              Data Belum Lengkap
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {validationWarning}
            </p>
            <button
              type="button"
              onClick={() => setValidationWarning(null)}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-colors"
            >
              Lengkapi Sekarang
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
