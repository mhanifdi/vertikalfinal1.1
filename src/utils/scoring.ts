/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VERTIKAL SMA JAWARA 28
 * Rumus Penilaian 7 Kebiasaan Anak Indonesia Hebat (7 KAIH)
 * Sesuai Spesifikasi Final & Addendum SMAN 28 Jakarta
 */

import { PRAYER_SCHEDULE, SCORING_RULES } from '../config/scoringConfig';
import { timeToMinutes } from './timeClassifier';

export interface ScoreBreakdownResult {
  baseScore: number;            // Nilai dasar sebelum bonus (0-100)
  bonusScore: number;           // Total bonus yang diperoleh (Adiwiyata, Sunnah, dsb.)
  bonusPoints: number;          // Alias untuk bonusScore
  bonusAppliedToScore?: number; // Poin bonus yang diserap untuk menggenapkan nilai capaian ke 100
  nilaiCapaian: number;         // Nilai Capaian akhir kebiasaan (Maksimal 100)
  finalScore: number;           // Nilai Capaian akhir (alias nilaiCapaian)
  overflowBonus: number;        // Bonus berlebih di atas 100 yang dialihkan ke Poin Hebat
  timePoints?: number;          // Poin komponen waktu (jika ada)
  conditionPoints?: number;     // Poin komponen kondisi/kebugaran (jika ada)
  timeLabel?: string;           // Label deskripsi slot waktu
  isHalangan?: boolean;
  completedPrayers?: number;
  completedCount?: number;
  [key: string]: any;
}

/**
 * Aturan Umum 1.4:
 * Tidak ada pengurangan nilai 5 poin untuk pengisian fleksibel atau formulir terlewat.
 */
export function getHonestyPenalty(_isMissed?: boolean): number {
  return 0;
}

/**
 * Mekanisme Bonus Final (Pasal 9.2 & Aturan Umum 10.1):
 * 1. Nilai Capaian suatu kebiasaan maksimal 100.
 * 2. Bonus menambah Nilai Capaian selama hasil akhirnya belum mencapai 100.
 * 3. Jika Nilai Capaian sudah 100, bonus yang berlebih dialihkan ke Poin Hebat (overflowBonus).
 * 4. Nilai Capaian tidak boleh menjadi 101, 105, atau angka lain di atas 100.
 */
export function applyBonusCapAndOverflow(baseScore: number, bonusScore: number): ScoreBreakdownResult {
  const cleanBase = Math.max(0, Math.round(baseScore * 100) / 100);
  const cleanBonus = Math.max(0, Math.round(bonusScore * 100) / 100);
  const combined = cleanBase + cleanBonus;
  const nilaiCapaian = Math.min(100, Math.round(combined * 10) / 10);
  const bonusAppliedToScore = Math.min(cleanBonus, Math.max(0, 100 - Math.min(100, cleanBase)));
  const overflowBonus = Math.max(0, Math.round((combined - 100) * 10) / 10);

  return {
    baseScore: Math.min(100, cleanBase),
    bonusScore: cleanBonus,
    bonusPoints: cleanBonus,
    bonusAppliedToScore,
    nilaiCapaian,
    finalScore: nilaiCapaian,
    overflowBonus,
  };
}

// ============================================================================
// 1. BANGUN PAGI (Pasal 3)
// Ketepatan waktu bangun (Maks 75):
// 04.00-04.20 = 75, 04.21-04.40 = 70, 04.41-05.00 = 65, 05.01-06.20 = 60, 06.21-06.40 = 55, >06.40 = 50
// Kondisi saat bangun (Maks 25):
// Sangat segar = 25, Cukup segar = 20, Kurang segar = 15, Lemas/mengantuk = 10, Pusing/kelelahan = 5
// ============================================================================
export interface BangunPagiInput {
  timeStr?: string; // e.g. "04:15"
  timeSlot?: string; // e.g. "04.00-04.20"
  kebugaranLevel?: number; // 1 to 5 (5=25, 4=20, 3=15, 2=10, 1=5)
  isMissed?: boolean;
}

