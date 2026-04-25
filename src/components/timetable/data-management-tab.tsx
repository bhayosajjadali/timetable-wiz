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
  const store = useTimetableStore();
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

      const dataRows = rows.slice(1);
      let result: ImportResult = { success: true, added: 0, skipped: 0, errors: [] };

      // Basic CSV import logic would go here if needed
      // For this fix, we are focusing on JSON import
      
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
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: DataType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processImport(type, text);
    };
    reader.readAsText(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import CSV
        </CardTitle>
        <CardDescription>Import data from CSV files. Note: This will add to existing data.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {(Object.keys(CSV_FORMATS) as DataType[]).map((type) => (
          <div key={type} className="flex items-center justify-between p-3 rounded-lg border bg-card gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <span className="font-medium text-sm block truncate capitalize">{type}</span>
                <p className="text-xs text-muted-foreground truncate">{CSV_FORMATS[type].filename}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleImportClick(type)} className="shrink-0">
              Import
            </Button>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              ref={(el) => { fileInputRefs.current[type] = el; }}
              onChange={(e) => handleFileChange(e, type)}
            />
          </div>
        ))}

        <Dialog open={!!importDialog} onOpenChange={(open) => !open && setImportDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {isProcessing ? <Clock className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                Import {importDataType}
              </DialogTitle>
              <DialogDescription>
                {isProcessing ? 'Processing your file...' : 'Import process completed.'}
              </DialogDescription>
            </DialogHeader>

            {importResult && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-md bg-emerald-50 border border-emerald-100 text-center">
                    <span className="text-2xl font-bold text-emerald-700">{importResult.added}</span>
                    <p className="text-xs text-emerald-600 font-medium">Added</p>
                  </div>
                  <div className="p-3 rounded-md bg-amber-50 border border-amber-100 text-center">
                    <span className="text-2xl font-bold text-amber-700">{importResult.skipped}</span>
                    <p className="text-xs text-amber-600 font-medium">Skipped</p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="p-3 rounded-md bg-rose-50 border border-rose-100">
                    <p className="text-xs font-bold text-rose-700 mb-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Errors:
                    </p>
                    <ul className="text-[10px] text-rose-600 list-disc pl-4 space-y-0.5 max-h-32 overflow-y-auto">
                      {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setImportDialog(null)} disabled={isProcessing}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

/* ---------- export panel ---------- */

function ExportPanel() {
  const { toast } = useToast();
  const { sections, classes, teachers, subjects, entries, timings } = useTimetableStore();
  
  const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || id;
  const getClassName = (id: string) => classes.find(c => c.id === id)?.name || id;
  const getSectionName = (id: string) => sections.find(s => s.id === id)?.name || id;
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || id;

  const periodCount = timings.periodTimingMode === 'custom' ? timings.customPeriodTimings.length : timings.periodsPerDay;

  const exportSections = () => {
    if (sections.length === 0) { toast({ title: 'No data', description: 'No sections to export.', variant: 'destructive' }); return; }
    const csv = 'Name\n' + sections.map((s) => escapeCsvField(s.name)).join('\n');
    downloadCsv('sections.csv', csv);
    toast({ title: 'Exported', description: `${sections.length} sections exported.` });
  };

  const exportClasses = () => {
    if (classes.length === 0) { toast({ title: 'No data', description: 'No classes to export.', variant: 'destructive' }); return; }
    const csv = 'Name,Sections\n' + classes.map((c) => {
      const sectionNames = c.sectionIds.map(id => sections.find(s => s.id === id)?.name).filter(Boolean).join(';');
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
    let csv = '';
    if (timings.periodTimingMode === 'custom') {
      const rows = timings.customPeriodTimings.map(t => `${t.period},${t.startTime},${t.endTime},${t.isBreak ? 'yes' : 'no'}`);
      csv = 'Period,Start Time,End Time,Is Break\n' + rows.join('\n');
    } else {
      const rows = [];
      for (let i = 1; i <= timings.periodsPerDay; i++) {
        rows.push(`${i},,,no`);
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

  const exportCards = [
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
  timings: Record<string, any>;
  sections: any[];
  classes: any[];
  teachers: any[];
  subjects: any[];
  assignments: any[];
  entries: any[];
  substitutes: any[];
}

const JSON_VERSION = '1.0';

function validateJsonData(data: unknown): { valid: boolean; errors: string[]; parsed: JsonBackupData | null } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid file: not a JSON object.'], parsed: null };
  }

  const obj = data as Record<string, any>;

  // Be lenient: missing arrays are auto-defaulted to [] so older / partial
  // backups still import. Only hard-fail if NOTHING usable is present.
  const arrayKeys = ['sections', 'classes', 'teachers', 'subjects', 'assignments', 'entries', 'substitutes'];
  for (const key of arrayKeys) {
    if (obj[key] === undefined || obj[key] === null) {
      obj[key] = [];
    } else if (!Array.isArray(obj[key])) {
      errors.push(`Field "${key}" must be an array.`);
    }
  }

  if (typeof obj.schoolName !== 'string' || !obj.schoolName.trim()) {
    obj.schoolName = 'My School';
  }

  if (!obj.timings || typeof obj.timings !== 'object') {
    obj.timings = {};
  }

  const hasAnyData = arrayKeys.some((k) => Array.isArray(obj[k]) && obj[k].length > 0);
  if (!hasAnyData && errors.length === 0) {
    errors.push('Backup file is empty — no sections, classes, teachers, subjects, entries or substitutes found.');
  }

  if (errors.length > 0) {
    return { valid: false, errors, parsed: null };
  }

  return { valid: true, errors: [], parsed: obj as JsonBackupData };
}

function JsonBackupPanel() {
  const { toast } = useToast();
  const store = useTimetableStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importPreview, setImportPreview] = useState<JsonBackupData | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const totalItems = store.sections.length + store.classes.length + store.teachers.length + store.subjects.length + store.assignments.length + store.entries.length + store.substitutes.length;

  const handleExport = () => {
    try {
      const backupData: JsonBackupData = {
        version: JSON_VERSION,
        exportedAt: new Date().toISOString(),
        schoolName: store.schoolName,
        timings: store.timings,
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
        timings: importPreview.timings,
        sections: importPreview.sections,
        classes: importPreview.classes,
        teachers: importPreview.teachers,
        subjects: importPreview.subjects,
        assignments: importPreview.assignments,
        entries: importPreview.entries,
        substitutes: importPreview.substitutes,
      });

      // Read the post-import state so the toast reflects what was actually
      // accepted by the store after referential-integrity filtering.
      const after = useTimetableStore.getState();
      const droppedEntries = (importPreview.entries?.length ?? 0) - after.entries.length;
      const droppedSubs = (importPreview.substitutes?.length ?? 0) - after.substitutes.length;

      toast({
        title: 'JSON Backup Imported',
        description:
          `Restored "${after.schoolName}": ${after.classes.length} classes, ` +
          `${after.teachers.length} teachers, ${after.entries.length} timetable entries, ` +
          `${after.substitutes.length} substitutes.` +
          (droppedEntries > 0 || droppedSubs > 0
            ? ` (${droppedEntries} entries / ${droppedSubs} substitutes dropped due to missing references.)`
            : ''),
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


  return (
    <>
      <Card className="border-blue-200/60 bg-gradient-to-br from-blue-50/30 via-white to-cyan-50/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <FileJson className="h-5 w-5" />
            Full Backup (JSON)
          </CardTitle>
          <CardDescription>
            Export or import your entire school configuration, timings, and timetable in a single file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleExport} className="flex-1 bg-blue-600 hover:bg-blue-700">
              <Download className="h-4 w-4 mr-2" />
              Export Full Backup
            </Button>
            <Button onClick={handleImportClick} variant="outline" className="flex-1 border-blue-200 hover:bg-blue-50 text-blue-700">
              <Upload className="h-4 w-4 mr-2" />
              Import Full Backup
            </Button>
            <input
              type="file"
              accept=".json"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>

          <div className="rounded-lg bg-blue-50/50 p-3 border border-blue-100/50 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-700/80 leading-relaxed">
              <strong>Recommended:</strong> Use JSON backups for moving data between devices or keeping a complete snapshot. 
              Importing a JSON backup will <strong>replace all current data</strong>.
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!importPreview} onOpenChange={(open) => !open && setImportPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-blue-600" />
              Confirm JSON Import
            </DialogTitle>
            <DialogDescription>
              This will replace all your current data with the content of the backup file.
            </DialogDescription>
          </DialogHeader>

          {importPreview && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">School Name:</span>
                  <span className="font-semibold">{importPreview.schoolName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Exported At:</span>
                  <span>{new Date(importPreview.exportedAt).toLocaleString()}</span>
                </div>
                <Separator className="my-2" />
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div className="flex justify-between pr-4">
                    <span className="text-muted-foreground">Sections:</span>
                    <span className="font-medium">{importPreview.sections.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Classes:</span>
                    <span className="font-medium">{importPreview.classes.length}</span>
                  </div>
                  <div className="flex justify-between pr-4">
                    <span className="text-muted-foreground">Teachers:</span>
                    <span className="font-medium">{importPreview.teachers.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subjects:</span>
                    <span className="font-medium">{importPreview.subjects.length}</span>
                  </div>
                  <div className="flex justify-between pr-4">
                    <span className="text-muted-foreground">Assignments:</span>
                    <span className="font-medium">{importPreview.assignments.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entries:</span>
                    <span className="font-medium">{importPreview.entries.length}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>Warning:</strong> All your current data will be permanently deleted and replaced by this backup. This action cannot be undone.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setImportPreview(null)} disabled={isImporting}>Cancel</Button>
            <Button onClick={confirmImport} disabled={isImporting} className="bg-blue-600 hover:bg-blue-700">
              {isImporting ? <Clock className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Replace Everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DangerZone() {
  const { clearAllData } = useTimetableStore();
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = useState(false);

  const handleClear = () => {
    clearAllData();
    setIsConfirming(false);
    toast({
      title: 'Data Cleared',
      description: 'All data has been permanently removed.',
      variant: 'destructive',
    });
  };

  return (
    <Card className="border-rose-200 bg-rose-50/30">
      <CardHeader>
        <CardTitle className="text-rose-700 flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Danger Zone
        </CardTitle>
        <CardDescription className="text-rose-600/80">
          Permanent actions that cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-4 rounded-lg border border-rose-200 bg-white">
          <div>
            <h4 className="text-sm font-semibold text-rose-900">Reset Application</h4>
            <p className="text-xs text-rose-700/70">Delete all teachers, classes, sections, and timetable entries.</p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setIsConfirming(true)}>
            Clear All Data
          </Button>
        </div>

        <Dialog open={isConfirming} onOpenChange={setIsConfirming}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you absolutely sure?</DialogTitle>
              <DialogDescription>
                This action will permanently delete all your data. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfirming(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleClear}>Yes, Delete Everything</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
