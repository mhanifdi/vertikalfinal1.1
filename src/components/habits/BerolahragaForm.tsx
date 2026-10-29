/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Formulir Kebiasaan Berolahraga — Spesifikasi Final Section 6 & Aturan Umum 1.1–1.4
 * - Halaman 1: Aktivitas fisik yang dilakukan (4 komponen @ 10 poin = maksimal 40 poin)
 *   + Bonus Adiwiyata: Berjalan kaki atau bersepeda ke sekolah (+5 poin)
 * - Halaman 2: Durasi total olahraga hari ini:
 *   Kurang dari 15 menit (25), 15–30 menit (35), Lebih dari 30 menit (45)
 *   + Deskripsi tempat atau jenis olahraga (opsional, >=15 karakter = 15 poin, 10–14 karakter = 10 poin)
 * - Tanpa pengurangan -5 poin.
 */

import React, { useState, useEffect } from 'react';
import { Activity, Check, ShieldCheck, ChevronRight, ChevronLeft, Sparkles, Calendar } from 'lucide-react';
import { calculateBerolahragaScoreWithBreakdown } from '../../utils/scoring';

interface BerolahragaFormProps {
  onSuccess: (score: number, payload: any) => void;
  onCancel: () => void;
  isAlreadySubmitted?: boolean;
  isMissedEntry?: boolean;
  targetDate?: string;
}