export function classifyBangunPagiTime(timeStr: string): { slotId: string; score: number; label: string } {
  const min = timeToMinutes(timeStr);
  if (min < 240) {
    return { slotId: '04.00-04.20', score: 75, label: '04.00 – 04.20 WIB' };
  }
  for (const b of SCORING_RULES.bangunPagi.brackets) {
    if (min >= b.minMin && min <= b.maxMin) {
      return { slotId: b.id, score: b.score, label: b.label };
    }
  }
  return { slotId: '>06.40', score: 50, label: 'Lebih dari 06.40 WIB' };
}

export function calculateBangunPagiScoreWithBreakdown(
  inputOrTime: BangunPagiInput | string,
  kebugaranLevel?: number,
  _isMissed?: boolean
): ScoreBreakdownResult {
  const input: BangunPagiInput = typeof inputOrTime === 'string'
    ? { [inputOrTime.includes(':') ? 'timeStr' : 'timeSlot']: inputOrTime, kebugaranLevel }
    : inputOrTime;

  let timeScore = 50;
  let timeLabel = '>06.40 WIB';

  if (input.timeSlot) {
    const found = SCORING_RULES.bangunPagi.brackets.find((b) => b.id === input.timeSlot);
    if (found) {
      timeScore = found.score;
      timeLabel = found.label;
    }
  } else if (input.timeStr) {
    const classified = classifyBangunPagiTime(input.timeStr);
    timeScore = classified.score;
    timeLabel = classified.label;
  }

  const level = input.kebugaranLevel !== undefined ? Math.max(1, Math.min(5, Number(input.kebugaranLevel))) : 5;
  const kebugaranScore = level * 5; // 1=5, 2=10, 3=15, 4=20, 5=25
  const baseScore = Math.min(100, timeScore + kebugaranScore);

  const res = applyBonusCapAndOverflow(baseScore, 0);
  return {
    ...res,
    timePoints: timeScore,
    conditionPoints: kebugaranScore,
    timeLabel,
  };
}

export function calculateBangunPagiScore(
  inputOrTime: BangunPagiInput | string,
  kebugaranLevel?: number,
  isMissed?: boolean
): number {
  return calculateBangunPagiScoreWithBreakdown(inputOrTime, kebugaranLevel, isMissed).finalScore;
}

// ============================================================================
// 2. BERIBADAH (ISLAM, KRISTEN/KATOLIK, HINDU) (Pasal 2 & Addendum B)
// ============================================================================
export type TimeCategoryChoice = 'awal' | 'tengah' | 'akhir';

export interface ShalatDetailResult {
  score: number;
  category: TimeCategoryChoice;
  categoryLabel: string;
  menitLewat: number;
  waktuSisa: number;
  waktuToleransi: number;
  selangTotal: number;
  formulaText: string;
}

export function getPrayerCategoryScore(category: TimeCategoryChoice): number {
  if (category === 'awal') return SCORING_RULES.shalat.awalWaktu; // 100
  if (category === 'tengah') return SCORING_RULES.shalat.tengahWaktu; // 85
  return SCORING_RULES.shalat.akhirWaktu; // 70
}

export function calculateShalatScoreDetailed(
  prayerKey: 'subuh' | 'zuhur' | 'asar' | 'magrib' | 'isya',
  checkInTimeStr: string,
  isMissed = false,
  manualCategory?: TimeCategoryChoice
): ShalatDetailResult {
  const sched = PRAYER_SCHEDULE[prayerKey] || PRAYER_SCHEDULE.zuhur;
  const adzanMin = timeToMinutes(sched.adzanTime);
  let checkInMin = timeToMinutes(checkInTimeStr || sched.adzanTime);

  if (prayerKey === 'isya' && checkInMin < 240) {
    checkInMin += 1440;
  }

  const selangTotal = sched.totalMinutes;
  const waktuToleransi = Math.max(1, selangTotal - SCORING_RULES.shalat.toleranceDeductionMinutes);
  const akhirShalatMin = adzanMin + selangTotal;
  const menitLewat = Math.max(0, checkInMin - adzanMin);
  const waktuSisa = Math.max(0, akhirShalatMin - checkInMin);

  let cat: TimeCategoryChoice = manualCategory || 'awal';
  if (!manualCategory) {
    const third = selangTotal / 3;
    if (menitLewat <= third) cat = 'awal';
    else if (menitLewat <= third * 2) cat = 'tengah';
    else cat = 'akhir';
  }

  const score = getPrayerCategoryScore(cat);
  const categoryLabel = cat === 'awal' ? 'Awal Waktu (100)' : cat === 'tengah' ? 'Tengah Waktu (85)' : 'Akhir Waktu (70)';
  const formulaText = `Kategori ${categoryLabel} • Jadwal Adzan ${sched.adzanTime} WIB`;

  return {
    score,
    category: cat,
    categoryLabel,
    menitLewat,
    waktuSisa,
    waktuToleransi,
    selangTotal,
    formulaText,
  };
}

