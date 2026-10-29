/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Analytics, Individual Reports, Leaderboard, Validations & Settings Service — VERTIKAL SMA JAWARA 28
 * Optimized with bulk SQL aggregations (zero N+1 queries) to scale smoothly to 750+ students.
 */

import crypto from 'node:crypto';
import { RelationalDatabase } from '../../database/client.ts';
import { VALID_HABIT_CODES } from '../../shared/schemas/validation-schemas.ts';
import type { HabitCode } from '../../shared/schemas/validation-schemas.ts';
import { NotFoundError, ValidationError } from '../../shared/errors/app-error.ts';
import { StreaksService, computePredicate } from '../streaks/streaks.service.ts';
import { JournalsService } from '../journals/journals.service.ts';
import { AuditService } from '../audit/audit.service.ts';
import type { AuthSessionContext } from '../auth/auth.service.ts';

const HABIT_LABELS: Record<HabitCode, string> = {
  bangun: 'Bangun Pagi',
  ibadah: 'Beribadah',
  olahraga: 'Berolahraga',
  makan: 'Makan Bergizi',
  belajar: 'Gemar Belajar',
  masyarakat: 'Bermasyarakat',
  tidur: 'Tidur Cepat',
};

export class AnalyticsReportsService {
  private readonly db: RelationalDatabase;
  private readonly streaks: StreaksService;
  private readonly journals: JournalsService;
  private readonly audit: AuditService;

  constructor(db: RelationalDatabase) {
    this.db = db;
    this.streaks = new StreaksService(db);
    this.journals = new JournalsService(db);
    this.audit = new AuditService(db);
  }