export const BerolahragaForm: React.FC<BerolahragaFormProps> = ({
  onSuccess,
  onCancel,
  isMissedEntry = false,
  targetDate,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const displayDate = targetDate || todayStr;
  const isPastDay = displayDate < todayStr || isMissedEntry;

  const [currentPage, setCurrentPage] = useState<1 | 2>(1);
  const [durasiKategori, setDurasiKategori] = useState<'<15' | '15-30' | '>30'>('>30');
  const [mandiri, setMandiri] = useState<boolean>(true);
  const [kelompok, setKelompok] = useState<boolean>(false);
  const [jalanTangga, setJalanTangga] = useState<boolean>(true);
  const [pemanasan, setPemanasan] = useState<boolean>(true);
  const [ecoCommute, setEcoCommute] = useState<boolean>(false);
  const [deskripsi, setDeskripsi] = useState('');
  const [showHonestyModal, setShowHonestyModal] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const breakdown = calculateBerolahragaScoreWithBreakdown(
    {
      mandiri,
      kelompok,
      jalanTangga,
      pemanasan,
      durasiKategori,
      deskripsi,
      ecoCommute,
    },
    isPastDay
  );

  const currentScore = breakdown.finalScore;

  const handleConfirmHonesty = () => {
    setShowHonestyModal(false);
    const selectedActivities: string[] = [];
    if (mandiri) selectedActivities.push('mandiri');
    if (kelompok) selectedActivities.push('kelompok');
    if (jalanTangga) selectedActivities.push('jalanTangga');
    if (pemanasan) selectedActivities.push('pemanasan');
    if (ecoCommute) selectedActivities.push('bersepedaAdiwiyata');

    onSuccess(currentScore, {
      entryMode: isPastDay ? 'formulir_terlewat' : 'tepat_hari_fleksibel',
      duration: durasiKategori,
      durasiKategori,
      activities: selectedActivities,
      mandiri,
      kelompok,
      jalanTangga,
      pemanasan,
      ecoCommute,
      notes: deskripsi,
      deskripsi,
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
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-red-50/80 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#fc351c] text-white flex items-center justify-center shadow-xs">
              <Activity className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#fc351c]">
                  Berolahraga • Halaman {currentPage} dari 2
                </span>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#fc351c]" /> Tanggal: {displayDate}
                </span>
                {isPastDay && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Formulir Terlewat
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-slate-900 text-base leading-tight mt-0.5">
                {currentPage === 1 ? 'Aktivitas Fisik yang Dilakukan' : 'Durasi Olahraga & Deskripsi'}
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
                  step === currentPage ? 'bg-[#fc351c]' : step < currentPage ? 'bg-red-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-black text-[#fc351c] bg-red-50 px-2.5 py-0.5 rounded-lg border border-red-200">
            Nilai: {currentScore} / 100
          </span>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          {currentPage === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-red-50/60 rounded-2xl border border-red-200">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Pilih Aktivitas Fisik (10 Poin per Komponen)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Dapat memilih lebih dari satu aktivitas olahraga
                  </span>
                </div>
                <span className="text-xs font-black text-[#fc351c] bg-white px-2.5 py-1 rounded-lg border border-red-200">
                  {breakdown.activityPoints} / 40
                </span>
              </div>

              <div className="space-y-2">
                {[
                  {
                    checked: mandiri,
                    toggle: () => setMandiri(!mandiri),
                    label: 'Olahraga mandiri seperti jogging, gym, skipping, atau renang',
                    pts: '10 / 10',
                  },
                  {
                    checked: kelompok,
                    toggle: () => setKelompok(!kelompok),
                    label: 'Olahraga kelompok atau ekskul seperti futsal, basket, badminton, atau tari',
                    pts: '10 / 10',
                  },
                  {
                    checked: jalanTangga,
                    toggle: () => setJalanTangga(!jalanTangga),
                    label: 'Jalan kaki aktif atau naik-turun tangga di sekolah maupun rumah',
                    pts: '10 / 10',
                  },
                  {
                    checked: pemanasan,
                    toggle: () => setPemanasan(!pemanasan),
                    label: 'Pemanasan atau peregangan ringan di sela jam belajar',
                    pts: '10 / 10',
                  },
                ].map((act, idx) => (
                  <label
                    key={idx}
                    onClick={act.toggle}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      act.checked
                        ? 'bg-red-50/80 border-[#fc351c] ring-1 ring-[#fc351c]'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border ${
                          act.checked ? 'bg-[#fc351c] border-[#fc351c] text-white' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {act.checked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-semibold text-slate-800">{act.label}</span>
                    </div>
                    <span className="text-[11px] font-black text-[#fc351c] shrink-0 ml-2">{act.pts}</span>
                  </label>
                ))}
              </div>

              {/* Bonus Adiwiyata (+5 Poin) */}
              <label
                onClick={() => setEcoCommute(!ecoCommute)}
                className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  ecoCommute
                    ? 'bg-emerald-50 border-[#19ae5d] ring-1 ring-[#19ae5d]'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border ${
                      ecoCommute ? 'bg-[#19ae5d] border-[#19ae5d] text-white' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {ecoCommute && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Berjalan kaki atau bersepeda ke sekolah (Bonus Adiwiyata)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Aksi ramah lingkungan mengurangi emisi kendaraan
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black text-[#19ae5d] shrink-0 ml-2">+5 Bonus</span>
              </label>
            </div>
          )}

          {currentPage === 2 && (
            <div className="space-y-4">
              {/* Durasi Olahraga */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Durasi Total Olahraga Hari Ini:
                  </label>
                  <span className="text-xs font-black text-[#fc351c]">
                    {breakdown.durationPoints} / 45
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { key: '<15', label: 'Kurang dari 15 menit', score: '25 / 45' },
                    { key: '15-30', label: '15–30 menit', score: '35 / 45' },
                    { key: '>30', label: 'Lebih dari 30 menit', score: '45 / 45' },
                  ].map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setDurasiKategori(d.key as any)}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        durasiKategori === d.key
                          ? 'bg-red-50 border-[#fc351c] ring-1 ring-[#fc351c]'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900">{d.label}</span>
                      <span className="text-[11px] font-black text-[#fc351c] mt-1">{d.score}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Deskripsi Tempat atau Jenis Olahraga */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Deskripsi Tempat atau Jenis Olahraga (Opsional):
                  </label>
                  <span className="text-xs font-black text-[#fc351c]">
                    {breakdown.descriptionPoints} / 15
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  placeholder="Contoh: Lari pagi 30 menit mengelilingi lapangan SMAN 28 Jakarta"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  {deskripsi.trim().length >= 15
                    ? `✓ Deskripsi lengkap (${deskripsi.trim().length} karakter → 15 / 15 poin)`
                    : deskripsi.trim().length >= 10
                    ? `Deskripsi 10–14 karakter (${deskripsi.trim().length} karakter → 10 / 15 poin, tambah ${15 - deskripsi.trim().length} karakter untuk 15 poin)`
                    : deskripsi.trim().length >= 5
                    ? `Deskripsi 5–9 karakter (${deskripsi.trim().length} karakter → 0 poin, dapat disimpan. Tambah ${10 - deskripsi.trim().length} karakter untuk 10 poin)`
                    : `Minimal 5 karakter untuk menyimpan (0 poin). 10–14 karakter: 10 poin, 15+ karakter: 15 poin maksimal.`}
                </span>
              </div>

              {/* Score summary */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-red-100 block">
                    Nilai Capaian Berolahraga:
                  </span>
                  <span className="text-2xl font-black">{currentScore} / 100</span>
                  <span className="text-[11px] text-red-100 block mt-0.5">
                    Aktivitas ({breakdown.activityPoints}/40) + Durasi ({breakdown.durationPoints}/45) + Deskripsi ({breakdown.descriptionPoints}/15)
                    {ecoCommute ? ' + Bonus Adiwiyata (+5)' : ''}
                  </span>
                  {breakdown.overflowBonus > 0 && (
                    <span className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full inline-block mt-1">
                      +{breakdown.overflowBonus} Poin Bonus masuk ke Poin Hebat
                    </span>
                  )}
                </div>
                <Sparkles className="w-8 h-8 text-amber-200" />
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
                className="px-4 py-2 bg-[#fc351c] hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
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
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-[#fc351c] flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Pernyataan Kejujuran Olahraga
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Jurnal tanggal {displayDate} • Nilai Capaian: {currentScore} / 100
              </p>
            </div>
            <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-xl text-xs text-red-950 font-medium text-left">
              "Saya menyatakan dengan sejujur-jujurnya bahwa aktivitas olahraga ini telah saya laksanakan sesuai data yang diisi."
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
