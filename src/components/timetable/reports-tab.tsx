'use client';

import { useState, useMemo, useRef, useCallback, createContext, useContext } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  Settings2,
  RotateCcw,
  ChevronsUpDown,
  Check,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  usePrintSettings,
  DEFAULT_PRINT_SETTINGS,
  type PrintSettings,
} from '@/hooks/usePrintSettings';

type ReportType = 'class-timetable' | 'teacher-schedule' | 'daywise' | 'teacher-period-count';

const ALL_REPORT_TYPES: ReportType[] = ['class-timetable', 'teacher-schedule', 'daywise', 'teacher-period-count'];
const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  'class-timetable': 'Class Timetable',
  'teacher-schedule': 'Teacher Schedule',
  'daywise': 'Daywise Schedule',
  'teacher-period-count': 'Period Count',
};

/* Share filter settings across reports via context */
const ReportFilterCtx = createContext({
  showBreaks: true,
  showEmpty: true,
  searchQuery: '',
});

/* ====================================================================
   Reusable CheckDropdown — Popover with checkboxes + "All" toggle
   ==================================================================== */

function CheckDropdown({
  label,
  options,
  selected,
  onToggle,
  onSelectAll,
  allLabel = 'All',
  icon: Icon,
  searchable = false,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  onSelectAll: () => void;
  allLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const isAll = selected.length === options.length && options.length > 0;
  const isNone = selected.length === 0;
  const displayLabel = isAll ? allLabel : isNone ? label : `${selected.length} selected`;

  const filteredOpts = searchable && filter.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(filter.toLowerCase()))
    : options;

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFilter(''); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          <span className="text-xs font-medium">{displayLabel}</span>
          {!isAll && !isNone && (
            <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">{selected.length}</Badge>
          )}
          <ChevronsUpDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="end">
        <div className="space-y-0.5">
          {/* All toggle */}
          <button
            onClick={onSelectAll}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-sm hover:bg-muted transition-colors text-left"
          >
            <Checkbox checked={isAll ? true : isNone ? false : 'indeterminate'} />
            <span className="text-sm font-medium">{allLabel}</span>
          </button>
          <Separator className="my-1" />
          {searchable && (
            <div className="relative px-1 pb-1">
              <Input
                placeholder="Filter..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-7 text-xs pl-7"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto">
            {filteredOpts.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onToggle(opt.value)}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-sm hover:bg-muted transition-colors text-left"
              >
                <Checkbox checked={selected.includes(opt.value)} />
                <span className="text-sm truncate">{opt.label}</span>
                {selected.includes(opt.value) && <Check className="h-3 w-3 ml-auto text-[#007AFF]" />}
              </button>
            ))}
            {filteredOpts.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground text-center">No results</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ====================================================================
   ReportsTab — All report types shown via dropdown-checkbox filters
   ==================================================================== */

export function ReportsTab() {
  const [activeTypes, setActiveTypes] = useState<ReportType[]>([...ALL_REPORT_TYPES]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBreaks, setShowBreaks] = useState(true);
  const [showEmpty, setShowEmpty] = useState(true);

  const { classes, sections, teachers, timings } = useTimetableStore();
  const availableClasses = classes.filter((c) => c.sectionIds.length > 0);

  // Per-report-type item selections
  const [selectedClassSectionKeys, setSelectedClassSectionKeys] = useState<string[]>([]);
  const [selectedTeacherIdsForSchedule, setSelectedTeacherIdsForSchedule] = useState<string[]>([]);
  const [selectedDayIds, setSelectedDayIds] = useState<string[]>([]);
  const [selectedDaywiseClassSectionKeys, setSelectedDaywiseClassSectionKeys] = useState<string[]>([]);

  // Toggle helpers
  const toggleType = (type: string) =>
    setActiveTypes((prev) => prev.includes(type as ReportType) ? prev.filter((t) => t !== type) : [...prev, type as ReportType]);
  const selectAllTypes = () => setActiveTypes(activeTypes.length === ALL_REPORT_TYPES.length ? [] : [...ALL_REPORT_TYPES]);

  const toggleItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (value: string) =>
    setter((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
  const selectAllItems = (setter: React.Dispatch<React.SetStateAction<string[]>>, all: string[]) => () =>
    setter((prev) => prev.length === all.length ? [] : [...all]);

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

  // Build flattened class+section combos
  const classSectionOpts = useMemo(() => {
    const opts: { value: string; label: string; classId: string; sectionId: string }[] = [];
    for (const cls of filteredClasses) {
      for (const sid of cls.sectionIds) {
        const sec = sections.find((s) => s.id === sid);
        if (sec) {
          const key = `${cls.id}::${sid}`;
          opts.push({ value: key, label: `${cls.name} - ${sec.name}`, classId: cls.id, sectionId: sid });
        }
      }
    }
    return opts;
  }, [filteredClasses, sections]);

  const teacherOpts = filteredTeachers.map((t) => ({ value: t.id, label: `${t.name} (${t.shortName})` }));
  const typeOpts = ALL_REPORT_TYPES.map((t) => ({ value: t, label: REPORT_TYPE_LABELS[t] }));

  const dayOpts = timings.days.map((d) => ({ value: d, label: d }));
  const allClassSectionKeys = classSectionOpts.map((o) => o.value);
  const allDayKeys = dayOpts.map((o) => o.value);

  // Resolve selected combos for class timetable rendering
  const visibleClassSections = useMemo(() => {
    if (selectedClassSectionKeys.length === 0) return classSectionOpts;
    return classSectionOpts.filter((o) => selectedClassSectionKeys.includes(o.value));
  }, [selectedClassSectionKeys, classSectionOpts]);

  return (
    <ReportFilterCtx.Provider value={{ showBreaks, showEmpty, searchQuery }}>
    <div className="space-y-4">
      {/* ── Compact top toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 mr-auto">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <span className="font-semibold text-sm">Reports</span>
        </div>

        {/* Report types dropdown-checkbox */}
        <CheckDropdown
          label="Report Types"
          icon={Filter}
          options={typeOpts}
          selected={activeTypes}
          onToggle={toggleType}
          onSelectAll={selectAllTypes}
          allLabel="All Reports"
        />

        {/* Show Breaks / Empty toggles */}
        <label className="flex items-center gap-1.5 cursor-pointer rounded-md border px-2.5 py-1 hover:bg-muted/50 transition-colors">
          <Checkbox checked={showBreaks} onCheckedChange={(v) => setShowBreaks(!!v)} className="h-3.5 w-3.5" />
          <span className="text-xs">Breaks</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer rounded-md border px-2.5 py-1 hover:bg-muted/50 transition-colors">
          <Checkbox checked={showEmpty} onCheckedChange={(v) => setShowEmpty(!!v)} className="h-3.5 w-3.5" />
          <span className="text-xs">Empty</span>
        </label>

        {/* Search */}
        <div className="relative w-48">
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs pl-7"
          />
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        </div>
      </div>

      {/* ── Report Sections ── */}

      {/* Class Timetable */}
      {activeTypes.includes('class-timetable') && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">Class Timetables</CardTitle>
                <CardDescription>Select class + section combos to generate timetables</CardDescription>
              </div>
              <CheckDropdown
                label="Classes"
                options={classSectionOpts}
                selected={selectedClassSectionKeys}
                onToggle={toggleItem(setSelectedClassSectionKeys)}
                onSelectAll={selectAllItems(setSelectedClassSectionKeys, allClassSectionKeys)}
                allLabel="All Classes"
                searchable
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedClassSectionKeys.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Select one or more class + section combos above, or choose &quot;All Classes&quot;.</p>
            )}
            {visibleClassSections.map((combo) => (
              <ClassTimetableReport
                key={combo.value}
                classId={combo.classId}
                sectionId={combo.sectionId}
                showBreaks={showBreaks}
                showEmpty={showEmpty}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Teacher Schedule */}
      {activeTypes.includes('teacher-schedule') && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2"><UserCheck className="h-4 w-4" />Teacher Schedules</CardTitle>
                <CardDescription>Weekly teaching schedules</CardDescription>
              </div>
              <CheckDropdown
                label="Teachers"
                options={teacherOpts}
                selected={selectedTeacherIdsForSchedule}
                onToggle={toggleItem(setSelectedTeacherIdsForSchedule)}
                onSelectAll={selectAllItems(setSelectedTeacherIdsForSchedule, teacherOpts.map((o) => o.value))}
                allLabel="All Teachers"
                searchable
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTeacherIdsForSchedule.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Select one or more teachers above, or choose &quot;All Teachers&quot;.</p>
            )}
            {(selectedTeacherIdsForSchedule.length > 0 ? filteredTeachers.filter((t) => selectedTeacherIdsForSchedule.includes(t.id)) : filteredTeachers).map((t) => (
              <TeacherScheduleReport key={t.id} teacherId={t.id} showBreaks={showBreaks} showEmpty={showEmpty} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Daywise Schedule */}
      {activeTypes.includes('daywise') && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4" />Daywise Schedule</CardTitle>
                <CardDescription>View timetables for selected days</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <CheckDropdown
                  label="Days"
                  options={dayOpts}
                  selected={selectedDayIds}
                  onToggle={toggleItem(setSelectedDayIds)}
                  onSelectAll={selectAllItems(setSelectedDayIds, allDayKeys)}
                  allLabel="All Days"
                />
                <CheckDropdown
                  label="Classes"
                  options={classSectionOpts}
                  selected={selectedDaywiseClassSectionKeys}
                  onToggle={toggleItem(setSelectedDaywiseClassSectionKeys)}
                  onSelectAll={selectAllItems(setSelectedDaywiseClassSectionKeys, allClassSectionKeys)}
                  allLabel="All Classes"
                  searchable
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedDayIds.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Select one or more days above, or choose &quot;All Days&quot;.</p>
            )}
            {selectedDayIds.length > 0 && (
              <DaywiseScheduleReport
                selectedDays={selectedDayIds}
                selectedClassSectionKeys={selectedDaywiseClassSectionKeys}
                classSectionOpts={classSectionOpts}
                showBreaks={showBreaks}
                showEmpty={showEmpty}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Period Count */}
      {activeTypes.includes('teacher-period-count') && (
        <TeacherPeriodCountReport />
      )}
    </div>
    </ReportFilterCtx.Provider>
  );
}

/* ====================================================================
   Iframe-based Print Helper
   --------------------------------------------------------------------
   Replaces the old window.open() approach.  Writes the report HTML
   into a hidden <iframe> using srcdoc, then calls print() on the
   iframe's contentWindow.  This guarantees:
     1. The correct report layout is rendered (not a generic page).
     2. 100% format consistency between Print and Download PDF
        (both paths call the same code).
     3. No popup-blocker issues (iframes are not blocked).
   ==================================================================== */

function printViaIframe(htmlContent: string, title: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Remove any leftover iframe from a previous print
    const existing = document.getElementById('__report_print_iframe__');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = '__report_print_iframe__';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText =
      'position:fixed;left:-99999px;top:-99999px;width:0;height:0;border:none;opacity:0;pointer-events:none;';
    document.body.appendChild(iframe);

    // Use srcdoc to set the content atomically (avoids about:blank flash)
    iframe.srcdoc = htmlContent;

    iframe.onload = () => {
      try {
        const iw = iframe.contentWindow;
        if (!iw) { iframe.remove(); reject(new Error('Iframe contentWindow unavailable')); return; }
        // Give the browser a moment to finish rendering (fonts, layout)
        setTimeout(() => {
          try {
            iw.focus();
            iw.print();
            resolve();
          } catch (e) { reject(e); }
          finally {
            // Clean up after the print dialog closes
            setTimeout(() => { iframe.remove(); }, 60_000);
          }
        }, 350);
      } catch (err) { iframe.remove(); reject(err); }
    };

    iframe.onerror = () => { iframe.remove(); reject(new Error('Iframe failed to load')); };
  });
}

/* ===== usePdfDownload — iframe-based, consistent with print ===== */

function usePdfDownload() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadPdf = async (htmlContent: string, filename: string, _orientation: 'portrait' | 'landscape' = 'portrait') => {
    setIsGenerating(true);
    try {
      await printViaIframe(htmlContent, filename.replace('.pdf', ''));
      toast({
        title: 'Print dialog opened',
        description: 'Choose "Save as PDF" as the destination to download the report as a color PDF.',
      });
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast({
        title: 'Print failed',
        description: 'An error occurred while preparing the report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return { downloadPdf, isGenerating };
}

/* ====================================================================
   Print Settings Dialog
   --------------------------------------------------------------------
   Reusable dialog component that wraps every report's Print /
   Download buttons.  Customisations are session-persistent via
   the parent hook.
   ==================================================================== */

function PrintSettingsDialog({
  settings,
  onUpdate,
  onReset,
  children,
}: {
  settings: PrintSettings;
  onUpdate: (partial: Partial<PrintSettings>) => void;
  onReset: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isDefault =
    settings.orientation === DEFAULT_PRINT_SETTINGS.orientation &&
    settings.sheetsPerPage === DEFAULT_PRINT_SETTINGS.sheetsPerPage &&
    settings.headerContent === DEFAULT_PRINT_SETTINGS.headerContent &&
    settings.footerContent === DEFAULT_PRINT_SETTINGS.footerContent;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Print Settings
          </DialogTitle>
          <DialogDescription>
            Customize how reports are printed and downloaded. Settings persist for this session only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Orientation */}
          <div className="space-y-2">
            <Label>Page Orientation</Label>
            <Select
              value={settings.orientation}
              onValueChange={(v) => onUpdate({ orientation: v as 'portrait' | 'landscape' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Portrait (default)</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              {settings.orientation === 'portrait' ? 'Vertical A4 layout — ideal for timetables' : 'Horizontal A4 layout — ideal for wide tables'}
            </p>
          </div>

          {/* Sheets per page (vertical stack) */}
          <div className="space-y-2">
            <Label>Sheets per Page</Label>
            <Select
              value={String(settings.sheetsPerPage)}
              onValueChange={(v) => onUpdate({ sheetsPerPage: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 sheet per page</SelectItem>
                <SelectItem value="2">2 sheets per page</SelectItem>
                <SelectItem value="3">3 sheets per page</SelectItem>
                <SelectItem value="4">4 sheets per page</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Multiple sheets stack vertically on one page with even spacing
            </p>
          </div>

          <Separator />

          {/* Custom header */}
          <div className="space-y-2">
            <Label>Custom Header</Label>
            <Textarea
              placeholder="Optional text to appear in the report header (e.g. school motto, academic year)"
              value={settings.headerContent}
              onChange={(e) => onUpdate({ headerContent: e.target.value })}
              rows={2}
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              Leave blank to use the default header
            </p>
          </div>

          {/* Custom footer */}
          <div className="space-y-2">
            <Label>Custom Footer</Label>
            <Textarea
              placeholder="Optional text to appear in the report footer (e.g. principal signature, contact info)"
              value={settings.footerContent}
              onChange={(e) => onUpdate({ footerContent: e.target.value })}
              rows={2}
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              Leave blank to use the default footer (date + page number)
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={onReset} disabled={isDefault}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset Defaults
          </Button>
          <Button size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===== Teacher Period Count Report ===== */

type DetailMode = 'count-only' | 'show-periods' | 'show-total';
type OrientationMode = 'portrait' | 'landscape';

function TeacherPeriodCountReport() {
  const { entries, teachers, timings, schoolName, classes, sections, subjects } = useTimetableStore();
  const { toast } = useToast();
  const { downloadPdf, isGenerating } = usePdfDownload();
  const reportRef = useRef<HTMLDivElement>(null);
  const { settings: printSettings, updateSettings, resetSettings } = usePrintSettings();

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

  const nonBreakPeriodsCount = useMemo(() => {
    let count = 0;
    for (let p = 1; p <= timings.periodsPerDay; p++) {
      if (!isBreakPeriod(p, timings)) count++;
    }
    return count;
  }, [timings]);

  const maxPossiblePerTeacher = filteredSelectedDays.length * nonBreakPeriodsCount;

  // Effective orientation: print settings override if changed from default
  const effectiveOrientation = (printSettings.orientation !== DEFAULT_PRINT_SETTINGS.orientation)
    ? printSettings.orientation
    : orientation;

  // Build print-ready HTML for the period count report
  const buildReportHtml = useCallback(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const isLandscape = effectiveOrientation === 'landscape';
    const s = printSettings;

    const teachersPerPage = tablesPerPage === 1
      ? (isLandscape ? 20 : 14)
      : Math.max(1, Math.floor((isLandscape ? 20 : 14) / tablesPerPage));

    const fontSize = tablesPerPage === 1 ? (isLandscape ? '8px' : '7px') : '6px';
    const headerFontSize = tablesPerPage === 1 ? (isLandscape ? '7px' : '6.5px') : '5.5px';
    const cellPad = tablesPerPage === 1 ? '2px 3px' : '1px 2px';

    const sorted = [...teacherData].sort((a, b) => b.totalForSelectedDays - a.totalForSelectedDays);

    let tablesHtml = '';

    if (tablesPerPage === 1) {
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
          let detailParts: string[] = [];
          for (const day of filteredSelectedDays) {
            const periods = td.dayPeriods[day] || [];
            if (periods.length > 0) {
              const pList = periods.map((p) => getPeriodLabel(p.period, timings)).join(',');
              detailParts.push(`${day.slice(0, 3)}:${pList}`);
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

        const colWidth = '100%';

        tablesHtml += `
          <div class="table-chunk sheet-slot" style="width:${colWidth};display:block;">
            <div class="chunk-title">Table ${ci + 1}</div>
            <table class="pc-table">
              <thead><tr>
                <th class="th-sno">#</th>
                <th class="th-name">Teacher</th>`;
        for (const day of filteredSelectedDays) {
          tablesHtml += `<th class="th-day">${esc(day.slice(0, 3))}</th>`;
        }
        tablesHtml += `<th class="th-total">Total</th></tr></thead>
              <tbody>${tableRows}</tbody>
            </table>
          </div>`;
      });
    }

    const daysLabel = filteredSelectedDays.length === activeDays.length
      ? 'All Days'
      : filteredSelectedDays.join(', ');

    // Custom header / footer
    const customHeaderHtml = s.headerContent
      ? `<div class="custom-header">${esc(s.headerContent)}</div>`
      : '';
    const customFooterHtml = s.footerContent
      ? `<div class="custom-footer">${esc(s.footerContent)}</div>`
      : '';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: A4 ${isLandscape ? 'landscape' : 'portrait'};
    margin: 12.7mm 12.7mm 12.7mm 12.7mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: ${fontSize}; line-height: 1.3; color: #1D1D1F; background: #fff; }

  .report-header { text-align: center; padding-bottom: 6px; margin-bottom: 8px; border-bottom: 2px solid #007AFF; }
  .school-name { font-size: ${isLandscape ? '16px' : '14px'}; font-weight: 700; color: #1D1D1F; }
  .report-title { font-size: ${isLandscape ? '12px' : '11px'}; font-weight: 600; color: #333; margin-top: 2px; }
  .report-subtitle { font-size: ${headerFontSize}; color: #666; margin-top: 1px; }
  .custom-header { text-align: center; font-size: ${headerFontSize}; color: #555; font-style: italic; margin-bottom: 4px; }
  .custom-footer { text-align: center; font-size: ${headerFontSize}; color: #555; font-style: italic; margin-top: 4px; }

  .pc-table { width: 100%; border-collapse: collapse; font-size: ${fontSize}; table-layout: fixed; }
  .pc-table th, .pc-table td { border: 1px solid #D1D1D6; padding: ${cellPad}; text-align: center; vertical-align: middle; }
  .th-sno { width: 22px; background: #F5F5F7; font-size: ${headerFontSize}; font-weight: 600; }
  .th-name { background: #F5F5F7; font-size: ${headerFontSize}; font-weight: 600; text-align: left !important; width: auto; }
  .th-short { background: #F5F5F7; font-size: ${headerFontSize}; font-weight: 600; width: 40px; }
  .th-day { background: #F5F5F7; font-size: ${headerFontSize}; font-weight: 600; }
  .th-total { background: #007AFF; color: white; font-size: ${headerFontSize}; font-weight: 700; width: 36px; }
  .th-detail { background: #F5F5F7; font-size: ${headerFontSize}; font-weight: 600; text-align: left !important; }

  .td-sno { font-size: ${headerFontSize}; color: #86868B; }
  .td-name { text-align: left !important; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .td-short { font-weight: 600; font-size: ${fontSize}; }
  .td-num { font-weight: 600; font-size: ${fontSize}; }
  .td-num.zero { background: #FFF3E0; color: #E65100; }
  .td-num.full { background: #E8F5E9; color: #2E7D32; }
  .td-total { background: #F0F5FF; font-size: ${fontSize}; }
  .td-detail { text-align: left !important; font-size: ${headerFontSize}; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: ${isLandscape ? '120px' : '80px'}; }

  .table-chunk { padding: 0 4px; }
  .chunk-title { font-size: ${headerFontSize}; font-weight: 600; text-align: center; margin-bottom: 3px; color: #333; }

  .sheet-slot { width: 100%; page-break-inside: avoid; break-inside: avoid; }

  .summary-bar { display: flex; gap: 16px; justify-content: center; margin-top: 8px; flex-wrap: wrap; }
  .summary-item { text-align: center; padding: 4px 12px; background: #F5F5F7; border-radius: 6px; border: 1px solid #E5E5EA; }
  .summary-num { display: block; font-size: 14px; font-weight: 700; color: #007AFF; }
  .summary-label { display: block; font-size: ${headerFontSize}; color: #86868B; }

  .report-footer { margin-top: 10px; padding-top: 6px; border-top: 1px solid #E5E5EA; display: flex; justify-content: space-between; font-size: ${headerFontSize}; color: #86868B; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="report-header">
    <div class="school-name">${esc(schoolName)}</div>
    <div class="report-title">Teacher Period Count Report</div>
    <div class="report-subtitle">${esc(daysLabel)} | Max ${maxPossiblePerTeacher} periods/teacher | ${teachers.length} teachers</div>
    ${customHeaderHtml}
  </div>

  ${tablesHtml}

  <div class="summary-bar">
    <div class="summary-item"><span class="summary-num">${teachers.length}</span><span class="summary-label">Teachers</span></div>
    <div class="summary-item"><span class="summary-num">${filteredSelectedDays.length}</span><span class="summary-label">Days</span></div>
    <div class="summary-item"><span class="summary-num">${maxPossiblePerTeacher}</span><span class="summary-label">Max Periods</span></div>
    <div class="summary-item"><span class="summary-num">${sorted.reduce((sum, t) => sum + t.totalForSelectedDays, 0)}</span><span class="summary-label">Total Assigned</span></div>
  </div>

  ${customFooterHtml}
  <div class="report-footer">
    <span>${esc(today)}</span>
    <span>Generated by Timetable Manager</span>
    <span>Page <span class="page-num"></span></span>
  </div>
</body>
</html>`;
  }, [teacherData, filteredSelectedDays, activeDays, orientation, tablesPerPage, detailMode, schoolName, nonBreakPeriodsCount, maxPossiblePerTeacher, teachers.length, effectiveOrientation, printSettings, timings]);

  const handlePrint = () => {
    const html = buildReportHtml();
    printViaIframe(html, 'Teacher_Period_Count');
    toast({ title: 'Print dialog opened', description: 'Use the print dialog to print or save as PDF.' });
  };

  const handlePdf = async () => {
    const html = buildReportHtml();
    await downloadPdf(html, `Period_Count_${new Date().toISOString().slice(0, 10)}.pdf`, effectiveOrientation);
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
              Download PDF ({effectiveOrientation === 'landscape' ? 'Landscape' : 'Portrait'})
            </Button>
            <PrintSettingsDialog
              settings={printSettings}
              onUpdate={updateSettings}
              onReset={resetSettings}
            >
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-1.5" />
                Print Settings
              </Button>
            </PrintSettingsDialog>
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
                  {filteredSelectedDays.length} day{filteredSelectedDays.length !== 1 ? 's' : ''} selected | {teachers.length} teachers | {effectiveOrientation} mode
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {effectiveOrientation === 'landscape' ? (tablesPerPage === 1 ? '~20' : `~${20 * tablesPerPage}`) : (tablesPerPage === 1 ? '~14' : `~${14 * tablesPerPage}`)} teachers/page
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
  const { settings: printSettings, updateSettings, resetSettings } = usePrintSettings();

  const activeDays = timings.days;
  const cls = classes.find((c) => c.id === classId);
  const sec = sections.find((s) => s.id === sectionId);

  const handlePrint = () => {
    const html = buildClassTimetableHtml(
      schoolName, cls?.name || 'Class', sec?.name || '',
      timings, entries, teachers, classes, sections, subjects,
      classId, sectionId, showBreaks, showEmpty,
      printSettings
    );
    printViaIframe(html, `${cls?.name || 'Class'}_${sec?.name || ''}_Timetable`);
    toast({ title: 'Print dialog opened', description: 'Use the print dialog to print or save as PDF.' });
  };

  const handlePdf = async () => {
    const html = buildClassTimetableHtml(
      schoolName, cls?.name || 'Class', sec?.name || '',
      timings, entries, teachers, classes, sections, subjects,
      classId, sectionId, showBreaks, showEmpty,
      printSettings
    );
    await downloadPdf(html, `${cls?.name || 'Class'}_${sec?.name || ''}_Timetable.pdf`, printSettings.orientation);
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
            <CardTitle className="text-lg">{cls?.name} — {sec?.name}</CardTitle>
            <CardDescription>Weekly timetable report</CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1.5" />
              Print
            </Button>
            <Button size="sm" onClick={handlePdf} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
              Download PDF
            </Button>
            <PrintSettingsDialog settings={printSettings} onUpdate={updateSettings} onReset={resetSettings}>
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-1.5" />
                Print Settings
              </Button>
            </PrintSettingsDialog>
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
  const { settings: printSettings, updateSettings, resetSettings } = usePrintSettings();

  const activeDays = timings.days;
  const teacher = teachers.find((t) => t.id === teacherId);

  const teacherEntries = useMemo(() => entries.filter((e) => e.teacherId === teacherId), [entries, teacherId]);

  const handlePrint = () => {
    const html = buildTeacherScheduleHtml(
      schoolName, teacher?.name || 'Teacher', timings, entries, teachers, classes, sections, subjects,
      teacherId, showBreaks, showEmpty, printSettings
    );
    printViaIframe(html, `${teacher?.shortName || 'Teacher'}_Schedule`);
    toast({ title: 'Print dialog opened', description: 'Use the print dialog to print or save as PDF.' });
  };

  const handlePdf = async () => {
    const html = buildTeacherScheduleHtml(
      schoolName, teacher?.name || 'Teacher', timings, entries, teachers, classes, sections, subjects,
      teacherId, showBreaks, showEmpty, printSettings
    );
    await downloadPdf(html, `${teacher?.shortName || 'Teacher'}_Schedule.pdf`, printSettings.orientation);
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
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-1.5" />Print</Button>
            <Button size="sm" onClick={handlePdf} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
              Download PDF
            </Button>
            <PrintSettingsDialog settings={printSettings} onUpdate={updateSettings} onReset={resetSettings}>
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-1.5" />
                Print Settings
              </Button>
            </PrintSettingsDialog>
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

/* ===== Daywise Schedule Report ===== */

function DaywiseScheduleReport({
  selectedDays,
  selectedClassSectionKeys,
  classSectionOpts,
  showBreaks,
  showEmpty,
}: {
  selectedDays: string[];
  selectedClassSectionKeys: string[];
  classSectionOpts: { value: string; label: string; classId: string; sectionId: string }[];
  showBreaks: boolean;
  showEmpty: boolean;
}) {
  const { entries, teachers, subjects, timings, schoolName, classes, sections } = useTimetableStore();
  const { toast } = useToast();
  const { downloadPdf, isGenerating } = usePdfDownload();
  const { settings: printSettings, updateSettings, resetSettings } = usePrintSettings();

  const activeDays = timings.days;
  const filteredSelectedDays = activeDays.filter((d) => selectedDays.includes(d));

  // Resolve visible combos
  const visibleCombos = useMemo(() => {
    if (selectedClassSectionKeys.length === 0) return classSectionOpts;
    return classSectionOpts.filter((o) => selectedClassSectionKeys.includes(o.value));
  }, [selectedClassSectionKeys, classSectionOpts]);

  const handlePrint = () => {
    const html = buildDaywiseScheduleHtml(
      schoolName, filteredSelectedDays, visibleCombos,
      timings, entries, teachers, classes, sections, subjects,
      showBreaks, showEmpty, printSettings
    );
    printViaIframe(html, 'Daywise_Schedule');
    toast({ title: 'Print dialog opened', description: 'Use the print dialog to print or save as PDF.' });
  };

  const handlePdf = async () => {
    const html = buildDaywiseScheduleHtml(
      schoolName, filteredSelectedDays, visibleCombos,
      timings, entries, teachers, classes, sections, subjects,
      showBreaks, showEmpty, printSettings
    );
    await downloadPdf(html, `Daywise_Schedule_${new Date().toISOString().slice(0, 10)}.pdf`, printSettings.orientation);
  };

  const visiblePeriods = useMemo(() => {
    const periods: number[] = [];
    for (let p = 1; p <= timings.periodsPerDay; p++) {
      const isBreak = isBreakPeriod(p, timings);
      if (isBreak && !showBreaks) continue;
      if (!isBreak && !showEmpty) {
        const hasAnyEntry = filteredSelectedDays.some((day) =>
          visibleCombos.some((combo) =>
            entries.some((e) => e.day === day && e.period === p && e.classId === combo.classId && e.sectionId === combo.sectionId)
          )
        );
        if (!hasAnyEntry) continue;
      }
      periods.push(p);
    }
    return periods;
  }, [timings, showBreaks, showEmpty, filteredSelectedDays, entries, visibleCombos]);

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1.5" />
          Print
        </Button>
        <Button size="sm" onClick={handlePdf} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
          Download PDF
        </Button>
        <PrintSettingsDialog settings={printSettings} onUpdate={updateSettings} onReset={resetSettings}>
          <Button variant="outline" size="sm">
            <Settings2 className="h-4 w-4 mr-1.5" />
            Print Settings
          </Button>
        </PrintSettingsDialog>
      </div>

      {/* Render cards for each selected day */}
      {filteredSelectedDays.map((day) => (
        <Card key={day}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {day}
            </CardTitle>
            <CardDescription>
              {visibleCombos.length} class{visibleCombos.length !== 1 ? 'es' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="grid gap-px bg-border rounded-lg overflow-hidden" style={{ gridTemplateColumns: '100px repeat(' + visibleCombos.length + ', 1fr)' }}>
                  <div className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground flex items-center justify-center">Period</div>
                  {visibleCombos.map((combo) => (
                    <div key={combo.value} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
                      {combo.label}
                    </div>
                  ))}
                  {visiblePeriods.map((period) => {
                    const isBreak = isBreakPeriod(period, timings);
                    const time = getPeriodTime(period, timings);
                    return (
                      <div key={`row-${day}-${period}`}>
                        <div className={`bg-muted/50 p-2 flex flex-col items-center justify-center gap-0.5 ${isBreak ? 'bg-amber-100 dark:bg-amber-900/20' : ''}`}>
                          <span className="text-xs font-medium">{getPeriodLabel(period, timings)}</span>
                          <span className="text-[10px] text-muted-foreground">{time}</span>
                        </div>
                        {visibleCombos.map((combo) => {
                          const entry = entries.find((e) => e.day === day && e.period === period && e.classId === combo.classId && e.sectionId === combo.sectionId);
                          const teacher = entry ? teachers.find((t) => t.id === entry.teacherId) : null;
                          const subject = entry ? subjects.find((s) => s.id === entry.subjectId) : null;
                          const colors = entry ? getSubjectColor(entry.subjectId) : null;
                          if (isBreak) return <div key={`${combo.value}-${period}`} className="bg-amber-50 dark:bg-amber-950/10 p-2 flex items-center justify-center"><Coffee className="h-3 w-3 text-amber-400" /></div>;
                          if (!entry && !showEmpty) return <div key={`${combo.value}-${period}`} className="bg-card p-2 min-h-[48px]" />;
                          return (
                            <div key={`${combo.value}-${period}`} className={`p-2 min-h-[48px] flex flex-col items-center justify-center ${entry ? `${colors?.bg || ''} ${colors?.border || ''} border` : 'bg-card'}`}>
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
      ))}
    </div>
  );
}

/* ===== Inline HTML builders for PDF/Print ===== */

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---------- Shared professional CSS for timetable grid reports ---------- */

function buildTimetableCss(isLandscape: boolean, sheetsPerPage: number): string {
  /* 0.5 inch = 12.7mm. Margins: left 0.5", right 0.5", bottom 0.5", top 12.7mm. */
  const pageH = isLandscape ? '210mm' : '297mm';
  const availH = `calc(${pageH} - 12.7mm - 12.7mm - 12mm)`; /* page - top margin - bottom margin - footer reserved */
  const sheetMaxH = sheetsPerPage > 1 ? `calc(${availH} / ${sheetsPerPage} - 8px)` : 'none';
  const nUpCss = sheetsPerPage > 1 ? `
  body.sheets-multi {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  body.sheets-multi .sheet-slot {
    flex: 0 0 auto;
    max-height: ${sheetMaxH};
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
    border: 1px solid #D1D1D6;
    border-radius: 4px;
    padding: 6px 8px;
  }
  body.sheets-multi .sheet-slot:nth-child(${sheetsPerPage}n) {
    page-break-after: always;
    break-after: page;
  }
  body.sheets-multi .sheet-slot:last-child {
    page-break-after: auto;
    break-after: auto;
  }` : '\n  body.sheets-multi .sheet-slot { width: 100%; }';

  return `
  @page {
    size: A4 ${isLandscape ? 'landscape' : 'portrait'};
    margin: 12.7mm 12.7mm 12.7mm 12.7mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    font-size: 9px;
    color: #1D1D1F;
    background: #fff;
  }
  ${nUpCss}

  /* ── Page header ── */
  .page-header {
    text-align: center;
    padding-bottom: 8px;
    margin-bottom: 10px;
    border-bottom: 2.5px solid #007AFF;
  }
  .page-header .school-name { font-size: 16px; font-weight: 700; color: #1D1D1F; letter-spacing: -0.3px; }
  .page-header .report-title { font-size: 12px; font-weight: 600; color: #333; margin-top: 3px; }
  .page-header .report-sub { font-size: 10px; color: #555; margin-top: 2px; }
  .custom-header { text-align: center; font-size: 9px; color: #666; font-style: italic; margin-top: 4px; }

  /* ── Footer (fixed at bottom of every printed page) ── */
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
  .page-footer .f-center { display: table-cell; text-align: center; width: 34%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .page-footer .f-right  { display: table-cell; text-align: right;  width: 33%; }
  .custom-footer { text-align: center; font-size: 8px; color: #666; font-style: italic; margin-top: 6px; }

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

  /* ── Summary stats ── */
  .sr { display: flex; gap: 12px; margin-bottom: 12px; justify-content: center; }
  .si { text-align: center; padding: 8px 18px; background: #E8EAF6; border-radius: 8px; border: 1px solid #C5CAE9; }
  .sn2 { display: block; font-size: 20px; font-weight: 700; color: #283593; }
  .sl { display: block; font-size: 8px; color: #86868B; margin-top: 2px; }

  /* ── Day blocks ── */
  .db { margin-bottom: 8px; border: 1px solid #E5E5EA; border-radius: 6px; overflow: hidden; }
  .dh { background: #F5F5F7; padding: 5px 8px; font-weight: 700; font-size: 10px; border-bottom: 1px solid #E5E5EA; }
  .fc { font-weight: 400; font-size: 8px; color: #283593; margin-left: 5px; }
  .di { display: flex; flex-wrap: wrap; gap: 5px; padding: 6px 8px; }
  .fi { padding: 3px 8px; background: #E8F5E9; border: 1px solid #A5D6A7; border-radius: 4px; font-size: 8px; font-weight: 600; color: #2E7D32; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page-footer { position: fixed; bottom: 0; }
  }`;
}

/* ---------- Class Timetable HTML ---------- */

function buildClassTimetableHtml(
  schoolName: string, className: string, sectionName: string,
  timings: any, entries: any[], teachers: any[], classes: any[], sections: any[], subjects: any[],
  classId: string, sectionId: string, showBreaks: boolean, showEmpty: boolean,
  printSettings?: PrintSettings
): string {
  const s = printSettings || DEFAULT_PRINT_SETTINGS;
  const isLandscape = s.orientation === 'landscape';
  const activeDays = timings.days;
  const filteredEntries = entries.filter((e: any) => e.classId === classId && e.sectionId === sectionId);
  const genTime = new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });
  const reportTitle = 'Class Timetable';
  const subtitle = `${className} — ${sectionName}`;

  const getT = (id: string) => teachers.find((t: any) => t.id === id);
  const getS = (id: string) => subjects.find((s: any) => s.id === id);

  let rows = '';
  for (let p = 1; p <= timings.periodsPerDay; p++) {
    const isBreak = isBreakPeriod(p, timings);
    if (isBreak && !showBreaks) continue;
    const time = getPeriodTime(p, timings);
    const label = getPeriodLabel(p, timings);
    const rowClass = isBreak ? ' class="brk"' : '';
    rows += `<tr${rowClass}><td class="tp"><span class="pl">${esc(label)}</span><span class="tt-time">${esc(time)}</span></td>`;
    for (const day of activeDays) {
      if (isBreak) { rows += '<td class="tb">&#9749; Break</td>'; continue; }
      const entry = filteredEntries.find((e: any) => e.day === day && e.period === p);
      if (entry) {
        const subj = getS(entry.subjectId);
        const tchr = getT(entry.teacherId);
        rows += `<td class="tf"><b>${esc(subj?.shortName || '?')}</b><span class="tn">${esc(tchr?.name || '?')}</span></td>`;
      } else if (showEmpty) {
        rows += '<td class="te">\u2014</td>';
      } else {
        rows += '<td></td>';
      }
    }
    rows += '</tr>';
  }

  const customHeaderHtml = s.headerContent
    ? `<div class="custom-header">${esc(s.headerContent)}</div>`
    : '';
  const customFooterHtml = s.footerContent
    ? `<div class="custom-footer">${esc(s.footerContent)}</div>`
    : '';
  const bodyClass = s.sheetsPerPage > 1 ? ' class="sheets-multi"' : '';

  const tableHtml = `<table class="tt">
    <thead><tr><th>Day / Period</th>${activeDays.map((d: string) => `<th>${esc(d)}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;

  const sheetContent = s.sheetsPerPage > 1
    ? `<div class="sheet-slot"><div class="page-header"><div class="school-name">${esc(schoolName)}</div><div class="report-title">${esc(reportTitle)}</div><div class="report-sub">${esc(subtitle)}</div>${customHeaderHtml}</div>${tableHtml}</div>`
    : `<div class="page-header"><div class="school-name">${esc(schoolName)}</div><div class="report-title">${esc(reportTitle)}</div><div class="report-sub">${esc(subtitle)}</div>${customHeaderHtml}</div>${tableHtml}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${buildTimetableCss(isLandscape, s.sheetsPerPage)}</style></head>
<body${bodyClass}>
  ${sheetContent}
  <div class="page-footer">
    <span class="f-left">${esc(genTime)}</span>
    <span class="f-center">${esc(schoolName)} &mdash; ${esc(reportTitle)}</span>
    <span class="f-right">Page: 1 of 1</span>
  </div>
  ${customFooterHtml}
</body></html>`;
}

/* ---------- Teacher Schedule HTML ---------- */

function buildTeacherScheduleHtml(
  schoolName: string, teacherName: string,
  timings: any, entries: any[], teachers: any[], classes: any[], sections: any[], subjects: any[],
  teacherId: string, showBreaks: boolean, showEmpty: boolean,
  printSettings?: PrintSettings
): string {
  const s = printSettings || DEFAULT_PRINT_SETTINGS;
  const isLandscape = s.orientation === 'landscape';
  const activeDays = timings.days;
  const filteredEntries = entries.filter((e: any) => e.teacherId === teacherId);
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
    const rowClass = isBreak ? ' class="brk"' : '';
    rows += `<tr${rowClass}><td class="tp"><span class="pl">${esc(label)}</span><span class="tt-time">${esc(time)}</span></td>`;
    for (const day of activeDays) {
      if (isBreak) { rows += '<td class="tb">&#9749; Break</td>'; continue; }
      const entry = filteredEntries.find((e: any) => e.day === day && e.period === p);
      if (entry) {
        const subj = getS(entry.subjectId);
        const cls = getC(entry.classId);
        const sec = getSec(entry.sectionId);
        rows += `<td class="tf"><b>${esc(subj?.shortName || '?')}</b><span class="tn">${esc(cls?.name || '')}-${esc(sec?.name || '')}</span></td>`;
      } else if (showEmpty) {
        rows += '<td class="te">\u2014</td>';
      } else {
        rows += '<td></td>';
      }
    }
    rows += '</tr>';
  }

  const customHeaderHtml = s.headerContent
    ? `<div class="custom-header">${esc(s.headerContent)}</div>`
    : '';
  const customFooterHtml = s.footerContent
    ? `<div class="custom-footer">${esc(s.footerContent)}</div>`
    : '';
  const bodyClass = s.sheetsPerPage > 1 ? ' class="sheets-multi"' : '';

  const tableHtml = `<table class="tt">
    <thead><tr><th>Day / Period</th>${activeDays.map((d: string) => `<th>${esc(d)}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;

  const sheetContent = s.sheetsPerPage > 1
    ? `<div class="sheet-slot"><div class="page-header"><div class="school-name">${esc(schoolName)}</div><div class="report-title">${esc(reportTitle)}</div><div class="report-sub">${esc(teacherName)}</div>${customHeaderHtml}</div>${tableHtml}</div>`
    : `<div class="page-header"><div class="school-name">${esc(schoolName)}</div><div class="report-title">${esc(reportTitle)}</div><div class="report-sub">${esc(teacherName)}</div>${customHeaderHtml}</div>${tableHtml}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${buildTimetableCss(isLandscape, s.sheetsPerPage)}</style></head>
<body${bodyClass}>
  ${sheetContent}
  <div class="page-footer">
    <span class="f-left">${esc(genTime)}</span>
    <span class="f-center">${esc(schoolName)} &mdash; ${esc(reportTitle)}</span>
    <span class="f-right">Page: 1 of 1</span>
  </div>
  ${customFooterHtml}
</body></html>`;
}

/* ---------- Daywise Schedule HTML ---------- */

function buildDaywiseScheduleHtml(
  schoolName: string,
  selectedDays: string[],
  combos: { value: string; label: string; classId: string; sectionId: string }[],
  timings: any,
  entries: any[],
  teachers: any[],
  classes: any[],
  sections: any[],
  subjects: any[],
  showBreaks: boolean,
  showEmpty: boolean,
  printSettings?: PrintSettings
): string {
  const s = printSettings || DEFAULT_PRINT_SETTINGS;
  const isLandscape = s.orientation === 'landscape';
  const genTime = new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });
  const reportTitle = 'Daywise Schedule';
  const daysLabel = selectedDays.length === timings.days.length
    ? 'All Days'
    : selectedDays.join(', ');

  const getS = (id: string) => subjects.find((s: any) => s.id === id);
  const getT = (id: string) => teachers.find((t: any) => t.id === id);

  // Build HTML for each day
  let dayBlocksHtml = '';
  for (const day of selectedDays) {
    let rows = '';
    for (let p = 1; p <= timings.periodsPerDay; p++) {
      const isBreak = isBreakPeriod(p, timings);
      if (isBreak && !showBreaks) continue;
      const time = getPeriodTime(p, timings);
      const label = getPeriodLabel(p, timings);
      const rowClass = isBreak ? ' class="brk"' : '';
      rows += `<tr${rowClass}><td class="tp"><span class="pl">${esc(label)}</span><span class="tt-time">${esc(time)}</span></td>`;
      for (const combo of combos) {
        if (isBreak) { rows += '<td class="tb">&#9749; Break</td>'; continue; }
        const entry = entries.find((e: any) => e.day === day && e.period === p && e.classId === combo.classId && e.sectionId === combo.sectionId);
        if (entry) {
          const subj = getS(entry.subjectId);
          const tchr = getT(entry.teacherId);
          rows += `<td class="tf"><b>${esc(subj?.shortName || '?')}</b><span class="tn">${esc(tchr?.name || '?')}</span></td>`;
        } else if (showEmpty) {
          rows += '<td class="te">\u2014</td>';
        } else {
          rows += '<td></td>';
        }
      }
      rows += '</tr>';
    }

    dayBlocksHtml += `
    <div class="day-block">
      <div class="db"><div class="dh">${esc(day)}</div></div>
      <table class="tt">
        <thead><tr><th>Period</th>${combos.map((c) => `<th>${esc(c.label)}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  const customHeaderHtml = s.headerContent
    ? `<div class="custom-header">${esc(s.headerContent)}</div>`
    : '';
  const customFooterHtml = s.footerContent
    ? `<div class="custom-footer">${esc(s.footerContent)}</div>`
    : '';
  const bodyClass = s.sheetsPerPage > 1 ? ' class="sheets-multi"' : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${buildTimetableCss(isLandscape, s.sheetsPerPage)}
  .day-block { margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid; }
  .day-block .db { margin-bottom: 0; }
  .day-block table.tt { margin-top: 0; }
</style></head>
<body${bodyClass}>
  <div class="page-header">
    <div class="school-name">${esc(schoolName)}</div>
    <div class="report-title">${esc(reportTitle)}</div>
    <div class="report-sub">${esc(daysLabel)} | ${combos.length} class${combos.length !== 1 ? 'es' : ''}</div>
    ${customHeaderHtml}
  </div>
  <div class="page-footer">
    <span class="f-left">${esc(genTime)}</span>
    <span class="f-center">${esc(schoolName)} &mdash; ${esc(reportTitle)}</span>
    <span class="f-right">Page: 1 of 1</span>
  </div>
  ${dayBlocksHtml}
  ${customFooterHtml}
</body></html>`;
}
