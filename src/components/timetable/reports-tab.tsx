'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTimetableStore } from '@/lib/store';
import { getSubjectColor, getPeriodTime, isBreakPeriod, getPeriodLabel } from '@/lib/timetable-utils';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Printer,
  Clock,
  Coffee,
  UserCheck,
  CalendarDays,
  Download,
  Loader2,
  Search,
  Filter,
  BarChart3,
  Hash,
  Scissors,
} from 'lucide-react';

type ReportType = 'class-timetable' | 'teacher-schedule' | 'free-periods' | 'teacher-period-count' | 'cutout-timetables';

export function ReportsTab() {
  const [reportType, setReportType] = useState<ReportType>('class-timetable');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  // Filter states
  const [filterReportTypes, setFilterReportTypes] = useState<ReportType[]>(['class-timetable', 'teacher-schedule', 'free-periods', 'teacher-period-count', 'cutout-timetables']);
  const [filterIncludeBreaks, setFilterIncludeBreaks] = useState(true);
  const [filterEmptySlots, setFilterEmptySlots] = useState(true);

  const { classes, sections, teachers, timings } = useTimetableStore();

  const availableClasses = classes.filter((c) => c.sectionIds.length > 0);
  const availableSections = selectedClass
    ? classes.find((c) => c.id === selectedClass)?.sectionIds || []
    : [];

  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return availableClasses;
    const q = searchQuery.toLowerCase();
    return availableClasses.filter((c) => c.name.toLowerCase().includes(q));
  }, [availableClasses, searchQuery]);

  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers;
    const q = searchQuery.toLowerCase();
    return teachers.filter((t) => t.name.toLowerCase().includes(q) || t.shortName.toLowerCase().includes(q));
  }, [teachers, searchQuery]);

  const toggleReportType = (type: ReportType) => {
    setFilterReportTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleReportChange = (v: string) => {
    setReportType(v as ReportType);
    setSelectedClass('');
    setSelectedSection('');
    setSelectedTeacher('');
  };

  return (
    <div className="space-y-6">
      {/* Filters & Search Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Reports
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-1.5" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
          <CardDescription>Generate, customize, and download reports</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <span className="text-xs">Clear</span>
              </button>
            )}
          </div>

          {showFilters && (
            <>
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Report Types</Label>
                <div className="flex flex-wrap gap-4">
                  {([
                    ['class-timetable', 'Class Timetable'],
                    ['teacher-schedule', 'Teacher Schedule'],
                    ['free-periods', 'Free Periods'],
                    ['teacher-period-count', 'Period Count'],
                    ['cutout-timetables', 'Cut-out Timetables'],
                  ] as [ReportType, string][]).map(([type, label]) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={filterReportTypes.includes(type)}
                        onCheckedChange={() => toggleReportType(type)}
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={filterIncludeBreaks} onCheckedChange={(v) => setFilterIncludeBreaks(!!v)} />
                  <span className="text-sm">Show Break Periods</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={filterEmptySlots} onCheckedChange={(v) => setFilterEmptySlots(!!v)} />
                  <span className="text-sm">Show Empty Slots</span>
                </label>
              </div>

              <Separator />
            </>
          )}

          {/* Report selection */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={handleReportChange}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filterReportTypes.includes('class-timetable') && (
                    <SelectItem value="class-timetable">Class Timetable</SelectItem>
                  )}
                  {filterReportTypes.includes('teacher-schedule') && (
                    <SelectItem value="teacher-schedule">Teacher Schedule</SelectItem>
                  )}
                  {filterReportTypes.includes('free-periods') && (
                    <SelectItem value="free-periods">Free Periods</SelectItem>
                  )}
                  {filterReportTypes.includes('teacher-period-count') && (
                    <SelectItem value="teacher-period-count">Period Count</SelectItem>
                  )}
                  {filterReportTypes.includes('cutout-timetables') && (
                    <SelectItem value="cutout-timetables">Cut-out Timetables</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {reportType === 'class-timetable' && (
              <>
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedSection(''); }}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredClasses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedClass}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder={selectedClass ? 'Select section' : 'Select class first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSections.map((sid) => {
                        const section = sections.find((s) => s.id === sid);
                        return <SelectItem key={sid} value={sid}>Section {section?.name}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {(reportType === 'teacher-schedule' || reportType === 'free-periods') && (
              <div className="space-y-2">
                <Label>Teacher</Label>
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTeachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name} ({t.shortName})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {reportType === 'class-timetable' && selectedClass && selectedSection && (
        <ClassTimetableReport classId={selectedClass} sectionId={selectedSection} showBreaks={filterIncludeBreaks} showEmpty={filterEmptySlots} />
      )}

      {reportType === 'teacher-schedule' && selectedTeacher && (
        <TeacherScheduleReport teacherId={selectedTeacher} showBreaks={filterIncludeBreaks} showEmpty={filterEmptySlots} />
      )}

      {reportType === 'free-periods' && selectedTeacher && (
        <FreePeriodsReport teacherId={selectedTeacher} />
      )}

      {reportType === 'teacher-period-count' && (
        <TeacherPeriodCountReport />
      )}

      {reportType === 'cutout-timetables' && (
        <CutoutTimetablesReport />
      )}
    </div>
  );
}

/* ===== Print/PDF Helper — iframe-based, works on Android WebView ===== */

function printOrSave(htmlContent: string, title: string) {
  // Remove any existing print iframe
  const existing = document.getElementById('__print_iframe__');
  if (existing) existing.remove();

  const iframe = document.createElement('iframe');
  iframe.id = '__print_iframe__';
  iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:99999;background:white;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(htmlContent);
  doc.title = title;
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Print failed:', e);
    }
    // Remove iframe after print dialog closes
    setTimeout(() => iframe.remove(), 2000);
  }, 500);
}

