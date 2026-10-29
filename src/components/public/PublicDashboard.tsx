/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sun,
  Heart,
  Activity,
  Utensils,
  GraduationCap,
  Users,
  Moon,
  Trophy,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  School,
  Clock,
  BookOpen,
} from 'lucide-react';
import { Student } from '../../types';
import { api } from '../../utils/api';
import sman28Photo from '../../assets/images/sman28_campus_exterior_1792928761292.jpg';

interface PublicDashboardProps {
  students: Student[];
  onGoToLogin: () => void;
  onGoToDemo?: () => void;
  onGoToAdmin?: () => void;
  onOpenReport?: (studentId: string) => void;
}

export const PublicDashboard: React.FC<PublicDashboardProps> = ({
  students,
  onGoToLogin,
  onGoToDemo,
  onGoToAdmin,
  onOpenReport,
}) => {
  const [schoolStats, setSchoolStats] = useState<any>(null);

  useEffect(() => {
    api.getSchoolAnalytics().then(setSchoolStats).catch(console.error);
  }, []);

  const top3 = students.slice(0, 3);

  const HABITS = [
    {
      title: 'Bangun Pagi',
      time: '04.00 – 06.00 WIB',
      icon: Sun,
      color: '#1c5ddc',
      bg: 'bg-blue-50',
      desc: 'Memulai hari dengan kesiapan jiwa, ibadah fajar, dan energi positif.',
    },
    {
      title: 'Beribadah',
      time: 'Tepat Waktu & Khusyuk',
      icon: Heart,
      color: '#19ae5d',
      bg: 'bg-emerald-50',
      desc: 'Shalat 5 waktu & tadarus Al-Qur’an / Doa Harian / Tri Sandhya.',
    },
    {
      title: 'Berolahraga',
      time: '15 – 60 Menit',
      icon: Activity,
      color: '#fc351c',
      bg: 'bg-red-50',
      desc: 'Menjaga kebugaran jasmani, peregangan aktif, dan kesehatan jantung.',
    },
    {
      title: 'Makan Bergizi',
      time: 'Isi Piringku & Air',
      icon: Utensils,
      color: '#feb52b',
      bg: 'bg-amber-50',
      desc: 'Komposisi karbohidrat, lauk, sayur-sayuran, buah, dan air minum ideal.',
    },
    {
      title: 'Gemar Belajar',
      time: 'Mandiri & Terstruktur',
      icon: GraduationCap,
      color: '#0000fe',
      bg: 'bg-indigo-50',
      desc: 'Mengulang materi pelajaran, literasi buku, dan pendalaman keilmuan.',
    },
    {
      title: 'Bermasyarakat',
      time: 'Aksi Nyata & Peduli',
      icon: Users,
      color: '#19ae5d',
      bg: 'bg-emerald-50',
      desc: 'Piket kelas, gotong royong, kegiatan Adiwiyata, dan kebaikan acak.',
    },
    {
      title: 'Tidur Cepat',
      time: 'Sebelum 22.30 WIB',
      icon: Moon,
      color: '#0000fe',
      bg: 'bg-indigo-50',
      desc: 'Mengistirahatkan fisik dan otak untuk ritme sirkadia yang bugar.',
    },
  ];

  return (
    <div className="min-h-screen bg-kebaya-pattern flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1c5ddc] to-[#0000fe] text-white flex items-center justify-center font-black text-base shadow-sm">
            28
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base sm:text-lg text-slate-900 tracking-tight">
                VERTIKAL SMA JAWARA 28
              </span>
              <span className="w-2 h-2 rounded-full bg-[#eb30a2]" />
            </div>
            <span className="text-xs text-slate-500 font-medium hidden sm:block">
              SMAN 28 Jakarta • Pemantauan 7 Kebiasaan Anak Indonesia Hebat (7 KAIH)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onGoToDemo && (
            <button
              type="button"
              onClick={onGoToDemo}
              className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Portal Demo</span>
            </button>
          )}
          {onGoToAdmin && (
            <button
              type="button"
              onClick={onGoToAdmin}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer hidden sm:block"
            >
              Admin
            </button>
          )}
          <button
            type="button"
            onClick={onGoToLogin}
            className="btn-interactive px-4 sm:px-5 py-2 bg-[#1c5ddc] hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Masuk (/app)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-8 pt-8 pb-10">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-sm relative overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200/80 px-3.5 py-1.5 rounded-full text-xs font-bold text-[#1c5ddc]">
              <Sparkles className="w-3.5 h-3.5 text-[#feb52b]" />
              Sistem Pemantauan Karakter Siswa Terpadu
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Membentuk Insan Unggul Melalui{' '}
              <span className="text-[#1c5ddc]">7 Kebiasaan</span> Anak Indonesia Hebat
            </h1>

            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed max-w-2xl">
              SMAN 28 Jakarta mengintegrasikan pelaporan mandiri teratur, pendampingan wali kelas, dan validasi observasi sekolah nyata untuk menumbuhkan keteladanan harian murid.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={onGoToLogin}
                className="btn-interactive px-6 py-3 bg-[#1c5ddc] hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-md cursor-pointer flex items-center gap-2"
              >
                <span>Mulai Catat Kebiasaan Hari Ini</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 relative rounded-2xl overflow-hidden shadow-lg border border-slate-200 max-h-[320px]">
            <img
              src={sman28Photo}
              alt="Gedung Kampus SMAN 28 Jakarta"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-4">
              <div className="text-white text-xs">
                <span className="font-black block">Kampus SMAN 28 Jakarta</span>
                <span className="text-slate-300 text-[11px]">Pasar Minggu, Jakarta Selatan</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Aggregate Public Metrics */}
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-8 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center shadow-xs">
            <span className="text-xs text-slate-500 font-semibold block">Total Siswa Terdaftar</span>
            <span className="text-3xl font-black text-[#1c5ddc] my-1 block">
              {students.length}
            </span>
            <span className="text-[11px] text-slate-400">Lintas MIPA &amp; IPS SMAN 28</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center shadow-xs">
            <span className="text-xs text-slate-500 font-semibold block">Rata-Rata Indeks Karakter</span>
            <span className="text-3xl font-black text-[#19ae5d] my-1 block">
              {schoolStats?.overallScore ? `${schoolStats.overallScore}%` : '0%'}
            </span>
            <span className="text-[11px] text-slate-400">Capaian 7 KAIH SMAN 28 Jakarta</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-center shadow-xs">
            <span className="text-xs text-slate-500 font-semibold block">Siswa Tervalidasi Sekolah</span>
            <span className="text-3xl font-black text-[#feb52b] my-1 block">
              {students.filter((s) => s.verification_score).length}
            </span>
            <span className="text-[11px] text-slate-400">Verifikasi Faktual Guru &amp; Admin</span>
          </div>
        </div>
      </section>

      {/* 7 KAIH Pillar Cards */}
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-8 pb-12 space-y-6">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-[#1c5ddc]">
            Indikator Utama
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            7 Pilar Kebiasaan Anak Indonesia Hebat
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Panduan baku dan penilaian terukur untuk membangun kebiasaan positif setiap hari.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {HABITS.map((h) => {
            const Icon = h.icon;
            return (
              <div
                key={h.title}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-[#1c5ddc] transition-all space-y-2"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
                  style={{ backgroundColor: h.color }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-base">{h.title}</h4>
                <span className="inline-block text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  {h.time}
                </span>
                <p className="text-xs text-slate-500 leading-relaxed">{h.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Top 3 Podium Preview */}
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-8 pb-16">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#feb52b]">
                Papan Kehormatan
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Top 3 Jawara Pembiasaan 28
              </h3>
            </div>
            <button
              type="button"
              onClick={onGoToLogin}
              className="text-xs font-bold text-[#1c5ddc] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Lihat Seluruh Peringkat Siswa →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {top3.map((st, i) => (
              <div
                key={st.id}
                onClick={() => onOpenReport?.(st.id)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  i === 0
                    ? 'border-[#feb52b] bg-amber-50/50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs font-black px-2 py-0.5 rounded-full ${
                      i === 0
                        ? 'bg-amber-400 text-slate-950'
                        : i === 1
                        ? 'bg-blue-100 text-[#1c5ddc]'
                        : 'bg-red-100 text-[#fc351c]'
                    }`}
                  >
                    Juara #{i + 1}
                  </span>
                  <Trophy
                    className={`w-4 h-4 ${
                      i === 0 ? 'text-[#feb52b]' : 'text-slate-400'
                    }`}
                  />
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm line-clamp-1">{st.name}</h4>
                <p className="text-xs text-slate-500 font-medium">{st.class_name}</p>
                <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between text-xs">
                  <span className="text-slate-400">Rerata Poin</span>
                  <span className="font-black text-[#1c5ddc]">
                    {st.avg_score ? st.avg_score.toFixed(1) : '0'} pt
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 px-4 sm:px-8 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">
          VERTIKAL SMA JAWARA 28 • SMAN 28 Jakarta Selatan
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          7 Kebiasaan Anak Indonesia Hebat • Sekolah Adiwiyata Mandiri
        </p>
      </footer>
    </div>
  );
};
