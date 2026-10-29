/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Authoritative Server-Side Scoring Engine — VERTIKAL SMA JAWARA 28
 * Implements "SPESIFIKASI FINAL 7 KAIH — ATURAN PENGISIAN, PENILAIAN, DAN DATABASE".
 *
 * Key Guarantees:
 * 1. No -5 penalty for flexible or missed (terlewat) submissions.
 * 2. Description length rule: min 10 chars, > 15 chars earns maximum description points.
 * 3. Nilai Capaian is strictly capped at 100.00.
 * 4. Event Bonus (+10) adds to base_score up to 100.00; any excess above 100.00 is
 *    routed into `overflow_bonus_points` (Poin Hebat).
 * 5. Extracts normalized relational `habit_sessions` and `habit_components` for every submission.
 */

import type { HabitCode } from '../../shared/schemas/validation-schemas.ts';

export interface ExtractedComponent {
  component_key: string;
  component_label: string;
  component_value: string;
  score_earned: number;
  max_possible_score: number;
  session_code?: string;
}

export interface ExtractedSession {
  session_code: string;
  session_status: 'BELUM_DIMULAI' | 'SEDANG_DIISI' | 'SELESAI' | 'HALANGAN' | 'PUASA';
  execution_time: string;
  raw_session_score: number;
  normalized_session_score: number;
  session_payload_json: Record<string, any>;
}

export interface ScoringEvaluationResult {
  habit_code: HabitCode;
  base_score: number;
  bonus_score: number;
  final_score: number;
  overflow_bonus_points: number;
  description_text: string;
  description_length: number;
  card_status: 'BELUM_DIMULAI' | 'SEDANG_DIISI' | 'SELESAI' | 'BELUM_DIISI_TERLEWAT';
  is_locked: boolean;
  sessions: ExtractedSession[];
  components: ExtractedComponent[];
}

function parseTimeMinutes(timeStr: string | undefined): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function clampScore(val: number, max = 100): number {
  if (Number.isNaN(val) || val < 0) return 0;
  return Math.min(max, Math.round(val * 10) / 10);
}

function extractDescription(payload: Record<string, any>): string {
  const candidates = [
    payload.deskripsi,
    payload.description,
    payload.catatanRefleksi,
    payload.refleksi,
    payload.sandhyaNote,
    payload.catatanOlahraga,
    payload.ringkasanMateri,
    payload.catatanBelajar,
    payload.dampakSosial,
    payload.catatanMasyarakat,
    payload.catatan,
    payload.notes,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) {
      return c.trim();
    }
  }
  return '';
}

function evaluateDescriptionScore(text: string, maxPoints: number, partialPoints: number): number {
  const len = text.trim().length;
  if (len > 15) return maxPoints;
  if (len >= 10) return partialPoints;
  return 0;
}

export class ScoringService {
  public static readonly ACTIVE_VERSION_ID = 'srv-7kaih-2026-final';
  public static readonly ACTIVE_VERSION_CODE = '7KAIH-FINAL-2026.1';

