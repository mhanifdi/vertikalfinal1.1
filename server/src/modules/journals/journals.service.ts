/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Journals, Habit Entries, Sessions, Components & Event Bonus Service — VERTIKAL SMA JAWARA 28
 */

import crypto from 'node:crypto';
import { RelationalDatabase } from '../../database/client.ts';
import {
  validateHabitSubmissionInput,
  validateAktivitasSeruInput,
  validateJournalCorrectionInput,
  VALID_HABIT_CODES,
} from '../../shared/schemas/validation-schemas.ts';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../shared/errors/app-error.ts';
import { ScoringService } from '../scoring/scoring.service.ts';
import { PointsService } from '../points/points.service.ts';
import { StreaksService } from '../streaks/streaks.service.ts';
import { AuditService } from '../audit/audit.service.ts';
import type { AuthSessionContext } from '../auth/auth.service.ts';

export class JournalsService {
  private readonly db: RelationalDatabase;
  private readonly points: PointsService;
  private readonly streaks: StreaksService;
  private readonly audit: AuditService;

  constructor(db: RelationalDatabase) {
    this.db = db;
    this.points = new PointsService(db);
    this.streaks = new StreaksService(db);
    this.audit = new AuditService(db);
  }

  /**
   * Formats a `habit_entries` database row to match the frontend `HabitLog` contract
   * while exposing all new relational fields.
   */
  public formatEntryForClient(row: any) {
    let parsedPayload = {};
    try {
      parsedPayload =
        typeof row.payload_json === 'string'
          ? JSON.parse(row.payload_json || '{}')
          : row.payload_json || {};
    } catch {
      parsedPayload = {};
    }
    return {
      id: row.id,
      entry_uuid: row.entry_uuid,
      journal_id: row.journal_id,
      student_id: row.student_id,
      habit_type: row.habit_code,
      habit_code: row.habit_code,
      log_date: row.log_date,
      sub_category: row.sub_category || '',
      card_status: row.card_status,
      entry_mode: row.entry_mode,
      score: Number(row.final_score),
      base_score: Number(row.base_score),
      bonus_score: Number(row.bonus_score),
      final_score: Number(row.final_score),
      overflow_bonus_points: Number(row.overflow_bonus_points || 0),
      is_locked: Number(row.is_locked ?? 1),
      is_counter_entry: Number(row.is_counter_entry ?? 0),
      is_missed: Number(row.is_missed ?? 0),
      payload: parsedPayload,
      timestamp: row.submitted_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Submits a habit entry inside an atomic transaction:
   * - Validates student & input
   * - Rejects duplicate or locked entries unless explicitly allowed
   * - Evaluates authoritative server-side score (or uses validated score)
   * - Persists `journals`, `habit_entries`, `habit_sessions`, `habit_components`, `habit_entry_revisions`
   * - Records `point_transactions` idempotently
   * - Updates `streak_records` and `students`
   */
  public submitHabitEntry(
    rawBody: any,
    todayDateStr: string,
    actor?: AuthSessionContext | null
  ) {
    const validated = validateHabitSubmissionInput(rawBody, todayDateStr);

    const student = this.db.queryOne<any>(
      `SELECT s.id, s.name, s.religion, s.class_id, s.rombel_id, s.account_status
       FROM students s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE s.id = ? OR s.nisn = ? OR u.username = ?`,
      [validated.student_id, validated.student_id, validated.student_id]
    );
    if (!student) {
      throw new NotFoundError(`Siswa '${validated.student_id}' tidak ditemukan.`);
    }
    validated.student_id = student.id;

    // Check existing entry for (student_id, log_date, habit_code, sub_category)
    const existingEntry = this.db.queryOne<any>(
      `SELECT * FROM habit_entries
       WHERE student_id = ? AND log_date = ? AND habit_code = ? AND sub_category = ?`,
      [validated.student_id, validated.log_date, validated.habit_type, validated.sub_category]
    );

    if (existingEntry) {
      if (Number(existingEntry.is_locked) === 1 && !validated.overwrite) {
        throw new ConflictError(
          `Kartu kebiasaan '${validated.habit_type}'${
            validated.sub_category ? ` (${validated.sub_category})` : ''
          } pada tanggal ${validated.log_date} sudah berstatus SELESAI dan terkunci.`
        );
      }
    }

    // Check if there is already an Aktivitas Seru bonus on this habit for this date
    const existingBonus = this.db.queryOne<{ bonus_awarded: number }>(
      `SELECT bonus_awarded FROM event_bonuses
       WHERE student_id = ? AND log_date = ? AND habit_code = ?`,
      [validated.student_id, validated.log_date, validated.habit_type]
    );
    const bonusToApply = Number(existingBonus?.bonus_awarded || rawBody.bonus_score || 0);

    // Enrich payload with student's religion if ibadah
    const enrichedPayload = {
      religion: student.religion || 'Islam',
      ...validated.payload,
    };

    const evaluation = ScoringService.evaluateHabitSubmission(
      validated.habit_type,
      enrichedPayload,
      validated.sub_category,
      bonusToApply
    );

    // Reconcile client calculated score with server evaluation:
    // Guarantees that the score projected in the form matches the persisted score.
    let baseScore = evaluation.base_score;
    if (rawBody.score !== undefined && !Number.isNaN(Number(rawBody.score))) {
      baseScore = Math.min(100, Math.max(0, Number(rawBody.score)));
    } else if (rawBody.base_score !== undefined && !Number.isNaN(Number(rawBody.base_score))) {
      baseScore = Math.min(100, Math.max(0, Number(rawBody.base_score)));
    } else if (validated.payload?.score !== undefined && !Number.isNaN(Number(validated.payload.score))) {
      baseScore = Math.min(100, Math.max(0, Number(validated.payload.score)));
    } else if (validated.payload?.baseScore !== undefined && !Number.isNaN(Number(validated.payload.baseScore))) {
      baseScore = Math.min(100, Math.max(0, Number(validated.payload.baseScore)));
    }

    const totalScoreWithBonus = baseScore + evaluation.bonus_score;
    const finalScore = Math.min(100, Math.round(totalScoreWithBonus * 10) / 10);
    const overflowBonus = Math.max(0, Math.round((totalScoreWithBonus - 100) * 10) / 10);

    let savedEntryId = 0;

    this.db.transaction(() => {
      // 1. Ensure parent `journals` row exists
      const journalId = `jrn-${validated.student_id}-${validated.log_date}`;
      this.db.execute(
        `INSERT OR IGNORE INTO journals
         (id, student_id, journal_date, academic_year_id, class_id_snapshot, rombel_id_snapshot, journal_status)
         VALUES (?, ?, ?, 'ay-2026-2027-1', ?, ?, 'SEDANG_DIISI')`,
        [
          journalId,
          validated.student_id,
          validated.log_date,
          student.class_id || null,
          student.rombel_id || null,
        ]
      );

      const payloadStr = JSON.stringify(enrichedPayload);

      if (existingEntry) {
        savedEntryId = Number(existingEntry.id);
        const revCountRow = this.db.queryOne<{ cnt: number }>(
          `SELECT COUNT(*) AS cnt FROM habit_entry_revisions WHERE habit_entry_id = ?`,
          [savedEntryId]
        );
        const nextRevNo = Number(revCountRow?.cnt || 0) + 1;

        this.db.execute(
          `UPDATE habit_entries
           SET card_status = 'SELESAI',
               entry_mode = ?,
               base_score = ?,
               bonus_score = ?,
               final_score = ?,
               overflow_bonus_points = ?,
               is_locked = 1,
               is_counter_entry = ?,
               is_missed = ?,
               description_text = ?,
               description_length = ?,
               payload_json = ?,
               scoring_version_id = ?,
               updated_at = datetime('now')
           WHERE id = ?`,
          [
            validated.entry_mode,
            baseScore,
            evaluation.bonus_score,
            finalScore,
            overflowBonus,
            validated.is_counter_entry ? 1 : 0,
            validated.is_missed ? 1 : 0,
            evaluation.description_text,
            evaluation.description_length,
            payloadStr,
            ScoringService.ACTIVE_VERSION_ID,
            savedEntryId,
          ]
        );

        this.db.execute(
          `INSERT INTO habit_entry_revisions
           (id, habit_entry_id, revision_no, previous_base_score, previous_bonus_score, previous_final_score,
            new_base_score, new_bonus_score, new_final_score, previous_payload_json, new_payload_json,
            change_source, reason, changed_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'STUDENT_SUBMIT', 'Pembaruan isian jurnal', ?)`,
          [
            `rev-${savedEntryId}-${nextRevNo}`,
            savedEntryId,
            nextRevNo,
            existingEntry.base_score,
            existingEntry.bonus_score,
            existingEntry.final_score,
            baseScore,
            evaluation.bonus_score,
            finalScore,
            existingEntry.payload_json,
            payloadStr,
            actor?.userId || null,
          ]
        );

        // Clear old sessions and components for this entry before re-inserting
        this.db.execute(`DELETE FROM habit_components WHERE habit_entry_id = ?`, [savedEntryId]);
        this.db.execute(`DELETE FROM habit_sessions WHERE habit_entry_id = ?`, [savedEntryId]);
      } else {
        const entryUuid = `he-${Date.now()}-${crypto.randomBytes(5).toString('hex')}`;
        const insertRes = this.db.execute(
          `INSERT INTO habit_entries
           (entry_uuid, journal_id, student_id, habit_code, log_date, sub_category,
            card_status, entry_mode, base_score, bonus_score, final_score, overflow_bonus_points,
            is_locked, is_counter_entry, is_missed, description_text, description_length,
            payload_json, scoring_version_id, submitted_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'SELESAI', ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [
            entryUuid,
            journalId,
            validated.student_id,
            validated.habit_type,
            validated.log_date,
            validated.sub_category,
            validated.entry_mode,
            baseScore,
            evaluation.bonus_score,
            finalScore,
            overflowBonus,
            validated.is_counter_entry ? 1 : 0,
            validated.is_missed ? 1 : 0,
            evaluation.description_text,
            evaluation.description_length,
            payloadStr,
            ScoringService.ACTIVE_VERSION_ID,
          ]
        );
        savedEntryId = insertRes.lastInsertRowid;

        this.db.execute(
          `INSERT INTO habit_entry_revisions
           (id, habit_entry_id, revision_no, previous_base_score, previous_bonus_score, previous_final_score,
            new_base_score, new_bonus_score, new_final_score, previous_payload_json, new_payload_json,
            change_source, reason, changed_by)
           VALUES (?, ?, 1, 0, 0, 0, ?, ?, ?, '{}', ?, 'STUDENT_SUBMIT', 'Pengisian jurnal awal', ?)`,
          [
            `rev-${savedEntryId}-1`,
            savedEntryId,
            baseScore,
            evaluation.bonus_score,
            finalScore,
            payloadStr,
            actor?.userId || null,
          ]
        );
      }

      // 2. Persist normalized `habit_sessions`
      const sessionIdMap: Record<string, string> = {};
      for (const s of evaluation.sessions) {
        const sessionId = `hses-${savedEntryId}-${s.session_code}`;
        sessionIdMap[s.session_code] = sessionId;
        this.db.execute(
          `INSERT OR REPLACE INTO habit_sessions
           (id, habit_entry_id, student_id, log_date, habit_code, session_code,
            session_status, execution_time, raw_session_score, normalized_session_score, session_payload_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sessionId,
            savedEntryId,
            validated.student_id,
            validated.log_date,
            validated.habit_type,
            s.session_code,
            s.session_status,
            s.execution_time,
            s.raw_session_score,
            s.normalized_session_score,
            JSON.stringify(s.session_payload_json),
          ]
        );
      }

      // 3. Persist granular `habit_components`
      for (let i = 0; i < evaluation.components.length; i++) {
        const c = evaluation.components[i];
        const compId = `hcmp-${savedEntryId}-${i + 1}-${c.component_key}`;
        const linkedSessionId = c.session_code ? sessionIdMap[c.session_code] || null : null;
        this.db.execute(
          `INSERT INTO habit_components
           (id, habit_entry_id, habit_session_id, component_key, component_label, component_value, score_earned, max_possible_score)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            compId,
            savedEntryId,
            linkedSessionId,
            c.component_key,
            c.component_label,
            c.component_value,
            c.score_earned,
            c.max_possible_score,
          ]
        );
      }

      // 4. Record idempotent XP transaction & overflow Poin Hebat transaction
      const sourceKey = `${validated.log_date}:${validated.habit_type}:${validated.sub_category || 'main'}`;
      this.points.recordTransaction({
        studentId: validated.student_id,
        transactionDate: validated.log_date,
        pointBucket: 'XP',
        sourceType: 'HABIT_COMPLETION',
        sourceId: sourceKey,
        amount: Math.round(finalScore),
        description: `Capaian Kebiasaan ${validated.habit_type.toUpperCase()} (${validated.log_date})`,
        createdBy: actor?.userId || null,
      });

      if (overflowBonus > 0) {
        this.points.recordTransaction({
          studentId: validated.student_id,
          transactionDate: validated.log_date,
          pointBucket: 'POIN_HEBAT',
          sourceType: 'EVENT_OVERFLOW',
          sourceId: sourceKey,
          amount: Math.round(overflowBonus),
          description: `Overflow Bonus Aktivitas Seru (${validated.habit_type.toUpperCase()} ${validated.log_date})`,
          createdBy: actor?.userId || null,
        });
      }

      // 5. Synchronize `journals`, `streak_records`, and `students`
      this.streaks.syncStudentJournalAndAggregates(
        validated.student_id,
        validated.log_date,
        todayDateStr
      );
    });

    const updatedStudent = this.db.queryOne<any>(
      `SELECT * FROM students WHERE id = ?`,
      [validated.student_id]
    );

    return {
      status: 'ok',
      entry_id: savedEntryId,
      habit_type: validated.habit_type,
      log_date: validated.log_date,
      base_score: baseScore,
      bonus_score: evaluation.bonus_score,
      final_score: finalScore,
      overflow_bonus_points: overflowBonus,
      student: updatedStudent,
    };
  }

  /**
   * Submits "Cerita Aktivitas Seru" (+10 bonus points):
   * - Validates story >= 15 characters
   * - Applies +10 to the selected habit on that date (capped at 100.0)
   * - Routes any excess above 100.0 into `overflow_to_poin_hebat` & `point_transactions`
   */
  public submitAktivitasSeru(
    rawBody: any,
    todayDateStr: string,
    actor?: AuthSessionContext | null
  ) {
    const validated = validateAktivitasSeruInput(rawBody, todayDateStr);
    const bonusAmount = 10;

    return this.db.transaction(() => {
      const targetEntry = this.db.queryOne<any>(
        `SELECT * FROM habit_entries
         WHERE student_id = ? AND log_date = ? AND habit_code = ?
         ORDER BY id DESC LIMIT 1`,
        [validated.student_id, validated.log_date, validated.habit_type]
      );

      let appliedToHabit = bonusAmount;
      let overflowPoints = 0;
      let habitEntryId: number | null = null;

      if (targetEntry) {
        habitEntryId = Number(targetEntry.id);
        const base = Number(targetEntry.base_score || targetEntry.final_score || 0);
        const rawCombined = base + bonusAmount;
        const newFinal = Math.min(100, Math.round(rawCombined * 10) / 10);
        appliedToHabit = Math.max(0, Math.round((newFinal - base) * 10) / 10);
        overflowPoints = Math.max(0, Math.round((rawCombined - 100) * 10) / 10);

        let currentPayload: Record<string, any> = {};
        try {
          currentPayload = JSON.parse(targetEntry.payload_json || '{}');
        } catch {
          currentPayload = {};
        }
        const updatedPayload = {
          ...currentPayload,
          aktivitasSeruStory: validated.story,
          bonusApplied: bonusAmount,
          overflowBonusPoints: overflowPoints,
        };

        this.db.execute(
          `UPDATE habit_entries
           SET bonus_score = ?,
               final_score = ?,
               overflow_bonus_points = ?,
               payload_json = ?,
               updated_at = datetime('now')
           WHERE id = ?`,
          [bonusAmount, newFinal, overflowPoints, JSON.stringify(updatedPayload), habitEntryId]
        );
      }

      const bonusUuid = `evb-${validated.student_id}-${validated.log_date}`;
      this.db.execute(
        `INSERT INTO event_bonuses
         (bonus_uuid, event_id, student_id, habit_entry_id, log_date, habit_code, story,
          bonus_awarded, applied_to_habit_score, overflow_to_poin_hebat, created_at)
         VALUES (?, 'evt-aktivitas-seru', ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(student_id, log_date) DO UPDATE SET
          habit_entry_id = excluded.habit_entry_id,
          habit_code = excluded.habit_code,
          story = excluded.story,
          bonus_awarded = excluded.bonus_awarded,
          applied_to_habit_score = excluded.applied_to_habit_score,
          overflow_to_poin_hebat = excluded.overflow_to_poin_hebat`,
        [
          bonusUuid,
          validated.student_id,
          habitEntryId,
          validated.log_date,
          validated.habit_type,
          validated.story,
          bonusAmount,
          appliedToHabit,
          overflowPoints,
        ]
      );

      if (overflowPoints > 0) {
        this.points.recordTransaction({
          studentId: validated.student_id,
          transactionDate: validated.log_date,
          pointBucket: 'POIN_HEBAT',
          sourceType: 'EVENT_OVERFLOW',
          sourceId: `aktivitas_seru:${validated.log_date}`,
          amount: Math.round(overflowPoints),
          description: `Overflow Bonus Aktivitas Seru (+${overflowPoints} Poin Hebat) pada ${validated.habit_type.toUpperCase()}`,
          createdBy: actor?.userId || null,
        });
      }

      this.streaks.syncStudentJournalAndAggregates(
        validated.student_id,
        validated.log_date,
        todayDateStr
      );

      const savedRow = this.db.queryOne<any>(
        `SELECT id, student_id, log_date, habit_code AS habit_type, story,
                bonus_awarded, overflow_to_poin_hebat AS overflow_points, created_at
         FROM event_bonuses
         WHERE student_id = ? AND log_date = ?`,
        [validated.student_id, validated.log_date]
      );

      return {
        status: 'ok',
        bonus_awarded: bonusAmount,
        applied_to_habit_score: appliedToHabit,
        overflow_points: overflowPoints,
        entry: savedRow,
      };
    });
  }

  public getAktivitasSeru(studentId: string, dateStr?: string) {
    if (dateStr) {
      return this.db.queryAll(
        `SELECT id, student_id, log_date, habit_code AS habit_type, story,
                bonus_awarded, overflow_to_poin_hebat AS overflow_points, created_at
         FROM event_bonuses
         WHERE student_id = ? AND log_date = ?`,
        [studentId, dateStr]
      );
    }
    return this.db.queryAll(
      `SELECT id, student_id, log_date, habit_code AS habit_type, story,
              bonus_awarded, overflow_to_poin_hebat AS overflow_points, created_at
       FROM event_bonuses
       WHERE student_id = ?
       ORDER BY log_date DESC LIMIT 30`,
      [studentId]
    );
  }

  public getStudentTodayJournal(studentId: string, dateStr: string, todayDateStr: string) {
    const rawRows = this.db.queryAll<any>(
      `SELECT * FROM habit_entries WHERE student_id = ? AND log_date = ? ORDER BY id ASC`,
      [studentId, dateStr]
    );
    const logs = rawRows.map((r) => this.formatEntryForClient(r));

    const habitsByType: Record<string, any[]> = {};
    for (const h of VALID_HABIT_CODES) habitsByType[h] = [];
    for (const l of logs) {
      if (habitsByType[l.habit_type]) {
        habitsByType[l.habit_type].push(l);
      }
    }

    const dailyEval = this.streaks.evaluateStudentDay(studentId, dateStr, todayDateStr, rawRows);
    const aktivitasSeru =
      this.db.queryOne<any>(
        `SELECT id, student_id, log_date, habit_code AS habit_type, story,
                bonus_awarded, overflow_to_poin_hebat AS overflow_points, created_at
         FROM event_bonuses
         WHERE student_id = ? AND log_date = ?`,
        [studentId, dateStr]
      ) || null;

    return {
      date: dateStr,
      student_id: studentId,
      logs,
      habitsByType,
      totalToday: dailyEval.completedCount,
      dailyEval,
      aktivitasSeru,
    };
  }

  public getStudentCalendarSummary(studentId: string, _days: number, todayDateStr: string) {
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    // Retrieve active data collection range from app_settings
    const startSetting = this.db.queryOne<{ value: string }>(
      `SELECT value FROM app_settings WHERE key = 'data_collection_start_date'`
    );
    const endSetting = this.db.queryOne<{ value: string }>(
      `SELECT value FROM app_settings WHERE key = 'data_collection_end_date'`
    );

    const startDateStr = startSetting?.value || '2026-10-15';
    const endDateStr = endSetting?.value || '2026-11-15';

    // Build complete list of all dates in data collection range
    const dateList: string[] = [];
    const curDate = new Date(`${startDateStr}T12:00:00Z`);
    const endDate = new Date(`${endDateStr}T12:00:00Z`);

    while (curDate.getTime() <= endDate.getTime()) {
      dateList.push(curDate.toISOString().split('T')[0]);
      curDate.setDate(curDate.getDate() + 1);
    }

    // Fallback if range invalid
    if (dateList.length === 0) {
      dateList.push(todayDateStr);
    }

    const allRows = this.db.queryAll<any>(
      `SELECT * FROM habit_entries
       WHERE student_id = ? AND log_date >= ? AND log_date <= ?`,
      [studentId, startDateStr, endDateStr]
    );

    const rowsByDate: Record<string, any[]> = {};
    for (const r of allRows) {
      if (!rowsByDate[r.log_date]) rowsByDate[r.log_date] = [];
      rowsByDate[r.log_date].push(r);
    }

    const dates = dateList.map((dateStr) => {
      const d = new Date(`${dateStr}T12:00:00Z`);
      const evalDay = this.streaks.evaluateStudentDay(
        studentId,
        dateStr,
        todayDateStr,
        rowsByDate[dateStr] || []
      );

      const isFuture = dateStr > todayDateStr;
      const isToday = dateStr === todayDateStr;
      const isPast = dateStr < todayDateStr;

      let calendarCardStatus: 'FUTURE' | 'TODAY' | 'COMPLETE' | 'MISSED' = 'FUTURE';
      if (isFuture) {
        calendarCardStatus = 'FUTURE';
      } else if (isToday) {
        calendarCardStatus = 'TODAY';
      } else if (evalDay.isCompleteDay) {
        calendarCardStatus = 'COMPLETE';
      } else {
        calendarCardStatus = 'MISSED';
      }

      return {
        date: dateStr,
        dayName: isToday ? 'Hari Ini' : dayNames[d.getUTCDay()],
        formattedDate: `${d.getUTCDate()} ${monthNames[d.getUTCMonth()]}`,
        completedCount: evalDay.completedCount,
        missingCount: evalDay.missingHabits.length,
        isComplete: evalDay.isCompleteDay,
        isFuture,
        isToday,
        isPast,
        calendarCardStatus,
        overallDayStatus: evalDay.overallDayStatus,
        habitStatuses: evalDay.habitStatuses,
        habitsDone: evalDay.completedHabits,
        missingHabits: evalDay.missingHabits,
        dailyScore: evalDay.dailyAverageScore,
        scoresByHabit: evalDay.scoresByHabit,
      };
    });

    const hasAnyMissed = dates.some((d) => d.isPast && !d.isComplete);
    return {
      student_id: studentId,
      startDate: startDateStr,
      endDate: endDateStr,
      hasAnyMissed,
      dates,
    };
  }

  public getStudentProgressSeries(studentId: string, days: number, todayDateStr: string) {
    const clampedDays = Math.min(30, Math.max(7, Number(days || 14)));
    const dayNamesShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const baseDate = new Date(`${todayDateStr}T12:00:00Z`);
    const dateList: string[] = [];
    for (let i = clampedDays - 1; i >= 0; i--) {
      const d = new Date(baseDate.getTime() - i * 86400000);
      dateList.push(d.toISOString().split('T')[0]);
    }
    const minDate = dateList[0];

    const allRows = this.db.queryAll<any>(
      `SELECT * FROM habit_entries
       WHERE student_id = ? AND log_date >= ? AND log_date <= ?`,
      [studentId, minDate, todayDateStr]
    );
    const rowsByDate: Record<string, any[]> = {};
    for (const r of allRows) {
      if (!rowsByDate[r.log_date]) rowsByDate[r.log_date] = [];
      rowsByDate[r.log_date].push(r);
    }

    const series = dateList.map((dateStr, idx) => {
      const d = new Date(`${dateStr}T12:00:00Z`);
      const evalDay = this.streaks.evaluateStudentDay(
        studentId,
        dateStr,
        todayDateStr,
        rowsByDate[dateStr] || []
      );
      return {
        dayIndex: idx + 1,
        date: dateStr,
        label: `${d.getUTCDate()} ${monthNamesShort[d.getUTCMonth()]}`,
        fullLabel: `${dayNamesShort[d.getUTCDay()]}, ${d.getUTCDate()} ${monthNamesShort[d.getUTCMonth()]}`,
        bangun: evalDay.scoresByHabit.bangun,
        ibadah: evalDay.scoresByHabit.ibadah,
        olahraga: evalDay.scoresByHabit.olahraga,
        makan: evalDay.scoresByHabit.makan,
        belajar: evalDay.scoresByHabit.belajar,
        masyarakat: evalDay.scoresByHabit.masyarakat,
        tidur: evalDay.scoresByHabit.tidur,
        rataRata: evalDay.dailyAverageScore,
        completedCount: evalDay.completedCount,
        status: evalDay.overallDayStatus,
      };
    });

    return {
      student_id: studentId,
      days: clampedDays,
      series,
    };
  }

  public resetHabitOnDate(
    studentId: string,
    habitType: string,
    dateStr: string,
    todayDateStr: string,
    actor?: AuthSessionContext | null
  ) {
    this.db.transaction(() => {
      this.db.execute(
        `DELETE FROM habit_entries WHERE student_id = ? AND log_date = ? AND habit_code = ?`,
        [studentId, dateStr, habitType]
      );
      this.streaks.syncStudentJournalAndAggregates(studentId, dateStr, todayDateStr);
      this.audit.log({
        actor_user_id: actor?.userId || null,
        actor_username: actor?.username || 'system',
        actor_role: actor?.activeRole || 'SYSTEM',
        action: 'HABIT_ENTRY_RESET',
        entity_type: 'habit_entries',
        entity_id: `${studentId}:${dateStr}:${habitType}`,
      });
    });
    return { status: 'ok', student_id: studentId, habit_type: habitType, date: dateStr };
  }

  /**
   * Controlled Admin / Tim 7 KAIH Journal Score Correction.
   * Requires mandatory reason, records `data_corrections`, `habit_entry_revisions`, and `audit_logs`,
   * and recalculates student aggregates.
   */
  public correctJournalEntry(
    rawBody: any,
    todayDateStr: string,
    actor?: AuthSessionContext | null
  ) {
    const validated = validateJournalCorrectionInput(rawBody);
    const actorName = validated.actor_name || actor?.fullName || 'Super Admin / Tim 7 KAIH';

    return this.db.transaction(() => {
      let existing: any = null;
      if (validated.log_id) {
        existing = this.db.queryOne<any>(`SELECT * FROM habit_entries WHERE id = ?`, [
          validated.log_id,
        ]);
      } else if (validated.student_id && validated.log_date && validated.habit_type) {
        existing = this.db.queryOne<any>(
          `SELECT * FROM habit_entries
           WHERE student_id = ? AND log_date = ? AND habit_code = ? AND sub_category = ?`,
          [
            validated.student_id,
            validated.log_date,
            validated.habit_type,
            validated.sub_category || '',
          ]
        );
      }

      const targetStudentId = existing?.student_id || validated.student_id;
      const targetDate = existing?.log_date || validated.log_date || todayDateStr;
      const targetHabit = existing?.habit_code || validated.habit_type;
      const targetSub = existing?.sub_category ?? validated.sub_category ?? '';

      if (!targetStudentId || !targetHabit) {
        throw new ValidationError(
          'Data target koreksi (log_id atau kombinasi student_id, log_date, habit_type) wajib lengkap.'
        );
      }

      const oldScore = existing ? Number(existing.final_score) : 0;
      const oldPayloadStr = existing ? String(existing.payload_json || '{}') : '{}';
      let basePayloadObj: Record<string, any> = {};
      try {
        basePayloadObj = JSON.parse(oldPayloadStr);
      } catch {
        basePayloadObj = {};
      }

      const mergedPayload = validated.new_payload
        ? { ...basePayloadObj, ...validated.new_payload, correctedByAdmin: true, correctionReason: validated.reason }
        : { ...basePayloadObj, correctedByAdmin: true, correctionReason: validated.reason };
      const newPayloadStr = JSON.stringify(mergedPayload);

      const newBaseScore =
        validated.new_base_score !== undefined ? validated.new_base_score : validated.new_score;
      const newBonusScore =
        validated.new_bonus_score !== undefined
          ? validated.new_bonus_score
          : Number(existing?.bonus_score || 0);

      let entryId: number;
      if (existing) {
        entryId = Number(existing.id);
        this.db.execute(
          `UPDATE habit_entries
           SET final_score = ?,
               base_score = ?,
               bonus_score = ?,
               payload_json = ?,
               is_locked = 1,
               updated_at = datetime('now')
           WHERE id = ?`,
          [validated.new_score, newBaseScore, newBonusScore, newPayloadStr, entryId]
        );

        const revCountRow = this.db.queryOne<{ cnt: number }>(
          `SELECT COUNT(*) AS cnt FROM habit_entry_revisions WHERE habit_entry_id = ?`,
          [entryId]
        );
        const nextRev = Number(revCountRow?.cnt || 0) + 1;

        this.db.execute(
          `INSERT INTO habit_entry_revisions
           (id, habit_entry_id, revision_no, previous_base_score, previous_bonus_score, previous_final_score,
            new_base_score, new_bonus_score, new_final_score, previous_payload_json, new_payload_json,
            change_source, reason, changed_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ADMIN_CORRECTION', ?, ?)`,
          [
            `rev-${entryId}-${nextRev}`,
            entryId,
            nextRev,
            existing.base_score,
            existing.bonus_score,
            oldScore,
            newBaseScore,
            newBonusScore,
            validated.new_score,
            oldPayloadStr,
            newPayloadStr,
            validated.reason,
            actor?.userId || null,
          ]
        );
      } else {
        const journalId = `jrn-${targetStudentId}-${targetDate}`;
        this.db.execute(
          `INSERT OR IGNORE INTO journals (id, student_id, journal_date, academic_year_id, journal_status)
           VALUES (?, ?, ?, 'ay-2026-2027-1', 'SEDANG_DIISI')`,
          [journalId, targetStudentId, targetDate]
        );
        const entryUuid = `he-corr-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const ins = this.db.execute(
          `INSERT INTO habit_entries
           (entry_uuid, journal_id, student_id, habit_code, log_date, sub_category,
            card_status, entry_mode, base_score, bonus_score, final_score, overflow_bonus_points,
            is_locked, is_counter_entry, is_missed, payload_json, scoring_version_id)
           VALUES (?, ?, ?, ?, ?, ?, 'SELESAI', 'TEPAT_HARI', ?, ?, ?, 0, 1, 0, 0, ?, ?)`,
          [
            entryUuid,
            journalId,
            targetStudentId,
            targetHabit,
            targetDate,
            targetSub,
            newBaseScore,
            newBonusScore,
            validated.new_score,
            newPayloadStr,
            ScoringService.ACTIVE_VERSION_ID,
          ]
        );
        entryId = ins.lastInsertRowid;
      }

      const correctionUuid = `cor-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      this.db.execute(
        `INSERT INTO data_corrections
         (correction_uuid, habit_entry_id, student_id, log_date, habit_type, sub_category,
          old_score, new_score, old_payload, new_payload, reason, actor_user_id, actor_name, corrected_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          correctionUuid,
          entryId,
          targetStudentId,
          targetDate,
          targetHabit,
          targetSub,
          oldScore,
          validated.new_score,
          oldPayloadStr,
          newPayloadStr,
          validated.reason,
          actor?.userId || null,
          actorName,
        ]
      );

      this.audit.log({
        actor_user_id: actor?.userId || null,
        actor_username: actor?.username || actorName,
        actor_role: actor?.activeRole || 'SUPER_ADMIN',
        action: 'JOURNAL_SCORE_CORRECTION',
        entity_type: 'habit_entries',
        entity_id: String(entryId),
        before_state: { score: oldScore, payload: basePayloadObj },
        after_state: { score: validated.new_score, payload: mergedPayload },
        reason: validated.reason,
      });

      this.streaks.syncStudentJournalAndAggregates(targetStudentId, targetDate, todayDateStr);

      return {
        status: 'ok',
        log_id: entryId,
        student_id: targetStudentId,
        log_date: targetDate,
        habit_type: targetHabit,
        old_score: oldScore,
        new_score: validated.new_score,
        reason: validated.reason,
        actor_name: actorName,
      };
    });
  }

  public queryAdminJournals(filters: {
    student_id?: string;
    class_name?: string;
    rombel_name?: string;
    habit_type?: string;
    date_from?: string;
    date_to?: string;
  }) {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (filters.student_id) {
      conditions.push('he.student_id = ?');
      params.push(filters.student_id);
    }
    if (filters.class_name) {
      conditions.push('s.class_name = ?');
      params.push(filters.class_name);
    }
    if (filters.rombel_name) {
      conditions.push('s.rombel_name = ?');
      params.push(filters.rombel_name);
    }
    if (filters.habit_type) {
      conditions.push('he.habit_code = ?');
      params.push(filters.habit_type);
    }
    if (filters.date_from) {
      conditions.push('he.log_date >= ?');
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      conditions.push('he.log_date <= ?');
      params.push(filters.date_to);
    }

    const rawRows = this.db.queryAll<any>(
      `SELECT he.*, s.name AS student_name, s.nisn, s.class_name, s.rombel_name
       FROM habit_entries he
       JOIN students s ON s.id = he.student_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY he.log_date DESC, he.id DESC
       LIMIT 250`,
      params
    );

    const logs = rawRows.map((r) => ({
      ...this.formatEntryForClient(r),
      student_name: r.student_name,
      nisn: r.nisn,
      class_name: r.class_name,
      rombel_name: r.rombel_name,
    }));

    const corrections = this.db.queryAll<any>(
      `SELECT dc.*, s.name AS student_name, s.class_name
       FROM data_corrections dc
       LEFT JOIN students s ON s.id = dc.student_id
       ORDER BY dc.id DESC LIMIT 50`
    );

    return { logs, corrections };
  }
}
