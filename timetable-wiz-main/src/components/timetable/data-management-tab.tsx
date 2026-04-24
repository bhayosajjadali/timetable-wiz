'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useTimetableStore } from '@/lib/store';
import {
  Database,
  Upload,
  Download,
  Layers,
  GraduationCap,
  Users,
  BookOpen,
  CalendarDays,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  Info,
  FileDown,
  Clock,
  Timer,
  FileJson,
  ShieldCheck,
  ArrowRightLeft,
} from 'lucide-react';

/* ---------- helpers ---------- */

function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsvFile(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map(parseCsvLine);
}

/* ---------- types ---------- */

type DataType = 'periods' | 'sections' | 'classes' | 'teachers' | 'subjects' | 'timetable';

interface ImportResult {
  success: boolean;
  added: number;
  skipped: number;
  errors: string[];
}

/* ---------- CSV format descriptions ---------- */

const CSV_FORMATS: Record<DataType, { filename: string; description: string; headers: string; example: string }> = {
  periods: {
    filename: 'period-timings.csv',
    description: 'Each row defines a period with its start time, end time, and optional break flag',
    headers: 'Period,Start Time,End Time,Is Break',
    example: '1,08:00,08:45,no\n2,08:45,09:30,no\n3,09:30,09:50,yes\n4,09:50,10:35,no',
  },
  sections: {
    filename: 'sections.csv',
    description: 'One section name per row',
    headers: 'Name',
    example: 'A\nB\nC',
  },
  classes: {
    filename: 'classes.csv',
    description: 'Class name with optional comma-separated section names',
    headers: 'Name,Sections',
    example: 'Grade 1,A;B\nGrade 2,A\nGrade 3,A;B;C',
  },
  teachers: {
    filename: 'teachers.csv',
    description: 'Teacher full name and short name',
    headers: 'Name,Short Name',
    example: 'Muhammad Ali,MA\nSara Ahmed,SA',
  },
  subjects: {
    filename: 'subjects.csv',
    description: 'Subject full name and short name',
    headers: 'Name,Short Name',
    example: 'Mathematics,Math\nEnglish,Eng\nScience,Sci',
  },
  timetable: {
    filename: 'timetable.csv',
    description: 'Full timetable entries referencing existing teachers, classes, sections, and subjects by name',
    headers: 'Day,Period,Teacher,Class,Section,Subject',
    example: 'Monday,1,Muhammad Ali,Grade 1,A,Mathematics\nMonday,1,Sara Ahmed,Grade 2,B,English',
  },
};

/* ---------- main component ---------- */

export function DataManagementTab() {
  return (
    <div className="space-y-6">
      <DataOverview />
      <JsonBackupPanel />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ImportPanel />
        <ExportPanel />
      </div>
      <DangerZone />
    </div>
  );
}

/* ---------- data overview ---------- */