export function calculateHinduSandhyaScoreDetailed(
  sandhyaKey: 'pagi' | 'siang' | 'sore',
  checkInTimeStr: string,
  isMissed = false,
  manualCategory?: TimeCategoryChoice
): { score: number; category: TimeCategoryChoice; menitLewat: number; waktuSisa: number; waktuToleransi: number; formulaText: string } {
  const sched = SCORING_RULES.triSandhya[sandhyaKey];
  const idealMin = sched.idealMin;
  const endMin = sched.endMin;
  const checkInMin = timeToMinutes(checkInTimeStr || '06:00');
  const menitLewat = Math.max(0, checkInMin - idealMin);
  const waktuSisa = Math.max(0, endMin - checkInMin);
  const waktuToleransi = endMin - idealMin;

  let cat: TimeCategoryChoice = manualCategory || 'awal';
  if (!manualCategory) {
    if (menitLewat <= 120) cat = 'awal';
    else if (menitLewat <= 240) cat = 'tengah';
    else cat = 'akhir';
  }

  const score = cat === 'awal' ? 100 : cat === 'tengah' ? 85 : 70;
  const catLabel = cat === 'awal' ? 'Awal Waktu (0–2 jam) = 100 pt' : cat === 'tengah' ? 'Tengah Waktu (2–4 jam) = 85 pt' : 'Akhir Waktu (4–6 jam) = 70 pt';

  return {
    score,
    category: cat,
    menitLewat,
    waktuSisa,
    waktuToleransi,
    formulaText: catLabel,
  };
}

export function calculateKristenDoaScoreDetailed(
  doaKey: 'bangun' | 'pergi' | 'makan' | 'pulang' | 'tidur' | 'alkitab' | 'kegiatan',
  checkInTimeStr: string,
  isMissed = false
): { score: number; label: string; formulaText: string } {
  const labelMap: Record<string, string> = {
    bangun: 'Doa bangun tidur',
    alkitab: 'Membaca Alkitab',
    pergi: 'Membaca Alkitab',
    makan: 'Doa saat makan',
    kegiatan: 'Doa sebelum melakukan kegiatan',
    pulang: 'Doa sebelum melakukan kegiatan',
    tidur: 'Doa sebelum tidur',
  };
  return {
    score: 20,
    label: labelMap[doaKey] || 'Kebiasaan Ibadah',
    formulaText: 'Komponen Ibadah Kristen/Katolik = 20 / 20 pt',
  };
}

export function calculateIslamHalanganScore(components: string[] | Record<string, any> = []): {
  completedCount: number;
  selectedComponents: string[];
  finalScore: number;
  score: number;
  baseScore: number;
  valueOf(): number;
} {
  let count = 0;
  let selectedComponents: string[] = [];
  if (Array.isArray(components)) {
    const validIds = SCORING_RULES.shalat.halanganComponents.map((c) => c.id);
    selectedComponents = Array.from(new Set(components.filter((id) => validIds.includes(id))));
    count = selectedComponents.length;
  } else if (typeof components === 'object' && components !== null) {
    if (components.dzikirDoa || components.dzikir_doa) selectedComponents.push('dzikir_doa');
    if (components.murajaahQuran || components.murajaah_quran) selectedComponents.push('murajaah_quran');
    if (components.berbuatBaik || components.berbuat_baik) selectedComponents.push('berbuat_baik');
    if (components.kajianAgama || components.kajian_agama) selectedComponents.push('kajian_agama');
    if (components.kebersihanDiri || components.kebersihan_diri) selectedComponents.push('kebersihan_diri');
    count = selectedComponents.length;
  }
  const score = Math.min(100, count * 20);
  return {
    completedCount: count,
    selectedComponents,
    finalScore: score,
    score,
    baseScore: score,
    valueOf() {
      return this.finalScore;
    },
  };
}

