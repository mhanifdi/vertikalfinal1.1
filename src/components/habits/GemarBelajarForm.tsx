/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Formulir Kebiasaan Gemar Belajar — Spesifikasi Final Section 7 & Aturan Umum 1.1–1.4
 * - Durasi belajar mandiri:
 *   Lebih dari 3 jam (60), 2–3 jam (50), 1–2 jam (40), 30–60 menit (30),
 *   15–30 menit (20), Kurang dari 15 menit (10), Tidak belajar (0)
 * - Jumlah kegiatan belajar:
 *   >= 3 kegiatan (30), 2 kegiatan (20), 1 kegiatan (10), 0 kegiatan (0)
 * - Deskripsi yang dipelajari:
 *   >= 15 karakter (10), 10–14 karakter (5), < 10 karakter (0)
 * - Tanpa pengurangan -5 poin.
 */

import React, { useState, useEffect } from 'react';
import { GraduationCap, Check, ShieldCheck, ChevronRight, ChevronLeft, Sparkles, Calendar } from 'lucide-react';
import { calculateGemarBelajarScoreWithBreakdown } from '../../utils/scoring';

interface GemarBelajarFormProps {
  onSuccess: (score: number, payload: any) => void;
  onCancel: () => void;
  isAlreadySubmitted?: boolean;
  isMissedEntry?: boolean;
  targetDate?: string;
}

