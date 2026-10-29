/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  FastForward,
  CheckCircle2,
  Trash2,
  Clock,
  ArrowRight,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { Student, Teacher } from './types';
import { api } from './utils/api';
import { PublicDashboard } from './components/public/PublicDashboard';
import { LoginPage } from './components/auth/LoginPage';
import { StudentDashboard } from './components/student/StudentDashboard';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { StudentReportModal } from './components/common/StudentReportModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { applyTheme, getSavedTheme } from './config/themeConfig';

type AppView =
  | 'public'
  | 'login'
  | 'admin_login'
  | 'demo_login'
  | 'student'
  | 'teacher'
  | 'admin';

export default function App() {
  const getInitialRoute = (): { view: AppView; isDemo: boolean; rememberedUser?: any } => {
    if (typeof window === 'undefined') return { view: 'public', isDemo: false };
    const pathname = window.location.pathname;
    const hash = window.location.hash;

    const isAdmin = pathname === '/admin' || pathname.startsWith('/admin') || hash === '#/admin';
    const isDemo = pathname === '/demo' || pathname.startsWith('/demo') || hash === '#/demo';
    const isApp = pathname === '/app' || pathname.startsWith('/app') || hash === '#/app';

    try {
      const saved = localStorage.getItem('jawara28_remember_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.token) {
          api.setAuthToken(parsed.token);
        }
        if (isAdmin) {
          if (parsed.role === 'admin' || parsed.data?.assignment_type === 'ADMIN') {
            return { view: 'admin', isDemo: false, rememberedUser: parsed.data };
          }
          return { view: 'admin_login', isDemo: false };
        }
        if (isDemo) {
          if (parsed.role === 'siswa') return { view: 'student', isDemo: true, rememberedUser: parsed.data };
          if (parsed.role === 'guru') return { view: 'teacher', isDemo: true, rememberedUser: parsed.data };
          if (parsed.role === 'admin') return { view: 'admin', isDemo: true, rememberedUser: parsed.data };
          return { view: 'demo_login', isDemo: true };
        }
        if (isApp) {
          if (parsed.role === 'siswa') return { view: 'student', isDemo: false, rememberedUser: parsed.data };
          if (parsed.role === 'guru') return { view: 'teacher', isDemo: false, rememberedUser: parsed.data };
          if (parsed.role === 'admin') return { view: 'admin', isDemo: false, rememberedUser: parsed.data };
          return { view: 'login', isDemo: false };
        }
      }
    } catch {
      // ignore JSON parse error
    }

    if (isAdmin) return { view: 'admin_login', isDemo: false };
    if (isDemo) return { view: 'demo_login', isDemo: true };
    if (isApp) return { view: 'login', isDemo: false };
    return { view: 'public', isDemo: false };
  };

  const initialInfo = getInitialRoute();
  const [currentView, setCurrentView] = useState<AppView>(initialInfo.view);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(initialInfo.isDemo);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  // Active authenticated user
  const [currentStudent, setCurrentStudent] = useState<Student | null>(() =>
    initialInfo.view === 'student' ? initialInfo.rememberedUser : null
  );
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(() =>
    initialInfo.view === 'teacher' ? initialInfo.rememberedUser : null
  );
  const [currentAdmin, setCurrentAdmin] = useState<Teacher | null>(() =>
    initialInfo.view === 'admin' ? initialInfo.rememberedUser : null
  );

  // Global report modal (can be opened from any view)
  const [openedReportStudentId, setOpenedReportStudentId] = useState<string | null>(null);

  // Demo Simulation State
  const [serverTodayDate, setServerTodayDate] = useState<string>('');
  const [demoActionLoading, setDemoActionLoading] = useState(false);

  const loadData = async () => {
    try {
      const [stList, tchList, todayInfo] = await Promise.all([
        api.getStudents(),
        api.getTeachers(),
        api.getTodayInfo().catch(() => ({
          todayDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()),
        })),
      ]);
      setStudents(stList);
      setTeachers(tchList);
      if (todayInfo?.todayDate) {
        setServerTodayDate(todayInfo.todayDate);
      }

      // Restore or match updated student data from DB
      const savedSession = localStorage.getItem('jawara28_remember_session');
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          if (parsed.role === 'siswa' && parsed.data?.id) {
            const found = stList.find((s) => s.id === parsed.data.id);
            if (found) setCurrentStudent(found);
          } else if (parsed.role === 'guru' && parsed.data?.id) {
            const found = tchList.find((t) => t.id === parsed.data.id);
            if (found) setCurrentTeacher(found);
          } else if (parsed.role === 'admin' && parsed.data?.id) {
            const found = tchList.find((t) => t.id === parsed.data.id);
            if (found) setCurrentAdmin(found);
          }
        } catch {
          // ignore
        }
      }
    } catch (e) {
      console.error('Failed to load school data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyTheme(getSavedTheme().hex);
    loadData();

    const handlePopState = () => {
      const info = getInitialRoute();
      setCurrentView(info.view);
      setIsDemoMode(info.isDemo);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (view: AppView, path: string, demo: boolean = false) => {
    try {
      window.history.pushState({}, '', path);
    } catch {
      window.location.hash = `#${path}`;
    }
    setCurrentView(view);
    setIsDemoMode(demo);
  };

  const handleStudentLogin = (s: Student) => {
    setCurrentStudent(s);
    setCurrentView('student');
    if (!isDemoMode) {
      try {
        window.history.pushState({}, '', '/app');
      } catch {}
    }
  };

  const handleTeacherLogin = (t: Teacher) => {
    setCurrentTeacher(t);
    setCurrentView('teacher');
    if (!isDemoMode) {
      try {
        window.history.pushState({}, '', '/app');
      } catch {}
    }
  };

  const handleAdminLogin = (a: Teacher) => {
    setCurrentAdmin(a);
    setCurrentView('admin');
    if (!isDemoMode) {
      try {
        window.history.pushState({}, '', '/admin');
      } catch {}
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jawara28_remember_session');
    api.setAuthToken('');
    setCurrentStudent(null);
    setCurrentTeacher(null);
    setCurrentAdmin(null);

    if (isDemoMode) {
      navigateTo('demo_login', '/demo', true);
    } else if (currentView === 'admin' || window.location.pathname.startsWith('/admin')) {
      navigateTo('admin_login', '/admin', false);
    } else {
      navigateTo('login', '/app', false);
    }
    loadData();
  };

  // Demo Simulation Actions
  const handleNextDayDemo = async () => {
    try {
      setDemoActionLoading(true);
      const res = await api.nextDayDemo();
      if (res?.date) {
        setServerTodayDate(res.date);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal memajukan hari demo');
    } finally {
      setDemoActionLoading(false);
    }
  };

  const handleSetDemoDate = async (newDate: string) => {
    if (!newDate) return;
    try {
      setDemoActionLoading(true);
      await api.setDemoDate(newDate);
      setServerTodayDate(newDate);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah tanggal demo');
    } finally {
      setDemoActionLoading(false);
    }
  };

  const handleFillAll100Demo = async () => {
    if (!currentStudent) return;
    try {
      setDemoActionLoading(true);
      await api.fillAll100Demo(currentStudent.id);
      await loadData();
      alert(`Berhasil mengisi 7 kebiasaan 100% untuk ${currentStudent.name}!`);
    } catch (err: any) {
      alert(err.message || 'Gagal mengisi instan');
    } finally {
      setDemoActionLoading(false);
    }
  };

  const handleResetDemo = async () => {
    if (!confirm('Reset semua data demo dan tanggal ke awal?')) return;
    try {
      setDemoActionLoading(true);
      await api.resetDemoData();
      await loadData();
      alert('Data demo berhasil di-reset!');
    } catch (err: any) {
      alert(err.message || 'Gagal reset data demo');
    } finally {
      setDemoActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-kebaya-pattern flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4 max-w-sm w-full">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1c5ddc] to-[#0000fe] text-white flex items-center justify-center font-black text-xl mx-auto shadow-md">
            28
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              VERTIKAL SMA JAWARA 28
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Menyiapkan Sistem Pemantauan 7 KAIH SMAN 28 Jakarta...
            </p>
          </div>
          <div className="w-6 h-6 border-2 border-[#1c5ddc] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={`min-h-screen ${isDemoMode && currentView !== 'demo_login' ? 'pb-24' : ''}`}>
        {/* VIEW 1: PUBLIC LANDING PAGE ( / ) */}
        {currentView === 'public' && (
          <PublicDashboard
            students={students}
            onGoToLogin={() => navigateTo('login', '/app', false)}
            onGoToDemo={() => navigateTo('demo_login', '/demo', true)}
            onGoToAdmin={() => navigateTo('admin_login', '/admin', false)}
            onOpenReport={(id) => setOpenedReportStudentId(id)}
          />
        )}

        {/* VIEW 2: PRODUCTION LOGIN ( /app - CLEAN, NO DEMO LABELS/BUTTONS ) */}
        {currentView === 'login' && (
          <LoginPage
            students={students}
            teachers={teachers}
            isAdminLogin={false}
            isDemoMode={false}
            onLoginStudent={handleStudentLogin}
            onLoginTeacher={handleTeacherLogin}
            onLoginAdmin={handleAdminLogin}
            onSwitchToAdminLogin={() => navigateTo('admin_login', '/admin', false)}
            onBackToPublic={() => navigateTo('public', '/', false)}
          />
        )}

        {/* VIEW 3: ADMIN LOGIN ( /admin ) */}
        {currentView === 'admin_login' && (
          <LoginPage
            students={students}
            teachers={teachers}
            isAdminLogin={true}
            isDemoMode={false}
            onLoginStudent={handleStudentLogin}
            onLoginTeacher={handleTeacherLogin}
            onLoginAdmin={handleAdminLogin}
            onSwitchToMainLogin={() => navigateTo('login', '/app', false)}
            onBackToPublic={() => navigateTo('public', '/', false)}
          />
        )}

        {/* VIEW 4: DEMO PORTAL LOGIN ( /demo - WITH 1-CLICK DEMO ACCOUNTS ) */}
        {currentView === 'demo_login' && (
          <LoginPage
            students={students}
            teachers={teachers}
            isAdminLogin={false}
            isDemoMode={true}
            onLoginStudent={handleStudentLogin}
            onLoginTeacher={handleTeacherLogin}
            onLoginAdmin={handleAdminLogin}
            onSwitchToAdminLogin={() => navigateTo('admin_login', '/admin', false)}
            onBackToPublic={() => navigateTo('public', '/', false)}
          />
        )}

        {/* VIEW 5: LOGGED IN STUDENT DASHBOARD */}
        {currentView === 'student' && currentStudent && (
          <StudentDashboard
            student={currentStudent}
            allStudents={students}
            onLogout={handleLogout}
            onOpenReport={(id) => setOpenedReportStudentId(id)}
          />
        )}

        {/* VIEW 6: LOGGED IN TEACHER DASHBOARD */}
        {currentView === 'teacher' && currentTeacher && (
          <TeacherDashboard
            teacher={currentTeacher}
            allStudents={students}
            onLogout={handleLogout}
            onRefreshStudents={loadData}
          />
        )}

        {/* VIEW 7: LOGGED IN ADMIN DASHBOARD */}
        {currentView === 'admin' && currentAdmin && (
          <AdminDashboard
            admin={currentAdmin}
            allStudents={students}
            onLogout={handleLogout}
            onRefreshStudents={loadData}
          />
        )}

        {/* STICKY FLOATING DEMO CONTROL TOOLBAR (ACTIVE ON /demo WHEN LOGGED IN) */}
        {isDemoMode && currentView !== 'demo_login' && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md text-white border-t border-purple-500/50 shadow-2xl py-3 px-4 sm:px-8">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
                <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm tracking-tight text-purple-200">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>PORTAL DEMO &amp; SIMULATOR TANGGAL JAWARA 28</span>
                </div>
                <span className="text-[11px] font-mono bg-purple-900/60 border border-purple-400/40 text-purple-200 px-2.5 py-0.5 rounded-full font-bold">
                  {serverTodayDate || '...'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Date Picker */}
                <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={serverTodayDate}
                    onChange={(e) => handleSetDemoDate(e.target.value)}
                    className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
                  />
                </div>

                {/* Next Day */}
                <button
                  type="button"
                  disabled={demoActionLoading}
                  onClick={handleNextDayDemo}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 font-extrabold text-white cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  title="Majukan server 1 hari ke depan"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span>Maju 1 Hari</span>
                </button>

                {/* Instant Fill 100% (If Student is logged in) */}
                {currentView === 'student' && (
                  <button
                    type="button"
                    disabled={demoActionLoading}
                    onClick={handleFillAll100Demo}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-extrabold text-white cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                    title="Isi instan 7 kebiasaan nilai 100 untuk hari ini"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Isi 100% Hari Ini</span>
                  </button>
                )}

                {/* Reset Demo */}
                <button
                  type="button"
                  disabled={demoActionLoading}
                  onClick={handleResetDemo}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white border border-slate-700 font-bold cursor-pointer flex items-center gap-1.5"
                  title="Reset database demo ke tanggal awal"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset Demo</span>
                </button>

                {/* Exit Demo */}
                <button
                  type="button"
                  onClick={() => navigateTo('public', '/', false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold cursor-pointer"
                >
                  Keluar Demo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Student Report Inspection Modal */}
        {openedReportStudentId && (
          <StudentReportModal
            studentId={openedReportStudentId}
            canEditNotes={currentView === 'teacher' || currentView === 'admin'}
            onClose={() => {
              setOpenedReportStudentId(null);
              loadData();
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