export interface IslamIbadahInput {
  isHalangan?: boolean;
  halanganComponents?: string[];
  halangan?: Record<string, boolean>;
  prayersDone?: ('subuh' | 'zuhur' | 'asar' | 'magrib' | 'isya')[];
  prayerScores?: Record<string, number>;
  subuh?: string;
  dzuhur?: string;
  ashar?: string;
  maghrib?: string;
  isya?: string;
  puasaSunnah?: boolean;
  sunnahActivities?: string;
  sunnahText?: string;
  quranPages?: number;
  surahName?: string;
  isMissed?: boolean;
}

export function calculateIslamScoreWithBreakdown(input: IslamIbadahInput): ScoreBreakdownResult {
  if (input.isHalangan) {
    const halSrc = input.halanganComponents || input.halangan;
    const compScore = halSrc !== undefined
      ? calculateIslamHalanganScore(halSrc as any).finalScore
      : 100;
    const res = applyBonusCapAndOverflow(compScore, 0);
    return {
      ...res,
      isHalangan: true,
      completedPrayers: 5,
      completedCount: Math.round(compScore / 20),
    };
  }

  const prayers = ['subuh', 'zuhur', 'asar', 'magrib', 'isya'] as const;
  const scores: number[] = [];
  let completedPrayers = 0;

  for (const p of prayers) {
    const directCat =
      (input as any)[p] ||
      (p === 'zuhur' ? (input as any)['dzuhur'] : undefined) ||
      (p === 'asar' ? (input as any)['ashar'] : undefined) ||
      (p === 'magrib' ? (input as any)['maghrib'] : undefined);

    const isDone =
      directCat ||
      input.prayersDone?.includes(p) ||
      (p === 'zuhur' && input.prayersDone?.includes('dzuhur' as any)) ||
      (p === 'asar' && input.prayersDone?.includes('ashar' as any)) ||
      (p === 'magrib' && input.prayersDone?.includes('maghrib' as any));

    if (directCat) {
      completedPrayers++;
      scores.push(getPrayerCategoryScore(directCat as TimeCategoryChoice));
    } else if (isDone) {
      completedPrayers++;
      const sc =
        input.prayerScores?.[p] !== undefined
          ? input.prayerScores[p]
          : p === 'zuhur' && input.prayerScores?.['dzuhur'] !== undefined
          ? input.prayerScores['dzuhur']
          : p === 'asar' && input.prayerScores?.['ashar'] !== undefined
          ? input.prayerScores['ashar']
          : p === 'magrib' && input.prayerScores?.['maghrib'] !== undefined
          ? input.prayerScores['maghrib']
          : 100;
      scores.push(Math.max(0, Math.min(100, sc)));
    } else {
      scores.push(0);
    }
  }

  const sumPrayers = scores.reduce((a, b) => a + b, 0);
  const avgPrayer = Math.round((sumPrayers / 5) * 10) / 10;

  const hasSunnah = Boolean(
    input.puasaSunnah ||
    input.sunnahText ||
    (input.sunnahActivities && input.sunnahActivities.trim().length > 0) ||
    (input.quranPages && input.quranPages > 0)
  );
  const bonus = hasSunnah ? SCORING_RULES.shalat.sunnahBonus : 0;

  if (completedPrayers === 0 && !hasSunnah) {
    return { baseScore: 0, bonusScore: 0, bonusPoints: 0, nilaiCapaian: 0, finalScore: 0, overflowBonus: 0, completedPrayers: 0 };
  }

  const res = applyBonusCapAndOverflow(avgPrayer, bonus);
  return {
    ...res,
    completedPrayers,
  };
}

export function calculateIslamScore(input: IslamIbadahInput): number {
  return calculateIslamScoreWithBreakdown(input).finalScore;
}

export interface KristenIbadahInput {
  prayers?: string[];
  prayerScores?: Record<string, number>;
  otherWorship?: boolean;
  bonusKitabSuci?: boolean;
  doaBangunTidur?: boolean;
  bacaAlkitab?: boolean;
  doaMakan?: boolean;
  doaKegiatan?: boolean;
  doaTidur?: boolean;
  notes?: string;
  isMissed?: boolean;
}

