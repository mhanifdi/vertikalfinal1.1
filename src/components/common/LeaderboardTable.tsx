/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Trophy, Medal, Award, Search, Sparkles, Filter, ChevronRight, CheckCircle2, AlertCircle, Star, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Student } from '../../types';

interface LeaderboardTableProps {
  students: Student[];
  currentUserId?: string;
  onSelectStudent?: (student: Student) => void;
  highlightClass?: string;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  students,
  currentUserId,
  onSelectStudent,
  highlightClass,
}) => {
  const [pageSize, setPageSize] = useState<number | 'all'>(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');

  // Trigger confetti for celebration
  const triggerCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#feb52b', '#1c5ddc', '#eb30a2', '#19ae5d', '#fc351c'],
    });
  };

  const [privacyWarning, setPrivacyWarning] = useState<string | null>(null);

  const handleRowClick = (s: Student) => {
    // Siswa hanya boleh membuka rapor diri sendiri. Guru & Admin boleh membuka semua rapor.
    if (currentUserId && s.id !== currentUserId) {
      setPrivacyWarning(`Rapor evaluasi atas nama ${s.name} bersifat privat. Siswa hanya dapat membuka rapor miliknya sendiri.`);
      return;
    }
    onSelectStudent?.(s);
  };

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nisn.includes(searchTerm) ||
      s.class_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = classFilter === 'ALL' || s.class_name === classFilter;
    return matchesSearch && matchesClass;
  });

  const displayedStudents =
    pageSize === 'all' ? filtered : filtered.slice(0, Number(pageSize));

  const top3 = students.slice(0, 3);
  const classes = Array.from(new Set(students.map((s) => s.class_name)));

  return (
    <div className="space-y-6">
      {/* Toast Notifikasi Privasi Siswa */}
      {privacyWarning && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between text-xs text-amber-900 shadow-sm animate-pulse">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{privacyWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => setPrivacyWarning(null)}
            className="px-2 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold rounded-lg text-[10px] cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Top 3 Podium Cards Heboh */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#feb52b]" />
            <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
              Podium Jawara Utama 7 KAIH
            </h3>
          </div>
          <button
            type="button"
            onClick={triggerCelebration}
            className="btn-interactive inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-bold text-amber-900 cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#feb52b]" />
            Rayakan Jawara 28 🎉
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Rank 2 (Left) */}
          {top3[1] && (
            <div
              onClick={() => handleRowClick(top3[1])}
              className={`relative p-5 rounded-2xl border-2 border-[#1c5ddc]/30 bg-gradient-to-b from-blue-50/60 to-white shadow-sm hover:shadow-md transition-all cursor-pointer md:mt-4 ${
                top3[1].id === currentUserId ? 'ring-2 ring-[#1c5ddc]' : ''
              }`}
            >
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-black text-[#1c5ddc] text-sm">
                #2
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-lg shadow-sm">
                  {top3[1].name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{top3[1].name}</h4>
                  <p className="text-xs text-slate-500 font-medium">{top3[1].class_name} • NISN {top3[1].nisn}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500">Poin Rata-Rata</span>
                <span className="text-lg font-black text-[#1c5ddc]">
                  {top3[1].avg_score ? top3[1].avg_score.toFixed(1) : '0'} pt
                </span>
              </div>
            </div>
          )}

          {/* Rank 1 (Center - HEBOH) */}
          {top3[0] && (
            <div
              onClick={() => handleRowClick(top3[0])}
              className={`relative p-5 rounded-2xl border-2 border-[#feb52b] bg-gradient-to-b from-amber-50 via-amber-50/40 to-white shadow-lg ring-2 ring-[#feb52b]/40 hover:shadow-xl transition-all cursor-pointer ${
                top3[0].id === currentUserId ? 'ring-4 ring-[#feb52b]' : ''
              }`}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#feb52b] text-slate-950 font-black text-[11px] shadow-sm flex items-center gap-1 uppercase tracking-wider">
                <Trophy className="w-3 h-3" /> Peringkat 1 Jawara
              </div>
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-xs">
                #1
              </div>
              <div className="flex items-center gap-3 mb-3 mt-1">
                <div className="w-14 h-14 rounded-full bg-[#feb52b] text-slate-950 font-black flex items-center justify-center text-xl shadow-md ring-2 ring-white">
                  {top3[0].name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base line-clamp-1">{top3[0].name}</h4>
                  <p className="text-xs text-amber-800 font-semibold">{top3[0].class_name} • NISN {top3[0].nisn}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-amber-200">
                <span className="text-xs text-slate-600 font-medium">Poin Rata-Rata 7 KAIH</span>
                <span className="text-2xl font-black text-amber-900">
                  {top3[0].avg_score ? top3[0].avg_score.toFixed(1) : '0'} pt
                </span>
              </div>
            </div>
          )}

          {/* Rank 3 (Right) */}
          {top3[2] && (
            <div
              onClick={() => handleRowClick(top3[2])}
              className={`relative p-5 rounded-2xl border-2 border-[#fc351c]/30 bg-gradient-to-b from-red-50/60 to-white shadow-sm hover:shadow-md transition-all cursor-pointer md:mt-6 ${
                top3[2].id === currentUserId ? 'ring-2 ring-[#fc351c]' : ''
              }`}
            >
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center font-black text-[#fc351c] text-sm">
                #3
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-red-600 text-white font-black flex items-center justify-center text-lg shadow-sm">
                  {top3[2].name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{top3[2].name}</h4>
                  <p className="text-xs text-slate-500 font-medium">{top3[2].class_name} • NISN {top3[2].nisn}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500">Poin Rata-Rata</span>
                <span className="text-lg font-black text-[#fc351c]">
                  {top3[2].avg_score ? top3[2].avg_score.toFixed(1) : '0'} pt
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari siswa berdasarkan nama, NISN, atau kelas..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#1c5ddc]"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Class Filter */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium"
          >
            <option value="ALL">Semua Kelas</option>
            {classes.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Page size limit */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>Tampilkan:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value="all">Semuanya</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-14 text-center">Rank</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4 text-center">Total Entri</th>
                <th className="py-3 px-4 text-center">Hari Aktif</th>
                <th className="py-3 px-4 text-right">Skor Rata-Rata</th>
                <th className="py-3 px-4 text-center">Validasi Sekolah</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedStudents.map((s, idx) => {
                const isMe = s.id === currentUserId;
                const isMyClass = highlightClass && s.class_name === highlightClass;
                const canOpenReport = !currentUserId || isMe;
                return (
                  <tr
                    key={s.id}
                    onClick={() => handleRowClick(s)}
                    className={`transition-colors ${
                      canOpenReport ? 'hover:bg-slate-50/80 cursor-pointer' : 'hover:bg-slate-50/40 cursor-default'
                    } ${
                      isMe ? 'bg-blue-50/60 font-semibold' : isMyClass ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center">
                      {idx === 0 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black inline-flex items-center justify-center text-xs">
                          1
                        </span>
                      ) : idx === 1 ? (
                        <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-bold inline-flex items-center justify-center text-xs">
                          2
                        </span>
                      ) : idx === 2 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-700 text-white font-bold inline-flex items-center justify-center text-xs">
                          3
                        </span>
                      ) : (
                        <span className="font-bold text-slate-500">#{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{s.name}</span>
                          <span className="text-[10px] text-slate-400">NISN: {s.nisn}</span>
                        </div>
                        {isMe && (
                          <span className="ml-1 text-[10px] bg-[#1c5ddc] text-white px-1.5 py-0.5 rounded font-black">
                            Saya
                          </span>
                        )}
                        {isMyClass && !isMe && (
                          <span className="ml-1 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                            Kelas Binaan
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{s.class_name}</td>
                    <td className="py-3 px-4 text-center font-medium text-slate-600">
                      {s.total_entries || 0}
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-slate-600">
                      {s.active_days || 0} hari
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-black text-[#1c5ddc] text-sm">
                        {s.avg_score ? s.avg_score.toFixed(1) : '0'}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-0.5">pt</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {s.verification_score !== null && s.verification_score !== undefined ? (
                        s.verification_score < 7 ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full font-black text-[10px] border border-red-200 animate-pulse">
                              <AlertCircle className="w-3 h-3 text-red-600" />
                              Tindak Lanjuti! ({s.verification_score}/10)
                            </span>
                            {canOpenReport ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(s);
                                }}
                                className="text-[10px] font-bold text-red-700 underline hover:text-red-900 cursor-pointer"
                              >
                                Buka Rapor
                              </button>
                            ) : (
                              <span className="text-[9px] text-slate-400 italic">Rapor Privat</span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {s.verification_score}/10
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 text-[10px]">Belum</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {canOpenReport ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(s);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"
                          title="Buka Rapor"
                        >
                          <span>Rapor</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-400 bg-slate-100 cursor-default"
                          title="Rapor ini hanya dapat diakses oleh siswa bersangkutan & guru/admin"
                        >
                          <Lock className="w-3 h-3 text-slate-400" />
                          Privat
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {displayedStudents.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ada siswa yang cocok dengan filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
