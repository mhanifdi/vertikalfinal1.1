/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  UserCheck,
  Layers,
  Database,
  Quote,
  Trash2,
  Edit3,
  Calendar,
  Sparkles,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  Search,
  RefreshCw,
  LogOut,
  ExternalLink,
  Plus,
  Sliders,
  Check,
  Clock,
  Heart,
  Activity,
  Utensils,
  GraduationCap,
  Moon,
  Sun,
  Lock,
} from 'lucide-react';
import {
  Student,
  Teacher,
  TeacherAssignmentType,
  AdminJournalEntry,
} from '../../types';
import { api } from '../../utils/api';
import { StudentReportModal } from '../common/StudentReportModal';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface AdminDashboardProps {
  admin: Teacher;
  allStudents: Student[];
  onLogout: () => void;
  onRefreshStudents?: () => void;
}

type AdminControlTab =
  | 'overview'
  | 'period'
  | 'instruments'
  | 'students'
  | 'teachers'
  | 'classes_rombels'
  | 'journals'
  | 'demo_manage'
  | 'announcements';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  admin,
  allStudents,
  onLogout,
  onRefreshStudents,
}) => {
  const [activeTab, setActiveTab] = useState<AdminControlTab>('overview');
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // =========================================================================
  // G.1: OVERVIEW STATE
  // =========================================================================
  const [overviewData, setOverviewData] = useState<any>(null);
  const [serverTodayDate, setServerTodayDate] = useState<string>('');

  // =========================================================================
  // JADWAL PENGAMBILAN DATA (DATA COLLECTION PERIOD)
  // =========================================================================
  const [periodForm, setPeriodForm] = useState({
    start_date: '2026-10-15',
    end_date: '2026-11-15',
  });
  const [periodSaving, setPeriodSaving] = useState(false);

  // =========================================================================
  // INSTRUMEN 7 KAIH STATE
  // =========================================================================
  const [instruments, setInstruments] = useState<any[]>([]);
  const [instrumentModalOpen, setInstrumentModalOpen] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<any | null>(null);
  const [instrumentForm, setInstrumentForm] = useState<any>({
    habit_code: 'bangun',
    habit_name: 'Bangun Pagi',
    subtitle: 'Pukul 04.00 – 06.40 WIB',
    category: 'Kedisiplinan',
    max_daily_sessions: 1,
    base_points: 100,
    rubric_json: '[]',
  });

  // =========================================================================
  // G.2: MANAJEMEN SISWA & CSV
  // =========================================================================
  const [adminStudents, setAdminStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDemo, setFilterDemo] = useState('ALL');
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [studentForm, setStudentForm] = useState<any>({
    id: '',
    nisn: '',
    name: '',
    password: '123',
    gender: 'L',
    religion: 'Islam',
    class_name: 'X-1',
    rombel_name: '',
    wali_name: '',
    angkatan: '2025/2026',
    status: 'ACTIVE',
    is_demo: 0,
  });

  // =========================================================================
  // G.3: MANAJEMEN GURU & ROLE
  // =========================================================================
  const [adminTeachers, setAdminTeachers] = useState<any[]>([]);
  const [teacherFilterRole, setTeacherFilterRole] = useState<string>('ALL');
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [teacherForm, setTeacherForm] = useState<any>({
    id: '',
    nip: '',
    name: '',
    password: '123',
    subject: 'Pendidikan Karakter',
    is_walas: true,
    is_wali: false,
    is_tim_7_kaih: false,
    class_name: 'X-1',
    is_demo: 0,
  });

  // =========================================================================
  // G.4 & G.5: KELAS & GURU WALI (ROMBEL)
  // =========================================================================
  const [classesRombelsData, setClassesRombelsData] = useState<{
    classes: any[];
    rombels: any[];
  }>({ classes: [], rombels: [] });
  const [newClassForm, setNewClassForm] = useState({ name: '', cohort_name: '2025/2026' });
  const [newRombelForm, setNewRombelForm] = useState({ name: '', wali_name: '', cohort_name: '2025/2026' });

  // =========================================================================
  // G.6: DATABASE JURNAL & AUDIT KOREKSI
  // =========================================================================
  const [journalsList, setJournalsList] = useState<AdminJournalEntry[]>([]);
  const [journalFilterDate, setJournalFilterDate] = useState<string>('');
  const [journalFilterHabit, setJournalFilterHabit] = useState<string>('');
  const [editingJournal, setEditingJournal] = useState<AdminJournalEntry | null>(null);
  const [newJournalScore, setNewJournalScore] = useState<number>(100);
  const [correctionReason, setCorrectionReason] = useState<string>('');

  // =========================================================================
  // PENGUMUMAN & QUOTES
  // =========================================================================
  const [announcementsList, setAnnouncementsList] = useState<any[]>([]);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState<{
    id: string;
    type: 'ANNOUNCEMENT' | 'QUOTE';
    title: string;
    content: string;
    author: string;
  }>({
    id: '',
    type: 'QUOTE',
    title: '',
    content: '',
    author: '',
  });

  // Load Main Data
  const loadControlPanelData = async () => {
    try {
      setLoading(true);
      const [ovData, stList, tchList, crData, pData, instData, annList, jRes] = await Promise.all([
        api.getAdminOverview(),
        api.getStudents(),
        api.getTeachers(),
        api.getAdminClassesAndRombels(),
        api.getDataCollectionPeriod().catch(() => ({ startDate: '2026-10-15', endDate: '2026-11-15' })),
        api.getInstruments().catch(() => []),
        api.getAnnouncements().catch(() => []),
        api.getAdminJournals({}),
      ]);

      setOverviewData(ovData);
      setAdminStudents(stList);
      setAdminTeachers(tchList);
      setClassesRombelsData(crData);
      if (pData?.startDate && pData?.endDate) {
        setPeriodForm({ start_date: pData.startDate, end_date: pData.endDate });
      }
      setInstruments(instData);
      setAnnouncementsList(annList);
      if (jRes?.journals) setJournalsList(jRes.journals);
    } catch (e) {
      console.error('Failed to load admin control data:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayDateInfo = async () => {
    try {
      const info = await api.getTodayInfo();
      setServerTodayDate(info.todayDate);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadControlPanelData();
    fetchTodayDateInfo();
  }, []);

  // Save Data Collection Period
  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setPeriodSaving(true);
      await api.saveDataCollectionPeriod(periodForm.start_date, periodForm.end_date);
      showToast('Jadwal pengambilan data berhasil diperbarui!');
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan jadwal pengambilan data');
    } finally {
      setPeriodSaving(false);
    }
  };

  // Save Instrument
  const handleSaveInstrument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveInstrument(instrumentForm);
      setInstrumentModalOpen(false);
      showToast('Instrumen 7 KAIH berhasil disimpan!');
      const updated = await api.getInstruments();
      setInstruments(updated);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan instrumen');
    }
  };

  const handleDeleteInstrument = async (id: number) => {
    if (!confirm('Hapus instrumen/pertanyaan ini?')) return;
    try {
      await api.deleteInstrument(id);
      showToast('Instrumen berhasil dihapus');
      const updated = await api.getInstruments();
      setInstruments(updated);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus instrumen');
    }
  };

  // Student Save & Delete
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveAdminStudent({
        ...studentForm,
        is_demo: studentForm.is_demo ? 1 : 0,
        rombel_name: studentForm.wali_name || studentForm.rombel_name,
      });
      setStudentModalOpen(false);
      showToast('Data akun siswa berhasil disimpan!');
      await loadControlPanelData();
      onRefreshStudents?.();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan siswa');
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Hapus akun siswa ini secara permanen?')) return;
    try {
      await api.deleteAdminStudent(id);
      showToast('Akun siswa berhasil dihapus');
      await loadControlPanelData();
      onRefreshStudents?.();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus siswa');
    }
  };

  // Teacher Save & Delete
  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const roles: string[] = [];
      if (teacherForm.is_walas) roles.push('WALAS');
      if (teacherForm.is_wali) roles.push('WALI');
      if (teacherForm.is_tim_7_kaih) roles.push('TIM_7_KAIH');

      await api.saveAdminTeacher({
        ...teacherForm,
        is_walas: teacherForm.is_walas ? 1 : 0,
        is_wali: teacherForm.is_wali ? 1 : 0,
        is_tim_7_kaih: teacherForm.is_tim_7_kaih ? 1 : 0,
        roles_csv: roles.join(','),
        assignment_type: roles[0] || 'WALAS',
        class_name: teacherForm.is_walas ? teacherForm.class_name : '',
      });
      setTeacherModalOpen(false);
      showToast('Data akun guru berhasil disimpan!');
      await loadControlPanelData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan guru');
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm('Hapus akun guru ini secara permanen?')) return;
    try {
      await api.deleteAdminTeacher(id);
      showToast('Akun guru berhasil dihapus');
      await loadControlPanelData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus guru');
    }
  };

  // Classes & Rombels Save & Delete
  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassForm.name.trim()) return;
    try {
      await api.saveAdminClass(newClassForm);
      setNewClassForm({ name: '', cohort_name: '2025/2026' });
      showToast('Kelas berhasil disimpan!');
      await loadControlPanelData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan kelas');
    }
  };

  const handleDeleteClass = async (id: number) => {
    if (!confirm('Hapus kelas ini? Siswa di kelas ini perlu dipindahkan.')) return;
    try {
      await api.deleteClass(id);
      showToast('Kelas berhasil dihapus');
      await loadControlPanelData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus kelas');
    }
  };

  const handleSaveRombel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRombelForm.name.trim() || !newRombelForm.wali_name.trim()) return;
    try {
      await api.saveAdminRombel(newRombelForm);
      setNewRombelForm({ name: '', wali_name: '', cohort_name: '2025/2026' });
      showToast('Guru Wali berhasil disimpan!');
      await loadControlPanelData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan rombel/guru wali');
    }
  };

  const handleDeleteRombel = async (id: number) => {
    if (!confirm('Hapus penugasan Guru Wali ini?')) return;
    try {
      await api.deleteRombel(id);
      showToast('Guru Wali berhasil dihapus');
      await loadControlPanelData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus rombel');
    }
  };

  // Toggle Demo Status
  const handleToggleDemoAccount = async (userId: string) => {
    try {
      await api.toggleDemoAccount(userId);
      showToast('Status akun demo berhasil diubah!');
      await loadControlPanelData();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status demo');
    }
  };

  // Reset Demo Data
  const handleResetDemoData = async () => {
    if (!confirm('Reset semua data demo dan tanggal ke kondisi awal?')) return;
    try {
      await api.resetDemoData();
      showToast('Data demo berhasil di-reset!');
      await loadControlPanelData();
      await fetchTodayDateInfo();
      onRefreshStudents?.();
    } catch (err: any) {
      alert(err.message || 'Gagal reset data demo');
    }
  };

  // Correct Journal
  const handleCorrectJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJournal || !correctionReason.trim()) return;
    try {
      await api.correctAdminJournal({
        log_id: editingJournal.id,
        new_score: Number(newJournalScore),
        reason: correctionReason.trim(),
        corrected_by: `${admin.name} (Admin)`,
      });
      setEditingJournal(null);
      setCorrectionReason('');
      showToast('Koreksi jurnal berhasil disimpan dan diaudit!');
      await loadControlPanelData();
      onRefreshStudents?.();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan koreksi jurnal');
    }
  };

  // Announcements Save & Delete
  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveAnnouncement(announcementForm);
      setAnnouncementModalOpen(false);
      showToast('Pengumuman/Quotes berhasil disimpan!');
      const updated = await api.getAnnouncements();
      setAnnouncementsList(updated);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan pengumuman');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Hapus pengumuman ini?')) return;
    try {
      await api.deleteAnnouncement(id);
      showToast('Pengumuman berhasil dihapus');
      const updated = await api.getAnnouncements();
      setAnnouncementsList(updated);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus pengumuman');
    }
  };

  // Calculate duration between start and end date
  const periodDurationDays = Math.max(
    1,
    Math.round(
      (new Date(`${periodForm.end_date}T12:00:00Z`).getTime() -
        new Date(`${periodForm.start_date}T12:00:00Z`).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1
  );

  const tabs = [
    { id: 'overview' as const, label: 'Ringkasan Sistem', icon: ShieldCheck },
    { id: 'period' as const, label: 'Jadwal Pengambilan Data', icon: Calendar },
    { id: 'instruments' as const, label: 'Instrumen 7 KAIH', icon: Sliders },
    { id: 'students' as const, label: 'Data Siswa', icon: Users },
    { id: 'teachers' as const, label: 'Data Guru & Penugasan', icon: UserCheck },
    { id: 'classes_rombels' as const, label: 'Master Kelas & Guru Wali', icon: Layers },
    { id: 'journals' as const, label: 'Database & Koreksi Jurnal', icon: Database },
    { id: 'demo_manage' as const, label: 'Kelola Laman Demo', icon: Sparkles },
    { id: 'announcements' as const, label: 'Pengumuman & Quotes', icon: Quote },
  ];

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
        {/* Toast */}
        {toastMsg && (
          <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-lg text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* ===================================================================
            LEFT SIDEBAR NAVBAR
        =================================================================== */}
        <aside className="w-full md:w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-5 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-xs">
                28
              </div>
              <div>
                <h1 className="font-extrabold text-sm text-slate-900 tracking-tight leading-tight">
                  PANEL PENGELOLA ADMIN
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                  SMAN 28 Jakarta
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-black text-xs shadow-xs">
                ADM
              </div>
              <div className="overflow-hidden">
                <span className="font-extrabold text-xs text-slate-900 block truncate">
                  {admin.name}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Otoritas: Administrator Sistem
                </span>
              </div>
            </div>
          </div>

          <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 block mb-1">
              Menu Otoritas Admin
            </span>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl font-bold text-xs transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar Sesi Admin</span>
            </button>
          </div>
        </aside>

        {/* ===================================================================
            RIGHT WORKSPACE CONTENT
        =================================================================== */}
        <main className="flex-1 p-4 sm:p-8 space-y-6 overflow-y-auto max-w-6xl">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Ringkasan &amp; Status Operasional Sistem
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pemantauan real-time akun, kebiasaan, partisipasi, dan integritas 7 KAIH SMAN 28 Jakarta.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                  <span className="text-xs font-bold text-slate-500 block">Total Siswa Terdaftar</span>
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 block mt-1">
                    {overviewData?.totalStudents ?? allStudents.length}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold">
                    {adminStudents.filter((s) => !s.is_demo).length} Akun Riil • {adminStudents.filter((s) => s.is_demo).length} Demo
                  </span>
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                  <span className="text-xs font-bold text-slate-500 block">Total Dewan Guru</span>
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 block mt-1">
                    {adminTeachers.length}
                  </span>
                  <span className="text-[10px] text-slate-400">Walas, Guru Wali, Tim 7 KAIH</span>
                </div>
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-xs">
                  <span className="text-xs font-bold text-emerald-800 block">Rata-rata Sekolah</span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-700 block mt-1">
                    {overviewData?.schoolAverage ?? 86.4}
                  </span>
                  <span className="text-[10px] text-emerald-700">Skor Karakter All-Time</span>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl shadow-xs">
                  <span className="text-xs font-bold text-blue-800 block">Partisipasi Hari Ini</span>
                  <span className="text-2xl sm:text-3xl font-black text-blue-700 block mt-1">
                    {overviewData?.participatingToday ?? 0}
                  </span>
                  <span className="text-[10px] text-blue-700">Siswa aktif mengisi jurnal</span>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
                <h3 className="font-extrabold text-sm text-slate-900">
                  Panduan Pengelolaan Cepat (Quick Access)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div
                    onClick={() => setActiveTab('period')}
                    className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 hover:border-amber-400 cursor-pointer transition-all"
                  >
                    <Calendar className="w-5 h-5 text-amber-700 mb-2" />
                    <span className="font-extrabold text-slate-900 block">Jadwal Pengambilan Data</span>
                    <span className="text-[11px] text-slate-600 mt-1 block">
                      Atur tanggal mulai dan berakhirnya pengisian jurnal siswa.
                    </span>
                  </div>
                  <div
                    onClick={() => setActiveTab('instruments')}
                    className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 hover:border-blue-400 cursor-pointer transition-all"
                  >
                    <Sliders className="w-5 h-5 text-blue-700 mb-2" />
                    <span className="font-extrabold text-slate-900 block">Instrumen 7 KAIH</span>
                    <span className="text-[11px] text-slate-600 mt-1 block">
                      Kelola pertanyaan, opsi jawaban, dan bobot poin tiap kebiasaan.
                    </span>
                  </div>
                  <div
                    onClick={() => setActiveTab('demo_manage')}
                    className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 hover:border-purple-400 cursor-pointer transition-all"
                  >
                    <Sparkles className="w-5 h-5 text-purple-700 mb-2" />
                    <span className="font-extrabold text-slate-900 block">Kelola Laman Demo</span>
                    <span className="text-[11px] text-slate-600 mt-1 block">
                      Tentukan akun khusus demo dan kelola simulator portal /demo.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: JADWAL PENGAMBILAN DATA */}
          {activeTab === 'period' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Pengaturan Jadwal Pengambilan Data 7 KAIH
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tentukan rentang tanggal resmi pengisian instrumen 7 Kebiasaan Anak Indonesia Hebat.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
                <form onSubmit={handleSavePeriod} className="space-y-6 max-w-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tanggal Mulai Pengambilan Data:
                      </label>
                      <input
                        type="date"
                        value={periodForm.start_date}
                        onChange={(e) => setPeriodForm({ ...periodForm, start_date: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tanggal Selesai Pengambilan Data:
                      </label>
                      <input
                        type="date"
                        value={periodForm.end_date}
                        onChange={(e) => setPeriodForm({ ...periodForm, end_date: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>Ringkasan Periode Aktif:</span>
                    </div>
                    <p className="text-[11px] text-blue-900">
                      Total Durasi: <strong>{periodDurationDays} Hari</strong> ({periodForm.start_date} s.d. {periodForm.end_date}).
                    </p>
                    <p className="text-[11px] text-blue-800">
                      • Seluruh tanggal dalam rentang ini akan muncul di kalender <strong>Riwayat Pengisian</strong> siswa.
                    </p>
                    <p className="text-[11px] text-blue-800">
                      • Bila siswa membuka aplikasi di luar tanggal periode ini, beranda tidak akan meminta pengisian lagi dan notifikasi pengingat otomatis dinonaktifkan.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={periodSaving}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {periodSaving ? 'Menyimpan...' : 'Simpan Jadwal Pengambilan Data'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: INSTRUMEN 7 KAIH (FULL CRUD) */}
          {activeTab === 'instruments' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Kelola Instrumen &amp; Rubrik Penilaian 7 KAIH
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Input, edit, dan hapus instrumen, jenis pertanyaan, opsi jawaban, dan bobot poin tiap kebiasaan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setInstrumentForm({
                      habit_code: 'belajar',
                      habit_name: 'Gemar Belajar Tambahan',
                      subtitle: 'Aktivitas literasi & pendalaman materi',
                      category: 'Akademik & Literasi',
                      max_daily_sessions: 1,
                      base_points: 100,
                      rubric_json: JSON.stringify([
                        { option: 'Belajar mandiri >= 60 menit', score: 100 },
                        { option: 'Belajar 30 - 59 menit', score: 80 },
                        { option: 'Belajar 15 - 29 menit', score: 60 },
                      ], null, 2),
                    });
                    setSelectedInstrument(null);
                    setInstrumentModalOpen(true);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Instrumen Baru</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {instruments.map((inst) => {
                  let rubricItems: any[] = [];
                  try {
                    rubricItems = typeof inst.rubric_json === 'string' ? JSON.parse(inst.rubric_json) : (inst.rubric_json || []);
                  } catch {
                    rubricItems = [];
                  }

                  return (
                    <div
                      key={inst.id || inst.habit_code}
                      className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                              Kode: {inst.habit_code}
                            </span>
                            <h3 className="font-extrabold text-base text-slate-900 mt-1">
                              {inst.habit_name}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">{inst.subtitle}</p>
                          </div>
                          <span className="text-[11px] font-black bg-slate-100 text-slate-700 px-2.5 py-1 rounded-xl">
                            Maks {inst.base_points || 100} Poin
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-600 space-y-1 pt-2 border-t border-slate-100">
                          <div>Kategori: <strong>{inst.category || '-'}</strong></div>
                          <div>Sesi Harian: <strong>{inst.max_daily_sessions || 1}x sehari</strong></div>
                        </div>

                        {rubricItems.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                              Rubrik Pilihan Jawaban ({rubricItems.length} Opsi):
                            </span>
                            <div className="space-y-1">
                              {rubricItems.slice(0, 4).map((r: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-slate-50 border border-slate-100"
                                >
                                  <span className="truncate pr-2 font-medium text-slate-700">
                                    {r.option || r.label || r.text || `Opsi ${idx + 1}`}
                                  </span>
                                  <span className="font-black text-emerald-700 shrink-0">
                                    +{r.score ?? r.points ?? 0} Poin
                                  </span>
                                </div>
                              ))}
                              {rubricItems.length > 4 && (
                                <span className="text-[10px] text-slate-400 italic block">
                                  +{rubricItems.length - 4} opsi lainnya...
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInstrument(inst);
                            setInstrumentForm({
                              id: inst.id,
                              habit_code: inst.habit_code,
                              habit_name: inst.habit_name,
                              subtitle: inst.subtitle,
                              category: inst.category,
                              max_daily_sessions: inst.max_daily_sessions,
                              base_points: inst.base_points,
                              rubric_json: typeof inst.rubric_json === 'string' ? inst.rubric_json : JSON.stringify(inst.rubric_json, null, 2),
                            });
                            setInstrumentModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Instrumen</span>
                        </button>
                        {inst.id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteInstrument(inst.id)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Instrument Modal */}
              {instrumentModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-base text-slate-900">
                        {selectedInstrument ? 'Edit Instrumen 7 KAIH' : 'Tambah Instrumen Baru'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setInstrumentModalOpen(false)}
                        className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleSaveInstrument} className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Kode Kebiasaan</label>
                          <input
                            type="text"
                            value={instrumentForm.habit_code}
                            onChange={(e) => setInstrumentForm({ ...instrumentForm, habit_code: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                            required
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Nama Kebiasaan</label>
                          <input
                            type="text"
                            value={instrumentForm.habit_name}
                            onChange={(e) => setInstrumentForm({ ...instrumentForm, habit_name: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Subjudul / Waktu</label>
                        <input
                          type="text"
                          value={instrumentForm.subtitle}
                          onChange={(e) => setInstrumentForm({ ...instrumentForm, subtitle: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Kategori</label>
                          <input
                            type="text"
                            value={instrumentForm.category}
                            onChange={(e) => setInstrumentForm({ ...instrumentForm, category: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Maks Poin / Sesi</label>
                          <input
                            type="number"
                            min={10}
                            max={100}
                            value={instrumentForm.base_points}
                            onChange={(e) => setInstrumentForm({ ...instrumentForm, base_points: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Rubrik Opsi Jawaban (Format JSON):
                        </label>
                        <textarea
                          rows={6}
                          value={instrumentForm.rubric_json}
                          onChange={(e) => setInstrumentForm({ ...instrumentForm, rubric_json: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-[11px]"
                          placeholder='[{"option": "Tepat waktu", "score": 100}]'
                          required
                        />
                        <span className="text-[10px] text-slate-400 block mt-1">
                          Format: Array objek dengan properti "option" dan "score".
                        </span>
                      </div>

                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setInstrumentModalOpen(false)}
                          className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                        >
                          Simpan Instrumen
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DATA SISWA (DROPDOWNS FOR KELAS & WALI, DEMO CHECKBOX, CRUD) */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Data Akun Siswa (Total: {adminStudents.length})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Input, edit, dan hapus akun siswa. Pilihan kelas dan guru wali menggunakan dropdown data master.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStudentForm({
                      id: '',
                      nisn: '',
                      name: '',
                      password: '123',
                      gender: 'L',
                      religion: 'Islam',
                      class_name: classesRombelsData.classes[0]?.name || 'X-1',
                      rombel_name: classesRombelsData.rombels[0]?.name || 'Rombel A',
                      wali_name: classesRombelsData.rombels[0]?.wali_name || '',
                      angkatan: '2025/2026',
                      status: 'ACTIVE',
                      is_demo: 0,
                    });
                    setStudentModalOpen(true);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Siswa Baru</span>
                </button>
              </div>

              {/* Filter Bar */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari nama atau NISN siswa..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 font-semibold focus:outline-none"
                  />
                </div>
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="ALL">Semua Kelas</option>
                  {classesRombelsData.classes.map((c) => (
                    <option key={c.id || c.name} value={c.name}>Kelas {c.name}</option>
                  ))}
                </select>
                <select
                  value={filterDemo}
                  onChange={(e) => setFilterDemo(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="ALL">Semua Akun</option>
                  <option value="DEMO">Akun Khusus Demo</option>
                  <option value="REAL">Akun Riil Sekolah</option>
                </select>
              </div>

              {/* Students Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase">
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-4">Guru Wali</th>
                      <th className="py-3 px-4 text-center">Status Akun</th>
                      <th className="py-3 px-4 text-center">Tipe</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {adminStudents
                      .filter((s) => {
                        if (studentSearch) {
                          const q = studentSearch.toLowerCase();
                          if (!s.name.toLowerCase().includes(q) && !s.nisn.includes(q)) return false;
                        }
                        if (filterClass !== 'ALL' && s.class_name !== filterClass) return false;
                        if (filterDemo === 'DEMO' && !s.is_demo) return false;
                        if (filterDemo === 'REAL' && s.is_demo) return false;
                        return true;
                      })
                      .map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <div>{s.name}</div>
                            <span className="text-[10px] text-slate-400 font-normal">NISN: {s.nisn}</span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-700">{s.class_name}</td>
                          <td className="py-3 px-4 text-slate-600">{s.wali_name || s.rombel_name || '-'}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {s.account_status || 'ACTIVE'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {s.is_demo ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                                Akun Demo
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                Akun Riil
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setStudentForm({
                                    id: s.id,
                                    nisn: s.nisn,
                                    name: s.name,
                                    password: '123',
                                    gender: s.gender || 'L',
                                    religion: s.religion || 'Islam',
                                    class_name: s.class_name,
                                    rombel_name: s.rombel_name,
                                    wali_name: s.wali_name || s.rombel_name,
                                    angkatan: s.angkatan || '2025/2026',
                                    status: s.account_status || 'ACTIVE',
                                    is_demo: s.is_demo ? 1 : 0,
                                  });
                                  setStudentModalOpen(true);
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                                title="Edit Siswa"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStudent(s.id)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg cursor-pointer"
                                title="Hapus Siswa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Student Create / Edit Modal */}
              {studentModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-base text-slate-900">
                        {studentForm.id ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setStudentModalOpen(false)}
                        className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleSaveStudent} className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">NISN (Wajib)</label>
                          <input
                            type="text"
                            value={studentForm.nisn}
                            onChange={(e) => setStudentForm({ ...studentForm, nisn: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                            required
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Password</label>
                          <input
                            type="password"
                            value={studentForm.password}
                            onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Siswa</label>
                        <input
                          type="text"
                          value={studentForm.name}
                          onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                          <select
                            value={studentForm.gender}
                            onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                          >
                            <option value="L">Laki-laki (L)</option>
                            <option value="P">Perempuan (P)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Agama</label>
                          <select
                            value={studentForm.religion}
                            onChange={(e) => setStudentForm({ ...studentForm, religion: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                          >
                            <option value="Islam">Islam</option>
                            <option value="Kristen">Kristen</option>
                            <option value="Katolik">Katolik</option>
                            <option value="Hindu">Hindu</option>
                            <option value="Buddha">Buddha</option>
                            <option value="Konghucu">Konghucu</option>
                          </select>
                        </div>
                      </div>

                      {/* Pure Dropdowns for Kelas & Guru Wali */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Pilih Kelas (Dropdown)</label>
                          <select
                            value={studentForm.class_name}
                            onChange={(e) => setStudentForm({ ...studentForm, class_name: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                            required
                          >
                            {classesRombelsData.classes.map((c) => (
                              <option key={c.id || c.name} value={c.name}>Kelas {c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Pilih Guru Wali (Dropdown)</label>
                          <select
                            value={studentForm.wali_name || studentForm.rombel_name}
                            onChange={(e) =>
                              setStudentForm({
                                ...studentForm,
                                wali_name: e.target.value,
                                rombel_name: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                            required
                          >
                            <option value="">-- Pilih Guru Wali --</option>
                            {classesRombelsData.rombels.map((r) => (
                              <option key={r.id || r.name} value={r.wali_name || r.name}>
                                {r.wali_name || r.name}
                              </option>
                            ))}
                            {adminTeachers
                              .filter((t) => t.is_wali || t.roles_csv?.includes('WALI'))
                              .map((t) => (
                                <option key={t.id} value={t.name}>
                                  {t.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>

                      {/* Demo Account Checkbox */}
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
                        <div>
                          <label className="font-bold text-slate-800 block">Akun Khusus Demo</label>
                          <span className="text-[10px] text-slate-500">
                            Jika dicentang, akun ini hanya akan muncul di Portal Demo (/demo).
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={Boolean(studentForm.is_demo)}
                          onChange={(e) =>
                            setStudentForm({ ...studentForm, is_demo: e.target.checked ? 1 : 0 })
                          }
                          className="w-5 h-5 text-purple-600 rounded cursor-pointer"
                        />
                      </div>

                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setStudentModalOpen(false)}
                          className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer"
                        >
                          Simpan Data Siswa
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DATA GURU & ROLE CHECKBOXES */}
          {activeTab === 'teachers' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Data Dewan Guru &amp; Penugasan (Total: {adminTeachers.length})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Penugasan guru berbasis checkbox wewenang ganda (Walas, Guru Wali, Tim 7 KAIH).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTeacherForm({
                      id: '',
                      nip: '',
                      name: '',
                      password: '123',
                      subject: 'Pendidikan Karakter',
                      is_walas: true,
                      is_wali: false,
                      is_tim_7_kaih: false,
                      class_name: classesRombelsData.classes[0]?.name || 'X-1',
                      is_demo: 0,
                    });
                    setTeacherModalOpen(true);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Guru Baru</span>
                </button>
              </div>

              {/* Teachers Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase">
                      <th className="py-3 px-4">Nama Guru</th>
                      <th className="py-3 px-4">Mata Pelajaran</th>
                      <th className="py-3 px-4">Wewenang / Penugasan</th>
                      <th className="py-3 px-4">Kelas Binaan Walas</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {adminTeachers.map((t) => {
                      const tWalas = Boolean(t.is_walas || t.roles_csv?.includes('WALAS') || t.assignment_type === 'WALAS');
                      const tWali = Boolean(t.is_wali || t.roles_csv?.includes('WALI') || t.assignment_type === 'WALI');
                      const tTim = Boolean(t.is_tim_7_kaih || t.roles_csv?.includes('TIM_7_KAIH') || t.assignment_type === 'TIM_7_KAIH');

                      return (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <div>{t.name}</div>
                            <span className="text-[10px] text-slate-400 font-normal">NIP: {t.nip || '-'}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{t.subject || 'Guru'}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {tWalas && (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                  Walas
                                </span>
                              )}
                              {tWali && (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-purple-100 text-purple-800">
                                  Guru Wali
                                </span>
                              )}
                              {tTim && (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-100 text-blue-800">
                                  Tim 7 KAIH
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {tWalas ? `Kelas ${t.class_name || '-'}` : '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setTeacherForm({
                                    id: t.id,
                                    nip: t.nip,
                                    name: t.name,
                                    password: '123',
                                    subject: t.subject || 'Pendidikan Karakter',
                                    is_walas: tWalas,
                                    is_wali: tWali,
                                    is_tim_7_kaih: tTim,
                                    class_name: t.class_name || 'X-1',
                                    is_demo: t.is_demo ? 1 : 0,
                                  });
                                  setTeacherModalOpen(true);
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                                title="Edit Guru"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTeacher(t.id)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg cursor-pointer"
                                title="Hapus Guru"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Teacher Create / Edit Modal */}
              {teacherModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-base text-slate-900">
                        {teacherForm.id ? 'Edit Data Guru & Penugasan' : 'Tambah Guru Baru'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setTeacherModalOpen(false)}
                        className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleSaveTeacher} className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">NIP Guru</label>
                          <input
                            type="text"
                            value={teacherForm.nip}
                            onChange={(e) => setTeacherForm({ ...teacherForm, nip: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                            required
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Password</label>
                          <input
                            type="password"
                            value={teacherForm.password}
                            onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Guru</label>
                        <input
                          type="text"
                          value={teacherForm.name}
                          onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                          required
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Mata Pelajaran</label>
                        <input
                          type="text"
                          value={teacherForm.subject}
                          onChange={(e) => setTeacherForm({ ...teacherForm, subject: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200"
                        />
                      </div>

                      {/* Checkbox Roles (Multi-Role) */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <label className="block font-extrabold text-slate-800">
                          Wewenang / Penugasan Guru (Bisa pilih 2 atau lebih):
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <label className="flex items-center gap-2 font-bold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(teacherForm.is_walas)}
                              onChange={(e) =>
                                setTeacherForm({
                                  ...teacherForm,
                                  is_walas: e.target.checked,
                                  class_name: e.target.checked ? teacherForm.class_name || 'X-1' : '',
                                })
                              }
                              className="w-4 h-4 text-emerald-600 rounded"
                            />
                            <span>Wali Kelas</span>
                          </label>

                          <label className="flex items-center gap-2 font-bold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(teacherForm.is_wali)}
                              onChange={(e) =>
                                setTeacherForm({ ...teacherForm, is_wali: e.target.checked })
                              }
                              className="w-4 h-4 text-purple-600 rounded"
                            />
                            <span>Guru Wali</span>
                          </label>

                          <label className="flex items-center gap-2 font-bold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(teacherForm.is_tim_7_kaih)}
                              onChange={(e) =>
                                setTeacherForm({ ...teacherForm, is_tim_7_kaih: e.target.checked })
                              }
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span>Tim 7 KAIH</span>
                          </label>
                        </div>
                      </div>

                      {/* Kelas Binaan Walas Dropdown (Enabled ONLY when Walas is checked) */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Kelas Binaan Walas: {!teacherForm.is_walas && <span className="text-slate-400 font-normal">(Centang Walas untuk memilih)</span>}
                        </label>
                        <select
                          value={teacherForm.class_name || ''}
                          disabled={!teacherForm.is_walas}
                          onChange={(e) => setTeacherForm({ ...teacherForm, class_name: e.target.value })}
                          className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                            teacherForm.is_walas
                              ? 'bg-white border-emerald-300 text-slate-900 cursor-pointer'
                              : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <option value="">-- Pilih Kelas Binaan --</option>
                          {classesRombelsData.classes.map((c) => (
                            <option key={c.id || c.name} value={c.name}>
                              Kelas {c.name} {c.walas_name && c.walas_name !== teacherForm.name ? `(Walas: ${c.walas_name})` : '(Tersedia)'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setTeacherModalOpen(false)}
                          className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer"
                        >
                          Simpan Data Guru
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: MASTER KELAS & GURU WALI (FULL CRUD) */}
          {activeTab === 'classes_rombels' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Master Data Kelas &amp; Guru Wali
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Input, edit, dan hapus kelas serta kelompok penugasan Guru Wali sekolah.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Master Kelas */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-slate-900">
                      Master Kelas SMAN 28 ({classesRombelsData.classes.length})
                    </h3>
                  </div>

                  <form onSubmit={handleSaveClass} className="flex gap-2 text-xs">
                    <input
                      type="text"
                      value={newClassForm.name}
                      onChange={(e) => setNewClassForm({ ...newClassForm, name: e.target.value })}
                      placeholder="Nama Kelas (mis. X-5)"
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 font-bold"
                      required
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shrink-0"
                    >
                      + Tambah Kelas
                    </button>
                  </form>

                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Nama Kelas</th>
                          <th className="py-2.5 px-3">Guru Walas</th>
                          <th className="py-2.5 px-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classesRombelsData.classes.map((c) => (
                          <tr key={c.id || c.name}>
                            <td className="py-2.5 px-3 font-bold text-slate-900">Kelas {c.name}</td>
                            <td className="py-2.5 px-3 text-slate-600">{c.walas_name || 'Belum ada Walas'}</td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteClass(c.id)}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                title="Hapus Kelas"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Master Guru Wali */}
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-slate-900">
                      Master Penugasan Guru Wali ({classesRombelsData.rombels.length})
                    </h3>
                  </div>

                  <form onSubmit={handleSaveRombel} className="space-y-2 text-xs">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newRombelForm.name}
                        onChange={(e) => setNewRombelForm({ ...newRombelForm, name: e.target.value })}
                        placeholder="Nama Kelompok (mis. Wali Kelas X-A)"
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 font-bold"
                        required
                      />
                      <input
                        type="text"
                        value={newRombelForm.wali_name}
                        onChange={(e) => setNewRombelForm({ ...newRombelForm, wali_name: e.target.value })}
                        placeholder="Nama Guru Wali"
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer"
                    >
                      + Tambah Guru Wali
                    </button>
                  </form>

                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Kelompok / Guru Wali</th>
                          <th className="py-2.5 px-3">Nama Guru</th>
                          <th className="py-2.5 px-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classesRombelsData.rombels.map((r) => (
                          <tr key={r.id || r.name}>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{r.name}</td>
                            <td className="py-2.5 px-3 text-slate-600">{r.wali_name}</td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteRombel(r.id)}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                title="Hapus Guru Wali"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: DATABASE JURNAL & KOREKSI AUDIT */}
          {activeTab === 'journals' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Database Nilai Jurnal &amp; Koreksi Terkontrol
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Audit rincian skor, alasan koreksi nilai wajib tercatat secara transparan.
                </p>
              </div>

              {/* Correction Inline Form */}
              {editingJournal && (
                <div className="bg-white rounded-3xl p-6 border-2 border-amber-300 shadow-md space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        Formulir Koreksi Nilai Jurnal
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 mt-1">
                        Koreksi: {editingJournal.student_name} ({editingJournal.habit_title} • {editingJournal.log_date})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Skor Saat Ini: <strong>{editingJournal.final_score}</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingJournal(null)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>

                  <form onSubmit={handleCorrectJournal} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Nilai Baru (0 - 100):
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={newJournalScore}
                        onChange={(e) => setNewJournalScore(Number(e.target.value))}
                        className="w-36 px-3 py-2 rounded-xl border border-slate-200 font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Alasan Koreksi Audit (Wajib Diisi):
                      </label>
                      <textarea
                        rows={2}
                        value={correctionReason}
                        onChange={(e) => setCorrectionReason(e.target.value)}
                        placeholder="Contoh: Bukti foto dan laporan Guru Wali menunjukkan aktivitas valid."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
                      >
                        Simpan Koreksi Nilai
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingJournal(null)}
                        className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                      >
                        Tutup
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Journals Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase">
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">Kebiasaan</th>
                      <th className="py-3 px-4 text-center">Skor Akhir</th>
                      <th className="py-3 px-4">Audit Koreksi</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {journalsList.slice(0, 30).map((j) => (
                      <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">{j.log_date}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div>{j.student_name}</div>
                          <span className="text-[10px] text-slate-400 font-normal">{j.class_name}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-semibold">{j.habit_title}</td>
                        <td className="py-3 px-4 text-center font-black text-blue-700">{j.final_score}</td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {j.correction_reason ? (
                            <span className="text-amber-700 italic">
                              "{j.correction_reason}" oleh {j.corrected_by}
                            </span>
                          ) : (
                            <span className="text-slate-400">Belum ada koreksi</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingJournal(j);
                              setNewJournalScore(j.final_score);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            Koreksi
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: KELOLA LAMAN DEMO */}
          {activeTab === 'demo_manage' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 bg-purple-100 px-2 py-0.5 rounded-full">
                      Manajemen Portal Demo
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Kelola Laman Demo &amp; Akun Simulasi (/demo)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Laman demo adalah portal mandiri untuk pengujian tanggal, waktu, dan pengisian cepat instan.
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href="/demo"
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Buka Laman Demo (/demo)</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleResetDemoData}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Reset Data Demo</span>
                  </button>
                </div>
              </div>

              {/* Demo Accounts List */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Daftar Akun yang Diberi Label Demo (Muncul di /demo)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Akun bertanda "Demo" dapat digunakan untuk login 1-klik di laman demo tanpa password.
                  </p>
                </div>

                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase">
                      <th className="py-3 px-4">Nama Pengguna</th>
                      <th className="py-3 px-4">Peran (Role)</th>
                      <th className="py-3 px-4">Username / NISN</th>
                      <th className="py-3 px-4 text-center">Status Demo</th>
                      <th className="py-3 px-4 text-center">Aksi Toggle Demo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {adminStudents
                      .filter((s) => s.is_demo)
                      .map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                          <td className="py-3 px-4 text-slate-600">Siswa ({s.class_name})</td>
                          <td className="py-3 px-4 font-mono">{s.nisn}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                              Demo Siswa
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleDemoAccount(s.id)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer"
                            >
                              Ubah Status
                            </button>
                          </td>
                        </tr>
                      ))}
                    {adminTeachers
                      .filter((t) => t.is_demo)
                      .map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-900">{t.name}</td>
                          <td className="py-3 px-4 text-slate-600">Guru</td>
                          <td className="py-3 px-4 font-mono">{t.nip}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              Demo Guru
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleDemoAccount(t.id)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer"
                            >
                              Ubah Status
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 9: PENGUMUMAN & QUOTES */}
          {activeTab === 'announcements' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Pengumuman &amp; Kata Bijak (Quotes) Jawara 28
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kelola kata mutiara pembangkit semangat karakter dan pengumuman sekolah.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAnnouncementForm({
                      id: '',
                      type: 'QUOTE',
                      title: 'Kata Mutiara 7 KAIH',
                      content: '',
                      author: 'SMAN 28 Jakarta',
                    });
                    setAnnouncementModalOpen(true);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Pengumuman</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {announcementsList.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full">
                          {ann.type}
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setAnnouncementForm({
                                id: ann.id,
                                type: ann.type,
                                title: ann.title,
                                content: ann.content,
                                author: ann.author || '',
                              });
                              setAnnouncementModalOpen(true);
                            }}
                            className="p-1 text-slate-500 hover:text-slate-800 rounded cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAnnouncement(ann.id)}
                            className="p-1 text-rose-500 hover:text-rose-800 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 mt-2">{ann.title}</h4>
                      <p className="text-xs text-slate-600 italic mt-1">"{ann.content}"</p>
                    </div>
                    {ann.author && (
                      <span className="text-[10px] font-bold text-slate-400 block text-right pt-2 border-t border-slate-100">
                        Oleh: {ann.author}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Announcement Modal */}
              {announcementModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-base text-slate-900">
                        {announcementForm.id ? 'Edit Pengumuman' : 'Tambah Pengumuman Baru'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setAnnouncementModalOpen(false)}
                        className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleSaveAnnouncement} className="space-y-3 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Tipe</label>
                        <select
                          value={announcementForm.type}
                          onChange={(e) =>
                            setAnnouncementForm({
                              ...announcementForm,
                              type: e.target.value as 'ANNOUNCEMENT' | 'QUOTE',
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                        >
                          <option value="QUOTE">Kata Bijak (Quote)</option>
                          <option value="ANNOUNCEMENT">Pengumuman Resmi</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Judul</label>
                        <input
                          type="text"
                          value={announcementForm.title}
                          onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                          required
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Isi Pesan / Kutipan</label>
                        <textarea
                          rows={4}
                          value={announcementForm.content}
                          onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200"
                          required
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Penulis / Tokoh</label>
                        <input
                          type="text"
                          value={announcementForm.author}
                          onChange={(e) => setAnnouncementForm({ ...announcementForm, author: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200"
                        />
                      </div>

                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setAnnouncementModalOpen(false)}
                          className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer"
                        >
                          Simpan
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
};