export const GemarBelajarForm: React.FC<GemarBelajarFormProps> = ({
  onSuccess,
  onCancel,
  isMissedEntry = false,
  targetDate,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const displayDate = targetDate || todayStr;
  const isPastDay = displayDate < todayStr || isMissedEntry;

  const [currentPage, setCurrentPage] = useState<1 | 2>(1);
  const [activities, setActivities] = useState<string[]>([
    'Mengulang materi pelajaran sekolah / mengerjakan TP / PR',
  ]);
  const [durasiKategori, setDurasiKategori] = useState<
    '>3_jam' | '2_3_jam' | '1_2_jam' | '30_60_menit' | '15_30_menit' | '<15_menit' | 'tidak_belajar'
  >('1_2_jam');
  const [outputDescription, setOutputDescription] = useState('');
  const [showHonestyModal, setShowHonestyModal] = useState(false);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const toggleActivity = (item: string) => {
    setActivities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  const breakdown = calculateGemarBelajarScoreWithBreakdown(
    {
      durasiKategori,
      activities,
      deskripsi: outputDescription,
    },
    isPastDay
  );
  const currentScore = breakdown.finalScore;

  const handleTriggerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (durasiKategori !== 'tidak_belajar' && outputDescription.trim().length < 5) {
      setValidationWarning(
        'Deskripsi yang dipelajari minimal 5 karakter untuk dapat disimpan (10 karakter: 5 poin, 15+ karakter: 10 poin).'
      );
      return;
    }
    setShowHonestyModal(true);
  };

  const handleConfirmHonesty = () => {
    setShowHonestyModal(false);
    onSuccess(currentScore, {
      entryMode: isPastDay ? 'formulir_terlewat' : 'tepat_hari_fleksibel',
      duration: durasiKategori,
      durasiKategori,
      activities,
      outputDescription,
      deskripsi: outputDescription,
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
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0000fe] text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#0000fe]">
                  Gemar Belajar • Halaman {currentPage} dari 2
                </span>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#0000fe]" /> Tanggal: {displayDate}
                </span>
                {isPastDay && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Formulir Terlewat
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-slate-900 text-base leading-tight mt-0.5">
                {currentPage === 1 ? 'Durasi & Jumlah Kegiatan Belajar' : 'Deskripsi Hasil Belajar & Konfirmasi'}
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
                  step === currentPage ? 'bg-[#0000fe]' : step < currentPage ? 'bg-indigo-700' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-black text-[#0000fe] bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
            Nilai: {currentScore} / 100
          </span>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          {currentPage === 1 && (
            <div className="space-y-4">
              {/* Durasi Belajar Mandiri */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Durasi Belajar Mandiri:
                  </label>
                  <span className="text-xs font-black text-[#0000fe]">
                    {breakdown.durationPoints} / 60
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: '>3_jam', label: 'Lebih dari 3 jam', pts: '60 / 60' },
                    { key: '2_3_jam', label: '2–3 jam', pts: '50 / 60' },
                    { key: '1_2_jam', label: '1–2 jam', pts: '40 / 60' },
                    { key: '30_60_menit', label: '30–60 menit', pts: '30 / 60' },
                    { key: '15_30_menit', label: '15–30 menit', pts: '20 / 60' },
                    { key: '<15_menit', label: 'Kurang dari 15 menit', pts: '10 / 60' },
                    { key: 'tidak_belajar', label: 'Tidak belajar', pts: '0 / 60' },
                  ].map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setDurasiKategori(d.key as any)}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        durasiKategori === d.key
                          ? 'bg-indigo-50 border-[#0000fe] ring-1 ring-[#0000fe]'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900">{d.label}</span>
                      <span className="text-[10px] font-black text-[#0000fe] mt-1">{d.pts}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Jumlah Kegiatan Belajar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Kegiatan Belajar yang Dilakukan ({activities.length} dipilih):
                  </label>
                  <span className="text-xs font-black text-[#0000fe]">
                    {breakdown.activityPoints} / 30
                  </span>
                </div>
                <div className="space-y-2">
                  {[
                    'Mengulang materi pelajaran sekolah / mengerjakan TP / PR',
                    'Membaca buku (Non-fiksi / Fiksi / Artikel Ilmiah)',
                    'Mempelajari keterampilan baru (Koding, bahasa asing, musik, riset)',
                    'Mengikuti kelompok belajar / diskusi materi bersama teman',
                  ].map((act) => {
                    const isSelected = activities.includes(act);
                    return (
                      <label
                        key={act}
                        onClick={() => toggleActivity(act)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isSelected ? 'bg-[#0000fe] border-[#0000fe] text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-semibold text-slate-800">{act}</span>
                      </label>
                    );
                  })}
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">
                  1 kegiatan = 10/30 • 2 kegiatan = 20/30 • ≥ 3 kegiatan = 30/30
                </span>
              </div>
            </div>
          )}

          {currentPage === 2 && (
            <div className="space-y-4">
              {/* Deskripsi yang Dipelajari */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Deskripsi Materi / Hal yang Dipelajari:
                  </label>
                  <span className="text-xs font-black text-[#0000fe]">
                    {breakdown.descriptionPoints} / 10
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={outputDescription}
                  onChange={(e) => setOutputDescription(e.target.value)}
                  placeholder="Contoh: Menyelesaikan soal latihan fisika bab fluida dinamis dan merangkum materi sejarah"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  {outputDescription.trim().length >= 15
                    ? `✓ Deskripsi lengkap (${outputDescription.trim().length} karakter → 10 / 10 poin maksimal)`
                    : outputDescription.trim().length >= 10
                    ? `Deskripsi 10–14 karakter (${outputDescription.trim().length} karakter → 5 / 10 poin, tambah ${15 - outputDescription.trim().length} karakter untuk 10 poin)`
                    : outputDescription.trim().length >= 5
                    ? `Deskripsi 5–9 karakter (${outputDescription.trim().length} karakter → 0 poin, dapat disimpan. Tambah ${10 - outputDescription.trim().length} karakter untuk 5 poin)`
                    : `Minimal 5 karakter untuk menyimpan (0 poin). 10–14 karakter: 5 poin, 15+ karakter: 10 poin maksimal.`}
                </span>
              </div>

              {/* Total Score */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-200 block">
                    Nilai Capaian Gemar Belajar:
                  </span>
                  <span className="text-2xl font-black">{currentScore} / 100</span>
                  <span className="text-[11px] text-blue-100 block mt-0.5">
                    Durasi ({breakdown.durationPoints}/60) + Kegiatan ({breakdown.activityPoints}/30) + Deskripsi ({breakdown.descriptionPoints}/10)
                  </span>
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
                className="px-4 py-2 bg-[#0000fe] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
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
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-[#0000fe] flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Pernyataan Kejujuran Belajar
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Jurnal tanggal {displayDate} • Nilai Capaian: {currentScore} / 100
              </p>
            </div>
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-950 font-medium text-left">
              "Saya menyatakan dengan sejujur-jujurnya bahwa saya benar telah melaksanakan kegiatan belajar mandiri: '{outputDescription}'."
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
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-base">
              Deskripsi Belum Memenuhi Batas Minimum
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {validationWarning}
            </p>
            <button
              type="button"
              onClick={() => setValidationWarning(null)}
              className="w-full py-2.5 bg-[#0000fe] hover:bg-blue-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-colors"
            >
              Lengkapi Deskripsi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
