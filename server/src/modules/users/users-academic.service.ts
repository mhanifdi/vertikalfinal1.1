/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Users, Students, Teachers, Classes, Rombels & Membership History Service — VERTIKAL SMA JAWARA 28
 */

import crypto from 'node:crypto';
import { RelationalDatabase } from '../../database/client.ts';
import { hashPassword } from '../../shared/utilities/password.ts';
import { NotFoundError, ValidationError } from '../../shared/errors/app-error.ts';
import { AuditService } from '../audit/audit.service.ts';
import type { AuthSessionContext } from '../auth/auth.service.ts';

export class UsersAcademicService {
  private readonly db: RelationalDatabase;
  private readonly audit: AuditService;

  constructor(db: RelationalDatabase) {
    this.db = db;
    this.audit = new AuditService(db);
  }

  public ensureClassExists(className: string, walasName?: string, walasTeacherId?: string): string {
    const cleanName = String(className || 'XI-MIPA-1').trim();
    const validTeacherId =
      walasTeacherId &&
      this.db.queryOne<{ id: string }>(`SELECT id FROM teachers WHERE id = ?`, [walasTeacherId])
        ? walasTeacherId
        : null;
    const existing = this.db.queryOne<{ id: string }>(
      `SELECT id FROM classes WHERE name = ?`,
      [cleanName]
    );
    if (existing) {
      if (walasName || validTeacherId) {
        this.db.execute(
          `UPDATE classes
           SET walas_name = COALESCE(?, walas_name),
               walas_teacher_id = COALESCE(?, walas_teacher_id),
               updated_at = datetime('now')
           WHERE id = ?`,
          [walasName || null, validTeacherId, existing.id]
        );
      }
      return existing.id;
    }

    const gradeLevel = cleanName.startsWith('XII')
      ? 'XII'
      : cleanName.startsWith('X-') || cleanName === 'X'
      ? 'X'
      : 'XI';
    const cohortId =
      gradeLevel === 'XII' ? 'coh-2024' : gradeLevel === 'X' ? 'coh-2026' : 'coh-2025';
    const classId = `cls-${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    this.db.execute(
      `INSERT INTO classes (id, name, grade_level, cohort_id, academic_year_id, walas_teacher_id, walas_name, is_active)
       VALUES (?, ?, ?, ?, 'ay-2026-2027-1', ?, ?, 1)`,
      [classId, cleanName, gradeLevel, cohortId, validTeacherId, walasName || null]
    );
    return classId;
  }

  public ensureRombelExists(
    rombelName: string,
    description?: string,
    waliName?: string,
    waliTeacherId?: string
  ): string | null {
    const cleanName = String(rombelName || '').trim();
    if (!cleanName) return null;
    const validTeacherId =
      waliTeacherId &&
      this.db.queryOne<{ id: string }>(`SELECT id FROM teachers WHERE id = ?`, [waliTeacherId])
        ? waliTeacherId
        : null;

    const existing = this.db.queryOne<{ id: string }>(
      `SELECT id FROM rombels WHERE name = ?`,
      [cleanName]
    );
    if (existing) {
      if (description || waliName || validTeacherId) {
        this.db.execute(
          `UPDATE rombels
           SET description = COALESCE(?, description),
               wali_name = COALESCE(?, wali_name),
               wali_teacher_id = COALESCE(?, wali_teacher_id),
               updated_at = datetime('now')
           WHERE id = ?`,
          [description || null, waliName || null, validTeacherId, existing.id]
        );
      }
      return existing.id;
    }

    const rombelId = `rmb-${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    this.db.execute(
      `INSERT INTO rombels (id, name, description, academic_year_id, wali_teacher_id, wali_name, is_active)
       VALUES (?, ?, ?, 'ay-2026-2027-1', ?, ?, 1)`,
      [
        rombelId,
        cleanName,
        description || 'Kelompok Binaan Rombel Lintas Kelas',
        validTeacherId,
        waliName || null,
      ]
    );
    return rombelId;
  }

  public getStudents(includeArchived = false) {
    const whereClause = includeArchived ? '' : `WHERE s.account_status = 'ACTIVE'`;
    return this.db.queryAll<any>(
      `SELECT s.id, s.user_id, u.username, s.nisn, s.nis, s.name, s.gender, s.religion,
              s.class_id, s.class_name, s.rombel_id, s.rombel_name,
              s.wali_name, s.wali_id, s.is_demo,
              COALESCE(s.avg_score, 0) AS avg_score,
              s.xp, s.poin_hebat, s.level, s.streak, s.best_streak, s.predicate,
              s.verification_score, s.verification_count,
              s.walas_notes, s.walas_recommendation, s.avatar_url, s.account_status, s.created_at
       FROM students s
       JOIN users u ON u.id = s.user_id
       ${whereClause}
       ORDER BY s.xp DESC, s.poin_hebat DESC, s.name ASC`
    );
  }

  public getStudentById(studentId: string) {
    const student = this.db.queryOne<any>(
      `SELECT s.id, s.user_id, u.username, s.nisn, s.nis, s.name, s.gender, s.religion,
              s.class_id, s.class_name, s.rombel_id, s.rombel_name,
              s.wali_name, s.wali_id, s.is_demo,
              COALESCE(s.avg_score, 0) AS avg_score,
              s.xp, s.poin_hebat, s.level, s.streak, s.best_streak, s.predicate,
              s.verification_score, s.verification_count,
              s.walas_notes, s.walas_recommendation, s.avatar_url, s.account_status, s.created_at
       FROM students s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
      [studentId]
    );
    if (!student) {
      throw new NotFoundError(`Siswa '${studentId}' tidak ditemukan.`);
    }
    return student;
  }

  public getTeachers() {
    const teachers = this.db.queryAll<any>(
      `SELECT t.id, t.user_id, u.username, t.nip, t.name, t.gender, t.phone,
              t.role_title AS role, t.assignment_type, t.class_name, t.rombel_name,
              t.roles_csv, t.is_demo,
              t.avatar_url, t.account_status, t.created_at
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       ORDER BY t.name ASC`
    );

    return teachers.map((t) => {
      const rolesCsv = t.roles_csv || t.assignment_type || 'WALAS';
      const isWalas = rolesCsv.includes('WALAS') || t.assignment_type === 'WALAS';
      const isWali = rolesCsv.includes('WALI') || t.assignment_type === 'GURU_WALI';
      const isTim7Kaih = rolesCsv.includes('TIM_7_KAIH') || t.assignment_type === 'TIM_7_KAIH' || (t.role && t.role.includes('7 KAIH'));
      const isAdmin = t.assignment_type === 'ADMIN' || (t.role && t.role.includes('Admin'));

      return {
        ...t,
        roles_csv: rolesCsv,
        is_walas: isWalas,
        is_wali: isWali,
        is_tim_7_kaih: isTim7Kaih,
        is_admin: isAdmin,
      };
    });
  }

  public saveStudent(rawBody: any, todayDateStr: string, actor?: AuthSessionContext | null) {
    const name = String(rawBody.name || '').trim();
    const nisn = String(rawBody.nisn || '').trim();
    if (!name || !nisn) {
      throw new ValidationError('Nama lengkap dan NISN siswa wajib diisi.');
    }

    const cleanUsername = String(rawBody.username || nisn).trim().toLowerCase();
    const studentId = String(rawBody.id || `std-${cleanUsername}`).trim();
    const userId = `usr-${studentId}`;
    const gender = String(rawBody.gender || 'L').toUpperCase() === 'P' ? 'P' : 'L';
    const religion = String(rawBody.religion || 'Islam').trim();
    const className = String(rawBody.class_name || 'XI-MIPA-1').trim();
    const rombelName = String(rawBody.rombel_name || 'Rombel Sains & Riset A').trim();
    const waliName = rawBody.wali_name ? String(rawBody.wali_name).trim() : null;
    const waliId = rawBody.wali_id ? String(rawBody.wali_id).trim() : null;
    const isDemo = rawBody.is_demo ? 1 : 0;
    const status = String(rawBody.account_status || 'ACTIVE').toUpperCase();
    const avatarUrl =
      rawBody.avatar_url ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanUsername)}`;

    return this.db.transaction(() => {
      const classId = this.ensureClassExists(className);
      const rombelId = this.ensureRombelExists(rombelName);
      const existingStudent = this.db.queryOne<any>(
        `SELECT * FROM students WHERE id = ?`,
        [studentId]
      );

      if (existingStudent) {
        if (rawBody.password && String(rawBody.password).trim()) {
          const newHash = hashPassword(String(rawBody.password).trim());
          this.db.execute(
            `UPDATE users
             SET username = ?, full_name = ?, password_hash = ?, password_algo = 'scrypt',
                 account_status = ?, updated_at = datetime('now')
             WHERE id = ?`,
            [cleanUsername, name, newHash, status, existingStudent.user_id]
          );
        } else {
          this.db.execute(
            `UPDATE users
             SET username = ?, full_name = ?, account_status = ?, updated_at = datetime('now')
             WHERE id = ?`,
            [cleanUsername, name, status, existingStudent.user_id]
          );
        }

        // If class or rombel changed, record non-destructive membership history
        if (existingStudent.class_name !== className) {
          this.db.execute(
            `UPDATE student_class_memberships SET is_current = 0, end_date = ? WHERE student_id = ? AND is_current = 1`,
            [todayDateStr, studentId]
          );
          this.db.execute(
            `INSERT INTO student_class_memberships
             (id, student_id, class_id, class_name, academic_year_id, start_date, is_current, move_reason, changed_by)
             VALUES (?, ?, ?, ?, 'ay-2026-2027-1', ?, 1, 'Pembaruan data profil siswa', ?)`,
            [
              `scm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
              studentId,
              classId,
              className,
              todayDateStr,
              actor?.userId || null,
            ]
          );
        }

        if (rombelId && existingStudent.rombel_name !== rombelName) {
          this.db.execute(
            `UPDATE student_rombel_memberships SET is_current = 0, end_date = ? WHERE student_id = ? AND is_current = 1`,
            [todayDateStr, studentId]
          );
          this.db.execute(
            `INSERT INTO student_rombel_memberships
             (id, student_id, rombel_id, rombel_name, academic_year_id, start_date, is_current, move_reason, changed_by)
             VALUES (?, ?, ?, ?, 'ay-2026-2027-1', ?, 1, 'Pembaruan data profil siswa', ?)`,
            [
              `srm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
              studentId,
              rombelId,
              rombelName,
              todayDateStr,
              actor?.userId || null,
            ]
          );
        }

        this.db.execute(
          `UPDATE students
           SET nisn = ?, name = ?, gender = ?, religion = ?,
               class_id = ?, class_name = ?, rombel_id = ?, rombel_name = ?,
               wali_name = ?, wali_id = ?, is_demo = ?,
               account_status = ?, updated_at = datetime('now')
           WHERE id = ?`,
          [
            nisn,
            name,
            gender,
            religion,
            classId,
            className,
            rombelId,
            rombelName,
            waliName,
            waliId,
            isDemo,
            status,
            studentId,
          ]
        );
      } else {
        const plainPass = String(rawBody.password || '123').trim();
        const passwordHash = hashPassword(plainPass);

        this.db.execute(
          `INSERT INTO users (id, username, password_hash, password_algo, full_name, account_status)
           VALUES (?, ?, ?, 'scrypt', ?, ?)`,
          [userId, cleanUsername, passwordHash, name, status]
        );

        this.db.execute(
          `INSERT OR IGNORE INTO user_roles (id, user_id, role_id, scope_type, scope_id, is_active, assigned_by)
           VALUES (?, ?, 'role-siswa', 'SELF', ?, 1, ?)`,
          [`ur-${studentId}`, userId, studentId, actor?.userId || null]
        );

        this.db.execute(
          `INSERT INTO students
           (id, user_id, nisn, name, gender, religion, cohort_id, class_id, class_name, rombel_id, rombel_name,
            wali_name, wali_id, is_demo, xp, poin_hebat, level, streak, best_streak, predicate, avatar_url, account_status)
           VALUES (?, ?, ?, ?, ?, ?, 'coh-2025', ?, ?, ?, ?, ?, ?, ?, 0, 0, 1, 0, 0, 'Perlu Pembinaan', ?, ?)`,
          [
            studentId,
            userId,
            nisn,
            name,
            gender,
            religion,
            classId,
            className,
            rombelId,
            rombelName,
            waliName,
            waliId,
            isDemo,
            avatarUrl,
            status,
          ]
        );

        this.db.execute(
          `INSERT INTO student_class_memberships
           (id, student_id, class_id, class_name, academic_year_id, start_date, is_current, move_reason, changed_by)
           VALUES (?, ?, ?, ?, 'ay-2026-2027-1', ?, 1, 'Pendaftaran awal siswa', ?)`,
          [
            `scm-${studentId}-init`,
            studentId,
            classId,
            className,
            todayDateStr,
            actor?.userId || null,
          ]
        );

        if (rombelId) {
          this.db.execute(
            `INSERT INTO student_rombel_memberships
             (id, student_id, rombel_id, rombel_name, academic_year_id, start_date, is_current, move_reason, changed_by)
             VALUES (?, ?, ?, ?, 'ay-2026-2027-1', ?, 1, 'Penempatan awal rombel', ?)`,
            [
              `srm-${studentId}-init`,
              studentId,
              rombelId,
              rombelName,
              todayDateStr,
              actor?.userId || null,
            ]
          );
        }

        this.db.execute(
          `INSERT OR IGNORE INTO streak_records (id, student_id, current_streak, longest_streak, streak_status)
           VALUES (?, ?, 0, 0, 'INACTIVE')`,
          [`str-${studentId}`, studentId]
        );
      }

      this.audit.log({
        actor_user_id: actor?.userId || null,
        actor_username: actor?.username || 'admin',
        actor_role: actor?.activeRole || 'SUPER_ADMIN',
        action: existingStudent ? 'STUDENT_ACCOUNT_UPDATE' : 'STUDENT_ACCOUNT_CREATE',
        entity_type: 'students',
        entity_id: studentId,
        after_state: { id: studentId, nisn, name, className, rombelName, status },
      });

      return { status: 'ok', id: studentId };
    });
  }

  public deleteOrArchiveStudent(
    studentId: string,
    mode: 'ARCHIVE' | 'INACTIVE' | 'DELETE',
    actor?: AuthSessionContext | null
  ) {
    const existing = this.db.queryOne<any>(`SELECT * FROM students WHERE id = ?`, [studentId]);
    if (!existing) {
      throw new NotFoundError(`Siswa '${studentId}' tidak ditemukan.`);
    }

    return this.db.transaction(() => {
      if (mode === 'DELETE') {
        this.db.execute(`DELETE FROM students WHERE id = ?`, [studentId]);
        this.db.execute(`DELETE FROM users WHERE id = ?`, [existing.user_id]);
      } else {
        const targetStatus = mode === 'INACTIVE' ? 'INACTIVE' : 'ARCHIVED';
        this.db.execute(
          `UPDATE students SET account_status = ?, updated_at = datetime('now') WHERE id = ?`,
          [targetStatus, studentId]
        );
        this.db.execute(
          `UPDATE users SET account_status = ?, updated_at = datetime('now') WHERE id = ?`,
          [targetStatus, existing.user_id]
        );
        // Revoke active sessions immediately when account is deactivated/archived
        this.db.execute(
          `UPDATE sessions SET revoked_at = datetime('now'), revoked_reason = ? WHERE user_id = ? AND revoked_at IS NULL`,
          [`ACCOUNT_${targetStatus}`, existing.user_id]
        );
      }

      this.audit.log({
        actor_user_id: actor?.userId || null,
        actor_username: actor?.username || 'admin',
        actor_role: actor?.activeRole || 'SUPER_ADMIN',
        action: `STUDENT_ACCOUNT_${mode}`,
        entity_type: 'students',
        entity_id: studentId,
      });

      return { status: 'ok', id: studentId, mode };
    });
  }

  public importStudentsBatch(rows: any[], todayDateStr: string, actor?: AuthSessionContext | null) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new ValidationError('Daftar siswa untuk impor kosong.');
    }
    let importedCount = 0;
    for (const r of rows) {
      if (!r.name || !r.nisn) continue;
      this.saveStudent(r, todayDateStr, actor);
      importedCount++;
    }
    return { status: 'ok', importedCount };
  }