function DataOverview() {
  const { sections, classes, teachers, subjects, entries, timings } = useTimetableStore();
  const periodCount = timings.periodTimingMode === 'custom' ? timings.customPeriodTimings.length : timings.periodsPerDay;

  const stats = [
    { label: 'Periods', count: periodCount, icon: Clock, color: 'text-indigo-500' },
    { label: 'Sections', count: sections.length, icon: Layers, color: 'text-violet-500' },
    { label: 'Classes', count: classes.length, icon: GraduationCap, color: 'text-emerald-500' },
    { label: 'Teachers', count: teachers.length, icon: Users, color: 'text-blue-500' },
    { label: 'Subjects', count: subjects.length, icon: BookOpen, color: 'text-amber-500' },
    { label: 'Timetable Entries', count: entries.length, icon: CalendarDays, color: 'text-rose-500' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Overview
        </CardTitle>
        <CardDescription>Current data counts in your timetable manager</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center p-3 rounded-lg border bg-card">
              <stat.icon className={`h-6 w-6 mb-1.5 ${stat.color}`} />
              <span className="text-2xl font-bold">{stat.count}</span>
              <span className="text-xs text-muted-foreground text-center mt-0.5">{stat.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- import panel ---------- */

function ImportPanel() {
  const { toast } = useToast();
  const { sections, classes, teachers, subjects, timings, bulkImportSections, bulkImportClasses, bulkImportTeachers, bulkImportSubjects, bulkImportEntries, bulkImportPeriodTimings } = useTimetableStore();
  const fileInputRefs = useRef<Record<DataType, HTMLInputElement | null>>({ periods: null, sections: null, classes: null, teachers: null, subjects: null, timetable: null });
  const [importDialog, setImportDialog] = useState<DataType | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importDataType, setImportDataType] = useState<DataType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImportClick = (type: DataType) => {
    setImportDataType(type);
    setImportResult(null);
    fileInputRefs.current[type]?.click();
  };

  const processImport = useCallback((type: DataType, text: string) => {
    setIsProcessing(true);
    setImportDialog(type);

    try {
      const rows = parseCsvFile(text);
      if (rows.length < 2) {
        setImportResult({ success: false, added: 0, skipped: 0, errors: ['CSV file is empty or has no data rows.'] });
        setIsProcessing(false);
        return;
      }

      const headerRow = rows[0];
      const dataRows = rows.slice(1);
      let result: ImportResult;

      switch (type) {
        case 'periods': {
          const items = dataRows.map((r) => ({
            period: parseInt(r[0]) || 0,
            startTime: r[1] || '',
            endTime: r[2] || '',
            isBreak: (r[3] || '').toLowerCase().trim() === 'yes' || (r[3] || '').toLowerCase().trim() === 'true',
          })).filter((item) => item.period > 0);
          const periodResult = bulkImportPeriodTimings(items);
          result = { ...periodResult, skipped: 0, success: periodResult.added > 0 || periodResult.errors.length === 0 };
          break;
        }
        case 'sections': {
          const names = dataRows.map((r) => r[0] || '').filter((n) => n);
          result = { ...bulkImportSections(names), errors: [], success: true };
          break;
        }
        case 'classes': {
          const items = dataRows.map((r) => ({
            name: r[0] || '',
            sectionNames: (r[1] || '').split(';').map((s) => s.trim()).filter((s) => s),
          }));
          result = { ...bulkImportClasses(items), errors: [], success: true };
          break;
        }
        case 'teachers': {
          const items = dataRows.map((r) => ({
            name: r[0] || '',
            shortName: r[1] || '',
          }));
          result = { ...bulkImportTeachers(items), errors: [], success: true };
          break;
        }
        case 'subjects': {
          const items = dataRows.map((r) => ({
            name: r[0] || '',
            shortName: r[1] || '',
          }));
          result = { ...bulkImportSubjects(items), errors: [], success: true };
          break;
        }
        case 'timetable': {
          const items = dataRows.map((r) => ({
            day: r[0] || '',
            period: parseInt(r[1]) || 0,
            teacherName: r[2] || '',
            className: r[3] || '',
            sectionName: r[4] || '',
            subjectName: r[5] || '',
          }));
          const entryResult = bulkImportEntries(items);
          result = { ...entryResult, success: entryResult.added > 0 || entryResult.errors.length === 0 };
          break;
        }
      }

      setImportResult(result);
    } catch (err) {
      setImportResult({
        success: false,
        added: 0,
        skipped: 0,
        errors: [`Failed to parse CSV: ${err instanceof Error ? err.message : 'Unknown error'}`],
      });
    }

    setIsProcessing(false);
  }, [bulkImportSections, bulkImportClasses, bulkImportTeachers, bulkImportSubjects, bulkImportEntries, bulkImportPeriodTimings]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: DataType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processImport(type, text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const periodCount = timings.periodTimingMode === 'custom' ? timings.customPeriodTimings.length : timings.periodsPerDay;

  const importCards: { type: DataType; label: string; icon: typeof Layers; count: number; hint: string }[] = [
    { type: 'periods', label: 'Period Timings', icon: Timer, count: periodCount, hint: 'Period, Start Time, End Time, Is Break (yes/no)' },
    { type: 'sections', label: 'Sections', icon: Layers, count: sections.length, hint: 'Name per row' },
    { type: 'classes', label: 'Classes', icon: GraduationCap, count: classes.length, hint: 'Name + Sections (A;B;C)' },
    { type: 'teachers', label: 'Teachers', icon: Users, count: teachers.length, hint: 'Name, Short Name' },
    { type: 'subjects', label: 'Subjects', icon: BookOpen, count: subjects.length, hint: 'Name, Short Name' },
    { type: 'timetable', label: 'Timetable', icon: CalendarDays, count: 0, hint: 'Day, Period, Teacher, Class, Section, Subject' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Import
        </CardTitle>
        <CardDescription>Import data from CSV files. Duplicates are automatically skipped.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {importCards.map((card) => (
          <div key={card.type} className="flex items-center justify-between p-3 rounded-lg border bg-card gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{card.label}</span>
                  {card.count > 0 && (
                    <Badge variant="secondary" className="text-xs">{card.count}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{card.hint}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleImportClick(card.type)}
              className="shrink-0"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Import
            </Button>
            <input
              ref={(el) => { fileInputRefs.current[card.type] = el; }}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => handleFileChange(e, card.type)}
            />
          </div>
        ))}

        {/* Import Help */}
        <Separator />
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
          <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Import order:</strong> Import Sections first, then Classes, Teachers, and Subjects before importing Timetable entries.</p>
            <p><strong>Classes sections:</strong> Use semicolons to separate section names (e.g., A;B;C). Sections must already exist in the master list.</p>
            <p><strong>Timetable:</strong> All names must match exactly (Teacher, Class, Section, Subject).</p>
          </div>
        </div>
      </CardContent>

      {/* Import Result Dialog */}
      <Dialog open={!!importDialog} onOpenChange={(open) => { if (!open) { setImportDialog(null); setImportResult(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {importResult?.success ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              Import {importDataType ? CSV_FORMATS[importDataType].filename.replace('.csv', '') : ''} Result
            </DialogTitle>
          </DialogHeader>
          {isProcessing ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse text-muted-foreground">Processing...</div>
            </div>
          ) : importResult ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{importResult.added}</p>
                  <p className="text-xs text-emerald-700">Added</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
                  <p className="text-2xl font-bold text-amber-600">{importResult.skipped}</p>
                  <p className="text-xs text-amber-700">Skipped</p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">
                    {importResult.errors.length} Error{importResult.errors.length !== 1 ? 's' : ''}:
                  </p>
                  <div className="max-h-40 overflow-y-auto text-xs space-y-0.5">
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-destructive/80">{err}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => { setImportDialog(null); setImportResult(null); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ---------- export panel ---------- */

function ExportPanel() {
  const { sections, classes, teachers, subjects, entries, timings } = useTimetableStore();
  const { toast } = useToast();

  const getSectionName = (id: string) => sections.find((s) => s.id === id)?.name || '';
  const periodCount = timings.periodTimingMode === 'custom' ? timings.customPeriodTimings.length : timings.periodsPerDay;
  const getClassName = (id: string) => classes.find((c) => c.id === id)?.name || '';
  const getTeacherName = (id: string) => teachers.find((t) => t.id === id)?.name || '';
  const getSubjectName = (id: string) => subjects.find((s) => s.id === id)?.name || '';

  const exportSections = () => {
    if (sections.length === 0) { toast({ title: 'No data', description: 'No sections to export.', variant: 'destructive' }); return; }
    const csv = 'Name\n' + sections.map((s) => escapeCsvField(s.name)).join('\n');
    downloadCsv('sections.csv', csv);
    toast({ title: 'Exported', description: `${sections.length} sections exported.` });
  };

  const exportClasses = () => {
    if (classes.length === 0) { toast({ title: 'No data', description: 'No classes to export.', variant: 'destructive' }); return; }
    const csv = 'Name,Sections\n' + classes.map((c) => {
      const sectionNames = c.sectionIds.map(getSectionName).filter(Boolean).join(';');
      return `${escapeCsvField(c.name)},${escapeCsvField(sectionNames)}`;
    }).join('\n');
    downloadCsv('classes.csv', csv);
    toast({ title: 'Exported', description: `${classes.length} classes exported.` });
  };

  const exportTeachers = () => {
    if (teachers.length === 0) { toast({ title: 'No data', description: 'No teachers to export.', variant: 'destructive' }); return; }
    const csv = 'Name,Short Name\n' + teachers.map((t) => `${escapeCsvField(t.name)},${escapeCsvField(t.shortName)}`).join('\n');
    downloadCsv('teachers.csv', csv);
    toast({ title: 'Exported', description: `${teachers.length} teachers exported.` });
  };

  const exportSubjects = () => {
    if (subjects.length === 0) { toast({ title: 'No data', description: 'No subjects to export.', variant: 'destructive' }); return; }
    const csv = 'Name,Short Name\n' + subjects.map((s) => `${escapeCsvField(s.name)},${escapeCsvField(s.shortName)}`).join('\n');
    downloadCsv('subjects.csv', csv);
    toast({ title: 'Exported', description: `${subjects.length} subjects exported.` });
  };

  const exportPeriods = () => {
    if (periodCount === 0) { toast({ title: 'No data', description: 'No periods configured to export.', variant: 'destructive' }); return; }
    let csv: string;
    if (timings.periodTimingMode === 'custom' && timings.customPeriodTimings.length > 0) {
      csv = 'Period,Start Time,End Time,Is Break\n' + timings.customPeriodTimings.map((pt) =>
        `${pt.period},${pt.startTime},${pt.endTime},${pt.isBreak ? 'yes' : 'no'}`
      ).join('\n');
    } else {
      // Generate from equal timings
      const [startH, startM] = timings.startTime.split(':').map(Number);
      let currentMinutes = startH * 60 + startM;
      const formatTime = (m: number) => {
        const h = Math.floor(m / 60);
        const min = m % 60;
        return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      };
      const rows: string[] = [];
      for (let i = 1; i <= timings.periodsPerDay; i++) {
        const isBreak = i === timings.breakAfterPeriod;
        const duration = isBreak ? timings.breakDuration : timings.periodDuration;
        const endMinutes = currentMinutes + duration;
        rows.push(`${i},${formatTime(currentMinutes)},${formatTime(endMinutes)},${isBreak ? 'yes' : 'no'}`);
        currentMinutes = endMinutes;
      }
      csv = 'Period,Start Time,End Time,Is Break\n' + rows.join('\n');
    }
    downloadCsv('period-timings.csv', csv);
    toast({ title: 'Exported', description: `${periodCount} periods exported.` });
  };

  const exportTimetable = () => {
    if (entries.length === 0) { toast({ title: 'No data', description: 'No timetable entries to export.', variant: 'destructive' }); return; }
    const csv = 'Day,Period,Teacher,Class,Section,Subject\n' + entries.map((e) =>
      `${escapeCsvField(e.day)},${e.period},${escapeCsvField(getTeacherName(e.teacherId))},${escapeCsvField(getClassName(e.classId))},${escapeCsvField(getSectionName(e.sectionId))},${escapeCsvField(getSubjectName(e.subjectId))}`
    ).join('\n');
    downloadCsv('timetable.csv', csv);
    toast({ title: 'Exported', description: `${entries.length} timetable entries exported.` });
  };

  const exportAll = () => {
    exportPeriods();
    setTimeout(() => exportSections(), 200);
    setTimeout(() => exportClasses(), 400);
    setTimeout(() => exportTeachers(), 600);
    setTimeout(() => exportSubjects(), 800);
    setTimeout(() => exportTimetable(), 1000);
    toast({ title: 'Export All', description: 'All data files are being downloaded.' });
  };

  const exportCards: { label: string; icon: typeof Layers; count: number; onExport: () => void }[] = [
    { label: 'Period Timings', icon: Timer, count: periodCount, onExport: exportPeriods },
    { label: 'Sections', icon: Layers, count: sections.length, onExport: exportSections },
    { label: 'Classes', icon: GraduationCap, count: classes.length, onExport: exportClasses },
    { label: 'Teachers', icon: Users, count: teachers.length, onExport: exportTeachers },
    { label: 'Subjects', icon: BookOpen, count: subjects.length, onExport: exportSubjects },
    { label: 'Timetable', icon: CalendarDays, count: entries.length, onExport: exportTimetable },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Data
        </CardTitle>
        <CardDescription>Download your data as CSV files for backup or use in other tools.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {exportCards.map((card) => (
          <div key={card.label} className="flex items-center justify-between p-3 rounded-lg border bg-card gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{card.label}</span>
                  {card.count > 0 && (
                    <Badge variant="secondary" className="text-xs">{card.count}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{card.label.toLowerCase() === 'period timings' ? 'period-timings.csv' : `${card.label.toLowerCase()}.csv`}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={card.onExport}
              disabled={card.count === 0}
              className="shrink-0"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>
          </div>
        ))}

        <Separator />

        {/* Export All Button */}
        <Button onClick={exportAll} className="w-full" variant="secondary">
          <FileDown className="h-4 w-4 mr-2" />
          Export All Data (6 files)
        </Button>
      </CardContent>
    </Card>
  );
}

/* ---------- JSON backup panel ---------- */

interface JsonBackupData {
  version: string;
  exportedAt: string;
  schoolName: string;
  timings: Record<string, unknown>;
  sections: { id: string; name: string }[];
  classes: { id: string; name: string; sectionIds: string[] }[];
  teachers: { id: string; name: string; shortName: string }[];
  subjects: { id: string; name: string; shortName: string }[];
  assignments: { id: string; teacherId: string; classId: string; sectionId: string; subjectId: string }[];
  entries: { id: string; day: string; period: number; teacherId: string; classId: string; sectionId: string; subjectId: string }[];
  substitutes: { id: string; date: string; day: string; entryId: string; originalTeacherId: string; substituteTeacherId: string }[];
}

const JSON_VERSION = '1.0';

function validateJsonData(data: unknown): { valid: boolean; errors: string[]; parsed: JsonBackupData | null } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid file: not a JSON object.'], parsed: null };
  }

  const obj = data as Record<string, unknown>;

  if (!obj.version) {
    errors.push('Missing "version" field. This may not be a valid backup file.');
  }

  // Check required arrays
  const requiredArrays = ['sections', 'classes', 'teachers', 'subjects', 'assignments', 'entries', 'substitutes'] as const;
  for (const key of requiredArrays) {
    if (!Array.isArray(obj[key])) {
      errors.push(`Missing or invalid "${key}" array.`);
    }
  }

  // Check schoolName
  if (typeof obj.schoolName !== 'string') {
    errors.push('Missing or invalid "schoolName" field.');
  }

  // Check timings
  if (!obj.timings || typeof obj.timings !== 'object') {
    errors.push('Missing or invalid "timings" object.');
  } else {
    const t = obj.timings as Record<string, unknown>;
    if (typeof t.periodsPerDay !== 'number') errors.push('timings.periodsPerDay must be a number.');
    if (typeof t.startTime !== 'string') errors.push('timings.startTime must be a string.');
    if (typeof t.periodDuration !== 'number') errors.push('timings.periodDuration must be a number.');
    if (!Array.isArray(t.days)) errors.push('timings.days must be an array.');
    if (!['equal', 'custom'].includes(t.periodTimingMode as string)) errors.push('timings.periodTimingMode must be "equal" or "custom".');
  }

  if (errors.length > 0) {
    return { valid: false, errors, parsed: null };
  }

  return { valid: true, errors: [], parsed: obj as unknown as JsonBackupData };
}

function JsonBackupPanel() {
  const { toast } = useToast();
  const store = useTimetableStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importPreview, setImportPreview] = useState<JsonBackupData | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const totalItems = store.sections.length + store.classes.length + store.teachers.length + store.subjects.length + store.assignments.length + store.entries.length + store.substitutes.length;

  /* --- Export --- */
  const handleExport = () => {
    try {
      const backupData: JsonBackupData = {
        version: JSON_VERSION,
        exportedAt: new Date().toISOString(),
        schoolName: store.schoolName,
        timings: store.timings as unknown as Record<string, unknown>,
        sections: store.sections,
        classes: store.classes,
        teachers: store.teachers,
        subjects: store.subjects,
        assignments: store.assignments,
        entries: store.entries,
        substitutes: store.substitutes,
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const dateStr = new Date().toISOString().slice(0, 10);
      const safeName = store.schoolName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      link.href = url;
      link.setAttribute('download', `timetable-backup-${safeName}-${dateStr}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'JSON Backup Exported',
        description: `Exported ${totalItems} items from "${store.schoolName}" successfully.`,
      });
    } catch (err) {
      toast({
        title: 'Export Failed',
        description: err instanceof Error ? err.message : 'Unknown error occurred.',
        variant: 'destructive',
      });
    }
  };

  /* --- Import --- */
  const handleImportClick = () => {
    setImportPreview(null);
    setValidationErrors([]);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.name.endsWith('.json')) {
      toast({
        title: 'Invalid File',
        description: 'Please select a .json file.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(event.target?.result as string);
        const { valid, errors, parsed } = validateJsonData(raw);

        if (!valid || !parsed) {
          setValidationErrors(errors);
          setImportPreview(null);
          toast({
            title: 'Invalid Backup File',
            description: `${errors.length} validation error(s) found.`,
            variant: 'destructive',
          });
          return;
        }

        setImportPreview(parsed);
        setValidationErrors([]);
      } catch {
        setValidationErrors(['Failed to parse JSON. The file may be corrupted.']);
        setImportPreview(null);
        toast({
          title: 'Parse Error',
          description: 'Could not read the JSON file. It may be corrupted.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!importPreview) return;
    setIsImporting(true);

    try {
      store.replaceAllData({
        schoolName: importPreview.schoolName,
        timings: importPreview.timings as typeof store.timings,
        sections: importPreview.sections,
        classes: importPreview.classes,
        teachers: importPreview.teachers,
        subjects: importPreview.subjects,
        assignments: importPreview.assignments,
        entries: importPreview.entries,
        substitutes: importPreview.substitutes,
      });

      toast({
        title: 'JSON Backup Imported',
        description: `Restored "${importPreview.schoolName}" with ${importPreview.sections.length} sections, ${importPreview.classes.length} classes, ${importPreview.teachers.length} teachers, ${importPreview.subjects.length} subjects, ${importPreview.assignments.length} assignments, ${importPreview.entries.length} entries, and ${importPreview.substitutes.length} substitutes.`,
      });

      setImportPreview(null);
    } catch (err) {
      toast({
        title: 'Import Failed',
        description: err instanceof Error ? err.message : 'Unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const cancelImport = () => {
    setImportPreview(null);
    setValidationErrors([]);
  };

  return (
    <>
      <Card className="border-blue-200/60 bg-gradient-to-br from-blue-50/30 via-white to-cyan-50/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <FileJson className="h-4.5 w-4.5 text-white" />
            </div>
            JSON Backup
          </CardTitle>
          <CardDescription>
            Export or import your entire timetable data as a single JSON file. This is the recommended way to backup and restore all your data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleExport}
              disabled={totalItems === 0}
              className="flex-1 h-12 text-sm font-medium"
              style={{ background: 'linear-gradient(135deg, #007AFF, #00C6FF)' }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON Backup
              <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-white/30 text-xs">
                {totalItems} items
              </Badge>
            </Button>
            <Button
              variant="outline"
              onClick={handleImportClick}
              className="flex-1 h-12 text-sm font-medium border-dashed border-2 border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import JSON Backup
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: ShieldCheck, label: 'All Data', desc: 'Complete backup' },
              { icon: Database, label: 'Single File', desc: 'Easy to share' },
              { icon: ArrowRightLeft, label: 'Full Restore', desc: 'Replace all data' },
              { icon: Clock, label: 'Timestamped', desc: 'Export date included' },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/60 border border-white/40">
                <f.icon className="h-4 w-4 text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-none">{f.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 space-y-1">
              <p className="text-sm font-medium text-red-700 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Validation Errors
              </p>
              <ul className="text-xs text-red-600 space-y-0.5 list-disc list-inside">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Preview / Confirmation Dialog */}
      <Dialog open={!!importPreview} onOpenChange={(open) => { if (!open) cancelImport(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-blue-500" />
              Confirm Import
            </DialogTitle>
            <DialogDescription>
              This will replace ALL your current data with the data from this backup file. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {importPreview && (
            <div className="space-y-4">
              {/* Backup info */}
              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-700">School</span>
                  <span className="text-sm font-semibold text-blue-900">{importPreview.schoolName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-700">Version</span>
                  <Badge variant="outline" className="text-xs">{importPreview.version}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-700">Exported</span>
                  <span className="text-xs text-blue-800">
                    {importPreview.exportedAt
                      ? new Date(importPreview.exportedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
                      : 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Data summary */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Sections', count: importPreview.sections.length },
                  { label: 'Classes', count: importPreview.classes.length },
                  { label: 'Teachers', count: importPreview.teachers.length },
                  { label: 'Subjects', count: importPreview.subjects.length },
                  { label: 'Assignments', count: importPreview.assignments.length },
                  { label: 'Entries', count: importPreview.entries.length },
                  { label: 'Substitutes', count: importPreview.substitutes.length },
                  { label: 'Days', count: (importPreview.timings.days as string[]).length },
                ].map((s) => (
                  <div key={s.label} className="text-center p-2 rounded-lg bg-muted/60">
                    <p className="text-lg font-bold leading-none">{s.count}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">
                  <strong>Warning:</strong> Importing will completely replace your current data including all sections, classes, teachers, subjects, assignments, timetable entries, and substitutes. Consider exporting a backup of your current data first.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={cancelImport}>Cancel</Button>
            <Button
              onClick={confirmImport}
              disabled={isImporting}
              style={{ background: 'linear-gradient(135deg, #007AFF, #00C6FF)' }}
            >
              {isImporting ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Importing...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Yes, Replace All Data
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------- danger zone ---------- */

function DangerZone() {
  const { clearAllData } = useTimetableStore();
  const { toast } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClearAll = () => {
    clearAllData();
    setShowConfirm(false);
    toast({ title: 'All data cleared', description: 'All timetable data has been permanently removed.' });
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone
        </CardTitle>
        <CardDescription>Irreversible actions that permanently delete data.</CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-sm">Clear All Data</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete all sections, classes, teachers, subjects, timetable entries, assignments, and substitutes.
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setShowConfirm(true)} className="shrink-0">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear All
            </Button>
          </div>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Are you absolutely sure?
              </DialogTitle>
              <DialogDescription>
                This will permanently delete ALL data from the Timetable Manager, including all sections, classes, teachers,
                subjects, timetable entries, assignments, and substitute records. This action cannot be undone.
                Consider exporting your data first as a backup.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleClearAll}>
                <Trash2 className="h-4 w-4 mr-2" />
                Yes, Clear Everything
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