export function calculateKristenScoreWithBreakdown(input: KristenIbadahInput): ScoreBreakdownResult {
  let uniqueCount = 0;
  if (input.prayers) {
    uniqueCount = Math.min(5, new Set(input.prayers).size);
  } else {
    if (input.doaBangunTidur) uniqueCount++;
    if (input.bacaAlkitab) uniqueCount++;
    if (input.doaMakan) uniqueCount++;
    if (input.doaKegiatan) uniqueCount++;
    if (input.doaTidur) uniqueCount++;
  }
  const baseScore = uniqueCount * 20;
  const bonus = (input.otherWorship || input.bonusKitabSuci) ? SCORING_RULES.doaKristen.otherWorshipBonus : 0;
  const res = applyBonusCapAndOverflow(baseScore, bonus);
  return {
    ...res,
    completedPrayers: uniqueCount,
  };
}

export function calculateKristenScore(input: KristenIbadahInput): number {
  return calculateKristenScoreWithBreakdown(input).finalScore;
}

export interface HinduIbadahInput {
  triSandhya?: ('pagi' | 'siang' | 'sore')[];
  sandhyaScores?: Record<string, number>;
  pagi?: string;
  siang?: string;
  sore?: string;
  otherWorship?: boolean;
  bacaWeda?: boolean;
  notes?: string;
  isMissed?: boolean;
}

export function calculateHinduScoreWithBreakdown(input: HinduIbadahInput): ScoreBreakdownResult {
  const allSandhya = ['pagi', 'siang', 'sore'] as const;
  let sum = 0;
  let count = 0;

  for (const s of allSandhya) {
    const directCat = (input as any)[s];
    if (directCat) {
      count++;
      sum += getPrayerCategoryScore(directCat as TimeCategoryChoice);
    } else if (input.triSandhya?.includes(s)) {
      count++;
      const sc = input.sandhyaScores?.[s] !== undefined ? input.sandhyaScores[s] : 100;
      sum += Math.max(0, Math.min(100, sc));
    }
  }

  const avgSandhya = Math.round((sum / 3) * 10) / 10;
  const bonus = (input.otherWorship || input.bacaWeda) ? SCORING_RULES.triSandhya.wedaBonus : 0;
  const res = applyBonusCapAndOverflow(avgSandhya, bonus);
  return {
    ...res,
    completedPrayers: count,
  };
}

export function calculateHinduScore(input: HinduIbadahInput): number {
  return calculateHinduScoreWithBreakdown(input).finalScore;
}

/**
 * Universal Beribadah Dispatcher
 */
export function calculateBeribadahScoreWithBreakdown(
  religion: 'Islam' | 'Kristen' | 'Katolik' | 'Hindu' | string,
  input: any
): ScoreBreakdownResult {
  const norm = (religion || 'Islam').toLowerCase();
  if (norm === 'hindu') {
    return calculateHinduScoreWithBreakdown(input);
  }
  if (norm === 'kristen' || norm === 'katolik') {
    return calculateKristenScoreWithBreakdown(input);
  }
  return calculateIslamScoreWithBreakdown(input);
}

// ============================================================================
// 3. BEROLAHRAGA (Pasal 6)
// ============================================================================
export interface OlahragaInput {
  duration?: '<15' | '15-30' | '>30' | '31-60' | '>60';
  durasiKategori?: '<15' | '15-30' | '>30' | '31-60' | '>60' | string;
  activities?: string[];
  mandiri?: boolean;
  kelompok?: boolean;
  jalanTangga?: boolean;
  pemanasan?: boolean;
  ecoCommute?: boolean;
  walkOrBikeToSchoolEco?: boolean;
  deskripsi?: string;
  notes?: string;
  isMissed?: boolean;
}

export function calculateOlahragaScoreWithBreakdown(input: OlahragaInput, _isMissed?: boolean): ScoreBreakdownResult {
  let actScore = 0;
  let ecoBonus = (input.walkOrBikeToSchoolEco || input.ecoCommute) ? 5 : 0;

  const acts = input.activities || [];
  if (input.mandiri || acts.includes('mandiri')) actScore += 10;
  if (input.kelompok || acts.includes('kelompok')) actScore += 10;
  if (input.jalanTangga || acts.includes('jalanTangga')) actScore += 10;
  if (input.pemanasan || acts.includes('pemanasan') || acts.includes('stretching')) actScore += 10;
  if (acts.includes('bersepedaAdiwiyata') || acts.includes('sepedaJalanSekolah')) {
    ecoBonus = 5;
  }

  const durKey = input.durasiKategori || input.duration || '>30';
  let durScore = 45;
  if (durKey === '<15') durScore = 25;
  else if (durKey === '15-30') durScore = 35;
  else durScore = 45;

  const descText = (input.deskripsi || input.notes || '').trim();
  let descScore = 0;
  if (descText.length >= 15) descScore = 15;
  else if (descText.length >= 10) descScore = 10;
  else descScore = 0;

  const baseScore = Math.min(100, actScore + durScore + descScore);
  const res = applyBonusCapAndOverflow(baseScore, ecoBonus);
  return {
    ...res,
    actScore,
    durScore,
    descScore,
  };
}

