import type { Timings, Entry } from './types';

// Subject color palette - avoids blue/indigo as primary
const SUBJECT_COLORS = [
  { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-800 dark:text-emerald-200', border: 'border-emerald-300 dark:border-emerald-700' },
  { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-800 dark:text-amber-200', border: 'border-amber-300 dark:border-amber-700' },
  { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-800 dark:text-rose-200', border: 'border-rose-300 dark:border-rose-700' },
  { bg: 'bg-teal-100 dark:bg-teal-900/40', text: 'text-teal-800 dark:text-teal-200', border: 'border-teal-300 dark:border-teal-700' },
  { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-800 dark:text-orange-200', border: 'border-orange-300 dark:border-orange-700' },
  { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-800 dark:text-purple-200', border: 'border-purple-300 dark:border-purple-700' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/40', text: 'text-cyan-800 dark:text-cyan-200', border: 'border-cyan-300 dark:border-cyan-700' },
  { bg: 'bg-pink-100 dark:bg-pink-900/40', text: 'text-pink-800 dark:text-pink-200', border: 'border-pink-300 dark:border-pink-700' },
  { bg: 'bg-lime-100 dark:bg-lime-900/40', text: 'text-lime-800 dark:text-lime-200', border: 'border-lime-300 dark:border-lime-700' },
  { bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40', text: 'text-fuchsia-800 dark:text-fuchsia-200', border: 'border-fuchsia-300 dark:border-fuchsia-700' },
  { bg: 'bg-sky-100 dark:bg-sky-900/40', text: 'text-sky-800 dark:text-sky-200', border: 'border-sky-300 dark:border-sky-700' },
  { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-800 dark:text-red-200', border: 'border-red-300 dark:border-red-700' },
  { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-800 dark:text-yellow-200', border: 'border-yellow-300 dark:border-yellow-700' },
  { bg: 'bg-stone-200 dark:bg-stone-700/40', text: 'text-stone-800 dark:text-stone-200', border: 'border-stone-400 dark:border-stone-600' },
];

// Create a stable color mapping based on subject ID
const colorCache = new Map<string, number>();

export function getSubjectColor(subjectId: string) {
  if (colorCache.has(subjectId)) {
    return SUBJECT_COLORS[colorCache.get(subjectId)! % SUBJECT_COLORS.length];
  }
  let hash = 0;
  for (let i = 0; i < subjectId.length; i++) {
    const char = subjectId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const index = Math.abs(hash) % SUBJECT_COLORS.length;
  colorCache.set(subjectId, index);
  return SUBJECT_COLORS[index];
}

export function getPeriodTime(period: number, timings: Timings): string {
  // If custom mode and custom timings exist, use them
  if (timings.periodTimingMode === 'custom' && timings.customPeriodTimings.length > 0) {
    const custom = timings.customPeriodTimings.find((c) => c.period === period);
    if (custom) {
      return `${custom.startTime} - ${custom.endTime}`;
    }
  }

  // Fallback to equal timing calculation
  const [startH, startM] = timings.startTime.split(':').map(Number);
  let totalMinutes = startH * 60 + startM;

  for (let i = 1; i < period; i++) {
    totalMinutes += timings.periodDuration;
    if (i === timings.breakAfterPeriod) {
      totalMinutes += timings.breakDuration;
    }
  }

  const endMinutes = totalMinutes + timings.periodDuration;
  const formatTime = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  };

  return `${formatTime(totalMinutes)} - ${formatTime(endMinutes)}`;
}

export function getPeriodDuration(period: number, timings: Timings): number {
  if (timings.periodTimingMode === 'custom' && timings.customPeriodTimings.length > 0) {
    const custom = timings.customPeriodTimings.find((c) => c.period === period);
    if (custom) {
      const [sh, sm] = custom.startTime.split(':').map(Number);
      const [eh, em] = custom.endTime.split(':').map(Number);
      return (eh * 60 + em) - (sh * 60 + sm);
    }
  }

  // Fallback: for equal mode, also account for break period
  if (timings.periodTimingMode === 'equal' && period === timings.breakAfterPeriod) {
    return timings.breakDuration;
  }

  return timings.periodDuration;
}

/**
 * Returns the display label for a slot.
 * Break slots show "Break". Non-break slots are numbered counting only
 * non-break slots (so a break between slot 4 and slot 6 means slot 6 → P5).
 */
export function getPeriodLabel(period: number, timings: Timings): string {
  // Custom mode: count non-break slots up to this period
  if (timings.periodTimingMode === 'custom' && timings.customPeriodTimings.length > 0) {
    const custom = timings.customPeriodTimings.find((c) => c.period === period);
    if (custom?.isBreak) return 'Break';
    let count = 0;
    for (const ct of timings.customPeriodTimings) {
      if (!ct.isBreak) count++;
      if (ct.period === period) break;
    }
    return `P${count}`;
  }
  // Equal mode
  if (period === timings.breakAfterPeriod) return 'Break';
  let count = 0;
  for (let i = 1; i <= period; i++) {
    if (i !== timings.breakAfterPeriod) count++;
  }
  return `P${count}`;
}

export function isBreakPeriod(period: number, timings: Timings): boolean {
  // If custom mode, check custom timings
  if (timings.periodTimingMode === 'custom' && timings.customPeriodTimings.length > 0) {
    const custom = timings.customPeriodTimings.find((c) => c.period === period);
    return custom?.isBreak ?? false;
  }
  // Fallback to equal mode
  return period === timings.breakAfterPeriod;
}

export function getEffectiveTimetable(
  entries: Entry[],
  substitutes: { entryId: string; substituteTeacherId: string; date?: string }[],
  date?: string
): Entry[] {
  if (!date) return entries;
  const dateSubs = substitutes.filter((s) => s.date === date);
  const subMap = new Map(dateSubs.map((s) => [s.entryId, s.substituteTeacherId]));

  return entries.map((e) => {
    if (subMap.has(e.id)) {
      return { ...e, teacherId: subMap.get(e.id)! };
    }
    return e;
  });
}

export function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}