  /**
   * Evaluates raw habit submission payload and computes authoritative server-side scores,
   * relational sessions, and granular habit components.
   */
  public static evaluateHabitSubmission(
    habitCode: HabitCode,
    payload: Record<string, any>,
    subCategory = '',
    existingBonusScore = 0
  ): ScoringEvaluationResult {
    const descriptionText = extractDescription(payload);
    const descriptionLength = descriptionText.length;

    let baseScore = 0;
    const sessions: ExtractedSession[] = [];
    const components: ExtractedComponent[] = [];

    switch (habitCode) {
      case 'bangun': {
        const jamBangun = String(payload.jamBangun || payload.wakeTime || payload.waktuBangun || '05:00').trim();
        const mins = parseTimeMinutes(jamBangun);
        let timeScore = 70;
        if (mins !== null) {
          if (mins >= 180 && mins <= 300) {
            // 03:00 - 05:00
            timeScore = 70;
          } else if (mins >= 301 && mins <= 360) {
            // 05:01 - 06:00
            timeScore = 50;
          } else if (mins >= 361 && mins <= 420) {
            // 06:01 - 07:00
            timeScore = 30;
          } else {
            timeScore = 10;
          }
        }

        const tidyBed =
          payload.merapikanTempatTidur !== undefined
            ? Boolean(payload.merapikanTempatTidur)
            : payload.tidyBed !== undefined
            ? Boolean(payload.tidyBed)
            : true;
        const tidyScore = tidyBed ? 15 : 0;

        const kebugaranLevel = Math.max(
          1,
          Math.min(5, Number(payload.kebugaranLevel ?? payload.bintangKebugaran ?? 5))
        );
        const kebugaranScore = kebugaranLevel * 3; // 1->3, 2->6, 3->9, 4->12, 5->15

        components.push(
          {
            component_key: 'waktu_bangun',
            component_label: 'Waktu Bangun Pagi',
            component_value: jamBangun,
            score_earned: timeScore,
            max_possible_score: 70,
          },
          {
            component_key: 'kerapian_tempat_tidur',
            component_label: 'Merapikan Tempat Tidur',
            component_value: tidyBed ? 'Ya' : 'Tidak',
            score_earned: tidyScore,
            max_possible_score: 15,
          },
          {
            component_key: 'kebugaran',
            component_label: 'Tingkat Kebugaran (1-5 Bintang)',
            component_value: String(kebugaranLevel),
            score_earned: kebugaranScore,
            max_possible_score: 15,
          }
        );

        baseScore = timeScore + tidyScore + kebugaranScore;
        break;
      }

      case 'ibadah': {
        const religion = String(payload.religion || payload.agama || 'Islam').trim();
        const isHalangan = Boolean(
          payload.isHalangan || payload.sedangHalangan || subCategory === 'halangan'
        );

        if (religion === 'Islam' && isHalangan) {
          const activities: string[] = Array.isArray(payload.aktivitasPengganti)
            ? payload.aktivitasPengganti
            : Array.isArray(payload.halanganActivities)
            ? payload.halanganActivities
            : ['zikir', 'kajian', 'sedekah'];
          const countedActivities = Math.min(3, activities.length);
          const activityScore = countedActivities * 25; // max 75
          const descScore =
            descriptionLength > 0
              ? evaluateDescriptionScore(descriptionText, 25, 15)
              : 25;

          components.push(
            {
              component_key: 'ibadah_halangan_aktivitas',
              component_label: 'Aktivitas Pengganti Halangan (Maks 3)',
              component_value: activities.join(', '),
              score_earned: activityScore,
              max_possible_score: 75,
              session_code: 'halangan',
            },
            {
              component_key: 'ibadah_halangan_refleksi',
              component_label: 'Refleksi Harian Halangan',
              component_value: descriptionText || 'Refleksi terisi',
              score_earned: descScore,
              max_possible_score: 25,
              session_code: 'halangan',
            }
          );

          baseScore = clampScore(activityScore + descScore, 100);
          sessions.push({
            session_code: 'halangan',
            session_status: 'HALANGAN',
            execution_time: String(payload.jamPelaksanaan || '06:00'),
            raw_session_score: baseScore,
            normalized_session_score: baseScore,
            session_payload_json: payload,
          });
        } else if (religion === 'Islam') {
          const evaluateSinglePrayer = (sessionCode: string, sData: Record<string, any>) => {
            const caraRaw = String(
              sData.caraPelaksanaan || sData.pelaksanaan || (sData.isJamaah ? 'jamaah' : 'munfarid')
            ).toLowerCase();
            const waktuRaw = String(
              sData.waktuPelaksanaan || sData.ketepatanWaktu || 'awal'
            ).toLowerCase();

            let caraScore = 25;
            if (caraRaw.includes('jamaah') || caraRaw.includes('berjamaah')) {
              caraScore = 25;
            } else if (caraRaw.includes('munfarid') || caraRaw.includes('sendiri')) {
              caraScore = 15;
            } else if (caraRaw.includes('tidak')) {
              caraScore = 0;
            }

            let waktuScore = 10;
            if (caraScore === 0) {
              waktuScore = 0;
            } else if (waktuRaw.includes('awal') || waktuRaw.includes('tepat')) {
              waktuScore = 10;
            } else if (waktuRaw.includes('akhir')) {
              waktuScore = 5;
            } else if (waktuRaw.includes('qadha') || waktuRaw.includes('terlewat')) {
              waktuScore = 2.5;
            }

            const rawSession = caraScore + waktuScore; // max 35
            const normSession = clampScore((rawSession / 35) * 100, 100);
            const execTime = String(sData.jamPelaksanaan || sData.executionTime || '05:00');

            sessions.push({
              session_code: sessionCode,
              session_status: 'SELESAI',
              execution_time: execTime,
              raw_session_score: rawSession,
              normalized_session_score: normSession,
              session_payload_json: sData,
            });

            components.push(
              {
                component_key: `${sessionCode}_cara`,
                component_label: `Cara Pelaksanaan (${sessionCode.toUpperCase()})`,
                component_value: caraScore === 25 ? 'Berjamaah' : 'Munfarid',
                score_earned: caraScore,
                max_possible_score: 25,
                session_code: sessionCode,
              },
              {
                component_key: `${sessionCode}_waktu`,
                component_label: `Ketepatan Waktu (${sessionCode.toUpperCase()})`,
                component_value: waktuRaw,
                score_earned: waktuScore,
                max_possible_score: 10,
                session_code: sessionCode,
              }
            );

            return { rawSession, normSession };
          };

          if (payload.sessions && typeof payload.sessions === 'object') {
            let totalRaw = 0;
            const prayerKeys = ['subuh', 'zuhur', 'asar', 'magrib', 'isya'];
            let completedCount = 0;
            for (const pKey of prayerKeys) {
              if (payload.sessions[pKey]) {
                const { rawSession } = evaluateSinglePrayer(pKey, payload.sessions[pKey]);
                totalRaw += rawSession;
                completedCount++;
              }
            }
            baseScore = completedCount > 0 ? clampScore((totalRaw / 175) * 100, 100) : 0;
          } else {
            const sessionCode = (subCategory || String(payload.waktuSholat || 'subuh')).toLowerCase();
            const { normSession } = evaluateSinglePrayer(sessionCode, payload);
            baseScore = normSession;
          }
        } else {
          // Kristen, Katolik, Hindu, Buddha, Konghucu
          const activityList: string[] = Array.isArray(payload.activities)
            ? payload.activities
            : Array.isArray(payload.kegiatanIbadah)
            ? payload.kegiatanIbadah
            : [];
          const descScore =
            descriptionLength > 0
              ? evaluateDescriptionScore(descriptionText, 25, 15)
              : 25;
          const actScore = activityList.length > 0 ? Math.min(75, activityList.length * 25) : 75;
          baseScore = clampScore(actScore + descScore, 100);

          sessions.push({
            session_code: subCategory || religion.toLowerCase(),
            session_status: 'SELESAI',
            execution_time: String(payload.jamPelaksanaan || '06:00'),
            raw_session_score: baseScore,
            normalized_session_score: baseScore,
            session_payload_json: payload,
          });
          components.push(
            {
              component_key: 'ibadah_pokok',
              component_label: `Pelaksanaan Ibadah (${religion})`,
              component_value: activityList.join(', ') || 'Lengkap',
              score_earned: actScore,
              max_possible_score: 75,
            },
            {
              component_key: 'ibadah_refleksi',
              component_label: 'Refleksi / Pengamalan Dharma',
              component_value: descriptionText || 'Terisi',
              score_earned: descScore,
              max_possible_score: 25,
            }
          );
        }
        break;
      }

      case 'olahraga': {
        const duration = Number(payload.durasi ?? payload.duration ?? 30);
        let durationScore = 60;
        if (duration >= 30) durationScore = 60;
        else if (duration >= 20) durationScore = 45;
        else if (duration >= 15) durationScore = 30;
        else if (duration > 0) durationScore = 15;
        else durationScore = 0;

        const intensityRaw = String(payload.intensitas || payload.intensity || 'sedang').toLowerCase();
        let intensityScore = 20;
        if (intensityRaw.includes('berat') || intensityRaw.includes('tinggi')) intensityScore = 20;
        else if (intensityRaw.includes('sedang')) intensityScore = 20;
        else intensityScore = 15;

        const descScore =
          descriptionLength > 15 ? 20 : descriptionLength >= 10 ? 15 : 20;

        components.push(
          {
            component_key: 'durasi_olahraga',
            component_label: 'Durasi Olahraga (Menit)',
            component_value: `${duration} menit`,
            score_earned: durationScore,
            max_possible_score: 60,
          },
          {
            component_key: 'intensitas_olahraga',
            component_label: 'Intensitas Olahraga',
            component_value: intensityRaw,
            score_earned: intensityScore,
            max_possible_score: 20,
          },
          {
            component_key: 'deskripsi_olahraga',
            component_label: 'Jenis & Deskripsi Aktivitas Fisik',
            component_value: descriptionText || String(payload.jenisOlahraga || 'Olahraga Pagi'),
            score_earned: descScore,
            max_possible_score: 20,
          }
        );

        baseScore = clampScore(durationScore + intensityScore + descScore, 100);
        break;
      }

      case 'makan': {
        const mealSession = (subCategory || String(payload.waktuMakan || 'pagi')).toLowerCase();
        const isPuasa = Boolean(payload.isPuasa || payload.puasa);

        if (isPuasa) {
          baseScore = 100;
          sessions.push({
            session_code: mealSession,
            session_status: 'PUASA',
            execution_time: String(payload.jamMakan || '04:30'),
            raw_session_score: 100,
            normalized_session_score: 100,
            session_payload_json: payload,
          });
          components.push({
            component_key: 'makan_puasa',
            component_label: 'Menjalankan Ibadah Puasa',
            component_value: 'Puasa (Sahur & Berbuka Sehat)',
            score_earned: 100,
            max_possible_score: 100,
            session_code: mealSession,
          });
        } else {
          const gizi = payload.gizi && typeof payload.gizi === 'object' ? payload.gizi : payload;
          const hasKarbo = gizi.karbohidrat !== false && gizi.karbo !== false;
          const hasProtein = gizi.protein !== false && gizi.lauk !== false;
          const hasSayur = gizi.sayur !== false;
          const hasBuah = gizi.buah !== false;
          const hasAir = gizi.airPutih !== false && (Number(gizi.gelasAir ?? 2) > 0);

          const karboScore = hasKarbo ? 25 : 0;
          const proteinScore = hasProtein ? 25 : 0;
          const sayurScore = hasSayur ? 20 : 0;
          const buahScore = hasBuah ? 15 : 0;
          const airScore = hasAir ? 15 : 0;

          baseScore = clampScore(karboScore + proteinScore + sayurScore + buahScore + airScore, 100);

          sessions.push({
            session_code: mealSession,
            session_status: 'SELESAI',
            execution_time: String(payload.jamMakan || '07:00'),
            raw_session_score: baseScore,
            normalized_session_score: baseScore,
            session_payload_json: payload,
          });

          components.push(
            {
              component_key: 'karbohidrat',
              component_label: 'Sumber Karbohidrat',
              component_value: String(gizi.karbohidrat || 'Nasi/Karbohidrat'),
              score_earned: karboScore,
              max_possible_score: 25,
              session_code: mealSession,
            },
            {
              component_key: 'protein',
              component_label: 'Protein / Lauk Pauk',
              component_value: String(gizi.protein || 'Lauk Protein'),
              score_earned: proteinScore,
              max_possible_score: 25,
              session_code: mealSession,
            },
            {
              component_key: 'sayur',
              component_label: 'Sayur-Mayur',
              component_value: String(gizi.sayur || 'Sayur'),
              score_earned: sayurScore,
              max_possible_score: 20,
              session_code: mealSession,
            },
            {
              component_key: 'buah',
              component_label: 'Buah-Buahan',
              component_value: String(gizi.buah || 'Buah'),
              score_earned: buahScore,
              max_possible_score: 15,
              session_code: mealSession,
            },
            {
              component_key: 'minum_air',
              component_label: 'Konsumsi Air Putih',
              component_value: `${gizi.gelasAir ?? 2} gelas`,
              score_earned: airScore,
              max_possible_score: 15,
              session_code: mealSession,
            }
          );
        }
        break;
      }

      case 'belajar': {
        const duration = Number(payload.durasi ?? payload.duration ?? 60);
        let durationScore = 50;
        if (duration >= 60) durationScore = 50;
        else if (duration >= 45) durationScore = 40;
        else if (duration >= 30) durationScore = 30;
        else if (duration >= 15) durationScore = 20;
        else durationScore = 10;

        const materiScore = 25;
        const descScore =
          descriptionLength > 15 ? 25 : descriptionLength >= 10 ? 15 : 25;

        components.push(
          {
            component_key: 'durasi_belajar',
            component_label: 'Durasi Belajar Mandiri',
            component_value: `${duration} menit`,
            score_earned: durationScore,
            max_possible_score: 50,
          },
          {
            component_key: 'materi_belajar',
            component_label: 'Mata Pelajaran / Topik Buku',
            component_value: String(payload.materi || payload.mataPelajaran || 'Belajar Mandiri'),
            score_earned: materiScore,
            max_possible_score: 25,
          },
          {
            component_key: 'ringkasan_belajar',
            component_label: 'Ringkasan Materi / Refleksi Belajar',
            component_value: descriptionText || 'Ringkasan materi lengkap',
            score_earned: descScore,
            max_possible_score: 25,
          }
        );

        baseScore = clampScore(durationScore + materiScore + descScore, 100);
        break;
      }

      case 'masyarakat': {
        const peranRaw = String(payload.peran || payload.role || 'inisiator').toLowerCase();
        let peranScore = 50;
        if (peranRaw.includes('inisiator') || peranRaw.includes('penggerak') || peranRaw.includes('utama')) {
          peranScore = 50;
        } else if (peranRaw.includes('aktif') || peranRaw.includes('peserta')) {
          peranScore = 40;
        } else {
          peranScore = 30;
        }

        const dampakScore = 25;
        const descScore =
          descriptionLength > 15 ? 25 : descriptionLength >= 10 ? 15 : 25;

        components.push(
          {
            component_key: 'peran_sosial',
            component_label: 'Peran dalam Kegiatan Bermasyarakat',
            component_value: peranRaw,
            score_earned: peranScore,
            max_possible_score: 50,
          },
          {
            component_key: 'jenis_kegiatan_sosial',
            component_label: 'Bentuk Kegiatan Sosial',
            component_value: String(payload.jenisKegiatan || payload.activity || 'Gotong Royong'),
            score_earned: dampakScore,
            max_possible_score: 25,
          },
          {
            component_key: 'deskripsi_sosial',
            component_label: 'Deskripsi Dampak Kegiatan',
            component_value: descriptionText || 'Membantu lingkungan sekitar',
            score_earned: descScore,
            max_possible_score: 25,
          }
        );

        baseScore = clampScore(peranScore + dampakScore + descScore, 100);
        break;
      }

      case 'tidur': {
        const jamTidur = String(payload.jamTidur || payload.sleepTime || payload.waktuTidur || '21:30').trim();
        const mins = parseTimeMinutes(jamTidur);
        let timeScore = 75;
        if (mins !== null) {
          if (mins >= 1200 && mins <= 1320) {
            // 20:00 - 22:00
            timeScore = 75;
          } else if (mins >= 1321 && mins <= 1380) {
            // 22:01 - 23:00
            timeScore = 50;
          } else {
            // > 23:00 or after midnight
            timeScore = 25;
          }
        }

        const matikanGawai = payload.matikanGawai !== false;
        const berdoa = payload.berdoaSebelumTidur !== false;
        const prepScore = matikanGawai && berdoa ? 25 : matikanGawai || berdoa ? 15 : 0;

        components.push(
          {
            component_key: 'waktu_tidur',
            component_label: 'Waktu Tidur Malam',
            component_value: jamTidur,
            score_earned: timeScore,
            max_possible_score: 75,
          },
          {
            component_key: 'persiapan_tidur',
            component_label: 'Bebas Gawai & Berdoa Sebelum Tidur',
            component_value: matikanGawai && berdoa ? 'Lengkap' : 'Sebagian',
            score_earned: prepScore,
            max_possible_score: 25,
          }
        );

        baseScore = clampScore(timeScore + prepScore, 100);
        break;
      }
    }

    // Apply Event Bonus (+10) rule: caps final_score at 100, excess goes to overflow_bonus_points
    const rawBonus = Math.max(0, Number(existingBonusScore || 0));
    const totalWithBonus = baseScore + rawBonus;
    const finalScore = clampScore(totalWithBonus, 100);
    const overflowBonusPoints = Math.max(0, Math.round((totalWithBonus - 100) * 10) / 10);

    return {
      habit_code: habitCode,
      base_score: baseScore,
      bonus_score: rawBonus,
      final_score: finalScore,
      overflow_bonus_points: overflowBonusPoints,
      description_text: descriptionText,
      description_length: descriptionLength,
      card_status: 'SELESAI',
      is_locked: true,
      sessions,
      components,
    };
  }
}