export function calculateOlahragaScore(input: OlahragaInput): number {
  return calculateOlahragaScoreWithBreakdown(input).finalScore;
}

export const calculateBerolahragaScoreWithBreakdown = calculateOlahragaScoreWithBreakdown;

// ============================================================================
// 4. MAKAN BERGIZI (Pasal 4)
// ============================================================================
export interface MakanSingleMealInput {
  mealType?: 'sarapan' | 'siang' | 'malam' | 'sahur' | 'buka';
  timeStr?: string;
  waktu?: string;
  isOnTimeChoice?: boolean;
  isPuasa?: boolean;
  hasKarbo?: boolean;
  karbo?: boolean;
  hasLauk?: boolean;
  lauk?: boolean;
  hasSayur?: boolean;
  sayur?: boolean;
  hasBuah?: boolean;
  buah?: boolean;
  waterGlasses?: '>=2' | '1' | '0_manis' | '0';
  airGelas?: number;
  kotakMakanEco?: boolean;
  tumblerEco?: boolean;
  isMissed?: boolean;
}

export function calculateSingleMealScoreWithBreakdown(input: MakanSingleMealInput): ScoreBreakdownResult {
  let timeScore = 15;
  if (input.isOnTimeChoice !== undefined) {
    timeScore = input.isOnTimeChoice ? 15 : 10;
  } else if (input.waktu) {
    timeScore = (input.waktu.toLowerCase() === 'ideal' || input.waktu.toLowerCase() === 'tepat_waktu') ? 15 : 10;
  } else if (input.timeStr) {
    const min = timeToMinutes(input.timeStr);
    if (input.mealType === 'sarapan') timeScore = min >= 360 && min <= 480 ? 15 : 10;
    else if (input.mealType === 'siang') timeScore = min >= 690 && min <= 780 ? 15 : 10;
    else if (input.mealType === 'malam') timeScore = min >= 1080 && min <= 1170 ? 15 : 10;
    else if (input.mealType === 'sahur') timeScore = min >= 210 && min <= 230 ? 15 : 10;
    else if (input.mealType === 'buka') timeScore = min >= 1110 && min <= 1155 ? 15 : 10;
  }

  let giziScore = 0;
  if (input.hasKarbo || input.karbo) giziScore += SCORING_RULES.makan.karbo; // 17.5
  if (input.hasLauk || input.lauk) giziScore += SCORING_RULES.makan.lauk;     // 17.5
  if (input.hasSayur || input.sayur) giziScore += SCORING_RULES.makan.sayur; // 15
  if (input.hasBuah || input.buah) giziScore += SCORING_RULES.makan.buah;   // 15

  let waterScore = 0;
  if (input.waterGlasses === '>=2' || (input.airGelas !== undefined && input.airGelas >= 2)) {
    waterScore = SCORING_RULES.makan.air2Gelas; // 20
  } else if (input.waterGlasses === '1' || input.airGelas === 1) {
    waterScore = SCORING_RULES.makan.air1Gelas; // 15
  }

  const baseScore = timeScore + giziScore + waterScore;
  const bonusScore = (input.kotakMakanEco ? 5 : 0) + (input.tumblerEco ? 5 : 0);

  return applyBonusCapAndOverflow(baseScore, bonusScore);
}

export function calculateSingleMealScore(input: MakanSingleMealInput): number {
  return calculateSingleMealScoreWithBreakdown(input).finalScore;
}

export interface MakanDailySummaryInput {
  sarapan?: MakanSingleMealInput;
  siang?: MakanSingleMealInput;
  malam?: MakanSingleMealInput;
  sahur?: MakanSingleMealInput;
  buka?: MakanSingleMealInput;
  pagi?: MakanSingleMealInput;
  isPuasa?: boolean;
  useLunchbox?: boolean;
  useTumbler?: boolean;
}