  public saveTeacher(rawBody: any, todayDateStr: string, actor?: AuthSessionContext | null) {
    const name = String(rawBody.name || '').trim();
    const nip = String(rawBody.nip || '').trim();
    if (!name || !nip) {
      throw new ValidationError('Nama lengkap dan NIP guru wajib diisi.');
    }

    const cleanUsername = String(rawBody.username || nip).trim().toLowerCase();
    const teacherId = String(rawBody.id || `tch-${cleanUsername}`).trim();
    const userId = `usr-${teacherId}`;

    // Multiple roles support via checkboxes
    const isWalas = Boolean(rawBody.is_walas ?? (rawBody.assignment_type === 'WALAS' || rawBody.roles_csv?.includes('WALAS')));
    const isWali = Boolean(rawBody.is_wali ?? (rawBody.assignment_type === 'GURU_WALI' || rawBody.roles_csv?.includes('WALI')));
    const isTim7Kaih = Boolean(rawBody.is_tim_7_kaih ?? (rawBody.assignment_type === 'TIM_7_KAIH' || rawBody.roles_csv?.includes('TIM_7_KAIH')));
    const isAdmin = Boolean(rawBody.is_admin ?? (rawBody.assignment_type === 'ADMIN' || rawBody.roles_csv?.includes('ADMIN')));
    const isDemo = rawBody.is_demo ? 1 : 0;

    const assignedRoles: string[] = [];
    if (isWalas) assignedRoles.push('WALAS');
    if (isWali) assignedRoles.push('WALI');
    if (isTim7Kaih) assignedRoles.push('TIM_7_KAIH');
    if (isAdmin) assignedRoles.push('ADMIN');
    if (assignedRoles.length === 0) assignedRoles.push('WALAS');
    const rolesCsv = assignedRoles.join(',');

    const assignmentType = isAdmin ? 'ADMIN' : (isWalas ? 'WALAS' : (isWali ? 'GURU_WALI' : 'TIM_7_KAIH'));
    const className = isWalas && rawBody.class_name ? String(rawBody.class_name).trim() : null;
    const rombelName = rawBody.rombel_name ? String(rawBody.rombel_name).trim() : null;
    const roleTitle = String(rawBody.role || (isWalas ? `Wali Kelas ${className || ''}` : (isWali ? 'Guru Wali' : 'Tim 7 KAIH'))).trim();
    const status = String(rawBody.account_status || 'ACTIVE').toUpperCase();
    const avatarUrl =
      rawBody.avatar_url ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanUsername)}`;

    return this.db.transaction(() => {
      const existing = this.db.queryOne<any>(`SELECT * FROM teachers WHERE id = ?`, [teacherId]);

      if (existing) {
        if (rawBody.password && String(rawBody.password).trim()) {
          const newHash = hashPassword(String(rawBody.password).trim());
          this.db.execute(
            `UPDATE users
             SET username = ?, full_name = ?, password_hash = ?, password_algo = 'scrypt',
                 account_status = ?, updated_at = datetime('now')
             WHERE id = ?`,
            [cleanUsername, name, newHash, status, existing.user_id]
          );
        } else {
          this.db.execute(
            `UPDATE users
             SET username = ?, full_name = ?, account_status = ?, updated_at = datetime('now')
             WHERE id = ?`,
            [cleanUsername, name, status, existing.user_id]
          );
        }

        this.db.execute(
          `UPDATE teachers
           SET nip = ?, name = ?, role_title = ?, assignment_type = ?,
               class_name = ?, rombel_name = ?, roles_csv = ?, is_demo = ?,
               account_status = ?, updated_at = datetime('now')
           WHERE id = ?`,
          [nip, name, roleTitle, assignmentType, className, rombelName, rolesCsv, isDemo, status, teacherId]
        );
      } else {
        const plainPass = String(rawBody.password || '123').trim();
        const passwordHash = hashPassword(plainPass);

        this.db.execute(
          `INSERT INTO users (id, username, password_hash, password_algo, full_name, account_status)
           VALUES (?, ?, ?, 'scrypt', ?, ?)`,
          [userId, cleanUsername, passwordHash, name, status]
        );

        this.db.execute(
          `INSERT INTO teachers
           (id, user_id, nip, name, role_title, assignment_type, class_name, rombel_name, roles_csv, is_demo, avatar_url, account_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            teacherId,
            userId,
            nip,
            name,
            roleTitle,
            assignmentType,
            className,
            rombelName,
            rolesCsv,
            isDemo,
            avatarUrl,
            status,
          ]
        );
      }

      const targetUserId = existing ? existing.user_id : userId;

      // Rebuild RBAC `user_roles` & `teacher_assignments` according to assignedRoles
      this.db.execute(`DELETE FROM user_roles WHERE user_id = ?`, [targetUserId]);
      this.db.execute(`UPDATE teacher_assignments SET is_active = 0 WHERE teacher_id = ?`, [
        teacherId,
      ]);

      if (isAdmin) {
        this.db.execute(
          `INSERT INTO user_roles (id, user_id, role_id, scope_type, scope_id, is_active)
           VALUES (?, ?, 'role-super-admin', 'GLOBAL', 'GLOBAL', 1)`,
          [`ur-${teacherId}-admin`, targetUserId]
        );
      }
      if (isTim7Kaih) {
        this.db.execute(
          `INSERT OR IGNORE INTO user_roles (id, user_id, role_id, scope_type, scope_id, is_active)
           VALUES (?, ?, 'role-tim-7kaih', 'SCHOOL', 'SCHOOL', 1)`,
          [`ur-${teacherId}-7kaih`, targetUserId]
        );
        this.db.execute(
          `INSERT OR REPLACE INTO teacher_assignments
           (id, teacher_id, academic_year_id, assignment_role, start_date, is_active)
           VALUES (?, ?, 'ay-2026-2027-1', 'TIM_7_KAIH', ?, 1)`,
          [`ta-${teacherId}-tim7kaih`, teacherId, todayDateStr]
        );
      }
      if (isWalas && className) {
        const classId = this.ensureClassExists(className, name, teacherId);
        this.db.execute(
          `INSERT OR IGNORE INTO user_roles (id, user_id, role_id, scope_type, scope_id, is_active)
           VALUES (?, ?, 'role-guru-walas', 'CLASS', ?, 1)`,
          [`ur-${teacherId}-walas-${classId}`, targetUserId, className]
        );
        this.db.execute(
          `INSERT OR REPLACE INTO teacher_assignments
           (id, teacher_id, academic_year_id, assignment_role, class_id, start_date, is_active)
           VALUES (?, ?, 'ay-2026-2027-1', 'GURU_WALAS', ?, ?, 1)`,
          [`ta-${teacherId}-walas-${classId}`, teacherId, classId, todayDateStr]
        );
        this.db.execute(
          `UPDATE classes SET walas_teacher_id = ?, walas_name = ? WHERE name = ?`,
          [teacherId, name, className]
        );
      }
      if (isWali) {
        this.db.execute(
          `INSERT OR IGNORE INTO user_roles (id, user_id, role_id, scope_type, scope_id, is_active)
           VALUES (?, ?, 'role-guru-wali', 'GLOBAL', 'GLOBAL', 1)`,
          [`ur-${teacherId}-wali`, targetUserId]
        );
        this.db.execute(
          `INSERT OR REPLACE INTO teacher_assignments
           (id, teacher_id, academic_year_id, assignment_role, start_date, is_active)
           VALUES (?, ?, 'ay-2026-2027-1', 'GURU_WALI', ?, 1)`,
          [`ta-${teacherId}-wali`, teacherId, todayDateStr]
        );
      }

      this.audit.log({
        actor_user_id: actor?.userId || null,
        actor_username: actor?.username || 'admin',
        actor_role: actor?.activeRole || 'SUPER_ADMIN',
        action: existing ? 'TEACHER_ACCOUNT_UPDATE' : 'TEACHER_ACCOUNT_CREATE',
        entity_type: 'teachers',
        entity_id: teacherId,
        after_state: { id: teacherId, nip, name, rolesCsv, className },
      });

      return { status: 'ok', id: teacherId };
    });
  }

  public deleteTeacher(teacherId: string, actor?: AuthSessionContext | null) {
    const existing = this.db.queryOne<any>(`SELECT * FROM teachers WHERE id = ?`, [teacherId]);
    if (!existing) {
      throw new NotFoundError(`Guru '${teacherId}' tidak ditemukan.`);
    }
    return this.db.transaction(() => {
      this.db.execute(`DELETE FROM teachers WHERE id = ?`, [teacherId]);
      this.db.execute(`DELETE FROM users WHERE id = ?`, [existing.user_id]);
      this.audit.log({
        actor_user_id: actor?.userId || null,
        actor_username: actor?.username || 'admin',
        actor_role: actor?.activeRole || 'SUPER_ADMIN',
        action: 'TEACHER_ACCOUNT_DELETE',
        entity_type: 'teachers',
        entity_id: teacherId,
      });
      return { status: 'ok', id: teacherId };
    });
  }

  public getClassesAndRombels() {
    const classes = this.db.queryAll<any>(
      `SELECT c.id, c.name, c.grade_level, c.walas_teacher_id, c.walas_name, c.created_at,
              COUNT(s.id) AS student_count
       FROM classes c
       LEFT JOIN students s ON s.class_name = c.name AND s.account_status = 'ACTIVE'
       WHERE c.is_active = 1
       GROUP BY c.id, c.name, c.grade_level, c.walas_teacher_id, c.walas_name, c.created_at
       ORDER BY c.name ASC`
    );

    const rombels = this.db.queryAll<any>(
      `SELECT r.id, r.name, r.description, r.wali_teacher_id, r.wali_name, r.created_at,
              COUNT(s.id) AS student_count
       FROM rombels r
       LEFT JOIN students s ON s.rombel_name = r.name AND s.account_status = 'ACTIVE'
       WHERE r.is_active = 1
       GROUP BY r.id, r.name, r.description, r.wali_teacher_id, r.wali_name, r.created_at
       ORDER BY r.name ASC`
    );

    return { classes, rombels };
  }

  public saveClass(rawBody: any, actor?: AuthSessionContext | null) {
    const name = String(rawBody.name || '').trim();
    if (!name) throw new ValidationError('Nama kelas wajib diisi.');
    const classId = this.ensureClassExists(name, rawBody.walas_name, rawBody.walas_teacher_id);
    this.audit.log({
      actor_user_id: actor?.userId || null,
      actor_username: actor?.username || 'admin',
      actor_role: actor?.activeRole || 'SUPER_ADMIN',
      action: 'CLASS_UPSERT',
      entity_type: 'classes',
      entity_id: classId,
    });
    return { status: 'ok', id: classId, name };
  }

  public deleteClass(classId: string, actor?: AuthSessionContext | null) {
    this.db.execute(`DELETE FROM classes WHERE id = ? OR name = ?`, [classId, classId]);
    this.audit.log({
      actor_user_id: actor?.userId || null,
      actor_username: actor?.username || 'admin',
      actor_role: actor?.activeRole || 'SUPER_ADMIN',
      action: 'CLASS_DELETE',
      entity_type: 'classes',
      entity_id: classId,
    });
    return { status: 'ok', id: classId };
  }

  public deleteRombel(rombelId: string, actor?: AuthSessionContext | null) {
    this.db.execute(`DELETE FROM rombels WHERE id = ? OR name = ?`, [rombelId, rombelId]);
    this.audit.log({
      actor_user_id: actor?.userId || null,
      actor_username: actor?.username || 'admin',
      actor_role: actor?.activeRole || 'SUPER_ADMIN',
      action: 'ROMBEL_DELETE',
      entity_type: 'rombels',
      entity_id: rombelId,
    });
    return { status: 'ok', id: rombelId };
  }

  public saveRombel(rawBody: any, actor?: AuthSessionContext | null) {
    const name = String(rawBody.name || '').trim();
    if (!name) throw new ValidationError('Nama rombel wajib diisi.');
    const rombelId = this.ensureRombelExists(
      name,
      rawBody.description,
      rawBody.wali_name,
      rawBody.wali_teacher_id
    );
    this.audit.log({
      actor_user_id: actor?.userId || null,
      actor_username: actor?.username || 'admin',
      actor_role: actor?.activeRole || 'SUPER_ADMIN',
      action: 'ROMBEL_UPSERT',
      entity_type: 'rombels',
      entity_id: rombelId || name,
    });
    return { status: 'ok', id: rombelId, name };
  }

  /**
   * Moves a student to a new Class and/or Rombel while preserving 100% of their
   * historical journals, habit entries, points, and streaks, and recording the
   * membership transition in `student_class_memberships` and `student_rombel_memberships`.
   */
  public moveStudentGroup(
    studentId: string,
    targetClassName: string | undefined,
    targetRombelName: string | undefined,
    todayDateStr: string,
    actor?: AuthSessionContext | null,
    reason = 'Mutasi penempatan kelas/rombel oleh Admin'
  ) {
    const student = this.db.queryOne<any>(`SELECT * FROM students WHERE id = ?`, [studentId]);
    if (!student) {
      throw new NotFoundError(`Siswa '${studentId}' tidak ditemukan.`);
    }

    return this.db.transaction(() => {
      let newClassId = student.class_id;
      let newClassName = student.class_name;
      if (targetClassName && targetClassName.trim() && targetClassName.trim() !== student.class_name) {
        newClassName = targetClassName.trim();
        newClassId = this.ensureClassExists(newClassName);

        this.db.execute(
          `UPDATE student_class_memberships SET is_current = 0, end_date = ? WHERE student_id = ? AND is_current = 1`,
          [todayDateStr, studentId]
        );
        this.db.execute(
          `INSERT INTO student_class_memberships
           (id, student_id, class_id, class_name, academic_year_id, start_date, is_current, move_reason, changed_by)
           VALUES (?, ?, ?, ?, 'ay-2026-2027-1', ?, 1, ?, ?)`,
          [
            `scm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
            studentId,
            newClassId,
            newClassName,
            todayDateStr,
            reason,
            actor?.userId || null,
          ]
        );
      }

      let newRombelId = student.rombel_id;
      let newRombelName = student.rombel_name;
      if (targetRombelName && targetRombelName.trim() && targetRombelName.trim() !== student.rombel_name) {
        newRombelName = targetRombelName.trim();
        newRombelId = this.ensureRombelExists(newRombelName);

        this.db.execute(
          `UPDATE student_rombel_memberships SET is_current = 0, end_date = ? WHERE student_id = ? AND is_current = 1`,
          [todayDateStr, studentId]
        );
        if (newRombelId) {
          this.db.execute(
            `INSERT INTO student_rombel_memberships
             (id, student_id, rombel_id, rombel_name, academic_year_id, start_date, is_current, move_reason, changed_by)
             VALUES (?, ?, ?, ?, 'ay-2026-2027-1', ?, 1, ?, ?)`,
            [
              `srm-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
              studentId,
              newRombelId,
              newRombelName,
              todayDateStr,
              reason,
              actor?.userId || null,
            ]
          );
        }
      }

      this.db.execute(
        `UPDATE students
         SET class_id = ?, class_name = ?, rombel_id = ?, rombel_name = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [newClassId, newClassName, newRombelId, newRombelName, studentId]
      );

      this.audit.log({
        actor_user_id: actor?.userId || null,
        actor_username: actor?.username || 'admin',
        actor_role: actor?.activeRole || 'SUPER_ADMIN',
        action: 'STUDENT_MOVE_GROUP',
        entity_type: 'students',
        entity_id: studentId,
        before_state: { class_name: student.class_name, rombel_name: student.rombel_name },
        after_state: { class_name: newClassName, rombel_name: newRombelName },
        reason,
      });

      return {
        status: 'ok',
        student_id: studentId,
        class_name: newClassName,
        rombel_name: newRombelName,
      };
    });
  }

  public saveTeacherNotes(
    studentId: string,
    walasNotes: string,
    walasRecommendation: string,
    actor?: AuthSessionContext | null
  ) {
    this.db.execute(
      `UPDATE students SET walas_notes = ?, walas_recommendation = ?, updated_at = datetime('now') WHERE id = ?`,
      [walasNotes || '', walasRecommendation || '', studentId]
    );
    this.audit.log({
      actor_user_id: actor?.userId || null,
      actor_username: actor?.username || 'walas',
      actor_role: actor?.activeRole || 'GURU_WALAS',
      action: 'WALAS_NOTES_SAVE',
      entity_type: 'students',
      entity_id: studentId,
      after_state: { walas_notes: walasNotes, walas_recommendation: walasRecommendation },
    });
    return { status: 'ok', student_id: studentId };
  }
}