function usePdfDownload() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadPdf = async (htmlContent: string, filename: string, _orientation: 'portrait' | 'landscape' = 'portrait') => {
    setIsGenerating(true);
    try {
      printOrSave(htmlContent, filename.replace('.pdf', ''));
      toast({ title: 'Print dialog opened', description: 'Choose "Save as PDF" to download.' });
    } catch (err) {
      console.error('PDF failed:', err);
      toast({ title: 'PDF generation failed', description: 'An error occurred.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return { downloadPdf, isGenerating };
}

/* ===== Teacher Period Count Report ===== */

type DetailMode = 'count-only' | 'show-periods' | 'show-total';
type OrientationMode = 'portrait' | 'landscape';

function TeacherPeriodCountReport() {
  const { entries, teachers, timings, schoolName, classes, sections, subjects } = useTimetableStore();
  const { toast } = useToast();
  const { downloadPdf, isGenerating } = usePdfDownload();
  const reportRef = useRef<HTMLDivElement>(null);

  const activeDays = timings.days;
  const [selectedDays, setSelectedDays] = useState<string[]>([...activeDays]);
  const [detailMode, setDetailMode] = useState<DetailMode>('show-periods');
  const [orientation, setOrientation] = useState<OrientationMode>('landscape');
  const [tablesPerPage, setTablesPerPage] = useState<number>(1);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  // Calculate period counts per teacher per day
  const teacherData = useMemo(() => {
    return teachers.map((teacher) => {
      const teacherEntries = entries.filter((e) => e.teacherId === teacher.id);
      const dayCounts: Record<string, number> = {};
      const dayPeriods: Record<string, { period: number; subject: string; cls: string; sec: string }[]> = {};

      for (const day of activeDays) {
        const dayEntries = teacherEntries.filter((e) => e.day === day && !isBreakPeriod(e.period, timings));
        dayCounts[day] = dayEntries.length;
        dayPeriods[day] = dayEntries.map((e) => {
          const subj = subjects.find((s) => s.id === e.subjectId);
          const cls = classes.find((c) => c.id === e.classId);
          const sec = sections.find((s) => s.id === e.sectionId);
          return {
            period: e.period,
            subject: subj?.shortName || '?',
            cls: cls?.name || '?',
            sec: sec?.name || '?',
          };
        });
      }

      const totalForSelectedDays = selectedDays.reduce((sum, d) => sum + (dayCounts[d] || 0), 0);

      return { teacher, dayCounts, dayPeriods, totalForSelectedDays };
    });
  }, [teachers, entries, activeDays, timings, selectedDays, subjects, classes, sections]);

  const filteredSelectedDays = activeDays.filter((d) => selectedDays.includes(d));
  const totalPeriodsPossible = filteredSelectedDays.length * activeDays.reduce((sum) => {
    // count non-break periods
    return sum; // we'll compute below
  }, 0);

  const nonBreakPeriodsCount = useMemo(() => {
    let count = 0;
    for (let p = 1; p <= timings.periodsPerDay; p++) {
      if (!isBreakPeriod(p, timings)) count++;
    }
    return count;
  }, [timings]);

  const maxPossiblePerTeacher = filteredSelectedDays.length * nonBreakPeriodsCount;

  // Build print-ready HTML for the period count report
  const buildReportHtml = useCallback(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const isLandscape = orientation === 'landscape';
    const pageW = isLandscape ? '297mm' : '210mm';
    const pageH = isLandscape ? '210mm' : '297mm';

    const teachersPerPage = tablesPerPage === 1
      ? (isLandscape ? 20 : 14)
      : Math.max(1, Math.floor((isLandscape ? 20 : 14) / tablesPerPage));

    // If tablesPerPage > 1, we want multiple tables side by side
    // For simplicity, tablesPerPage=1 means one full table; >1 means side-by-side mini tables
    const fontSize = tablesPerPage === 1 ? (isLandscape ? '8px' : '7px') : '6px';
    const headerFontSize = tablesPerPage === 1 ? (isLandscape ? '7px' : '6.5px') : '5.5px';
    const cellPad = tablesPerPage === 1 ? '2px 3px' : '1px 2px';
    const rowHeight = tablesPerPage === 1 ? 'auto' : '16px';

    // Sort teachers by total (descending) for the report
    const sorted = [...teacherData].sort((a, b) => b.totalForSelectedDays - a.totalForSelectedDays);

    let tablesHtml = '';

    if (tablesPerPage === 1) {
      // Single full table
      let tableRows = '';
      sorted.forEach((td) => {
        const t = td.teacher;
        tableRows += `<tr>
          <td class="td-sno">${sorted.indexOf(td) + 1}</td>
          <td class="td-name">${esc(t.name)}</td>
          <td class="td-short">${esc(t.shortName)}</td>`;
        for (const day of filteredSelectedDays) {
          const cnt = td.dayCounts[day] || 0;
          const bgClass = cnt === 0 ? 'zero' : cnt >= nonBreakPeriodsCount ? 'full' : '';
          tableRows += `<td class="td-num ${bgClass}">${cnt}</td>`;
        }
        tableRows += `<td class="td-total"><strong>${td.totalForSelectedDays}</strong></td>`;
        if (detailMode === 'show-periods') {
          // Add a detail cell with periods info
          let detailParts: string[] = [];
          for (const day of filteredSelectedDays) {
            const periods = td.dayPeriods[day] || [];
            if (periods.length > 0) {
              const pList = periods.map((p) => getPeriodLabel(p.period, timings)).join(',');
              detailParts.push(`${day.slice(0,3)}:${pList}`);
            }
          }
          tableRows += `<td class="td-detail">${detailParts.join(' | ')}</td>`;
        }
        tableRows += '</tr>';
      });

      tablesHtml = `
        <table class="pc-table">
          <thead>
            <tr>
              <th class="th-sno">#</th>
              <th class="th-name">Teacher Name</th>
              <th class="th-short">Code</th>`;
      for (const day of filteredSelectedDays) {
        tablesHtml += `<th class="th-day">${esc(day)}</th>`;
      }
      tablesHtml += `<th class="th-total">Total</th>`;
      if (detailMode === 'show-periods') {
        tablesHtml += '<th class="th-detail">Periods</th>';
      }
      tablesHtml += `</tr></thead><tbody>${tableRows}</tbody></table>`;
    } else {
      // Multiple side-by-side tables
      const chunkSize = Math.max(1, Math.ceil(sorted.length / tablesPerPage));
      const chunks: typeof sorted[] = [];
      for (let i = 0; i < sorted.length; i += chunkSize) {
        chunks.push(sorted.slice(i, i + chunkSize));
      }

      chunks.forEach((chunk, ci) => {
        let tableRows = '';
        chunk.forEach((td) => {
          const t = td.teacher;
          tableRows += `<tr>
            <td class="td-sno">${ci * chunkSize + chunk.indexOf(td) + 1}</td>
            <td class="td-name">${esc(t.shortName)}</td>`;
          for (const day of filteredSelectedDays) {
            const cnt = td.dayCounts[day] || 0;
            const bgClass = cnt === 0 ? 'zero' : '';
            tableRows += `<td class="td-num ${bgClass}">${cnt}</td>`;
          }
          tableRows += `<td class="td-total"><strong>${td.totalForSelectedDays}</strong></td>`;
          tableRows += '</tr>';
        });

        const colWidth = isLandscape ? `${100 / tablesPerPage}%` : '100%';

        tablesHtml += `
          <div class="table-chunk" style="width:${colWidth};display:inline-block;vertical-align:top;">
            <div class="chunk-title">Table ${ci + 1}</div>
            <table class="pc-table">
              <thead><tr>
                <th class="th-sno">#</th>
                <th class="th-name">Teacher</th>`;
        for (const day of filteredSelectedDays) {
          tablesHtml += `<th class="th-day">${esc(day.slice(0,3))}</th>`;
        }
        tablesHtml += `<th class="th-total">Total</th></tr></thead>
              <tbody>${tableRows}</tbody>
            </table>
          </div>`;
      });
    }

    const showPeriods = detailMode === 'show-periods';
    const daysLabel = filteredSelectedDays.length === activeDays.length
      ? 'All Days'
      : filteredSelectedDays.join(', ');

    const genTime = new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@page { size: A4 ${isLandscape ? 'landscape' : 'portrait'}; margin: 14mm 10mm 14mm 10mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, 'Helvetica Neue', sans-serif; font-size: ${fontSize}; color: #1a1a2e; }
.rpt-header { text-align: center; padding-bottom: 7px; margin-bottom: 9px; border-bottom: 3px solid #1565C0; }
.rpt-school { font-size: ${isLandscape ? '15pt' : '13pt'}; font-weight: 700; color: #0D47A1; }
.rpt-title  { font-size: ${isLandscape ? '11pt' : '10pt'}; font-weight: 600; color: #1a1a2e; margin-top: 2px; }
.rpt-sub    { font-size: ${headerFontSize}; color: #555; margin-top: 1px; }
.pc-table { width: 100%; border-collapse: collapse; font-size: ${fontSize}; table-layout: fixed; }
.pc-table th, .pc-table td { border: 1px solid #CFD8DC; padding: ${cellPad}; text-align: center; vertical-align: middle; }
.pc-table thead th { background: #1565C0; color: #fff; font-size: ${headerFontSize}; font-weight: 700; }
.pc-table thead .th-name { text-align: left; }
.td-sno  { color: #78909C; font-size: ${headerFontSize}; width: 22px; }
.td-name { text-align: left !important; font-weight: 500; }
.td-short { font-weight: 600; }
.td-num  { font-weight: 600; }
.td-zero { background: #FFF3E0 !important; color: #E65100; }
.td-full { background: #E8F5E9 !important; color: #2E7D32; }
.td-total { background: #E3F2FD; font-weight: 700; color: #1565C0; }
.td-detail { text-align: left !important; font-size: ${headerFontSize}; color: #555; }
.table-chunk { padding: 0 3px; }
.chunk-title { font-size: ${headerFontSize}; font-weight: 700; text-align: center; margin-bottom: 3px; color: #1565C0; border-bottom: 1px solid #90CAF9; padding-bottom: 2px; }
.pc-summary { display: flex; gap: 10px; justify-content: center; margin-top: 10px; flex-wrap: wrap; }
.pc-sum-item { text-align: center; padding: 5px 14px; background: #E3F2FD; border-radius: 6px; border: 1px solid #90CAF9; }
.pc-sum-num { display: block; font-size: 14pt; font-weight: 700; color: #1565C0; }
.pc-sum-lbl { display: block; font-size: ${headerFontSize}; color: #78909C; }
.rpt-footer { margin-top: 10px; padding-top: 5px; border-top: 1px solid #B0BEC5; display: flex; justify-content: space-between; font-size: ${headerFontSize}; color: #78909C; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
  <div class="rpt-header">
    <div class="rpt-school">${esc(schoolName)}</div>
    <div class="rpt-title">Teacher Period Count Report</div>
    <div class="rpt-sub">${esc(daysLabel)} | Max ${maxPossiblePerTeacher} periods/teacher | ${teachers.length} teachers</div>
  </div>
  ${tablesHtml}
  <div class="pc-summary">
    <div class="pc-sum-item"><span class="pc-sum-num">${teachers.length}</span><span class="pc-sum-lbl">Teachers</span></div>
    <div class="pc-sum-item"><span class="pc-sum-num">${filteredSelectedDays.length}</span><span class="pc-sum-lbl">Days</span></div>
    <div class="pc-sum-item"><span class="pc-sum-num">${maxPossiblePerTeacher}</span><span class="pc-sum-lbl">Max Periods</span></div>
    <div class="pc-sum-item"><span class="pc-sum-num">${sorted.reduce((s: number, t: any) => s + t.totalForSelectedDays, 0)}</span><span class="pc-sum-lbl">Total Assigned</span></div>
  </div>
  <div class="rpt-footer">
    <span>${esc(genTime)}</span>
    <span>${esc(schoolName)} \u2014 Teacher Period Count Report</span>
    <span>Page: 1 of 1</span>
  </div>
</body></html>`;
  }, [teacherData, filteredSelectedDays  }, [teacherData, filteredSelectedDays, activeDays, orientation, tablesPerPage, detailMode, schoolName, nonBreakPeriodsCount, maxPossiblePerTeacher, teachers.length]);

  const handlePrint = () => {
    const html = buildReportHtml();
    printOrSave(html, 'Teacher_Period_Count');
    toast({ title: 'Print dialog opened', description: 'Use the print dialog to print or save as PDF.' });
  };

  const handlePdf = async () => {
    const html = buildReportHtml();
    await downloadPdf(html, `Period_Count_${new Date().toISOString().slice(0, 10)}.pdf`, orientation);
  };

  return (
    <div className="space-y-4">
      {/* Customization Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Teacher Period Count
          </CardTitle>
          <CardDescription>Calculate and customize teacher workload report</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Day Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Select Days</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedDays([...activeDays])}>
                  All
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedDays([])}>
                  None
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeDays.map((day) => (
                <label
                  key={day}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                    selectedDays.includes(day)
                      ? 'bg-[#007AFF10] border-[#007AFF30] text-[#007AFF] font-medium'
                      : 'border-border hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <Checkbox checked={selectedDays.includes(day)} onCheckedChange={() => toggleDay(day)} />
                  <span>{day.slice(0, 3)}</span>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* Detail Mode */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Display Mode</Label>
            <div className="flex flex-wrap gap-2">
              {([
                ['count-only', 'Count Only', 'Just period numbers'],
                ['show-periods', 'Show Periods', 'Include period details'],
                ['show-total', 'Totals Summary', 'Total counts per day'],
              ] as [DetailMode, string, string][]).map(([mode, label, desc]) => (
                <button
                  key={mode}
                  onClick={() => setDetailMode(mode)}
                  className={`px-3 py-2 rounded-lg border text-left transition-colors ${
                    detailMode === mode
                      ? 'bg-[#007AFF10] border-[#007AFF30]'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className={`text-sm font-medium ${detailMode === mode ? 'text-[#007AFF]' : ''}`}>{label}</div>
                  <div className="text-[10px] text-muted-foreground">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Layout Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Orientation</Label>
              <Select value={orientation} onValueChange={(v) => setOrientation(v as OrientationMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait (A4)</SelectItem>
                  <SelectItem value="landscape">Landscape (A4)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Landscape fits {orientation === 'landscape' ? '~20' : '~14'} teachers per page
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tables Per Page</Label>
              <Select value={String(tablesPerPage)} onValueChange={(v) => setTablesPerPage(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Full Table</SelectItem>
                  <SelectItem value="2">2 Tables Side-by-Side</SelectItem>
                  <SelectItem value="3">3 Tables Side-by-Side</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                More tables = smaller font, fits more data
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1.5" />
              Print Report
            </Button>
            <Button onClick={handlePdf} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
              Download PDF ({orientation === 'landscape' ? 'Landscape' : 'Portrait'})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Table */}
      {selectedDays.length > 0 && (
        <Card ref={reportRef}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg">Preview</CardTitle>
                <CardDescription>
                  {filteredSelectedDays.length} day{filteredSelectedDays.length !== 1 ? 's' : ''} selected | {teachers.length} teachers | {orientation} mode
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {orientation === 'landscape' ? (tablesPerPage === 1 ? '~20' : `~${20 * tablesPerPage}`) : (tablesPerPage === 1 ? '~14' : `~${14 * tablesPerPage}`)} teachers/page
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border px-2 py-1.5 text-left text-xs font-semibold w-8">#</th>
                    <th className="border px-2 py-1.5 text-left text-xs font-semibold">Teacher</th>
                    <th className="border px-2 py-1.5 text-center text-xs font-semibold">Code</th>
                    {filteredSelectedDays.map((day) => (
                      <th key={day} className="border px-2 py-1.5 text-center text-xs font-semibold">{day.slice(0, 3)}</th>
                    ))}
                    <th className="border px-2 py-1.5 text-center text-xs font-semibold bg-[#007AFF] text-white">Total</th>
                    {detailMode === 'show-periods' && (
                      <th className="border px-2 py-1.5 text-left text-xs font-semibold">Periods</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[...teacherData].sort((a, b) => b.totalForSelectedDays - a.totalForSelectedDays).map((td, idx) => (
                    <tr key={td.teacher.id} className={idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'}>
                      <td className="border px-2 py-1 text-xs text-muted-foreground">{idx + 1}</td>
                      <td className="border px-2 py-1 text-sm font-medium whitespace-nowrap">{td.teacher.name}</td>
                      <td className="border px-2 py-1 text-xs font-semibold text-center">{td.teacher.shortName}</td>
                      {filteredSelectedDays.map((day) => {
                        const cnt = td.dayCounts[day] || 0;
                        return (
                          <td
                            key={day}
                            className={`border px-2 py-1 text-center text-sm font-semibold ${
                              cnt === 0 ? 'bg-amber-50 text-amber-700' : ''
                            }`}
                          >
                            {cnt}
                          </td>
                        );
                      })}
                      <td className="border px-2 py-1 text-center text-sm font-bold bg-blue-50 text-[#007AFF]">
                        {td.totalForSelectedDays}
                      </td>
                      {detailMode === 'show-periods' && (
                        <td className="border px-2 py-1 text-[10px] text-muted-foreground max-w-[200px] truncate">
                          {filteredSelectedDays.map((day) => {
                            const periods = td.dayPeriods[day] || [];
                            if (periods.length === 0) return null;
                            return (
                              <span key={day}>
                                {day.slice(0, 3)}: {periods.map((p) => getPeriodLabel(p.period, timings)).join(',')} &nbsp;
                              </span>
                            );
                          })}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted font-semibold">
                    <td colSpan={3} className="border px-2 py-1.5 text-xs text-right">Total Periods:</td>
                    {filteredSelectedDays.map((day) => (
                      <td key={day} className="border px-2 py-1.5 text-center text-xs">
                        {teacherData.reduce((sum, td) => sum + (td.dayCounts[day] || 0), 0)}
                      </td>
                    ))}
                    <td className="border px-2 py-1.5 text-center text-xs bg-blue-100 text-[#007AFF]">
                      {teacherData.reduce((sum, td) => sum + td.totalForSelectedDays, 0)}
                    </td>
                    {detailMode === 'show-periods' && <td className="border px-2 py-1.5" />}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Summary Stats */}
            <div className="flex flex-wrap gap-3 mt-4 justify-center">
              <div className="text-center px-4 py-2 bg-muted rounded-lg border">
                <div className="text-lg font-bold text-[#007AFF]">{teachers.length}</div>
                <div className="text-[10px] text-muted-foreground">Teachers</div>
              </div>
              <div className="text-center px-4 py-2 bg-muted rounded-lg border">
                <div className="text-lg font-bold text-[#007AFF]">{filteredSelectedDays.length}</div>
                <div className="text-[10px] text-muted-foreground">Days</div>
              </div>
              <div className="text-center px-4 py-2 bg-muted rounded-lg border">
                <div className="text-lg font-bold text-[#007AFF]">{maxPossiblePerTeacher}</div>
                <div className="text-[10px] text-muted-foreground">Max Periods/Teacher</div>
              </div>
              <div className="text-center px-4 py-2 bg-muted rounded-lg border">
                <div className="text-lg font-bold text-[#34C759]">
                  {maxPossiblePerTeacher > 0
                    ? Math.round((teacherData.reduce((s, td) => s + td.totalForSelectedDays, 0) / (teachers.length * maxPossiblePerTeacher)) * 100)
                    : 0}%
                </div>
                <div className="text-[10px] text-muted-foreground">Utilization</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ===== Class Timetable Report ===== */

function ClassTimetableReport({ classId, sectionId, showBreaks, showEmpty }: { classId: string; sectionId: string; showBreaks: boolean; showEmpty: boolean }) {
  const { entries, teachers, subjects, timings, schoolName, classes, sections } = useTimetableStore();
  const { toast } = useToast();
  const { downloadPdf, isGenerating } = usePdfDownload();

  const activeDays = timings.days;
  const cls = classes.find((c) => c.id === classId);
  const sec = sections.find((s) => s.id === sectionId);

  const handlePrint = () => {
    toast({ title: 'Print', description: 'Use your browser\'s print function (Ctrl+P / Cmd+P) to print the report.' });
    window.print();
  };

  const handlePdf = async () => {
    await downloadPdf(buildClassTimetableHtml(schoolName, cls?.name || 'Class', sec?.name || '', timings, entries, teachers, classes, sections, subjects, classId, sectionId, showBreaks, showEmpty), `${cls?.name || 'Class'}_Section_${sec?.name || ''}_Timetable.pdf`);
  };

  const visiblePeriods = useMemo(() => {
    const periods: number[] = [];
    for (let p = 1; p <= timings.periodsPerDay; p++) {
      const isBreak = isBreakPeriod(p, timings);
      if (isBreak && !showBreaks) continue;
      if (!isBreak && !showEmpty) {
        const hasEntry = activeDays.some((day) =>
          entries.some((e) => e.day === day && e.period === p && e.classId === classId && e.sectionId === sectionId)
        );
        if (!hasEntry) continue;
      }
      periods.push(p);
    }
    return periods;
  }, [timings, showBreaks, showEmpty, activeDays, entries, classId, sectionId]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-lg">{cls?.name} — Section {sec?.name}</CardTitle>
            <CardDescription>Weekly timetable report</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1.5" />
              Print
            </Button>
            <Button size="sm" onClick={handlePdf} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
              Download PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="grid gap-px bg-border rounded-lg overflow-hidden" style={{ gridTemplateColumns: '100px repeat(' + activeDays.length + ', 1fr)' }}>
              <div className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground flex items-center justify-center">Day / Period</div>
              {activeDays.map((day) => (
                <div key={day} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">{day}</div>
              ))}
              {visiblePeriods.map((period) => {
                const isBreak = isBreakPeriod(period, timings);
                const time = getPeriodTime(period, timings);
                return (
                  <div key={`row-${period}`}>
                    <div className={`bg-muted/50 p-2 flex flex-col items-center justify-center gap-0.5 ${isBreak ? 'bg-amber-100 dark:bg-amber-900/20' : ''}`}>
                      <span className="text-xs font-medium">{getPeriodLabel(period, timings)}</span>
                      <span className="text-[10px] text-muted-foreground">{time}</span>
                    </div>
                    {activeDays.map((day) => {
                      const entry = entries.find((e) => e.day === day && e.period === period && e.classId === classId && e.sectionId === sectionId);
                      const teacher = entry ? teachers.find((t) => t.id === entry.teacherId) : null;
                      const subject = entry ? subjects.find((s) => s.id === entry.subjectId) : null;
                      const colors = entry ? getSubjectColor(entry.subjectId) : null;
                      if (isBreak) return <div key={`${day}-${period}`} className="bg-amber-50 dark:bg-amber-950/10 p-2 flex items-center justify-center"><Coffee className="h-3 w-3 text-amber-400" /></div>;
                      if (!entry && !showEmpty) return <div key={`${day}-${period}`} className="bg-card p-2 min-h-[48px]" />;
                      return (
                        <div key={`${day}-${period}`} className={`p-2 min-h-[48px] flex flex-col items-center justify-center ${entry ? `${colors?.bg || ''} ${colors?.border || ''} border` : 'bg-card'}`}>
                          {entry ? (<><span className={`text-xs font-semibold ${colors?.text || ''}`}>{subject?.shortName || '?'}</span><span className="text-[10px] text-muted-foreground">{teacher?.name}</span></>) : (<span className="text-[10px] text-muted-foreground/40">—</span>)}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ===== Teacher Schedule Report ===== */

function TeacherScheduleReport({ teacherId, showBreaks, showEmpty }: { teacherId: string; showBreaks: boolean; showEmpty: boolean }) {
  const { entries, classes, sections, subjects, timings, schoolName, teachers } = useTimetableStore();
  const { toast } = useToast();
  const { downloadPdf, isGenerating } = usePdfDownload();

  const activeDays = timings.days;
  const teacher = teachers.find((t) => t.id === teacherId);

  const teacherEntries = useMemo(() => entries.filter((e) => e.teacherId === teacherId), [entries, teacherId]);

  const handlePrint = () => {
    toast({ title: 'Print', description: 'Use your browser\'s print function (Ctrl+P / Cmd+P) to print the report.' });
    window.print();
  };

  const handlePdf = async () => {
    await downloadPdf(buildTeacherScheduleHtml(schoolName, teacher?.name || 'Teacher', timings, entries, teachers, classes, sections, subjects, teacherId, showBreaks, showEmpty), `${teacher?.shortName || 'Teacher'}_Schedule.pdf`);
  };

  const visiblePeriods = useMemo(() => {
    const periods: number[] = [];
    for (let p = 1; p <= timings.periodsPerDay; p++) {
      const isBreak = isBreakPeriod(p, timings);
      if (isBreak && !showBreaks) continue;
      if (!isBreak && !showEmpty) {
        const hasEntry = activeDays.some((day) => teacherEntries.some((e) => e.day === day && e.period === p));
        if (!hasEntry) continue;
      }
      periods.push(p);
    }
    return periods;
  }, [timings, showBreaks, showEmpty, activeDays, teacherEntries]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2"><UserCheck className="h-4 w-4" />{teacher?.name}</CardTitle>
            <CardDescription>Weekly teaching schedule</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-1.5" />Print</Button>
            <Button size="sm" onClick={handlePdf} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
              Download PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="grid gap-px bg-border rounded-lg overflow-hidden" style={{ gridTemplateColumns: '100px repeat(' + activeDays.length + ', 1fr)' }}>
              <div className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground flex items-center justify-center">Day / Period</div>
              {activeDays.map((day) => <div key={day} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">{day}</div>)}
              {visiblePeriods.map((period) => {
                const isBreak = isBreakPeriod(period, timings);
                const time = getPeriodTime(period, timings);
                return (
                  <div key={`row-${period}`}>
                    <div className={`bg-muted/50 p-2 flex flex-col items-center justify-center gap-0.5 ${isBreak ? 'bg-amber-100 dark:bg-amber-900/20' : ''}`}>
                      <span className="text-xs font-medium">{getPeriodLabel(period, timings)}</span>
                      <span className="text-[10px] text-muted-foreground">{time}</span>
                    </div>
                    {activeDays.map((day) => {
                      const entry = teacherEntries.find((e) => e.day === day && e.period === period);
                      const subject = entry ? subjects.find((s) => s.id === entry.subjectId) : null;
                      const cls = entry ? classes.find((c) => c.id === entry.classId) : null;
                      const sec = entry ? sections.find((s) => s.id === entry.sectionId) : null;
                      const colors = entry ? getSubjectColor(entry.subjectId) : null;
                      if (isBreak) return <div key={`${day}-${period}`} className="bg-amber-50 dark:bg-amber-950/10 p-2 flex items-center justify-center"><Coffee className="h-3 w-3 text-amber-400" /></div>;
                      if (!entry && !showEmpty) return <div key={`${day}-${period}`} className="bg-card p-2 min-h-[48px]" />;
                      return (
                        <div key={`${day}-${period}`} className={`p-2 min-h-[48px] flex flex-col items-center justify-center ${entry ? `${colors?.bg || ''} ${colors?.border || ''} border` : 'bg-card'}`}>
                          {entry ? (<><span className={`text-xs font-semibold ${colors?.text || ''}`}>{subject?.shortName || '?'}</span><span className="text-[10px] text-muted-foreground">{cls?.name}-{sec?.name}</span></>) : (<span className="text-[10px] text-muted-foreground/40">—</span>)}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ===== Free Periods Report ===== */

function FreePeriodsReport({ teacherId }: { teacherId: string }) {
  const { entries, timings, schoolName, teachers, classes, sections, subjects } = useTimetableStore();
  const { toast } = useToast();
  const { downloadPdf, isGenerating } = usePdfDownload();

  const activeDays = timings.days;
  const teacher = teachers.find((t) => t.id === teacherId);

  const teacherEntries = useMemo(() => entries.filter((e) => e.teacherId === teacherId), [entries, teacherId]);

  const freePeriods = useMemo(() => {
    const result: { day: string; period: number; time: string }[] = [];
    activeDays.forEach((day) => {
      for (let period = 1; period <= timings.periodsPerDay; period++) {
        if (isBreakPeriod(period, timings)) continue;
        const hasEntry = teacherEntries.some((e) => e.day === day && e.period === period);
        if (!hasEntry) result.push({ day, period, time: getPeriodTime(period, timings) });
      }
    });
    return result;
  }, [teacherEntries, activeDays, timings]);

  const groupedByDay = useMemo(() => {
    const map = new Map<string, typeof freePeriods>();
    freePeriods.forEach((fp) => { const list = map.get(fp.day) || []; list.push(fp); map.set(fp.day, list); });
    return map;
  }, [freePeriods]);

  const totalFreePeriods = freePeriods.length;
  const breakCount = timings.periodTimingMode === 'custom'
    ? timings.customPeriodTimings.filter((pt) => pt.isBreak).length
    : (timings.breakAfterPeriod > 0 ? 1 : 0);
  const totalPeriods = activeDays.length * (timings.periodsPerDay - breakCount);

  const handlePrint = () => { toast({ title: 'Print', description: 'Use your browser\'s print function.' }); window.print(); };

  const handlePdf = async () => {
    await downloadPdf(buildFreePeriodsHtml(schoolName, teacher?.name || 'Teacher', timings, entries, teachers, classes, sections, subjects, teacherId), `${teacher?.shortName || 'Teacher'}_Free_Periods.pdf`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2"><Clock className="h-4 w-4" />Free Periods — {teacher?.name}</CardTitle>
            <CardDescription>{totalFreePeriods} free period{totalFreePeriods !== 1 ? 's' : ''} out of {totalPeriods} total ({totalPeriods > 0 ? Math.round((totalFreePeriods / totalPeriods) * 100) : 0}% free)</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-1.5" />Print</Button>
            <Button size="sm" onClick={handlePdf} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
              Download PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {freePeriods.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No free periods found. This teacher is fully occupied.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activeDays.map((day) => {
              const dayFree = groupedByDay.get(day);
              if (!dayFree || dayFree.length === 0) return null;
              return (
                <div key={day} className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 mb-2"><CalendarDays className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{day}</span><Badge variant="secondary">{dayFree.length} free</Badge></div>
                  <div className="flex flex-wrap gap-2">
                    {dayFree.map((fp) => (
                      <div key={`${fp.day}-${fp.period}`} className="px-3 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-sm">
                        <span className="font-medium">Period {fp.period}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{fp.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ===== Cut-out Teacher Timetables Report ===== */

function CutoutTimetablesReport() {
  const { entries, teachers, timings, schoolName, classes, sections, subjects } = useTimetableStore();
  const { toast } = useToast();
  const { downloadPdf, isGenerating } = usePdfDownload();

  const activeDays = timings.days;
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [tablesPerSheet, setTablesPerSheet] = useState<number>(2);
  const [showBreaks, setShowBreaks] = useState(false);
  const [showEmpty, setShowEmpty] = useState(true);

  const toggleTeacher = (id: string) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedTeacherIds(teachers.map((t) => t.id));
  const selectNone = () => setSelectedTeacherIds([]);

  // Get non-break period numbers for this teacher
  const visiblePeriods = useMemo(() => {
    const periods: number[] = [];
    for (let p = 1; p <= timings.periodsPerDay; p++) {
      const isBreak = isBreakPeriod(p, timings);
      if (isBreak && !showBreaks) continue;
      if (!isBreak && !showEmpty) {
        const hasAnyEntry = activeDays.some((day) =>
          entries.some((e) => {
            if (!selectedTeacherIds.includes(e.teacherId)) return false;
            return e.day === day && e.period === p;
          })
        );
        if (!hasAnyEntry) continue;
      }
      periods.push(p);
    }
    return periods;
  }, [timings, showBreaks, showEmpty, activeDays, entries, selectedTeacherIds]);

  // Build teacher schedule data for selected teachers
  const teacherSchedules = useMemo(() => {
    return selectedTeacherIds.map((teacherId) => {
      const teacher = teachers.find((t) => t.id === teacherId);
      if (!teacher) return null;
      const teacherEntries = entries.filter((e) => e.teacherId === teacherId);

      const schedule: Record<string, Record<number, { subject: string; cls: string; sec: string }>> = {};
      for (const day of activeDays) {
        schedule[day] = {};
        for (const period of visiblePeriods) {
          const entry = teacherEntries.find((e) => e.day === day && e.period === period);
          if (entry) {
            const subj = subjects.find((s) => s.id === entry.subjectId);
            const cls = classes.find((c) => c.id === entry.classId);
            const sec = sections.find((s) => s.id === entry.sectionId);
            schedule[day][period] = {
              subject: subj?.shortName || '?',
              cls: cls?.name || '?',
              sec: sec?.name || '?',
            };
          }
        }
      }

      return { teacher, schedule };
    }).filter(Boolean);
  }, [selectedTeacherIds, teachers, entries, activeDays, visiblePeriods, subjects, classes, sections]);

  const selectedCount = selectedTeacherIds.length;

  // Build print HTML
  const buildCutoutHtml = useCallback(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Layout configurations based on tablesPerSheet
    const layouts: Record<number, { cols: number; rows: number; fontSize: string; headerFontSize: string; nameFontSize: string; cellPad: string; dayAbbrev: boolean }> = {
      1: { cols: 1, rows: 1, fontSize: '9px', headerFontSize: '8px', nameFontSize: '14px', cellPad: '3px 4px', dayAbbrev: false },
      2: { cols: 1, rows: 2, fontSize: '7px', headerFontSize: '6.5px', nameFontSize: '11px', cellPad: '2px 3px', dayAbbrev: true },
      4: { cols: 2, rows: 2, fontSize: '6px', headerFontSize: '5.5px', nameFontSize: '9px', cellPad: '1px 2px', dayAbbrev: true },
      6: { cols: 2, rows: 3, fontSize: '5px', headerFontSize: '4.5px', nameFontSize: '7.5px', cellPad: '1px 1.5px', dayAbbrev: true },
      8: { cols: 2, rows: 4, fontSize: '4.5px', headerFontSize: '4px', nameFontSize: '6.5px', cellPad: '0.5px 1px', dayAbbrev: true },
    };

    const layout = layouts[tablesPerSheet] || layouts[2];
    const { cols, rows, fontSize, headerFontSize, nameFontSize, cellPad, dayAbbrev } = layout;

    // Grid CSS for the page
    const gridCols = cols === 1 ? '1fr' : `1fr 1fr`;
    const boxGap = tablesPerSheet <= 2 ? '12px' : tablesPerSheet <= 4 ? '8px' : '5px';
    const boxPadding = tablesPerSheet <= 2 ? '10px' : tablesPerSheet <= 4 ? '6px' : '4px';

    // Group selected teachers into pages
    const perPage = cols * rows;
    const pages: typeof teacherSchedules[] = [];
    for (let i = 0; i < teacherSchedules.length; i += perPage) {
      pages.push(teacherSchedules.slice(i, i + perPage));
    }

    // Build each teacher's box
    const buildTeacherBox = (item: NonNullable<typeof teacherSchedules[0]>) => {
      const { teacher, schedule } = item;
      const dayLabel = (d: string) => dayAbbrev ? d.slice(0, 3) : d;

      let tableHtml = '';
      // Header row with days
      tableHtml += `<tr><th class="ct-corner"></th>`;
      for (const day of activeDays) {
        tableHtml += `<th class="ct-day">${esc(dayLabel(day))}</th>`;
      }
      tableHtml += `</tr>`;

      // Period rows
      for (const period of visiblePeriods) {
        const isBreak = isBreakPeriod(period, timings);
        if (isBreak) {
          tableHtml += `<tr><td class="ct-period ct-break" colspan="${activeDays.length + 1}">Break</td></tr>`;
          continue;
        }
        const time = getPeriodTime(period, timings);
        tableHtml += `<tr><td class="ct-period">${esc(getPeriodLabel(period, timings))}<br><span class="ct-time">${esc(time)}</span></td>`;
        for (const day of activeDays) {
          const cell = schedule[day]?.[period];
          if (cell) {
            tableHtml += `<td class="ct-cell ct-filled">${esc(cell.cls)}-${esc(cell.sec)}<br><strong>${esc(cell.subject)}</strong></td>`;
          } else {
            tableHtml += `<td class="ct-cell ct-empty">-</td>`;
          }
        }
        tableHtml += `</tr>`;
      }

      return `
        <div class="ct-box">
          <div class="ct-name">${esc(teacher.name)}</div>
          <table class="ct-table">${tableHtml}</table>
        </div>`;
    };

    let allPagesHtml = '';
    pages.forEach((page, pi) => {
      allPagesHtml += `<div class="ct-page">`;
      page.forEach((item) => {
        if (item) allPagesHtml += buildTeacherBox(item);
      });
      allPagesHtml += `</div>`;
      if (pi < pages.length - 1) allPagesHtml += `<div class="page-break"></div>`;
    });

    const totalPages = pages.length;

    const genTime = new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@page { size: A4 portrait; margin: 8mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, 'Helvetica Neue', sans-serif; font-size: ${fontSize}; color: #1a1a2e; line-height: 1.2; }
.rpt-header { text-align: center; padding-bottom: 5px; margin-bottom: 7px; border-bottom: 3px solid #1565C0; }
.rpt-school { font-size: 12pt; font-weight: 700; color: #0D47A1; }
.rpt-title  { font-size: 9pt; font-weight: 600; color: #1a1a2e; margin-top: 2px; }
.ct-page { display: grid; grid-template-columns: ${gridCols}; gap: ${boxGap}; width: 100%; align-content: start; }
.ct-box { border: 2px solid #1565C0; border-radius: 8px; padding: ${boxPadding}; page-break-inside: avoid; break-inside: avoid; background: #FAFAFE; }
.ct-name { text-align: center; font-size: ${nameFontSize}; font-weight: 800; color: #0D47A1; margin-bottom: 4px; padding-bottom: 3px; border-bottom: 1.5px solid #90CAF9; }
.ct-table { width: 100%; border-collapse: collapse; font-size: ${fontSize}; table-layout: fixed; }
.ct-table th, .ct-table td { border: 1px solid #CFD8DC; padding: ${cellPad}; text-align: center; vertical-align: middle; }
.ct-corner { width: 28px; background: #E3F2FD; font-size: ${headerFontSize}; font-weight: 700; }
.ct-day { background: #1565C0; color: #fff; font-size: ${headerFontSize}; font-weight: 700; }
.ct-period { background: #E3F2FD; font-size: ${headerFontSize}; font-weight: 700; color: #0D47A1; white-space: nowrap; }
.ct-time { font-size: ${tablesPerSheet <= 2 ? '5px' : '4px'}; color: #78909C; font-weight: 400; }
.ct-break { background: #FFF8E1 !important; font-size: ${headerFontSize}; color: #F57F17; font-style: italic; }
.ct-cell { font-size: ${fontSize}; height: ${tablesPerSheet <= 2 ? '22px' : tablesPerSheet <= 4 ? '16px' : '12px'}; }
.ct-filled { background: #F8F9FF; }
.ct-filled strong { color: #1a237e; }
.ct-empty { background: #FAFAFA; color: #CFD8DC; }
.page-break { page-break-after: always; break-after: page; }
.rpt-footer { margin-top: 6px; padding-top: 4px; border-top: 1px solid #B0BEC5; display: flex; justify-content: space-between; font-size: 7pt; color: #78909C; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .ct-box { border-color: #1565C0; } }
</style></head><body>
  <div class="rpt-header">
    <div class="rpt-school">${esc(schoolName)}</div>
    <div class="rpt-title">Individual Teacher Timetables</div>
  </div>
  ${allPagesHtml}
  <div class="rpt-footer">
    <span>${esc(genTime)}</span>
    <span>${teacherSchedules.length} teachers | ${tablesPerSheet} per sheet | ${totalPages} pages</span>
    <span>Page: 1 of ${totalPages}</span>
  </div>
</body></html>`;
  }, [teacherSchedules, tablesPerSheet  }, [teacherSchedules, tablesPerSheet, activeDays, visiblePeriods, schoolName, timings]);

  const handlePrint = () => {
    if (selectedTeacherIds.length === 0) {
      toast({ title: 'No teachers selected', description: 'Please select at least one teacher to print.', variant: 'destructive' });
      return;
    }
    const html = buildCutoutHtml();
    printOrSave(html, 'Cutout_Teacher_Timetables');
    toast({ title: 'Print dialog opened', description: `${selectedTeacherIds.length} teacher(s) scheduled for print.` });
  };

  const handlePdf = async () => {
    if (selectedTeacherIds.length === 0) {
      toast({ title: 'No teachers selected', description: 'Please select at least one teacher.', variant: 'destructive' });
      return;
    }
    const html = buildCutoutHtml();
    await downloadPdf(html, `Cutout_Timetables_${new Date().toISOString().slice(0, 10)}.pdf`, 'portrait');
  };

  const previewTeachers = teacherSchedules.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Controls Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Scissors className="h-5 w-5" />
            Cut-out Teacher Timetables
          </CardTitle>
          <CardDescription>
            Print individual box-shaped timetables for each teacher — ready to cut and hand out
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Teacher Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Select Teachers ({selectedCount} selected)
              </Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectNone}>
                  Clear
                </Button>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border p-2 space-y-1 bg-muted/30">
              {teachers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No teachers added yet. Go to Setup to add teachers.</p>
              ) : (
                teachers.map((t) => (
                  <label
                    key={t.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-sm ${
                      selectedTeacherIds.includes(t.id)
                        ? 'bg-[#FF000008] border border-[#FF000020] text-[#FF0000] font-medium'
                        : 'hover:bg-muted/60 text-muted-foreground'
                    }`}
                  >
                    <Checkbox checked={selectedTeacherIds.includes(t.id)} onCheckedChange={() => toggleTeacher(t.id)} />
                    <span>{t.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">({t.shortName})</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <Separator />

          {/* Layout Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tables Per Sheet (A4 Portrait)</Label>
              <Select value={String(tablesPerSheet)} onValueChange={(v) => setTablesPerSheet(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 table per sheet (Large)</SelectItem>
                  <SelectItem value="2">2 tables per sheet (Medium)</SelectItem>
                  <SelectItem value="4">4 tables per sheet (2x2)</SelectItem>
                  <SelectItem value="6">6 tables per sheet (2x3)</SelectItem>
                  <SelectItem value="8">8 tables per sheet (2x4)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                More tables per sheet = smaller size, more teachers per page
              </p>
            </div>

            <div className="space-y-2">
              <Label>Display Options</Label>
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={showBreaks} onCheckedChange={(v) => setShowBreaks(!!v)} />
                  <span className="text-sm">Show Break Periods</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={showEmpty} onCheckedChange={(v) => setShowEmpty(!!v)} />
                  <span className="text-sm">Show Empty Slots</span>
                </label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handlePrint} disabled={selectedCount === 0}>
              <Printer className="h-4 w-4 mr-1.5" />
              Print ({selectedCount})
            </Button>
            <Button onClick={handlePdf} disabled={selectedCount === 0 || isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
              Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {selectedCount > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg">Preview</CardTitle>
                <CardDescription>
                  Showing {previewTeachers.length} of {selectedCount} selected teacher(s) | {tablesPerSheet} per A4 sheet
                </CardDescription>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Scissors className="h-3 w-3" />
                {Math.ceil(selectedCount / tablesPerSheet)} page(s) needed
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4" style={{ gridTemplateColumns: tablesPerSheet <= 2 ? '1fr' : '1fr 1fr' }}>
              {previewTeachers.map((item) => {
                if (!item) return null;
                const { teacher, schedule } = item;
                return (
                  <div
                    key={teacher.id}
                    className="border-2 border-dashed border-gray-400 rounded-xl p-3 bg-[#FAFAFA]"
                  >
                    <div className="text-center font-extrabold text-red-600 text-sm mb-2 pb-1 border-b border-red-200">
                      {teacher.name}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-[10px]">
                        <thead>
                          <tr>
                            <th className="border px-1 py-1 bg-muted text-[9px] font-semibold w-12">Day/P</th>
                            {activeDays.map((day) => (
                              <th key={day} className="border px-1 py-1 bg-[#E8E8ED] text-[9px] font-bold">{day.slice(0, 3)}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {visiblePeriods.map((period) => {
                            const isBreak = isBreakPeriod(period, timings);
                            if (isBreak) {
                              return (
                                <tr key={`break-${period}`}>
                                  <td colSpan={activeDays.length + 1} className="border px-1 py-0.5 bg-amber-50 text-center text-[9px] text-amber-600">
                                    Break
                                  </td>
                                </tr>
                              );
                            }
                            const time = getPeriodTime(period, timings);
                            return (
                              <tr key={period}>
                                <td className="border px-1 py-0.5 bg-muted text-center text-[8px] font-semibold whitespace-nowrap">
                                  {getPeriodLabel(period, timings)}<br /><span className="text-[7px] text-muted-foreground">{time}</span>
                                </td>
                                {activeDays.map((day) => {
                                  const cell = schedule[day]?.[period];
                                  if (cell) {
                                    return (
                                      <td key={day} className="border px-1 py-0.5 bg-white text-center">
                                        <div className="text-[7px] text-muted-foreground">{cell.cls}-{cell.sec}</div>
                                        <div className="font-bold text-[9px]">{cell.subject}</div>
                                      </td>
                                    );
                                  }
                                  return (
                                    <td key={day} className="border px-1 py-0.5 bg-[#F9F9F9] text-center text-muted-foreground/40">
                                      -
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedCount > 3 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                + {selectedCount - 3} more teacher(s) not shown in preview
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ===== Inline HTML builders for PDF/Print ===== */

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildClassTimetableHtml(schoolName: string, className: string, sectionName: string, timings: any, entries: any[], teachers: any[], classes: any[], sections: any[], subjects: any[], classId: string, sectionId: string, showBreaks: boolean, showEmpty: boolean): string {
  const activeDays = timings.days;
  const fe = entries.filter((e: any) => e.classId === classId && e.sectionId === sectionId);
  const genTime = new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });
  const reportTitle = 'Class Timetable';
  const subtitle = `${className} \u2014 Section ${sectionName}`;
  const getT = (id: string) => teachers.find((t: any) => t.id === id);
  const getS = (id: string) => subjects.find((s: any) => s.id === id);
  let rows = '';
  for (let p = 1; p <= timings.periodsPerDay; p++) {
    const isBreak = isBreakPeriod(p, timings);
    if (isBreak && !showBreaks) continue;
    const time = getPeriodTime(p, timings);
    const label = getPeriodLabel(p, timings);
    if (isBreak) {
      rows += `<tr class="tt-break"><td class="tt-period"><span class="pl">${esc(label)}</span><span class="pt">${esc(time)}</span></td>${activeDays.map(() => '<td class="tt-break-cell">\u2615 Break</td>').join('')}</tr>`;
      continue;
    }
    rows += `<tr><td class="tt-period"><span class="pl">${esc(label)}</span><span class="pt">${esc(time)}</span></td>`;
    for (const day of activeDays) {
      const entry = fe.find((e: any) => e.day === day && e.period === p);
      if (entry) {
        const subj = getS(entry.subjectId);
        const tchr = getT(entry.teacherId);
        rows += `<td class="tt-filled"><b>${esc(subj?.shortName || '?')}</b><span class="tn">${esc(tchr?.name || '?')}</span></td>`;
      } else if (showEmpty) {
        rows += '<td class="tt-empty">\u2014</td>';
      } else {
        rows += '<td></td>';
      }
    }
    rows += '</tr>';
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${'
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, 'Helvetica Neue', sans-serif; font-size: 9pt; color: #1a1a2e; background: #fff; }

/* ── Page setup ── */
@page { size: A4 portrait; margin: 14mm 12mm 14mm 12mm; }
@page { @bottom-left   { content: attr(data-gen-time); font-family: Arial; font-size: 7pt; color: #888; } }
@page { @bottom-center { content: attr(data-footer-mid); font-family: Arial; font-size: 7pt; color: #888; } }
@page { @bottom-right  { content: "Page " counter(page) " of " counter(pages); font-family: Arial; font-size: 7pt; color: #888; } }

/* ── Header block ── */
.rpt-header { text-align: center; padding-bottom: 8px; margin-bottom: 10px; border-bottom: 3px solid #1565C0; }
.rpt-school { font-size: 15pt; font-weight: 700; color: #0D47A1; letter-spacing: 0.5px; }
.rpt-title  { font-size: 11pt; font-weight: 600; color: #1a1a2e; margin-top: 3px; }
.rpt-sub    { font-size: 9pt;  color: #555; margin-top: 2px; }

/* ── Footer bar ── */
.rpt-footer {
  margin-top: 12px; padding-top: 6px;
  border-top: 1px solid #B0BEC5;
  display: flex; justify-content: space-between; align-items: center;
  font-size: 7pt; color: #78909C;
}
.rpt-footer .fl { text-align: left; }
.rpt-footer .fc { text-align: center; flex: 1; }
.rpt-footer .fr { text-align: right; }

/* ── Timetable grid ── */
.tt-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
.tt-table th, .tt-table td { border: 1px solid #CFD8DC; padding: 3pt 2pt; text-align: center; vertical-align: middle; }
.tt-table thead th { background: #1565C0; color: #fff; font-size: 8pt; font-weight: 700; }
.tt-table thead th:first-child { background: #0D47A1; }
.tt-period { background: #E3F2FD; font-size: 7.5pt; width: 70px; min-width: 70px; }
.tt-period .pl { display: block; font-weight: 700; color: #0D47A1; }
.tt-period .pt { display: block; font-size: 6pt; color: #78909C; margin-top: 1px; }
.tt-filled { font-size: 8pt; }
.tt-filled b { display: block; color: #1a237e; }
.tt-filled .tn { display: block; font-size: 6.5pt; color: #455A64; margin-top: 1px; }
.tt-empty { color: #CFD8DC; font-size: 10pt; }
.tt-break td { background: #FFF8E1 !important; }
.tt-break-cell { font-style: italic; color: #F57F17; font-size: 8pt; }

/* ── Free periods ── */
.fp-stats { display: flex; gap: 10px; justify-content: center; margin-bottom: 12px; }
.fp-stat { text-align: center; padding: 7px 16px; background: #E3F2FD; border-radius: 8px; border: 1px solid #90CAF9; }
.fp-stat-num { display: block; font-size: 18pt; font-weight: 700; color: #1565C0; }
.fp-stat-lbl { display: block; font-size: 7pt; color: #78909C; margin-top: 2px; }
.fp-day { margin-bottom: 8px; border: 1px solid #CFD8DC; border-radius: 6px; overflow: hidden; }
.fp-day-hd { background: #1565C0; color: #fff; padding: 5px 8px; font-weight: 700; font-size: 9pt; }
.fp-day-hd .fc { font-weight: 400; font-size: 7.5pt; color: #BBDEFB; margin-left: 6px; }
.fp-day-bd { display: flex; flex-wrap: wrap; gap: 5px; padding: 7px 8px; }
.fp-chip { padding: 3px 9px; background: #E8F5E9; border: 1px solid #A5D6A7; border-radius: 12px; font-size: 7.5pt; font-weight: 600; color: #2E7D32; }
.fp-chip span { font-weight: 400; color: #555; font-size: 6.5pt; margin-left: 3px; }

/* ── Period count table ── */
.pc-table { width: 100%; border-collapse: collapse; }
.pc-table th, .pc-table td { border: 1px solid #CFD8DC; padding: 3pt 2pt; text-align: center; vertical-align: middle; }
.pc-table thead tr th { background: #1565C0; color: #fff; font-size: 7.5pt; font-weight: 700; }
.pc-table thead tr th.th-name { text-align: left; }
.td-sno { color: #78909C; font-size: 7pt; width: 22px; }
.td-name { text-align: left !important; font-weight: 500; }
.td-short { font-weight: 600; }
.td-num { font-weight: 600; }
.td-zero { background: #FFF3E0 !important; color: #E65100; }
.td-full { background: #E8F5E9 !important; color: #2E7D32; }
.td-total { background: #E3F2FD; font-weight: 700; color: #1565C0; }
.td-detail { text-align: left !important; font-size: 6.5pt; color: #555; }
.pc-summary { display: flex; gap: 10px; justify-content: center; margin-top: 10px; flex-wrap: wrap; }
.pc-sum-item { text-align: center; padding: 5px 14px; background: #E3F2FD; border-radius: 6px; border: 1px solid #90CAF9; }
.pc-sum-num { display: block; font-size: 14pt; font-weight: 700; color: #1565C0; }
.pc-sum-lbl { display: block; font-size: 6.5pt; color: #78909C; }

@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
'}</style></head><body>
  <div class="rpt-header">
    <div class="rpt-school">${esc(schoolName)}</div>
    <div class="rpt-title">${esc(reportTitle)}</div>
    <div class="rpt-sub">${esc(subtitle)}</div>
  </div>
  <table class="tt-table">
    <thead><tr><th>Period / Day</th>${activeDays.map((d: string) => `<th>${esc(d)}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="rpt-footer">
    <span class="fl">${esc(genTime)}</span>
    <span class="fc">${esc(schoolName)} \u2014 ${esc(reportTitle)}</span>
    <span class="fr">Page: 1 of 1</span>
  </div>
</body></html>`;
}

function buildTeacherScheduleHtml(schoolName: string, teacherName: string, timings: any, entries: any[], teachers: any[], classes: any[], sections: any[], subjects: any[], teacherId: string, showBreaks: boolean, showEmpty: boolean): string {
  const activeDays = timings.days;
  const fe = entries.filter((e: any) => e.teacherId === teacherId);
  const genTime = new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });
  const reportTitle = 'Teacher Schedule';
  const getS = (id: string) => subjects.find((s: any) => s.id === id);
  const getC = (id: string) => classes.find((c: any) => c.id === id);
  const getSec = (id: string) => sections.find((s: any) => s.id === id);
  let rows = '';
  for (let p = 1; p <= timings.periodsPerDay; p++) {
    const isBreak = isBreakPeriod(p, timings);
    if (isBreak && !showBreaks) continue;
    const time = getPeriodTime(p, timings);
    const label = getPeriodLabel(p, timings);
    if (isBreak) {
      rows += `<tr class="tt-break"><td class="tt-period"><span class="pl">${esc(label)}</span><span class="pt">${esc(time)}</span></td>${activeDays.map(() => '<td class="tt-break-cell">\u2615 Break</td>').join('')}</tr>`;
      continue;
    }
    rows += `<tr><td class="tt-period"><span class="pl">${esc(label)}</span><span class="pt">${esc(time)}</span></td>`;
    for (const day of activeDays) {
      const entry = fe.find((e: any) => e.day === day && e.period === p);
      if (entry) {
        const subj = getS(entry.subjectId);
        const cls = getC(entry.classId);
        const sec = getSec(entry.sectionId);
        rows += `<td class="tt-filled"><b>${esc(subj?.shortName || '?')}</b><span class="tn">${esc(cls?.name || '')}-${esc(sec?.name || '')}</span></td>`;
      } else if (showEmpty) {
        rows += '<td class="tt-empty">\u2014</td>';
      } else {
        rows += '<td></td>';
      }
    }
    rows += '</tr>';
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${'
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, 'Helvetica Neue', sans-serif; font-size: 9pt; color: #1a1a2e; background: #fff; }

/* ── Page setup ── */
@page { size: A4 portrait; margin: 14mm 12mm 14mm 12mm; }
@page { @bottom-left   { content: attr(data-gen-time); font-family: Arial; font-size: 7pt; color: #888; } }
@page { @bottom-center { content: attr(data-footer-mid); font-family: Arial; font-size: 7pt; color: #888; } }
@page { @bottom-right  { content: "Page " counter(page) " of " counter(pages); font-family: Arial; font-size: 7pt; color: #888; } }

/* ── Header block ── */
.rpt-header { text-align: center; padding-bottom: 8px; margin-bottom: 10px; border-bottom: 3px solid #1565C0; }
.rpt-school { font-size: 15pt; font-weight: 700; color: #0D47A1; letter-spacing: 0.5px; }
.rpt-title  { font-size: 11pt; font-weight: 600; color: #1a1a2e; margin-top: 3px; }
.rpt-sub    { font-size: 9pt;  color: #555; margin-top: 2px; }

/* ── Footer bar ── */
.rpt-footer {
  margin-top: 12px; padding-top: 6px;
  border-top: 1px solid #B0BEC5;
  display: flex; justify-content: space-between; align-items: center;
  font-size: 7pt; color: #78909C;
}
.rpt-footer .fl { text-align: left; }
.rpt-footer .fc { text-align: center; flex: 1; }
.rpt-footer .fr { text-align: right; }

/* ── Timetable grid ── */
.tt-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
.tt-table th, .tt-table td { border: 1px solid #CFD8DC; padding: 3pt 2pt; text-align: center; vertical-align: middle; }
.tt-table thead th { background: #1565C0; color: #fff; font-size: 8pt; font-weight: 700; }
.tt-table thead th:first-child { background: #0D47A1; }
.tt-period { background: #E3F2FD; font-size: 7.5pt; width: 70px; min-width: 70px; }
.tt-period .pl { display: block; font-weight: 700; color: #0D47A1; }
.tt-period .pt { display: block; font-size: 6pt; color: #78909C; margin-top: 1px; }
.tt-filled { font-size: 8pt; }
.tt-filled b { display: block; color: #1a237e; }
.tt-filled .tn { display: block; font-size: 6.5pt; color: #455A64; margin-top: 1px; }
.tt-empty { color: #CFD8DC; font-size: 10pt; }
.tt-break td { background: #FFF8E1 !important; }
.tt-break-cell { font-style: italic; color: #F57F17; font-size: 8pt; }

/* ── Free periods ── */
.fp-stats { display: flex; gap: 10px; justify-content: center; margin-bottom: 12px; }
.fp-stat { text-align: center; padding: 7px 16px; background: #E3F2FD; border-radius: 8px; border: 1px solid #90CAF9; }
.fp-stat-num { display: block; font-size: 18pt; font-weight: 700; color: #1565C0; }
.fp-stat-lbl { display: block; font-size: 7pt; color: #78909C; margin-top: 2px; }
.fp-day { margin-bottom: 8px; border: 1px solid #CFD8DC; border-radius: 6px; overflow: hidden; }
.fp-day-hd { background: #1565C0; color: #fff; padding: 5px 8px; font-weight: 700; font-size: 9pt; }
.fp-day-hd .fc { font-weight: 400; font-size: 7.5pt; color: #BBDEFB; margin-left: 6px; }
.fp-day-bd { display: flex; flex-wrap: wrap; gap: 5px; padding: 7px 8px; }
.fp-chip { padding: 3px 9px; background: #E8F5E9; border: 1px solid #A5D6A7; border-radius: 12px; font-size: 7.5pt; font-weight: 600; color: #2E7D32; }
.fp-chip span { font-weight: 400; color: #555; font-size: 6.5pt; margin-left: 3px; }

/* ── Period count table ── */
.pc-table { width: 100%; border-collapse: collapse; }
.pc-table th, .pc-table td { border: 1px solid #CFD8DC; padding: 3pt 2pt; text-align: center; vertical-align: middle; }
.pc-table thead tr th { background: #1565C0; color: #fff; font-size: 7.5pt; font-weight: 700; }
.pc-table thead tr th.th-name { text-align: left; }
.td-sno { color: #78909C; font-size: 7pt; width: 22px; }
.td-name { text-align: left !important; font-weight: 500; }
.td-short { font-weight: 600; }
.td-num { font-weight: 600; }
.td-zero { background: #FFF3E0 !important; color: #E65100; }
.td-full { background: #E8F5E9 !important; color: #2E7D32; }
.td-total { background: #E3F2FD; font-weight: 700; color: #1565C0; }
.td-detail { text-align: left !important; font-size: 6.5pt; color: #555; }
.pc-summary { display: flex; gap: 10px; justify-content: center; margin-top: 10px; flex-wrap: wrap; }
.pc-sum-item { text-align: center; padding: 5px 14px; background: #E3F2FD; border-radius: 6px; border: 1px solid #90CAF9; }
.pc-sum-num { display: block; font-size: 14pt; font-weight: 700; color: #1565C0; }
.pc-sum-lbl { display: block; font-size: 6.5pt; color: #78909C; }

@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
'}</style></head><body>
  <div class="rpt-header">
    <div class="rpt-school">${esc(schoolName)}</div>
    <div class="rpt-title">${esc(reportTitle)}</div>
    <div class="rpt-sub">${esc(teacherName)}</div>
  </div>
  <table class="tt-table">
    <thead><tr><th>Period / Day</th>${activeDays.map((d: string) => `<th>${esc(d)}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="rpt-footer">
    <span class="fl">${esc(genTime)}</span>
    <span class="fc">${esc(schoolName)} \u2014 ${esc(reportTitle)}</span>
    <span class="fr">Page: 1 of 1</span>
  </div>
</body></html>`;
}

function buildFreePeriodsHtml(schoolName: string, teacherName: string, timings: any, entries: any[], teachers: any[], classes: any[], sections: any[], subjects: any[], teacherId: string): string {
  const activeDays = timings.days;
  const te = entries.filter((e: any) => e.teacherId === teacherId);
  const genTime = new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });
  const reportTitle = 'Free Periods Analysis';
  const fps: { day: string; period: number; time: string }[] = [];
  activeDays.forEach((day: string) => {
    for (let p = 1; p <= timings.periodsPerDay; p++) {
      if (isBreakPeriod(p, timings)) continue;
      if (!te.some((e: any) => e.day === day && e.period === p))
        fps.push({ day, period: p, time: getPeriodTime(p, timings) });
    }
  });
  const grouped = new Map<string, typeof fps>();
  fps.forEach((fp) => { const l = grouped.get(fp.day) || []; l.push(fp); grouped.set(fp.day, l); });
  const nonBreak = timings.periodTimingMode === 'custom'
    ? timings.customPeriodTimings.filter((pt: any) => !pt.isBreak).length
    : timings.periodsPerDay - (timings.breakAfterPeriod > 0 ? 1 : 0);
  const total = activeDays.length * nonBreak;
  const pct = total > 0 ? Math.round((fps.length / total) * 100) : 0;
  let dayBlocks = '';
  activeDays.forEach((day: string) => {
    const df = grouped.get(day);
    if (!df || df.length === 0) return;
    const chips = df.map((fp) => `<span class="fp-chip">${getPeriodLabel(fp.period, timings)} <span>${esc(fp.time)}</span></span>`).join('');
    dayBlocks += `<div class="fp-day"><div class="fp-day-hd">${esc(day)}<span class="fc">${df.length} free</span></div><div class="fp-day-bd">${chips}</div></div>`;
  });
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${'
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, 'Helvetica Neue', sans-serif; font-size: 9pt; color: #1a1a2e; background: #fff; }

/* ── Page setup ── */
@page { size: A4 portrait; margin: 14mm 12mm 14mm 12mm; }
@page { @bottom-left   { content: attr(data-gen-time); font-family: Arial; font-size: 7pt; color: #888; } }
@page { @bottom-center { content: attr(data-footer-mid); font-family: Arial; font-size: 7pt; color: #888; } }
@page { @bottom-right  { content: "Page " counter(page) " of " counter(pages); font-family: Arial; font-size: 7pt; color: #888; } }

/* ── Header block ── */
.rpt-header { text-align: center; padding-bottom: 8px; margin-bottom: 10px; border-bottom: 3px solid #1565C0; }
.rpt-school { font-size: 15pt; font-weight: 700; color: #0D47A1; letter-spacing: 0.5px; }
.rpt-title  { font-size: 11pt; font-weight: 600; color: #1a1a2e; margin-top: 3px; }
.rpt-sub    { font-size: 9pt;  color: #555; margin-top: 2px; }

/* ── Footer bar ── */
.rpt-footer {
  margin-top: 12px; padding-top: 6px;
  border-top: 1px solid #B0BEC5;
  display: flex; justify-content: space-between; align-items: center;
  font-size: 7pt; color: #78909C;
}
.rpt-footer .fl { text-align: left; }
.rpt-footer .fc { text-align: center; flex: 1; }
.rpt-footer .fr { text-align: right; }

/* ── Timetable grid ── */
.tt-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
.tt-table th, .tt-table td { border: 1px solid #CFD8DC; padding: 3pt 2pt; text-align: center; vertical-align: middle; }
.tt-table thead th { background: #1565C0; color: #fff; font-size: 8pt; font-weight: 700; }
.tt-table thead th:first-child { background: #0D47A1; }
.tt-period { background: #E3F2FD; font-size: 7.5pt; width: 70px; min-width: 70px; }
.tt-period .pl { display: block; font-weight: 700; color: #0D47A1; }
.tt-period .pt { display: block; font-size: 6pt; color: #78909C; margin-top: 1px; }
.tt-filled { font-size: 8pt; }
.tt-filled b { display: block; color: #1a237e; }
.tt-filled .tn { display: block; font-size: 6.5pt; color: #455A64; margin-top: 1px; }
.tt-empty { color: #CFD8DC; font-size: 10pt; }
.tt-break td { background: #FFF8E1 !important; }
.tt-break-cell { font-style: italic; color: #F57F17; font-size: 8pt; }

/* ── Free periods ── */
.fp-stats { display: flex; gap: 10px; justify-content: center; margin-bottom: 12px; }
.fp-stat { text-align: center; padding: 7px 16px; background: #E3F2FD; border-radius: 8px; border: 1px solid #90CAF9; }
.fp-stat-num { display: block; font-size: 18pt; font-weight: 700; color: #1565C0; }
.fp-stat-lbl { display: block; font-size: 7pt; color: #78909C; margin-top: 2px; }
.fp-day { margin-bottom: 8px; border: 1px solid #CFD8DC; border-radius: 6px; overflow: hidden; }
.fp-day-hd { background: #1565C0; color: #fff; padding: 5px 8px; font-weight: 700; font-size: 9pt; }
.fp-day-hd .fc { font-weight: 400; font-size: 7.5pt; color: #BBDEFB; margin-left: 6px; }
.fp-day-bd { display: flex; flex-wrap: wrap; gap: 5px; padding: 7px 8px; }
.fp-chip { padding: 3px 9px; background: #E8F5E9; border: 1px solid #A5D6A7; border-radius: 12px; font-size: 7.5pt; font-weight: 600; color: #2E7D32; }
.fp-chip span { font-weight: 400; color: #555; font-size: 6.5pt; margin-left: 3px; }

/* ── Period count table ── */
.pc-table { width: 100%; border-collapse: collapse; }
.pc-table th, .pc-table td { border: 1px solid #CFD8DC; padding: 3pt 2pt; text-align: center; vertical-align: middle; }
.pc-table thead tr th { background: #1565C0; color: #fff; font-size: 7.5pt; font-weight: 700; }
.pc-table thead tr th.th-name { text-align: left; }
.td-sno { color: #78909C; font-size: 7pt; width: 22px; }
.td-name { text-align: left !important; font-weight: 500; }
.td-short { font-weight: 600; }
.td-num { font-weight: 600; }
.td-zero { background: #FFF3E0 !important; color: #E65100; }
.td-full { background: #E8F5E9 !important; color: #2E7D32; }
.td-total { background: #E3F2FD; font-weight: 700; color: #1565C0; }
.td-detail { text-align: left !important; font-size: 6.5pt; color: #555; }
.pc-summary { display: flex; gap: 10px; justify-content: center; margin-top: 10px; flex-wrap: wrap; }
.pc-sum-item { text-align: center; padding: 5px 14px; background: #E3F2FD; border-radius: 6px; border: 1px solid #90CAF9; }
.pc-sum-num { display: block; font-size: 14pt; font-weight: 700; color: #1565C0; }
.pc-sum-lbl { display: block; font-size: 6.5pt; color: #78909C; }

@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
'}</style></head><body>
  <div class="rpt-header">
    <div class="rpt-school">${esc(schoolName)}</div>
    <div class="rpt-title">${esc(reportTitle)}</div>
    <div class="rpt-sub">${esc(teacherName)}</div>
  </div>
  <div class="fp-stats">
    <div class="fp-stat"><span class="fp-stat-num">${fps.length}</span><span class="fp-stat-lbl">Free Periods</span></div>
    <div class="fp-stat"><span class="fp-stat-num">${total - fps.length}</span><span class="fp-stat-lbl">Assigned</span></div>
    <div class="fp-stat"><span class="fp-stat-num">${total}</span><span class="fp-stat-lbl">Total Slots</span></div>
    <div class="fp-stat"><span class="fp-stat-num">${pct}%</span><span class="fp-stat-lbl">Free Rate</span></div>
  </div>
  ${dayBlocks}
  <div class="rpt-footer">
    <span class="fl">${esc(genTime)}</span>
    <span class="fc">${esc(schoolName)} \u2014 ${esc(reportTitle)}</span>
    <span class="fr">Page: 1 of 1</span>
  </div>
</body></html>`;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  font-size: 9px;
  color: #1D1D1F;
}
/* ── Page header (visible, printed at top of document) ── */
.page-header {
  text-align: center;
  padding-bottom: 8px;
  margin-bottom: 10px;
  border-bottom: 2.5px solid #007AFF;
}
.page-header .school-name { font-size: 16px; font-weight: 700; color: #1D1D1F; letter-spacing: -0.3px; }
.page-header .report-title { font-size: 12px; font-weight: 600; color: #333; margin-top: 3px; }
.page-header .report-sub { font-size: 10px; color: #555; margin-top: 2px; }
/* ── Footer table (fixed at bottom of every printed page) ── */
.page-footer {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  display: table;
  width: 100%;
  border-top: 1px solid #D1D1D6;
  padding-top: 4px;
  font-size: 7px;
  color: #86868B;
}
.page-footer .f-left   { display: table-cell; text-align: left;   width: 33%; }
.page-footer .f-center { display: table-cell; text-align: center; width: 34%; }
.page-footer .f-right  { display: table-cell; text-align: right;  width: 33%; }
/* ── Timetable grid ── */
table.tt { width: 100%; border-collapse: collapse; }
table.tt th, table.tt td { border: 1px solid #D1D1D6; padding: 3px 2px; text-align: center; vertical-align: middle; }
table.tt th { background: #E8EAF6; font-size: 8px; font-weight: 700; color: #1a237e; }
.tp { background: #FAFAFA; font-size: 8px; width: 68px; min-width: 68px; }
.pl { display: block; font-weight: 700; color: #1D1D1F; }
.tt-time { display: block; font-size: 6.5px; color: #86868B; margin-top: 1px; }
.tf { font-size: 9px; }
.tn { display: block; font-size: 7px; color: #555; margin-top: 1px; }
.tb { font-size: 9px; color: #E65100; background: #FFF3E0 !important; font-style: italic; }
.te { color: #C7C7CC; }
.brk td { background: #FFF3E0 !important; }
/* ── Free periods ── */
.sr { display: flex; gap: 12px; margin-bottom: 12px; justify-content: center; }
.si { text-align: center; padding: 8px 18px; background: #E8EAF6; border-radius: 8px; border: 1px solid #C5CAE9; }
.sn2 { display: block; font-size: 20px; font-weight: 700; color: #283593; }
.sl { display: block; font-size: 8px; color: #86868B; margin-top: 2px; }
.db { margin-bottom: 8px; border: 1px solid #E5E5EA; border-radius: 6px; overflow: hidden; }
.dh { background: #F5F5F7; padding: 5px 8px; font-weight: 700; font-size: 10px; border-bottom: 1px solid #E5E5EA; }
.fc { font-weight: 400; font-size: 8px; color: #283593; margin-left: 5px; }
.di { display: flex; flex-wrap: wrap; gap: 5px; padding: 6px 8px; }
.fi { padding: 3px 8px; background: #E8F5E9; border: 1px solid #A5D6A7; border-radius: 4px; font-size: 8px; font-weight: 600; color: #2E7D32; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page-footer { position: fixed; bottom: 0; }
}

</style></head><body>
  <div class="page-header">
    <div class="school-name">${esc(schoolName)}</div>
    <div class="report-title">${esc(reportTitle)}</div>
    <div class="report-sub">${esc(teacherName)}</div>
  </div>
  <div class="page-footer">
    <span class="f-left">${esc(genTime)}</span>
    <span class="f-center">${esc(schoolName)} &mdash; ${esc(reportTitle)}</span>
    <span class="f-right">Page: 1 of 1</span>
  </div>
  <div class="sr">
    <div class="si"><span class="sn2">${freePeriods.length}</span><span class="sl">Free Periods</span></div>
    <div class="si"><span class="sn2">${totalTeaching}</span><span class="sl">Total Periods</span></div>
    <div class="si"><span class="sn2">${pct}%</span><span class="sl">Free Rate</span></div>
  </div>
  ${dayBlocks}
</body></html>`;
}