export function calculateMakanBergiziScoreWithBreakdown(input: MakanDailySummaryInput): ScoreBreakdownResult {
  const pInput = input.pagi || input.sarapan;
  const sInput = input.siang;
  const mInput = input.malam;
  const isPuasa = Boolean(input.isPuasa);

  const pScore = pInput ? calculateSingleMealScore(pInput) : 0;
  const sScore = sInput ? calculateSingleMealScore(sInput) : 0;
  const mScore = mInput ? calculateSingleMealScore(mInput) : 0;

  const totalSessionsCount = isPuasa ? 2 : 3;
  const sumBase = isPuasa ? (pScore + mScore) : (pScore + sScore + mScore);
  const avgBase = Math.round((sumBase / totalSessionsCount) * 10) / 10;

  const bonusPoints = (input.useLunchbox ? 5 : 0) + (input.useTumbler ? 5 : 0);
  return applyBonusCapAndOverflow(avgBase, bonusPoints);
}

export function calculateMakanDailyScore(input: MakanDailySummaryInput): number {
  return calculateMakanBergiziScoreWithBreakdown(input).finalScore;
}

// ============================================================================
// 5. GEMAR BELAJAR (Pasal 7)
// ============================================================================
export interface GemarBelajarInput {
  duration?: '0' | '<15' | '15-30' | '30-60' | '1-2h' | '2-3h' | '>3h';
  durasiKategori?: string;
  activities?: string[];
  outputDescription?: string;
  deskripsi?: string;
  isMissed?: boolean;
}

export function calculateGemarBelajarScoreWithBreakdown(input: GemarBelajarInput, _isMissed?: boolean): ScoreBreakdownResult {
  const durKey = input.durasiKategori || input.duration || '1-2h';
  let durScore = 0;
  if (durKey === '>3h' || durKey === '>3_jam') durScore = 60;
  else if (durKey === '2-3h' || durKey === '2_3_jam') durScore = 50;
  else if (durKey === '1-2h' || durKey === '1_2_jam') durScore = 40;
  else if (durKey === '30-60' || durKey === '30_60_menit') durScore = 30;
  else if (durKey === '15-30' || durKey === '15_30_menit') durScore = 20;
  else if (durKey === '<15' || durKey === '<15_menit') durScore = 10;
  else durScore = 0;

  const actCount = (input.activities || []).length;
  let actScore = 0;
  if (actCount >= 3) actScore = 30;
  else if (actCount === 2) actScore = 20;
  else if (actCount === 1) actScore = 10;
  else actScore = 0;

  const desc = (input.deskripsi || input.outputDescription || '').trim();
  let descScore = 0;
  if (desc.length >= 15) descScore = 10;
  else if (desc.length >= 10) descScore = 5;
  else descScore = 0;

  const baseScore = Math.min(100, durScore + actScore + descScore);
  const res = applyBonusCapAndOverflow(baseScore, 0);
  return {
    ...res,
    durScore,
    actScore,
    descScore,
  };
}

export function calculateGemarBelajarScore(input: GemarBelajarInput): number {
  return calculateGemarBelajarScoreWithBreakdown(input).finalScore;
}

// ============================================================================
// 6. BERMASYARAKAT (Pasal 8)
// ============================================================================
export interface BermasyarakatInput {
  actions?: string[];
  description?: string;
  deskripsi?: string;
  piketEcoBonus?: boolean;
  bonusPiket?: boolean;
  isMissed?: boolean;
}

export function calculateBermasyarakatScoreWithBreakdown(input: BermasyarakatInput, _isMissed?: boolean): ScoreBreakdownResult {
  const rawActions = input.actions || [];
  const hasPiketBonus = Boolean(input.piketEcoBonus || input.bonusPiket || rawActions.includes('piket'));
  const socialActionsOnly = rawActions.filter((a) => a !== 'piket_bonus_only' && a !== 'piket');
  const actCount = socialActionsOnly.length;

  let actScore = 0;
  if (actCount >= 4) actScore = 90;
  else if (actCount === 3) actScore = 80;
  else if (actCount === 2) actScore = 70;
  else if (actCount === 1) actScore = 60;
  else actScore = 0;

  const desc = (input.deskripsi || input.description || '').trim();
  let descScore = 0;
  if (desc.length > 15) descScore = 10;
  else if (desc.length >= 10) descScore = 5;
  else descScore = 0;

  const baseScore = actScore + descScore;
  const bonusScore = hasPiketBonus ? 5 : 0;

  return applyBonusCapAndOverflow(baseScore, bonusScore);
}

