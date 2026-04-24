import type { Timings, Entry, CustomPeriodTiming } from './types';
import { getPeriodTime, isBreakPeriod, getPeriodLabel } from './timetable-utils';

// Generate custom timings from equal settings
function generateTimingsFromEqual(timings: Timings): CustomPeriodTiming[] {
  const result: CustomPeriodTiming[] = [];
  const [startH, startM] = timings.startTime.split(':').map(Number);
  let currentMinutes = startH * 60 + startM;
  for (let i = 1; i <= timings.periodsPerDay; i++) {
    const isBreak = i === timings.breakAfterPeriod;
    const duration = isBreak ? timings.breakDuration : timings.periodDuration;
    const endMinutes = currentMinutes + duration;
    const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    result.push({ period: i, startTime: fmt(currentMinutes), endTime: fmt(endMinutes), isBreak });
    currentMinutes = endMinutes;
  }
  return result;
}

function getTimings(timings: Timings): CustomPeriodTiming[] {
  if (timings.periodTimingMode === 'custom' && timings.customPeriodTimings.length > 0) {
    return timings.customPeriodTimings;
  }
  return generateTimingsFromEqual(timings);
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Subject color palette for PDF (using more saturated, vibrant print-friendly colors)
const SUBJECT_COLORS = [
  { bg: '#C8E6C9', text: '#1B5E20', border: '#A5D6A7' },
  { bg: '#FFE0B2', text: '#BF360C', border: '#FFCC80' },
  { bg: '#F8BBD0', text: '#AD1457', border: '#F48FB1' },
  { bg: '#B2DFDB', text: '#004D40', border: '#80CBC4' },
  { bg: '#FFF59D', text: '#F57F17', border: '#FFF176' },
  { bg: '#E1BEE7', text: '#6A1B9A', border: '#CE93D8' },
  { bg: '#B3E5FC', text: '#01579B', border: '#81D4FA' },
  { bg: '#FFCCBC', text: '#BF360C', border: '#FFAB91' },
  { bg: '#DCEDC8', text: '#33691E', border: '#C5E1A5' },
  { bg: '#D1C4E9', text: '#4527A0', border: '#B39DDB' },
  { bg: '#B2EBF2', text: '#006064', border: '#80DEEA' },
  { bg: '#FFF9C4', text: '#827717', border: '#FFF176' },
  { bg: '#D7CCC8', text: '#3E2723', border: '#BCAAA4' },
  { bg: '#C5CAE9', text: '#1A237E', border: '#9FA8DA' },
];

const colorCache = new Map<string, number>();
function getColor(subjectId: string) {
  if (colorCache.has(subjectId)) return SUBJECT_COLORS[colorCache.get(subjectId)! % SUBJECT_COLORS.length];
  let hash = 0;
  for (let i = 0; i < subjectId.length; i++) { hash = ((hash << 5) - hash) + subjectId.charCodeAt(i); hash |= 0; }
  const idx = Math.abs(hash) % SUBJECT_COLORS.length;
  colorCache.set(subjectId, idx);
  return SUBJECT_COLORS[idx];
}

export interface PdfReportOptions {
  schoolName: string;
  reportTitle: string;
  subtitle?: string;
  timings: Timings;
  entries: Entry[];
  teachers: { id: string; name: string; shortName: string }[];
  classes: { id: string; name: string }[];
  sections: { id: string; name: string }[];
  subjects: { id: string; name: string; shortName: string }[];
  // Filters
  filterClassId?: string;
  filterSectionId?: string;
  filterTeacherId?: string;
  // Report type
  type: 'class-timetable' | 'teacher-schedule' | 'free-periods';
}

export function generatePdfHtml(opts: PdfReportOptions): string {
  const { schoolName, reportTitle, timings, entries, teachers, classes, sections, subjects } = opts;
  const customTimings = getTimings(timings);
  const activeDays = timings.days;

  const getTeacher = (id: string) => teachers.find(t => t.id === id);
  const getSubject = (id: string) => subjects.find(s => s.id === id);
  const getClass = (id: string) => classes.find(c => c.id === id);
  const getSection = (id: string) => sections.find(s => s.id === id);

  // Filter entries
  let filteredEntries = entries;
  if (opts.filterClassId) filteredEntries = filteredEntries.filter(e => e.classId === opts.filterClassId);
  if (opts.filterSectionId) filteredEntries = filteredEntries.filter(e => e.sectionId === opts.filterSectionId);
  if (opts.filterTeacherId) filteredEntries = filteredEntries.filter(e => e.teacherId === opts.filterTeacherId);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  let subtitle = opts.subtitle || '';
  if (opts.type === 'class-timetable') {
    const cls = getClass(opts.filterClassId || '');
    const sec = getSection(opts.filterSectionId || '');
    subtitle = `${cls?.name || ''} — Section ${sec?.name || ''}`;
  } else if (opts.type === 'teacher-schedule' || opts.type === 'free-periods') {
    const teacher = getTeacher(opts.filterTeacherId || '');
    subtitle = teacher?.name || '';
  }

  // Build table rows
  const buildGridHtml = () => {
    let html = '<div style="border-radius:6px;overflow:hidden;border:1px solid #D1D1D6;">';
    html += '<table class="tt-grid">';

    // Header row
    html += '<thead><tr><th class="th-corner">Day / Period</th>';
    activeDays.forEach(day => {
      html += `<th class="th-day">${esc(day)}</th>`;
    });
    html += '</tr></thead><tbody>';

    // Period rows
    customTimings.forEach(pt => {
      const time = `${pt.startTime} - ${pt.endTime}`;
      const periodLabel = pt.isBreak ? 'Break' : getPeriodLabel(pt.period, timings);
      const rowClass = pt.isBreak ? 'break-row' : '';

      html += `<tr class="${rowClass}">`;
      html += `<td class="td-period">
        <span class="period-label">${periodLabel}</span>
        <span class="period-time">${esc(time)}</span>
      </td>`;

      activeDays.forEach(day => {
        if (pt.isBreak) {
          html += '<td class="td-break"><span class="break-icon">&#9749;</span></td>';
        } else {
          const entry = filteredEntries.find(e => e.day === day && e.period === pt.period);
          if (entry) {
            const subject = getSubject(entry.subjectId);
            const teacher = getTeacher(entry.teacherId);
            const cls = getClass(entry.classId);
            const sec = getSection(entry.sectionId);
            const color = getColor(entry.subjectId);

            let cellContent = '';
            if (opts.type === 'class-timetable') {
              cellContent = `
                <span class="subject-name" style="color:${color.text}">${esc(subject?.shortName || '?')}</span>
                <span class="teacher-name">${esc(teacher?.name || '?')}</span>`;
            } else if (opts.type === 'teacher-schedule') {
              cellContent = `
                <span class="subject-name" style="color:${color.text}">${esc(subject?.shortName || '?')}</span>
                <span class="teacher-name">${esc(cls?.name || '')}-${esc(sec?.name || '')}</span>`;
            }

            html += `<td class="td-filled" style="background:${color.bg};border-color:${color.border}">${cellContent}</td>`;
          } else {
            html += '<td class="td-empty">—</td>';
          }
        }
      });
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    return html;
  };

  // Build free periods HTML
  const buildFreePeriodsHtml = () => {
    const breakPeriods = new Set(customTimings.filter(pt => pt.isBreak).map(pt => pt.period));
    const freePeriods: { day: string; period: number; time: string }[] = [];

    activeDays.forEach(day => {
      customTimings.forEach(pt => {
        if (pt.isBreak) return;
        const hasEntry = filteredEntries.some(e => e.day === day && e.period === pt.period);
        if (!hasEntry) {
          freePeriods.push({ day, period: pt.period, time: `${pt.startTime} - ${pt.endTime}` });
        }
      });
    });

    // Group by day
    const grouped = new Map<string, typeof freePeriods>();
    freePeriods.forEach(fp => {
      const list = grouped.get(fp.day) || [];
      list.push(fp);
      grouped.set(fp.day, list);
    });

    let html = '<div class="free-periods">';
    let totalFree = freePeriods.length;
    const teachingPeriods = customTimings.filter(pt => !pt.isBreak).length;
    const totalTeaching = activeDays.length * teachingPeriods;
    const pct = totalTeaching > 0 ? Math.round((totalFree / totalTeaching) * 100) : 0;

    html += `<div class="summary-row">
      <div class="summary-stat"><span class="stat-num">${totalFree}</span><span class="stat-label">Free Periods</span></div>
      <div class="summary-stat"><span class="stat-num">${totalTeaching}</span><span class="stat-label">Total Periods</span></div>
      <div class="summary-stat"><span class="stat-num">${pct}%</span><span class="stat-label">Free</span></div>
    </div>`;

    activeDays.forEach(day => {
      const dayFree = grouped.get(day);
      if (!dayFree || dayFree.length === 0) return;
      html += `<div class="day-block">
        <div class="day-header">${esc(day)} <span class="free-count">${dayFree.length} free</span></div>
        <div class="free-items">`;
      dayFree.forEach(fp => {
        html += `<div class="free-item">
          <span class="free-period">${getPeriodLabel(fp.period, timings)}</span>
          <span class="free-time">${esc(fp.time)}</span>
        </div>`;
      });
      html += '</div></div>';
    });

    html += '</div>';
    return html;
  };

  const isFreePeriodReport = opts.type === 'free-periods';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: A4 portrait;
    margin: 15mm 12mm 20mm 12mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Roboto, Arial, sans-serif;
    font-size: 10px;
    line-height: 1.4;
    color: #1D1D1F;
    padding: 0;
  }

  /* Header */
  .report-header {
    text-align: center;
    padding-bottom: 10px;
    margin-bottom: 12px;
  }
  .header-bar {
    width: 100%;
    height: 3px;
    background: linear-gradient(to right, transparent, #1B2A4A, transparent);
    margin-bottom: 10px;
  }
  .school-name {
    font-size: 18px;
    font-weight: 700;
    color: #1B2A4A;
    letter-spacing: -0.3px;
  }
  .report-title {
    font-size: 13px;
    font-weight: 600;
    color: #333;
    margin-top: 3px;
  }
  .report-subtitle {
    font-size: 11px;
    color: #666;
    margin-top: 2px;
  }

  /* Table Grid */
  .tt-grid {
    width: 100%;
    border-collapse: collapse;
    font-size: 9px;
  }
  .tt-grid th, .tt-grid td {
    border: 1px solid #D1D1D6;
    padding: 4px 3px;
    text-align: center;
    vertical-align: middle;
  }
  .th-corner {
    background: #1B2A4A;
    font-weight: 600;
    font-size: 9px;
    color: #fff;
    width: 70px;
    min-width: 70px;
  }
  .th-day {
    background: #1B2A4A;
    font-weight: 600;
    font-size: 9px;
    color: #fff;
  }
  .td-period {
    background: #F1F3F5;
    width: 70px;
    min-width: 70px;
    text-align: center;
    vertical-align: middle;
  }
  .period-label {
    display: block;
    font-weight: 600;
    font-size: 9px;
    color: #1D1D1F;
  }
  .period-time {
    display: block;
    font-size: 7.5px;
    color: #86868B;
    margin-top: 1px;
  }
  .break-row td {
    background: linear-gradient(135deg, #FFF8E1, #FFECB3) !important;
  }
  .td-break {
    font-size: 10px;
    color: #E65100;
  }
  .td-filled {
    border: 1px solid;
    border-radius: 3px;
    padding: 3px 2px !important;
  }
  .subject-name {
    display: block;
    font-weight: 700;
    font-size: 9.5px;
  }
  .teacher-name {
    display: block;
    font-size: 7px;
    color: #555;
    margin-top: 1px;
  }
  .td-empty {
    color: #C7C7CC;
    font-size: 10px;
  }

  /* Alternating rows */
  .tt-grid tbody tr:nth-child(even) td.td-empty { background: #F8F9FA; }
  .tt-grid tbody tr:nth-child(even) td.td-filled { background: #F8F9FA; }
  .tt-grid tbody tr:nth-child(even) td.td-period { background: #E9ECEF; }

  /* Free Periods */
  .free-periods { margin-top: 8px; }
  .summary-row {
    display: flex;
    gap: 16px;
    margin-bottom: 14px;
    justify-content: center;
  }
  .summary-stat {
    text-align: center;
    padding: 10px 20px;
    background: #F8F9FA;
    border-radius: 10px;
    border: 1px solid #DEE2E6;
  }
  .stat-num { display: block; font-size: 22px; font-weight: 700; color: #1B2A4A; }
  .stat-label { display: block; font-size: 9px; color: #86868B; margin-top: 2px; }
  .day-block {
    margin-bottom: 10px;
    border: 1px solid #E5E5EA;
    border-radius: 8px;
    overflow: hidden;
  }
  .day-header {
    background: #1B2A4A;
    padding: 6px 10px;
    font-weight: 600;
    font-size: 11px;
    color: #fff;
    border-bottom: 1px solid #1B2A4A;
  }
  .free-count {
    font-weight: 400;
    font-size: 9px;
    color: #B0BEC5;
    margin-left: 6px;
  }
  .free-items { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 10px; }
  .free-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: #C8E6C9;
    border: 1px solid #A5D6A7;
    border-radius: 6px;
    font-size: 9px;
  }
  .free-period { font-weight: 600; color: #1B5E20; }
  .free-time { color: #666; font-size: 8px; }

  /* Footer */
  .report-footer {
    margin-top: 16px;
    padding-top: 8px;
    border-top: 1px solid #E5E5EA;
    display: flex;
    justify-content: space-between;
    font-size: 8px;
    color: #86868B;
  }
  .watermark { font-style: italic; color: #bbb; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="report-header">
    <div class="header-bar"></div>
    <div class="school-name">${esc(schoolName)}</div>
    <div class="report-title">${esc(reportTitle)}</div>
    ${subtitle ? `<div class="report-subtitle">${esc(subtitle)}</div>` : ''}
  </div>

  ${isFreePeriodReport ? buildFreePeriodsHtml() : buildGridHtml()}

  <div class="report-footer">
    <span>${esc(today)}</span>
    <span class="watermark">Generated by TimetableWiz</span>
    <span>Page <span class="page-num"></span></span>
  </div>
</body>
</html>`;
}