  /**
   * Computes Individual Student Report (Rapor 7 KAIH) comparing Student vs Class vs School averages.
   */
  public getStudentReport(studentId: string) {
    const student = this.db.queryOne<any>(
      `SELECT s.*, u.username
       FROM students s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
      [studentId]
    );
    if (!student) {
      throw new NotFoundError(`Siswa '${studentId}' tidak ditemukan.`);
    }

    // 1. Student averages per habit
    const studentHabitRows = this.db.queryAll<{ habit_code: HabitCode; cnt: number; avg_score: number }>(
      `SELECT habit_code, COUNT(*) AS cnt, ROUND(AVG(final_score), 1) AS avg_score
       FROM habit_entries
       WHERE student_id = ?
       GROUP BY habit_code`,
      [studentId]
    );
    const studentMap: Record<string, { cnt: number; avg: number }> = {};
    let totalEntries = 0;
    for (const r of studentHabitRows) {
      studentMap[r.habit_code] = { cnt: Number(r.cnt), avg: Number(r.avg_score) };
      totalEntries += Number(r.cnt);
    }

    // 2. Class averages per habit
    const classHabitRows = this.db.queryAll<{ habit_code: HabitCode; avg_score: number }>(
      `SELECT he.habit_code, ROUND(AVG(he.final_score), 1) AS avg_score
       FROM habit_entries he
       JOIN students s ON s.id = he.student_id
       WHERE s.class_name = ? AND s.account_status = 'ACTIVE'
       GROUP BY he.habit_code`,
      [student.class_name]
    );
    const classMap: Record<string, number> = {};
    for (const r of classHabitRows) classMap[r.habit_code] = Number(r.avg_score);

    // 3. School averages per habit (Index-only scan on idx_habit_entries_covering_habit_score)
    const schoolHabitRows = this.db.queryAll<{ habit_code: HabitCode; avg_score: number }>(
      `SELECT habit_code, ROUND(AVG(final_score), 1) AS avg_score
       FROM habit_entries
       GROUP BY habit_code`
    );
    const schoolMap: Record<string, number> = {};
    for (const r of schoolHabitRows) schoolMap[r.habit_code] = Number(r.avg_score);

    const habitMetrics = VALID_HABIT_CODES.map((h) => ({
      habit: h,
      label: HABIT_LABELS[h],
      studentScore: studentMap[h]?.avg ?? 0,
      classAvg: classMap[h] ?? 0,
      schoolAvg: schoolMap[h] ?? 0,
      count: studentMap[h]?.cnt ?? 0,
    }));

    const activeMetrics = habitMetrics.filter((m) => m.count > 0);
    const overallScore =
      activeMetrics.length > 0
        ? Math.round(
            (activeMetrics.reduce((acc, m) => acc + m.studentScore, 0) / activeMetrics.length) * 10
          ) / 10
        : 0;

    const activeDaysRow = this.db.queryOne<{ cnt: number }>(
      `SELECT COUNT(DISTINCT log_date) AS cnt FROM habit_entries WHERE student_id = ?`,
      [studentId]
    );

    const latestValidation = this.db.queryOne<{ verification_score: number }>(
      `SELECT verification_score FROM admin_validations WHERE student_id = ? ORDER BY id DESC LIMIT 1`,
      [studentId]
    );

    const rawRecent = this.db.queryAll<any>(
      `SELECT * FROM habit_entries WHERE student_id = ? ORDER BY log_date DESC, id DESC LIMIT 25`,
      [studentId]
    );

    return {
      student: {
        ...student,
        predicate: computePredicate(overallScore || 0),
      },
      habitMetrics,
      overallScore,
      poinHebat: Number(student.poin_hebat || 0),
      totalEntries,
      streak: Number(student.streak || 0),
      activeDays: Number(activeDaysRow?.cnt || 0),
      verification_score: latestValidation ? Number(latestValidation.verification_score) : null,
      recentLogs: rawRecent.map((r) => this.journals.formatEntryForClient(r)),
    };
  }

  /**
   * Computes Class Analytics (Wali Kelas Monitoring & Analytics) using bulk SQL queries.
   */
  public getClassAnalytics(className: string, filterDateStr: string | undefined, todayDateStr: string) {
    const targetDate = filterDateStr || todayDateStr;
    const cleanClassName = (className || '').trim().toLowerCase();
    const students = this.db.queryAll<any>(
      `SELECT s.*, u.username
       FROM students s
       JOIN users u ON u.id = s.user_id
       WHERE LOWER(TRIM(s.class_name)) = ? AND s.account_status = 'ACTIVE'
       ORDER BY s.xp DESC, s.name ASC`,
      [cleanClassName]
    );

    // Bulk load all entries on targetDate for this class
    const dateEntries = this.db.queryAll<any>(
      `SELECT he.*
       FROM habit_entries he
       JOIN students s ON s.id = he.student_id
       WHERE LOWER(TRIM(s.class_name)) = ? AND s.account_status = 'ACTIVE' AND he.log_date = ?`,
      [cleanClassName, targetDate]
    );
    const dateEntriesByStudent: Record<string, any[]> = {};
    for (const r of dateEntries) {
      if (!dateEntriesByStudent[r.student_id]) dateEntriesByStudent[r.student_id] = [];
      dateEntriesByStudent[r.student_id].push(r);
    }

    // Bulk load all-time habit averages per student in this class
    const studentHabitAvgs = this.db.queryAll<{
      student_id: string;
      habit_code: HabitCode;
      avg_score: number;
      cnt: number;
    }>(
      `SELECT he.student_id, he.habit_code, ROUND(AVG(he.final_score), 1) AS avg_score, COUNT(*) AS cnt
       FROM habit_entries he
       JOIN students s ON s.id = he.student_id
       WHERE LOWER(TRIM(s.class_name)) = ? AND s.account_status = 'ACTIVE'
       GROUP BY he.student_id, he.habit_code`,
      [cleanClassName]
    );

    const studentHabitMap: Record<string, Record<string, number>> = {};
    const studentTotalLogsMap: Record<string, number> = {};
    const habitSumAcrossClass: Record<HabitCode, { sum: number; count: number }> = {
      bangun: { sum: 0, count: 0 },
      ibadah: { sum: 0, count: 0 },
      olahraga: { sum: 0, count: 0 },
      makan: { sum: 0, count: 0 },
      belajar: { sum: 0, count: 0 },
      masyarakat: { sum: 0, count: 0 },
      tidur: { sum: 0, count: 0 },
    };

    for (const row of studentHabitAvgs) {
      if (!studentHabitMap[row.student_id]) studentHabitMap[row.student_id] = {};
      studentHabitMap[row.student_id][row.habit_code] = Number(row.avg_score);
      studentTotalLogsMap[row.student_id] =
        (studentTotalLogsMap[row.student_id] || 0) + Number(row.cnt);
      if (habitSumAcrossClass[row.habit_code]) {
        habitSumAcrossClass[row.habit_code].sum += Number(row.avg_score);
        habitSumAcrossClass[row.habit_code].count += 1;
      }
    }

    let participatingCount = 0;
    const statusSummary = { selesai: 0, sedangDiisi: 0, belumDimulai: 0, terlewat: 0 };

    const enrichedStudents = students.map((st) => {
      const dayEval = this.streaks.evaluateStudentDay(
        st.id,
        targetDate,
        todayDateStr,
        dateEntriesByStudent[st.id] || []
      );

      if (dayEval.completedCount > 0 || dayEval.inProgressHabits.length > 0) {
        participatingCount++;
      }
      if (dayEval.overallDayStatus === 'SELESAI') statusSummary.selesai++;
      else if (dayEval.overallDayStatus === 'SEDANG_DIISI') statusSummary.sedangDiisi++;
      else if (dayEval.overallDayStatus === 'BELUM_DIISI_TERLEWAT') statusSummary.terlewat++;
      else statusSummary.belumDimulai++;

      const hScores = studentHabitMap[st.id] || {};
      const hValues = Object.values(hScores);
      const avgScore =
        st.avg_score !== undefined && st.avg_score !== null
          ? Number(st.avg_score)
          : (hValues.length > 0
              ? Math.round((hValues.reduce((a, b) => a + b, 0) / hValues.length) * 10) / 10
              : 0);

      return {
        ...st,
        avgScore,
        avg_score: avgScore,
        poin_hebat: st.poin_hebat || 0,
        todayCount: dayEval.completedCount,
        today_entries: dayEval.completedCount,
        today_completed_habits: dayEval.completedCount,
        todayHabitsDone: dayEval.completedHabits,
        todayHabitStatuses: dayEval.habitStatuses,
        todayStatus: dayEval.overallDayStatus,
        today_status: dayEval.overallDayStatus,
        todayScore: dayEval.dailyAverageScore,
        totalLogs: studentTotalLogsMap[st.id] || 0,
        habitScores: {
          bangun: hScores.bangun || 0,
          ibadah: hScores.ibadah || 0,
          olahraga: hScores.olahraga || 0,
          makan: hScores.makan || 0,
          belajar: hScores.belajar || 0,
          masyarakat: hScores.masyarakat || 0,
          tidur: hScores.tidur || 0,
        },
      };
    });

    const classRadar = VALID_HABIT_CODES.map((h) => ({
      habit: h,
      label: HABIT_LABELS[h],
      avg_score:
        habitSumAcrossClass[h].count > 0
          ? Math.round((habitSumAcrossClass[h].sum / habitSumAcrossClass[h].count) * 10) / 10
          : 0,
      average:
        habitSumAcrossClass[h].count > 0
          ? Math.round((habitSumAcrossClass[h].sum / habitSumAcrossClass[h].count) * 10) / 10
          : 0,
    }));

    const habitAverages = classRadar;

    const distribution = {
      under70: 0,
      between70_79: 0,
      between80_89: 0,
      between90_95: 0,
      between96_100: 0,
      noData: 0,
    };
    let totalScoreSum = 0;
    let studentsWithScores = 0;
    for (const st of enrichedStudents) {
      const sc = Number(st.avg_score || st.avgScore || 0);
      if (sc <= 0) {
        distribution.noData++;
      } else {
        totalScoreSum += sc;
        studentsWithScores++;
        if (sc < 70) distribution.under70++;
        else if (sc < 80) distribution.between70_79++;
        else if (sc < 90) distribution.between80_89++;
        else if (sc < 96) distribution.between90_95++;
        else distribution.between96_100++;
      }
    }

    const classAverage =
      studentsWithScores > 0
        ? Math.round((totalScoreSum / studentsWithScores) * 10) / 10
        : 0;

    const participationRate =
      students.length > 0 ? Math.round((participatingCount / students.length) * 100) : 0;

    return {
      className,
      studentCount: students.length,
      totalStudents: students.length,
      participatingCount,
      participatingToday: participatingCount,
      classAverage,
      completionPercentage: participationRate,
      participationRate,
      statusSummary,
      distribution,
      classRadar,
      habitAverages,
      filterDate: targetDate,
      students: enrichedStudents,
    };
  }

  /**
   * Computes Rombel / Guru Wali Analytics using bulk SQL queries.
   */
  public getRombelAnalytics(rombelOrWaliName: string, days: number, todayDateStr: string) {
    const clampedDays = Math.min(30, Math.max(7, Number(days || 14)));
    const cleanName = (rombelOrWaliName || '').trim().toLowerCase();
    const students = this.db.queryAll<any>(
      `SELECT s.*, u.username
       FROM students s
       JOIN users u ON u.id = s.user_id
       WHERE (LOWER(TRIM(COALESCE(s.rombel_name, ''))) = ? OR LOWER(TRIM(COALESCE(s.wali_name, ''))) = ? OR LOWER(TRIM(COALESCE(s.wali_id, ''))) = ?) AND s.account_status = 'ACTIVE'
       ORDER BY s.xp DESC, s.name ASC`,
      [cleanName, cleanName, cleanName]
    );

    const todayEntries = this.db.queryAll<any>(
      `SELECT he.*
       FROM habit_entries he
       JOIN students s ON s.id = he.student_id
       WHERE (LOWER(TRIM(COALESCE(s.rombel_name, ''))) = ? OR LOWER(TRIM(COALESCE(s.wali_name, ''))) = ? OR LOWER(TRIM(COALESCE(s.wali_id, ''))) = ?) AND s.account_status = 'ACTIVE' AND he.log_date = ?`,
      [cleanName, cleanName, cleanName, todayDateStr]
    );
    const todayByStudent: Record<string, any[]> = {};
    for (const r of todayEntries) {
      if (!todayByStudent[r.student_id]) todayByStudent[r.student_id] = [];
      todayByStudent[r.student_id].push(r);
    }

    const studentHabitAvgs = this.db.queryAll<{
      student_id: string;
      habit_code: HabitCode;
      avg_score: number;
      cnt: number;
    }>(
      `SELECT he.student_id, he.habit_code, ROUND(AVG(he.final_score), 1) AS avg_score, COUNT(*) AS cnt
       FROM habit_entries he
       JOIN students s ON s.id = he.student_id
       WHERE (LOWER(TRIM(COALESCE(s.rombel_name, ''))) = ? OR LOWER(TRIM(COALESCE(s.wali_name, ''))) = ? OR LOWER(TRIM(COALESCE(s.wali_id, ''))) = ?) AND s.account_status = 'ACTIVE'
       GROUP BY he.student_id, he.habit_code`,
      [cleanName, cleanName, cleanName]
    );

    const studentHabitMap: Record<string, Record<string, number>> = {};
    const studentTotalLogsMap: Record<string, number> = {};
    const habitSumAcrossRombel: Record<HabitCode, { sum: number; count: number }> = {
      bangun: { sum: 0, count: 0 },
      ibadah: { sum: 0, count: 0 },
      olahraga: { sum: 0, count: 0 },
      makan: { sum: 0, count: 0 },
      belajar: { sum: 0, count: 0 },
      masyarakat: { sum: 0, count: 0 },
      tidur: { sum: 0, count: 0 },
    };

    for (const row of studentHabitAvgs) {
      if (!studentHabitMap[row.student_id]) studentHabitMap[row.student_id] = {};
      studentHabitMap[row.student_id][row.habit_code] = Number(row.avg_score);
      studentTotalLogsMap[row.student_id] =
        (studentTotalLogsMap[row.student_id] || 0) + Number(row.cnt);
      if (habitSumAcrossRombel[row.habit_code]) {
        habitSumAcrossRombel[row.habit_code].sum += Number(row.avg_score);
        habitSumAcrossRombel[row.habit_code].count += 1;
      }
    }

    let participatingToday = 0;
    const enrichedStudents = students.map((st) => {
      const dayEval = this.streaks.evaluateStudentDay(
        st.id,
        todayDateStr,
        todayDateStr,
        todayByStudent[st.id] || []
      );
      if (dayEval.completedCount > 0 || dayEval.inProgressHabits.length > 0) {
        participatingToday++;
      }

      const hScores = studentHabitMap[st.id] || {};
      const hValues = Object.values(hScores);
      const avgScore =
        st.avg_score !== undefined && st.avg_score !== null
          ? Number(st.avg_score)
          : (hValues.length > 0
              ? Math.round((hValues.reduce((a, b) => a + b, 0) / hValues.length) * 10) / 10
              : 0);

      return {
        ...st,
        avgScore,
        avg_score: avgScore,
        poin_hebat: st.poin_hebat || 0,
        todayCount: dayEval.completedCount,
        today_entries: dayEval.completedCount,
        today_completed_habits: dayEval.completedCount,
        todayStatus: dayEval.overallDayStatus,
        today_status: dayEval.overallDayStatus,
        todayHabitStatuses: dayEval.habitStatuses,
        totalLogs: studentTotalLogsMap[st.id] || 0,
        habitScores: {
          bangun: hScores.bangun || 0,
          ibadah: hScores.ibadah || 0,
          olahraga: hScores.olahraga || 0,
          makan: hScores.makan || 0,
          belajar: hScores.belajar || 0,
          masyarakat: hScores.masyarakat || 0,
          tidur: hScores.tidur || 0,
        },
      };
    });

    const rombelRadar = VALID_HABIT_CODES.map((h) => ({
      habit: h,
      label: HABIT_LABELS[h],
      avg_score:
        habitSumAcrossRombel[h].count > 0
          ? Math.round((habitSumAcrossRombel[h].sum / habitSumAcrossRombel[h].count) * 10) / 10
          : 0,
      average:
        habitSumAcrossRombel[h].count > 0
          ? Math.round((habitSumAcrossRombel[h].sum / habitSumAcrossRombel[h].count) * 10) / 10
          : 0,
    }));

    const distribution = {
      under70: 0,
      between70_79: 0,
      between80_89: 0,
      between90_95: 0,
      between96_100: 0,
      noData: 0,
    };
    let totalScoreSum = 0;
    let studentsWithScores = 0;
    for (const st of enrichedStudents) {
      const sc = Number(st.avg_score || st.avgScore || 0);
      if (sc <= 0) {
        distribution.noData++;
      } else {
        totalScoreSum += sc;
        studentsWithScores++;
        if (sc < 70) distribution.under70++;
        else if (sc < 80) distribution.between70_79++;
        else if (sc < 90) distribution.between80_89++;
        else if (sc < 96) distribution.between90_95++;
        else distribution.between96_100++;
      }
    }

    const rombelAverage =
      studentsWithScores > 0
        ? Math.round((totalScoreSum / studentsWithScores) * 10) / 10
        : 0;

    const participationRate =
      students.length > 0 ? Math.round((participatingToday / students.length) * 100) : 0;

    // Daily trend series for Rombel / Wali
    const dayNamesShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const baseDate = new Date(`${todayDateStr}T12:00:00Z`);
    const dateList: string[] = [];
    for (let i = clampedDays - 1; i >= 0; i--) {
      const d = new Date(baseDate.getTime() - i * 86400000);
      dateList.push(d.toISOString().split('T')[0]);
    }
    const minDate = dateList[0];

    const trendRows = this.db.queryAll<{
      log_date: string;
      avg_score: number;
      active_students: number;
    }>(
      `SELECT he.log_date,
              ROUND(AVG(he.final_score), 1) AS avg_score,
              COUNT(DISTINCT he.student_id) AS active_students
       FROM habit_entries he
       JOIN students s ON s.id = he.student_id
       WHERE (s.rombel_name = ? OR s.wali_name = ? OR s.wali_id = ?) AND s.account_status = 'ACTIVE'
         AND he.log_date >= ? AND he.log_date <= ?
       GROUP BY he.log_date`,
      [rombelOrWaliName, rombelOrWaliName, rombelOrWaliName, minDate, todayDateStr]
    );
    const trendMap: Record<string, { avg_score: number; active_students: number }> = {};
    for (const r of trendRows) trendMap[r.log_date] = r;

    const dailyTrend = dateList.map((dateStr) => {
      const d = new Date(`${dateStr}T12:00:00Z`);
      const t = trendMap[dateStr];
      return {
        date: dateStr,
        label: `${dayNamesShort[d.getUTCDay()]}, ${d.getUTCDate()} ${monthNamesShort[d.getUTCMonth()]}`,
        avgScore: Number(t?.avg_score || 0),
        avg_score: Number(t?.avg_score || 0),
        completion_pct: students.length > 0 ? Math.round((Number(t?.active_students || 0) / students.length) * 100) : 0,
        activeStudents: Number(t?.active_students || 0),
      };
    });

    return {
      rombelName: rombelOrWaliName,
      waliName: rombelOrWaliName,
      studentCount: students.length,
      totalStudents: students.length,
      participatingToday,
      participatingCount: participatingToday,
      participationRate,
      completionRate: participationRate,
      completionPercentage: participationRate,
      rombelAverage,
      waliAverage: rombelAverage,
      classAverage: rombelAverage,
      distribution,
      rombelRadar,
      waliRadar: rombelRadar,
      classRadar: rombelRadar,
      habitAverages: rombelRadar,
      dailyTrend,
      students: enrichedStudents,
    };
  }

  /**
   * Computes School-Wide & Cohort Analytics using fast bulk SQL queries.
   */
  public getSchoolAnalytics(todayDateStr: string) {
    const totalsRow = this.db.queryOne<{ total_students: number }>(
      `SELECT COUNT(*) AS total_students FROM students WHERE account_status = 'ACTIVE'`
    );
    const totalStudents = Number(totalsRow?.total_students || 0);

    const entriesStatRow = this.db.queryOne<{
      total_entries: number;
      participating_students: number;
    }>(
      `SELECT COUNT(*) AS total_entries,
              COUNT(DISTINCT student_id) AS participating_students
       FROM habit_entries`
    );
    const totalEntries = Number(entriesStatRow?.total_entries || 0);
    const participatingStudents = Number(entriesStatRow?.participating_students || 0);
    const schoolParticipationRate =
      totalStudents > 0 ? Math.round((participatingStudents / totalStudents) * 100) : 0;

    // Habit averages across school (Index-only scan on idx_habit_entries_covering_habit_score)
    const habitRows = this.db.queryAll<{ habit_code: HabitCode; avg_score: number }>(
      `SELECT habit_code, ROUND(AVG(final_score), 1) AS avg_score
       FROM habit_entries
       GROUP BY habit_code`
    );
    const habitMap: Record<string, number> = {};
    for (const r of habitRows) habitMap[r.habit_code] = Number(r.avg_score);

    const habitAverages = VALID_HABIT_CODES.map((h) => ({
      habit: h,
      label: HABIT_LABELS[h],
      average: habitMap[h] ?? 0,
    }));

    // Predicate distribution
    const predRows = this.db.queryAll<{ predicate: string; cnt: number }>(
      `SELECT predicate, COUNT(*) AS cnt
       FROM students
       WHERE account_status = 'ACTIVE'
       GROUP BY predicate`
    );
    const predicateDistribution: Record<string, number> = {
      'Sangat Terbiasa (Teladan)': 0,
      'Terbiasa Baik': 0,
      'Cukup Terbiasa': 0,
      'Perlu Pembinaan': 0,
    };
    for (const r of predRows) {
      predicateDistribution[r.predicate] = Number(r.cnt);
    }

    // Classes & Rombels lists
    const classesRows = this.db.queryAll<{ name: string }>(
      `SELECT DISTINCT class_name AS name FROM students WHERE account_status = 'ACTIVE' ORDER BY class_name ASC`
    );
    const rombelsRows = this.db.queryAll<{ name: string }>(
      `SELECT DISTINCT rombel_name AS name FROM students WHERE account_status = 'ACTIVE' AND rombel_name IS NOT NULL AND rombel_name != '' ORDER BY rombel_name ASC`
    );

    // Cohort Breakdown (X, XI, XII) using journals daily_average_score for 7x faster aggregation
    const cohortStats = this.db.queryAll<{
      grade_prefix: string;
      student_count: number;
      participating_count: number;
      avg_score: number;
    }>(
      `SELECT
          CASE
            WHEN s.class_name LIKE 'XII%' THEN 'Kelas XII'
            WHEN s.class_name LIKE 'XI%' THEN 'Kelas XI'
            ELSE 'Kelas X'
          END AS grade_prefix,
          COUNT(DISTINCT s.id) AS student_count,
          COUNT(DISTINCT j.student_id) AS participating_count,
          COALESCE(ROUND(AVG(j.daily_average_score), 1), 0) AS avg_score
       FROM students s
       LEFT JOIN journals j ON j.student_id = s.id
       WHERE s.account_status = 'ACTIVE'
       GROUP BY grade_prefix
       ORDER BY grade_prefix ASC`
    );

    const cohorts = cohortStats.map((c) => ({
      cohortName: c.grade_prefix,
      studentCount: Number(c.student_count),
      participatingCount: Number(c.participating_count),
      avgScore: Number(c.avg_score),
    }));

    // Top Leaderboard (Top 25 for fast UI rendering, backed by full SQL index)
    const leaderboard = this.getLeaderboard({
      periodType: 'ALL_TIME',
      scopeType: 'SCHOOL',
      limit: 25,
      todayDateStr,
    });

    return {
      totalStudents,
      participatingStudents,
      schoolParticipationRate,
      totalEntries,
      habitAverages,
      predicateDistribution,
      leaderboard,
      classes: classesRows.map((c) => c.name),
      rombels: rombelsRows.map((r) => r.name),
      cohorts,
    };
  }

  /**
   * Period-based and Scope-based Leaderboard Query.
   */
  public getLeaderboard(params: {
    periodType?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SEMESTER' | 'ALL_TIME';
    scopeType?: 'SCHOOL' | 'CLASS' | 'ROMBEL' | 'COHORT';
    scopeId?: string;
    limit?: number;
    todayDateStr: string;
  }) {
    const periodType = params.periodType || 'ALL_TIME';
    const scopeType = params.scopeType || 'SCHOOL';
    const limit = Math.min(750, Math.max(1, Number(params.limit || 50)));

    let dateFilterSql = '';
    const sqlParams: any[] = [];

    if (periodType === 'DAILY') {
      dateFilterSql = 'AND he.log_date = ?';
      sqlParams.push(params.todayDateStr);
    } else if (periodType === 'WEEKLY') {
      const d = new Date(`${params.todayDateStr}T12:00:00Z`);
      const minD = new Date(d.getTime() - 7 * 86400000).toISOString().split('T')[0];
      dateFilterSql = 'AND he.log_date >= ?';
      sqlParams.push(minD);
    } else if (periodType === 'MONTHLY') {
      const d = new Date(`${params.todayDateStr}T12:00:00Z`);
      const minD = new Date(d.getTime() - 30 * 86400000).toISOString().split('T')[0];
      dateFilterSql = 'AND he.log_date >= ?';
      sqlParams.push(minD);
    }

    let scopeFilterSql = '';
    if (scopeType === 'CLASS' && params.scopeId) {
      scopeFilterSql = 'AND s.class_name = ?';
      sqlParams.push(params.scopeId);
    } else if (scopeType === 'ROMBEL' && params.scopeId) {
      scopeFilterSql = 'AND s.rombel_name = ?';
      sqlParams.push(params.scopeId);
    } else if (scopeType === 'COHORT' && params.scopeId) {
      scopeFilterSql = 'AND s.cohort_id = ?';
      sqlParams.push(params.scopeId);
    }

    sqlParams.push(limit);

    if (periodType === 'ALL_TIME') {
      const topStudents = this.db.queryAll<any>(
        `SELECT s.id, s.nisn, s.name, s.gender, s.religion, s.class_name, s.rombel_name,
                s.xp, s.poin_hebat, s.level, s.streak, s.predicate, s.avatar_url
         FROM students s
         WHERE s.account_status = 'ACTIVE' ${scopeFilterSql}
         ORDER BY s.xp DESC, s.poin_hebat DESC, s.streak DESC
         LIMIT ?`,
        sqlParams
      );
      return topStudents.map((r, index) => ({
        ...r,
        rank: index + 1,
        period_avg_score: r.xp > 0 ? Math.min(100, Math.round((r.xp / Math.max(1, r.streak * 7)) * 10) / 10) : 0,
        entry_count: r.streak * 7,
      }));
    }

    const rows = this.db.queryAll<any>(
      `SELECT s.id, s.nisn, s.name, s.gender, s.religion, s.class_name, s.rombel_name,
              s.xp, s.poin_hebat, s.level, s.streak, s.predicate, s.avatar_url,
              COUNT(he.id) AS entry_count,
              COALESCE(ROUND(AVG(he.final_score), 1), 0) AS period_avg_score
       FROM students s
       LEFT JOIN habit_entries he ON he.student_id = s.id ${dateFilterSql}
       WHERE s.account_status = 'ACTIVE' ${scopeFilterSql}
       GROUP BY s.id
       ORDER BY period_avg_score DESC, s.xp DESC, s.poin_hebat DESC, s.streak DESC
       LIMIT ?`,
      sqlParams
    );

    return rows.map((r, index) => ({
      ...r,
      rank: index + 1,
      period_avg_score: Number(r.period_avg_score),
      entry_count: Number(r.entry_count),
    }));
  }

  public saveAdminValidation(
    data: {
      student_id: string;
      verification_score: number;
      verified_by?: string;
      notes?: string;
    },
    actor?: AuthSessionContext | null
  ) {
    const score = Number(data.verification_score);
    if (!data.student_id || Number.isNaN(score) || score < 1 || score > 10) {
      throw new ValidationError('student_id dan verification_score (1..10) wajib valid.');
    }

    const verifiedBy = data.verified_by || actor?.fullName || 'Tim 7 KAIH';
    const validationUuid = `val-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    this.db.transaction(() => {
      this.db.execute(
        `INSERT INTO admin_validations
         (validation_uuid, student_id, verification_score, verified_by_user_id, verified_by, notes, verified_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          validationUuid,
          data.student_id,
          score,
          actor?.userId || null,
          verifiedBy,
          data.notes || '',
        ]
      );

      // Persist directly to students table so leaderboard and analytics immediately reflect verification
      this.db.execute(
        `UPDATE students
         SET verification_score = ?,
             verification_count = COALESCE(verification_count, 0) + 1,
             updated_at = datetime('now')
         WHERE id = ?`,
        [score, data.student_id]
      );

      this.audit.log({
        actor_user_id: actor?.userId || null,
        actor_username: actor?.username || verifiedBy,
        actor_role: actor?.activeRole || 'TIM_7_KAIH',
        action: 'ADMIN_VALIDATION_SAVE',
        entity_type: 'admin_validations',
        entity_id: validationUuid,
        after_state: { student_id: data.student_id, verification_score: score, notes: data.notes },
      });
    });

    return { status: 'ok', validation_uuid: validationUuid, student_id: data.student_id, verification_score: score };
  }

  public getAdminValidationsSummary() {
    const validations = this.db.queryAll<any>(
      `SELECT av.*, s.name AS student_name, s.class_name
       FROM admin_validations av
       LEFT JOIN students s ON s.id = av.student_id
       ORDER BY av.id DESC`
    );

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
    for (const v of validations) {
      const s = Math.min(10, Math.max(1, Math.round(Number(v.verification_score))));
      distribution[s] = (distribution[s] || 0) + 1;
    }

    const avgScore =
      validations.length > 0
        ? Math.round(
            (validations.reduce((acc, v) => acc + Number(v.verification_score || 0), 0) /
              validations.length) *
              10
          ) / 10
        : 0;

    return {
      totalValidations: validations.length,
      averageScore: avgScore,
      distribution,
      recentValidations: validations.slice(0, 50),
    };
  }

  // =========================================================================
  // 7 KAIH INSTRUMENT MANAGEMENT (CRUD)
  // =========================================================================
  public getInstruments(habitCode?: string) {
    if (habitCode) {
      return this.db.queryAll<any>(
        `SELECT * FROM habit_instruments WHERE habit_code = ? ORDER BY order_no ASC`,
        [habitCode]
      );
    }
    return this.db.queryAll<any>(
      `SELECT * FROM habit_instruments ORDER BY habit_code ASC, order_no ASC`
    );
  }

  public saveInstrument(data: any, actor?: AuthSessionContext | null) {
    const id = data.id || `inst-${data.habit_code}-${Date.now()}`;
    const rubricJson = typeof data.rubric_json === 'string'
      ? data.rubric_json
      : JSON.stringify(data.rubric_options || []);

    this.db.execute(
      `INSERT INTO habit_instruments
       (id, habit_code, title, category, question_text, input_type, max_score, weight_percentage, rubric_json, help_text, order_no, is_active, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
        habit_code = excluded.habit_code,
        title = excluded.title,
        category = excluded.category,
        question_text = excluded.question_text,
        input_type = excluded.input_type,
        max_score = excluded.max_score,
        weight_percentage = excluded.weight_percentage,
        rubric_json = excluded.rubric_json,
        help_text = excluded.help_text,
        order_no = excluded.order_no,
        is_active = excluded.is_active,
        updated_at = datetime('now')`,
      [
        id,
        data.habit_code || 'bangun',
        data.title || 'Instrumen 7 KAIH',
        data.category || 'Umum',
        data.question_text || '',
        data.input_type || 'CHOICE',
        Number(data.max_score || 100),
        Number(data.weight_percentage || 100),
        rubricJson,
        data.help_text || '',
        Number(data.order_no || 1),
        data.is_active === false || data.is_active === 0 ? 0 : 1,
      ]
    );

    this.audit.log({
      actor_user_id: actor?.userId || null,
      actor_username: actor?.username || 'admin',
      actor_role: actor?.activeRole || 'SUPER_ADMIN',
      action: 'INSTRUMENT_UPSERT',
      entity_type: 'habit_instruments',
      entity_id: id,
    });

    return { status: 'ok', id };
  }

  public deleteInstrument(id: string, actor?: AuthSessionContext | null) {
    this.db.execute(`DELETE FROM habit_instruments WHERE id = ?`, [id]);
    this.audit.log({
      actor_user_id: actor?.userId || null,
      actor_username: actor?.username || 'admin',
      actor_role: actor?.activeRole || 'SUPER_ADMIN',
      action: 'INSTRUMENT_DELETE',
      entity_type: 'habit_instruments',
      entity_id: id,
    });
    return { status: 'ok', id };
  }

  // =========================================================================
  // DATA COLLECTION SCHEDULE PERIOD
  // =========================================================================
  public getDataCollectionPeriod(todayDateStr: string) {
    const startRow = this.db.queryOne<{ value: string }>(
      `SELECT value FROM app_settings WHERE key = 'data_collection_start_date'`
    );
    const endRow = this.db.queryOne<{ value: string }>(
      `SELECT value FROM app_settings WHERE key = 'data_collection_end_date'`
    );
    const activeRow = this.db.queryOne<{ value: string }>(
      `SELECT value FROM app_settings WHERE key = 'data_collection_active'`
    );

    const startDate = startRow?.value || '2026-10-15';
    const endDate = endRow?.value || '2026-11-15';
    const isActive = activeRow ? activeRow.value === 'true' : true;

    const isBeforeStart = todayDateStr < startDate;
    const isAfterEnd = todayDateStr > endDate;
    const isInPeriod = isActive && !isBeforeStart && !isAfterEnd;

    let message = 'Periode pengambilan data sedang aktif.';
    if (!isActive) message = 'Pengambilan data sedang dinonaktifkan oleh Admin.';
    else if (isBeforeStart) message = `Periode pengambilan data baru akan dibuka pada ${startDate}.`;
    else if (isAfterEnd) message = `Periode pengambilan data telah berakhir pada ${endDate}.`;

    return {
      startDate,
      endDate,
      isActive,
      todayDate: todayDateStr,
      isInPeriod,
      isBeforeStart,
      isAfterEnd,
      message,
    };
  }

  public saveDataCollectionPeriod(
    data: { startDate: string; endDate: string; isActive?: boolean },
    actor?: AuthSessionContext | null
  ) {
    const startDate = String(data.startDate || '').trim();
    const endDate = String(data.endDate || '').trim();
    const isActive = data.isActive !== undefined ? (data.isActive ? 'true' : 'false') : 'true';

    if (!startDate || !endDate) {
      throw new ValidationError('Tanggal mulai dan selesai pengambilan data wajib diisi.');
    }

    this.db.transaction(() => {
      this.db.execute(
        `INSERT INTO app_settings (key, value, value_type, description, updated_at)
         VALUES ('data_collection_start_date', ?, 'STRING', 'Tanggal awal rentang pengambilan data 7 KAIH', datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
        [startDate]
      );
      this.db.execute(
        `INSERT INTO app_settings (key, value, value_type, description, updated_at)
         VALUES ('data_collection_end_date', ?, 'STRING', 'Tanggal akhir rentang pengambilan data 7 KAIH', datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
        [endDate]
      );
      this.db.execute(
        `INSERT INTO app_settings (key, value, value_type, description, updated_at)
         VALUES ('data_collection_active', ?, 'BOOLEAN', 'Status keaktifan rentang pengambilan data', datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
        [isActive]
      );
    });

    this.audit.log({
      actor_user_id: actor?.userId || null,
      actor_username: actor?.username || 'admin',
      actor_role: actor?.activeRole || 'SUPER_ADMIN',
      action: 'DATA_COLLECTION_PERIOD_UPDATE',
      entity_type: 'app_settings',
      entity_id: 'data_collection_period',
      after_state: { startDate, endDate, isActive },
    });

    return { status: 'ok', startDate, endDate, isActive: isActive === 'true' };
  }

  public getAdminOverview() {
    const stRow = this.db.queryOne<{ total: number; active: number; archived: number }>(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN account_status = 'ACTIVE' THEN 1 ELSE 0 END) AS active,
              SUM(CASE WHEN account_status != 'ACTIVE' THEN 1 ELSE 0 END) AS archived
       FROM students`
    );
    const tchRow = this.db.queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM teachers WHERE account_status = 'ACTIVE'`
    );
    const clsRow = this.db.queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM classes WHERE is_active = 1`
    );
    const rmbRow = this.db.queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM rombels WHERE is_active = 1`
    );
    const logRow = this.db.queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM habit_entries`
    );
    const corRow = this.db.queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM data_corrections`
    );

    return {
      totalStudents: Number(stRow?.total || 0),
      activeStudents: Number(stRow?.active || 0),
      archivedStudents: Number(stRow?.archived || 0),
      totalTeachers: Number(tchRow?.total || 0),
      totalClasses: Number(clsRow?.total || 0),
      totalRombels: Number(rmbRow?.total || 0),
      totalLogs: Number(logRow?.total || 0),
      totalCorrections: Number(corRow?.total || 0),
    };
  }

  public getGlobalSettings() {
    const rows = this.db.queryAll<{ key: string; value: string }>(`SELECT key, value FROM app_settings`);
    const settings: Record<string, string> = {};
    for (const r of rows) settings[r.key] = r.value;

    let prayerSchedule = {
      subuh: { start: '04:15', onTimeEnd: '05:00', end: '05:45' },
      zuhur: { start: '11:45', onTimeEnd: '12:30', end: '14:45' },
      asar: { start: '15:00', onTimeEnd: '15:45', end: '17:30' },
      magrib: { start: '17:50', onTimeEnd: '18:20', end: '19:00' },
      isya: { start: '19:05', onTimeEnd: '19:45', end: '23:59' },
    };
    if (settings.prayer_schedule_json) {
      try {
        prayerSchedule = JSON.parse(settings.prayer_schedule_json);
      } catch {
        // use default
      }
    }

    return { settings, prayerSchedule };
  }

  public saveGlobalSettings(
    data: { settings?: Record<string, string>; prayerSchedule?: any },
    actor?: AuthSessionContext | null
  ) {
    this.db.transaction(() => {
      if (data.settings && typeof data.settings === 'object') {
        for (const [k, v] of Object.entries(data.settings)) {
          this.db.execute(
            `INSERT INTO app_settings (key, value, updated_by, updated_at)
             VALUES (?, ?, ?, datetime('now'))
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = datetime('now')`,
            [k, String(v), actor?.userId || null]
          );
        }
      }
      if (data.prayerSchedule && typeof data.prayerSchedule === 'object') {
        this.db.execute(
          `INSERT INTO app_settings (key, value, value_type, updated_by, updated_at)
           VALUES ('prayer_schedule_json', ?, 'JSON', ?, datetime('now'))
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = datetime('now')`,
          [JSON.stringify(data.prayerSchedule), actor?.userId || null]
        );
      }
      this.audit.log({
        actor_user_id: actor?.userId || null,
        actor_username: actor?.username || 'admin',
        actor_role: actor?.activeRole || 'SUPER_ADMIN',
        action: 'APP_SETTINGS_UPDATE',
        entity_type: 'app_settings',
        entity_id: 'global',
      });
    });

    return { status: 'ok', ...this.getGlobalSettings() };
  }

  public getDashboardWidgets() {
    const rows = this.db.queryAll<any>(
      `SELECT * FROM dashboard_widgets ORDER BY display_order ASC`
    );
    return rows.map((r) => {
      let config = {};
      try {
        config = JSON.parse(r.config_json || '{}');
      } catch {
        config = {};
      }
      return {
        ...r,
        config,
      };
    });
  }

  public saveDashboardWidget(rawWidget: any, actor?: AuthSessionContext | null) {
    const id = String(rawWidget.id || `w-${Date.now()}`).trim();
    const title = String(rawWidget.title || 'Widget Dashboard').trim();
    const subtitle = String(rawWidget.subtitle || '').trim();
    const widgetType = String(rawWidget.widget_type || 'METRIC_CARD').trim();
    const visiblePublic = rawWidget.visible_public !== undefined ? (rawWidget.visible_public ? 1 : 0) : 1;
    const visibleStudent = rawWidget.visible_student !== undefined ? (rawWidget.visible_student ? 1 : 0) : 1;
    const visibleTeacher = rawWidget.visible_teacher !== undefined ? (rawWidget.visible_teacher ? 1 : 0) : 1;
    const displayOrder = Number(rawWidget.display_order || 1);
    const configJson =
      typeof rawWidget.config_json === 'string'
        ? rawWidget.config_json
        : JSON.stringify(rawWidget.config || {});

    this.db.execute(
      `INSERT INTO dashboard_widgets
       (id, title, subtitle, widget_type, visible_public, visible_student, visible_teacher, display_order, config_json, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        subtitle = excluded.subtitle,
        widget_type = excluded.widget_type,
        visible_public = excluded.visible_public,
        visible_student = excluded.visible_student,
        visible_teacher = excluded.visible_teacher,
        display_order = excluded.display_order,
        config_json = excluded.config_json,
        updated_by = excluded.updated_by,
        updated_at = datetime('now')`,
      [
        id,
        title,
        subtitle,
        widgetType,
        visiblePublic,
        visibleStudent,
        visibleTeacher,
        displayOrder,
        configJson,
        actor?.userId || null,
      ]
    );
    return { status: 'ok', id };
  }
}