export function calculateBermasyarakatScore(input: BermasyarakatInput): number {
  return calculateBermasyarakatScoreWithBreakdown(input).finalScore;
}

// ============================================================================
// 7. TIDUR CEPAT (Pasal 5)
// ============================================================================
export interface TidurCepatInput {
  bedtimeSlot?: '<21.30' | '21.30-22.30' | '22.31-23.30' | '>23.30' | string;
  timeStr?: string;
  turnOffLightsEco?: boolean;
  sleepQuality?: number;
  reasonOrReport?: string;
  isMissed?: boolean;
}

export function classifyTidurTime(timeStr: string): { slot: '<21.30' | '21.30-22.30' | '22.31-23.30' | '>23.30'; score: number; label: string } {
  const min = timeToMinutes(timeStr);
  if (min >= 1080 && min < 1290) {
    return { slot: '<21.30', score: 75, label: 'Sebelum 21.30 WIB' };
  }
  if (min >= 1290 && min <= 1350) {
    return { slot: '21.30-22.30', score: 65, label: '21.30 – 22.30 WIB' };
  }
  if (min > 1350 && min <= 1410) {
    return { slot: '22.31-23.30', score: 55, label: '22.31 – 23.30 WIB' };
  }
  return { slot: '>23.30', score: 45, label: 'Setelah 23.30 WIB' };
}

export function calculateTidurCepatScoreWithBreakdown(
  inputOrTime: TidurCepatInput | string,
  qualityLevel?: number,
  _isMissed?: boolean,
  turnOffLightsEco?: boolean
): ScoreBreakdownResult {
  const input: TidurCepatInput = typeof inputOrTime === 'string'
    ? {
        [inputOrTime.includes(':') ? 'timeStr' : 'bedtimeSlot']: inputOrTime,
        sleepQuality: qualityLevel,
        turnOffLightsEco,
      }
    : inputOrTime;

  let timeScore = 75;
  let timeLabel = 'Sebelum 21.30 WIB';

  if (input.bedtimeSlot) {
    if (input.bedtimeSlot === '<21.30' || input.bedtimeSlot === '<21:30' || input.bedtimeSlot === 'Sebelum 21.30') {
      timeScore = 75;
      timeLabel = 'Sebelum 21.30 WIB';
    } else if (input.bedtimeSlot === '21.30-22.30' || input.bedtimeSlot === '21:30-22:30') {
      timeScore = 65;
      timeLabel = '21.30 – 22.30 WIB';
    } else if (input.bedtimeSlot === '22.31-23.30' || input.bedtimeSlot === '22:31-23:30') {
      timeScore = 55;
      timeLabel = '22.31 – 23.30 WIB';
    } else {
      timeScore = 45;
      timeLabel = 'Setelah 23.30 WIB';
    }
  } else if (input.timeStr) {
    const classified = classifyTidurTime(input.timeStr);
    timeScore = classified.score;
    timeLabel = classified.label;
  }

  let kondisiScore = 15;
  const q = Number(input.sleepQuality !== undefined ? input.sleepQuality : 5);
  switch (q) {
    case 5:
      kondisiScore = 25;
      break;
    case 4:
      kondisiScore = 20;
      break;
    case 3:
      kondisiScore = 15;
      break;
    case 2:
      kondisiScore = 10;
      break;
    case 1:
    default:
      kondisiScore = 5;
      break;
  }

  const baseScore = Math.min(100, timeScore + kondisiScore);
  const bonusScore = input.turnOffLightsEco ? 5 : 0;
  const res = applyBonusCapAndOverflow(baseScore, bonusScore);

  return {
    ...res,
    timePoints: timeScore,
    conditionPoints: kondisiScore,
    timeLabel,
  };
}

export function calculateTidurCepatScore(
  inputOrTime: TidurCepatInput | string,
  qualityLevel?: number,
  isMissed?: boolean,
  turnOffLightsEco?: boolean
): number {
  return calculateTidurCepatScoreWithBreakdown(inputOrTime, qualityLevel, isMissed, turnOffLightsEco).finalScore;
}
