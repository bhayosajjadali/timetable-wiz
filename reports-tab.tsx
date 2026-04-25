'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTimetableStore } from '@/lib/store';
import { getSubjectColor, getPeriodTime, isBreakPeriod, getPeriodLabel } from '@/lib/timetable-utils';
import { useToast } from '@/hooks/use-toast';
import {
  Printer,
  Coffee,
  UserCheck,
  CalendarDays,
  Download,
  Loader2,
  Search,
  BarChart3,
  GraduationCap,
  Settings2,
  RotateCcw,
  ChevronsUpDown,
  Check,
  FileText,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DEFAULT_PRINT_SETTINGS,
  type PrintSettings,
} from '@/hooks/usePrintSettings';

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
                {selected.includes(opt.value) && <Check className="h-3 w-3 ml-auto text-[#1B2A4A]" />}
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
   Shared type
   ==================================================================== */

type DetailMode = 'count-only' | 'show-periods' | 'show-total';

/* ====================================================================
   ReportsTab — 3-tab layout: Timetables | Period Count | PDF Export
   ==================================================================== */

export function ReportsTab() {
  const [activeTab, setActiveTab] = useState('timetables');

  // ── Timetables tab state ──
  const [viewMode, setViewMode] = useState<'class' | 'teacher'>('class');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBreaks, setShowBreaks] = useState(true);
  const [showEmpty, setShowEmpty] = useState(true);
  const [selectedClassSectionKeys, setSelectedClassSectionKeys] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  // ── PDF Export tab state ──
  const [exportType, setExportType] = useState<'class' | 'teacher' | 'period-count' | 'daywise'>('class');
  const [exportShowBreaks, setExportShowBreaks] = useState(true);
  const [exportShowEmpty, setExportShowEmpty] = useState(true);
  const [exportOrientation, setExportOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [exportSheetsPerPage, setExportSheetsPerPage] = useState(1);
  const [exportHeaderContent, setExportHeaderContent] = useState('');
  const [exportFooterContent, setExportFooterContent] = useState('');
  const [exportSelectedClasses, setExportSelectedClasses] = useState<string[]>([]);
  const [exportSelectedTeachers, setExportSelectedTeachers] = useState<string[]>([]);
  const [exportSelectedDays, setExportSelectedDays] = useState<string[]>([]);
  const [exportDetailMode, setExportDetailMode] = useState<DetailMode>('show-periods');
  const [exportDaywiseDays, setExportDaywiseDays] = useState<string[]>([]);
  const [exportDaywiseClasses, setExportDaywiseClasses] = useState<string[]>([]);

  const { toast } = useToast();
  const { downloadPdf, isGenerating } = usePdfDownload();

  const { classes, sections, teachers, timings } = useTimetableStore();
  const availableClasses = classes.filter((c) => c.sectionIds.length > 0);

  // ── Helpers ──
  const toggleItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (value: string) =>
    setter((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
  const selectAllItems = (setter: React.Dispatch<React.SetStateAction<string[]>>, all: string[]) => () =>
    setter((prev) => prev.length === all.length ? [] : [...all]);

  // ── Filtered options ──
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
  const dayOpts = timings.days.map((d) => ({ value: d, label: d }));
  const allClassSectionKeys = classSectionOpts.map((o) => o.value);
  const allDayKeys = dayOpts.map((o) => o.value);
  const allTeacherKeys = teacherOpts.map((o) => o.value);

  // ── Visible items for Timetables tab ──
  const visibleClassSections = useMemo(() => {
    if (selectedClassSectionKeys.length === 0) return [];
    return classSectionOpts.filter((o) => selectedClassSectionKeys.includes(o.value));
  }, [selectedClassSectionKeys, classSectionOpts]);

  const visibleTeachers = useMemo(() => {
    if (selectedTeacherIds.length === 0) return [];
    return filteredTeachers.filter((t) => selectedTeacherIds.includes(t.id));
  }, [selectedTeacherIds, filteredTeachers]);

  // ── PDF Export: build PrintSettings object ──
  const exportSettings: PrintSettings = useMemo(() => ({
    orientation: exportOrientation,
    sheetsPerPage: exportSheetsPerPage,
    headerContent: exportHeaderContent,
    footerContent: exportFooterContent,
  }), [exportOrientation, exportSheetsPerPage, exportHeaderContent, exportFooterContent]);

  // ── PDF Export: build HTML and trigger action ──
  const handleExport = useCallback(async (action: 'print' | 'download') => {
    const store = useTimetableStore.getState();
    const { schoolName, timings: storeTimings, entries, teachers: storeTeachers, classes: storeClasses, sections: storeSections, subjects } = store;
    let html = '';
    let title = '';

    try {
      switch (exportType) {
        case 'class': {
          const combos = exportSelectedClasses.length === 0
            ? classSectionOpts
            : classSectionOpts.filter((o) => exportSelectedClasses.includes(o.value));
          if (combos.length === 0) {
            toast({ title: 'Nothing to export', description: 'Select at least one class to export.', variant: 'destructive' });
            return;
          }
          html = buildCombinedClassTimetableHtml(schoolName, combos, store, exportShowBreaks, exportShowEmpty, exportSettings);
          title = `Class_Timetables_${combos.length}`;
          break;
        }
        case 'teacher': {
          const teacherList = exportSelectedTeachers.length === 0
            ? storeTeachers
            : storeTeachers.filter((t) => exportSelectedTeachers.includes(t.id));
          if (teacherList.length === 0) {
            toast({ title: 'Nothing to export', description: 'Select at least one teacher to export.', variant: 'destructive' });
            return;
          }
          html = buildCombinedTeacherScheduleHtml(schoolName, teacherList, store, exportShowBreaks, exportShowEmpty, exportSettings);
          title = `Teacher_Schedules_${teacherList.length}`;
          break;
        }
        case 'period-count': {
          const activeDays = storeTimings.days;
          const effectiveDays = exportSelectedDays.length === 0 ? activeDays : activeDays.filter((d) => exportSelectedDays.includes(d));
          if (effectiveDays.length === 0) {
            toast({ title: 'Nothing to export', description: 'Select at least one day to export.', variant: 'destructive' });
            return;
          }
          const teacherData = computeTeacherPeriodData(storeTeachers, entries, activeDays, effectiveDays, storeTimings, subjects, storeClasses, storeSections);
          html = buildPeriodCountReportHtml({
            schoolName,
            teacherData,
            filteredSelectedDays: effectiveDays,
            activeDays,
            orientation: exportOrientation,
            tablesPerPage: exportSheetsPerPage,
            detailMode: exportDetailMode,
            nonBreakPeriodsCount: countNonBreakPeriods(storeTimings),
            maxPossiblePerTeacher: effectiveDays.length * countNonBreakPeriods(storeTimings),
            teachersCount: storeTeachers.length,
            printSettings: exportSettings,
            timings: storeTimings,
          });
          title = `Period_Count_${effectiveDays.length}days`;
          break;
        }
        case 'daywise': {
          const activeDays = storeTimings.days;
          const effectiveDays = exportDaywiseDays.length === 0 ? activeDays : activeDays.filter((d) => exportDaywiseDays.includes(d));
          const combos = exportDaywiseClasses.length === 0
            ? classSectionOpts
            : classSectionOpts.filter((o) => exportDaywiseClasses.includes(o.value));
          if (effectiveDays.length === 0 || combos.length === 0) {
            toast({ title: 'Nothing to export', description: 'Select at least one day and one class to export.', variant: 'destructive' });
            return;
          }
          html = buildDaywiseScheduleHtml(
            schoolName, effectiveDays, combos,
            storeTimings, entries, storeTeachers, storeClasses, storeSections, subjects,
            exportShowBreaks, exportShowEmpty, exportSettings
          );
          title = `Daywise_Schedule_${effectiveDays.length}days`;
          break;
        }
      }

      if (!html) return;

      if (action === 'print') {
        await printViaIframe(html, title);
        toast({ title: 'Print dialog opened', description: 'Use the print dialog to print or save as PDF.' });
      } else {
        await downloadPdf(html, `${title}.pdf`, exportOrientation);
      }
    } catch (err) {
      console.error('Export failed:', err);
      toast({ title: 'Export failed', description: 'An error occurred. Please try again.', variant: 'destructive' });
    }
  }, [exportType, exportShowBreaks, exportShowEmpty, exportOrientation, exportSheetsPerPage, exportHeaderContent, exportFooterContent, exportSelectedClasses, exportSelectedTeachers, exportSelectedDays, exportDetailMode, exportDaywiseDays, exportDaywiseClasses, classSectionOpts, exportSettings, toast, downloadPdf]);

  // ── PDF Export summary text ──
  const exportSummary = useMemo(() => {
    const parts: string[] = [];
    switch (exportType) {
      case 'class': {
        const count = exportSelectedClasses.length || classSectionOpts.length;
        parts.push(`${count} class timetable${count !== 1 ? 's' : ''} selected`);
        break;
      }
      case 'teacher': {
        const count = exportSelectedTeachers.length || teachers.length;
        parts.push(`${count} teacher schedule${count !== 1 ? 's' : ''} selected`);
        break;
      }
      case 'period-count': {
        const daysCount = exportSelectedDays.length || timings.days.length;
        parts.push(`${daysCount} day${daysCount !== 1 ? 's' : ''} selected`);
        const modeLabels: Record<DetailMode, string> = { 'count-only': 'Count Only', 'show-periods': 'Show Periods', 'show-total': 'Totals Summary' };
        parts.push(modeLabels[exportDetailMode]);
        break;
      }
      case 'daywise': {
        const daysCount = exportDaywiseDays.length || timings.days.length;
        const classCount = exportDaywiseClasses.length || classSectionOpts.length;
        parts.push(`${daysCount} day${daysCount !== 1 ? 's' : ''}, ${classCount} class${classCount !== 1 ? 'es' : ''}`);
        break;
      }
    }
    parts.push(exportOrientation === 'landscape' ? 'Landscape' : 'Portrait');
    parts.push(`${exportSheetsPerPage} sheet${exportSheetsPerPage !== 1 ? 's' : ''}/page`);
    return parts.join(', ');
  }, [exportType, exportSelectedClasses, exportSelectedTeachers, exportSelectedDays, exportDetailMode, exportDaywiseDays, exportDaywiseClasses, exportOrientation, exportSheetsPerPage, classSectionOpts, teachers, timings.days]);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="timetables" className="gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" />
            Timetables
          </TabsTrigger>
          <TabsTrigger value="period-count" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Period Count
          </TabsTrigger>
          <TabsTrigger value="pdf-export" className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            PDF Export
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════
            Tab 1: Timetables
            ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="timetables">
          {/* View mode toggle + global filters */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Timetables
                  </CardTitle>
                  <CardDescription>View class and teacher timetables</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* View mode toggle */}
                  <div className="flex rounded-md border overflow-hidden">
                    <button
                      onClick={() => setViewMode('class')}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        viewMode === 'class'
                          ? 'bg-[#1B2A4A] text-white'
                          : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      Class View
                    </button>
                    <button
                      onClick={() => setViewMode('teacher')}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        viewMode === 'teacher'
                          ? 'bg-[#1B2A4A] text-white'
                          : 'bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      Teacher View
                    </button>
                  </div>

                  <Separator orientation="vertical" className="h-6" />

                  {/* Search */}
                  <div className="relative w-40">
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 text-xs pl-7"
                    />
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  </div>

                  {/* Breaks checkbox */}
                  <label className="flex items-center gap-1.5 cursor-pointer rounded-md border px-2.5 py-1 hover:bg-muted/50 transition-colors">
                    <Checkbox checked={showBreaks} onCheckedChange={(v) => setShowBreaks(!!v)} className="h-3.5 w-3.5" />
                    <span className="text-xs">Breaks</span>
                  </label>

                  {/* Empty checkbox */}
                  <label className="flex items-center gap-1.5 cursor-pointer rounded-md border px-2.5 py-1 hover:bg-muted/50 transition-colors">
                    <Checkbox checked={showEmpty} onCheckedChange={(v) => setShowEmpty(!!v)} className="h-3.5 w-3.5" />
                    <span className="text-xs">Empty</span>
                  </label>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Class View */}
          {viewMode === 'class' && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Class Timetables
                    </CardTitle>
                    <CardDescription>Select class + section combos to view timetables</CardDescription>
                  </div>
                  <CheckDropdown
                    label="Classes"
                    icon={GraduationCap}
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
                {selectedClassSectionKeys.length === 0 && classSectionOpts.length > 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <GraduationCap className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Select classes from the dropdown above to preview timetables</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Choose one or more class–section combinations</p>
                  </div>
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

          {/* Teacher View */}
          {viewMode === 'teacher' && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Teacher Schedules
                    </CardTitle>
                    <CardDescription>Weekly teaching schedules</CardDescription>
                  </div>
                  <CheckDropdown
                    label="Teachers"
                    icon={UserCheck}
                    options={teacherOpts}
                    selected={selectedTeacherIds}
                    onToggle={toggleItem(setSelectedTeacherIds)}
                    onSelectAll={selectAllItems(setSelectedTeacherIds, allTeacherKeys)}
                    allLabel="All Teachers"
                    searchable
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTeacherIds.length === 0 && teacherOpts.length > 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <UserCheck className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Select teachers from the dropdown above to preview schedules</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Choose one or more teachers to view their weekly timetables</p>
                  </div>
                )}
                {visibleTeachers.map((t) => (
                  <TeacherScheduleReport key={t.id} teacherId={t.id} showBreaks={showBreaks} showEmpty={showEmpty} />
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
            Tab 2: Period Count
            ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="period-count">
          <TeacherPeriodCountReport />
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════
            Tab 3: PDF Export
            ═══════════════════════════════════════════════════════════════ */}
        <TabsContent value="pdf-export">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* ── Left: Configuration ── */}
            <div className="lg:col-span-2 space-y-4">
              {/* Report Type */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Report Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {([
                      ['class', 'Class Timetable', GraduationCap],
                      ['teacher', 'Teacher Schedule', UserCheck],
                      ['period-count', 'Period Count', BarChart3],
                      ['daywise', 'Daywise Schedule', CalendarDays],
                    ] as const).map(([value, label, Icon]) => (
                      <button
                        key={value}
                        onClick={() => setExportType(value)}
                        className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border text-center transition-colors ${
                          exportType === value
                            ? 'bg-[#1B2A4A10] border-[#1B2A4A30]'
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${exportType === value ? 'text-[#1B2A4A]' : 'text-muted-foreground'}`} />
                        <span className={`text-xs font-medium ${exportType === value ? 'text-[#1B2A4A]' : ''}`}>{label}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Dynamic selectors based on report type */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Selection</CardTitle>
                  <CardDescription>Choose what to include in the export</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Class Timetable: class selection */}
                  {exportType === 'class' && (
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <Label className="text-sm">Class + Section</Label>
                      <CheckDropdown
                        label="Classes"
                        icon={GraduationCap}
                        options={classSectionOpts}
                        selected={exportSelectedClasses}
                        onToggle={toggleItem(setExportSelectedClasses)}
                        onSelectAll={selectAllItems(setExportSelectedClasses, allClassSectionKeys)}
                        allLabel="All Classes"
                        searchable
                      />
                    </div>
                  )}

                  {/* Teacher Schedule: teacher selection */}
                  {exportType === 'teacher' && (
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <Label className="text-sm">Teachers</Label>
                      <CheckDropdown
                        label="Teachers"
                        icon={UserCheck}
                        options={teacherOpts}
                        selected={exportSelectedTeachers}
                        onToggle={toggleItem(setExportSelectedTeachers)}
                        onSelectAll={selectAllItems(setExportSelectedTeachers, allTeacherKeys)}
                        allLabel="All Teachers"
                        searchable
                      />
                    </div>
                  )}

                  {/* Period Count: day selection + display mode */}
                  {exportType === 'period-count' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Select Days</Label>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExportSelectedDays([...allDayKeys])}>All</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExportSelectedDays([])}>None</Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {timings.days.map((day) => (
                            <label
                              key={day}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                                exportSelectedDays.includes(day)
                                  ? 'bg-[#1B2A4A10] border-[#1B2A4A30] text-[#1B2A4A] font-medium'
                                  : 'border-border hover:bg-muted/50 text-muted-foreground'
                              }`}
                            >
                              <Checkbox checked={exportSelectedDays.includes(day)} onCheckedChange={() => toggleItem(setExportSelectedDays)(day)} />
                              <span>{day.slice(0, 3)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <Separator />
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
                              onClick={() => setExportDetailMode(mode)}
                              className={`px-3 py-2 rounded-lg border text-left transition-colors ${
                                exportDetailMode === mode
                                  ? 'bg-[#1B2A4A10] border-[#1B2A4A30]'
                                  : 'border-border hover:bg-muted/50'
                              }`}
                            >
                              <div className={`text-sm font-medium ${exportDetailMode === mode ? 'text-[#1B2A4A]' : ''}`}>{label}</div>
                              <div className="text-[10px] text-muted-foreground">{desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Daywise: day selection + class selection */}
                  {exportType === 'daywise' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Select Days</Label>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExportDaywiseDays([...allDayKeys])}>All</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExportDaywiseDays([])}>None</Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {timings.days.map((day) => (
                            <label
                              key={day}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                                exportDaywiseDays.includes(day)
                                  ? 'bg-[#1B2A4A10] border-[#1B2A4A30] text-[#1B2A4A] font-medium'
                                  : 'border-border hover:bg-muted/50 text-muted-foreground'
                              }`}
                            >
                              <Checkbox checked={exportDaywiseDays.includes(day)} onCheckedChange={() => toggleItem(setExportDaywiseDays)(day)} />
                              <span>{day.slice(0, 3)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <Label className="text-sm">Class + Section</Label>
                        <CheckDropdown
                          label="Classes"
                          icon={GraduationCap}
                          options={classSectionOpts}
                          selected={exportDaywiseClasses}
                          onToggle={toggleItem(setExportDaywiseClasses)}
                          onSelectAll={selectAllItems(setExportDaywiseClasses, allClassSectionKeys)}
                          allLabel="All Classes"
                          searchable
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Export Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Export Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Page Orientation</Label>
                      <Select value={exportOrientation} onValueChange={(v) => setExportOrientation(v as 'portrait' | 'landscape')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portrait">Portrait (default)</SelectItem>
                          <SelectItem value="landscape">Landscape</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground">
                        {exportOrientation === 'portrait' ? 'Vertical A4 layout — ideal for timetables' : 'Horizontal A4 layout — ideal for wide tables'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Sheets per Page</Label>
                      <Select value={String(exportSheetsPerPage)} onValueChange={(v) => setExportSheetsPerPage(Number(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 sheet per page</SelectItem>
                          <SelectItem value="2">2 sheets per page</SelectItem>
                          <SelectItem value="3">3 sheets per page</SelectItem>
                          <SelectItem value="4">4 sheets per page</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground">
                        Multiple sheets stack vertically on one page
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={exportShowBreaks} onCheckedChange={(v) => setExportShowBreaks(!!v)} />
                      <span className="text-sm">Show Breaks</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={exportShowEmpty} onCheckedChange={(v) => setExportShowEmpty(!!v)} />
                      <span className="text-sm">Show Empty Cells</span>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Customization */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Customization</CardTitle>
                  <CardDescription>Add optional header and footer text to the exported report</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Custom Header</Label>
                    <Textarea
                      placeholder="Optional text for the report header (e.g. school motto, academic year)"
                      value={exportHeaderContent}
                      onChange={(e) => setExportHeaderContent(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">Leave blank to use the default header</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Custom Footer</Label>
                    <Textarea
                      placeholder="Optional text for the report footer (e.g. principal signature, contact info)"
                      value={exportFooterContent}
                      onChange={(e) => setExportFooterContent(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">Leave blank to use the default footer (date + page number)</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Right: Summary + Actions ── */}
            <div className="space-y-4">
              {/* Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Export Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="secondary" className="text-xs">
                        {exportType === 'class' ? 'Class Timetable' : exportType === 'teacher' ? 'Teacher Schedule' : exportType === 'period-count' ? 'Period Count' : 'Daywise Schedule'}
                      </Badge>
                    </div>
                    <Separator />
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {exportSummary}
                    </p>
                    {exportHeaderContent && (
                      <>
                        <Separator />
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Header: </span>
                          <span className="text-xs">{exportHeaderContent}</span>
                        </div>
                      </>
                    )}
                    {exportFooterContent && (
                      <>
                        <Separator />
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Footer: </span>
                          <span className="text-xs">{exportFooterContent}</span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Action buttons */}
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    disabled={isGenerating}
                    onClick={() => handleExport('download')}
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    size="lg"
                    onClick={() => handleExport('print')}
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full gap-2 text-xs"
                    size="sm"
                    onClick={() => {
                      setExportOrientation('portrait');
                      setExportSheetsPerPage(1);
                      setExportShowBreaks(true);
                      setExportShowEmpty(true);
                      setExportHeaderContent('');
                      setExportFooterContent('');
                      setExportSelectedClasses([]);
                      setExportSelectedTeachers([]);
                      setExportSelectedDays([]);
                      setExportDetailMode('show-periods');
                      setExportDaywiseDays([]);
                      setExportDaywiseClasses([]);
                      toast({ title: 'Settings reset', description: 'Export settings have been reset to defaults.' });
                    }}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset Defaults
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ====================================================================
   Iframe-based Print Helper
   ==================================================================== */

function printViaIframe(htmlContent: string, title: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('__report_print_iframe__');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = '__report_print_iframe__';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText =
      'position:fixed;left:-99999px;top:-99999px;width:0;height:0;border:none;opacity:0;pointer-events:none;';
    document.body.appendChild(iframe);

    iframe.srcdoc = htmlContent;

    iframe.onload = () => {
      try {
        const iw = iframe.contentWindow;
        if (!iw) { iframe.remove(); reject(new Error('Iframe contentWindow unavailable')); return; }
        setTimeout(() => {
          try {
            iw.focus();
            iw.print();
            resolve();
          } catch (e) { reject(e); }
          finally {
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
   Extracted Teacher Period Count helpers (shared by Period Count tab
   and PDF Export tab)
   ==================================================================== */

function countNonBreakPeriods(timings: any): number {
  let count = 0;
  for (let p = 1; p <= timings.periodsPerDay; p++) {
    if (!isBreakPeriod(p, timings)) count++;
  }
  return count;
}

interface TeacherPeriodDataItem {
  teacher: { id: string; name: string; shortName: string };
  dayCounts: Record<string, number>;
  dayPeriods: Record<string, { period: number; subject: string; cls: string; sec: string }[]>;
  totalForSelectedDays: number;
}

function computeTeacherPeriodData(
  teachers: any[],
  entries: any[],
  activeDays: string[],
  filteredSelectedDays: string[],
  timings: any,
  subjects: any[],
  classes: any[],
  sections: any[]
): TeacherPeriodDataItem[] {
  return teachers.map((teacher) => {
    const teacherEntries = entries.filter((e: any) => e.teacherId === teacher.id);
    const dayCounts: Record<string, number> = {};
    const dayPeriods: Record<string, { period: number; subject: string; cls: string; sec: string }[]> = {};

    for (const day of activeDays) {
      const dayEntries = teacherEntries.filter((e: any) => e.day === day && !isBreakPeriod(e.period, timings));
      dayCounts[day] = dayEntries.length;
      dayPeriods[day] = dayEntries.map((e: any) => {
        const subj = subjects.find((s: any) => s.id === e.subjectId);
        const cls = classes.find((c: any) => c.id === e.classId);
        const sec = sections.find((s: any) => s.id === e.sectionId);
        return {
          period: e.period,
          subject: subj?.shortName || '?',
          cls: cls?.name || '?',
          sec: sec?.name || '?',
        };
      });
    }

    const totalForSelectedDays = filteredSelectedDays.reduce((sum: number, d: string) => sum + (dayCounts[d] || 0), 0);

    return { teacher, dayCounts, dayPeriods, totalForSelectedDays };
  });
}

function buildPeriodCountReportHtml(params: {
  schoolName: string;
  teacherData: TeacherPeriodDataItem[];
  filteredSelectedDays: string[];
  activeDays: string[];
  orientation: 'portrait' | 'landscape';
  tablesPerPage: number;
  detailMode: DetailMode;
  nonBreakPeriodsCount: number;
  maxPossiblePerTeacher: number;
  teachersCount: number;
  printSettings: PrintSettings;
  timings: any;
}): string {
  const {
    schoolName, teacherData, filteredSelectedDays, activeDays,
    orientation, tablesPerPage, detailMode,
    nonBreakPeriodsCount, maxPossiblePerTeacher, teachersCount,
    printSettings: s, timings,
  } = params;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const isLandscape = orientation === 'landscape';

  const fontSize = tablesPerPage === 1 ? (isLandscape ? '8px' : '7px') : '6px';
  const headerFontSize = tablesPerPage === 1 ? (isLandscape ? '7px' : '6.5px') : '5.5px';
  const cellPad = tablesPerPage === 1 ? '2px 3px' : '1px 2px';

  const sorted = [...teacherData].sort((a, b) => b.totalForSelectedDays - a.totalForSelectedDays);

  const daysLabel = filteredSelectedDays.length === activeDays.length
    ? 'All Days'
    : filteredSelectedDays.join(', ');

  const customHeaderHtml = s.headerContent
    ? `<div class="custom-header">${esc(s.headerContent)}</div>`
    : '';
  const customFooterHtml = s.footerContent
    ? `<div class="custom-footer">${esc(s.footerContent)}</div>`
    : '';

  let tablesHtml = '';

  if (tablesPerPage === 1) {
    let tableRows = '';
    sorted.forEach((td, idx) => {
      const t = td.teacher;
      const rowBg = idx % 2 === 0 ? 'background:#FFFFFF;' : 'background:#F8F9FA;';
      tableRows += `<tr style="${rowBg}">
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

      const isFirstOnPage = ci % tablesPerPage === 0;
      const chunkHeaderHtml = isFirstOnPage
        ? `<div class="report-header"><div class="school-name">${esc(schoolName)}</div><div class="report-title">Teacher Period Count Report</div><div class="report-subtitle">${esc(daysLabel)} | Max ${maxPossiblePerTeacher} periods/teacher | ${teachersCount} teachers</div>${ci === 0 ? customHeaderHtml : ''}</div>`
        : `<div class="sheet-label-pc">Part ${ci + 1} — ${esc(daysLabel)}</div>`;

      tablesHtml += `
        <div class="table-chunk sheet-slot" style="width:100%;display:block;">
          ${chunkHeaderHtml}
          <table class="pc-table">
            <thead><tr>
              <th class="th-sno">#</th>
              <th class="th-name">Teacher</th>`;
      for (const day of filteredSelectedDays) {
        tablesHtml += `<th class="th-day">${esc(day.slice(0, 3))}</th>`;
      }
      tablesHtml += `<th class="th-total">Total</th>`;
      if (detailMode === 'show-periods') {
        tablesHtml += '<th class="th-detail">Periods</th>';
      }
      tablesHtml += `</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>`;
    });
  }

  const bodyClass = tablesPerPage > 1 ? ' class="sheets-multi-pc"' : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: A4 ${isLandscape ? 'landscape' : 'portrait'};
    margin: 10mm 10mm 14mm 10mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: ${fontSize};
    line-height: 1.45;
    color: #111827;
    background: #fff;
  }
  ${tablesPerPage > 1 ? `
  body.sheets-multi-pc {
    display: flex;
    flex-direction: column;
    gap: 0;
    height: 100vh;
    overflow: hidden;
  }
  body.sheets-multi-pc .sheet-slot {
    flex: 0 0 calc(100vh / ${tablesPerPage});
    max-height: calc(100vh / ${tablesPerPage});
    min-height: 0;
    page-break-inside: avoid;
    break-inside: avoid;
    border: 1px solid #D4D4D8;
    border-radius: 3px;
    padding: 4px 6px;
    margin-bottom: 3px;
    overflow: hidden;
    contain: layout paint;
  }
  body.sheets-multi-pc .sheet-slot:nth-child(${tablesPerPage}n) {
    page-break-after: always;
    break-after: page;
    margin-bottom: 0;
  }
  body.sheets-multi-pc .sheet-slot:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  ` : ''}

  /* ── Header ── */
  .report-header {
    text-align: center;
    padding-bottom: 6px;
    margin-bottom: 8px;
    border-bottom: 2px solid #111827;
    position: relative;
  }
  .report-header::after {
    content: '';
    display: block;
    margin-top: 3px;
    height: 1px;
    background: #D4D4D8;
  }
  .school-name {
    font-size: ${isLandscape ? '17px' : '15px'};
    font-weight: 800;
    color: #111827;
    letter-spacing: 0.5px;
    font-family: Georgia, 'Times New Roman', serif;
  }
  .report-title {
    font-size: ${isLandscape ? '12px' : '11px'};
    font-weight: 600;
    color: #374151;
    margin-top: 2px;
  }
  .report-subtitle {
    font-size: ${headerFontSize};
    color: #6B7280;
    margin-top: 1px;
  }
  .custom-header {
    text-align: center;
    font-size: ${headerFontSize};
    color: #6B7280;
    font-style: italic;
    margin-bottom: 4px;
  }
  .custom-footer {
    text-align: center;
    font-size: ${headerFontSize};
    color: #6B7280;
    font-style: italic;
    margin-top: 4px;
  }

  /* ── Period Count Table ── */
  .pc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: ${fontSize};
    table-layout: fixed;
    border: 1px solid #111827;
  }
  .pc-table th, .pc-table td {
    border: 0.5px solid #D4D4D8;
    padding: ${cellPad};
    text-align: center;
    vertical-align: middle;
  }

  /* ── Table Headers ── */
  .th-sno {
    width: 22px;
    background: #374151;
    color: #fff;
    font-size: ${headerFontSize};
    font-weight: 600;
  }
  .th-name {
    background: #111827;
    color: #fff;
    font-size: ${headerFontSize};
    font-weight: 600;
    text-align: left !important;
    width: auto;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .th-short {
    background: #111827;
    color: #fff;
    font-size: ${headerFontSize};
    font-weight: 600;
    width: 40px;
  }
  .th-day {
    background: #111827;
    color: #fff;
    font-size: ${headerFontSize};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .th-total {
    background: #111827;
    color: #fff;
    font-size: ${headerFontSize};
    font-weight: 700;
    width: 36px;
  }
  .th-detail {
    background: #111827;
    color: #fff;
    font-size: ${headerFontSize};
    font-weight: 600;
    text-align: left !important;
  }

  /* ── Data cells ── */
  .td-sno {
    font-size: ${headerFontSize};
    color: #9CA3AF;
    background: #F3F4F6;
  }
  .td-name {
    text-align: left !important;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #111827;
    letter-spacing: 0.2px;
  }
  .td-short {
    font-weight: 600;
    font-size: ${fontSize};
    background: #F3F4F6;
    color: #374151;
  }
  .td-num {
    font-weight: 700;
    font-size: ${fontSize};
    letter-spacing: 0.3px;
  }
  .td-num.zero {
    background: #F3F4F6;
    color: #9CA3AF;
    font-weight: 800;
  }
  .td-num.full {
    background: #E5E7EB;
    color: #111827;
  }
  .td-total {
    background: #F3F4F6;
    font-size: ${fontSize};
    font-weight: 800;
    color: #111827;
    border-left: 1.5px solid #111827 !important;
  }
  .td-detail {
    text-align: left !important;
    font-size: ${headerFontSize};
    color: #6B7280;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: ${isLandscape ? '120px' : '80px'};
    font-style: italic;
  }

  /* ── Alternating rows ── */
  .pc-table tbody tr:nth-child(even) .td-name,
  .pc-table tbody tr:nth-child(even) .td-num,
  .pc-table tbody tr:nth-child(even) .td-detail { background: #FAFAFA; }
  .pc-table tbody tr:nth-child(even) .td-sno,
  .pc-table tbody tr:nth-child(even) .td-short { background: #E5E7EB; }

  .table-chunk { padding: 0 4px; }
  .chunk-title { font-size: ${headerFontSize}; font-weight: 600; text-align: center; margin-bottom: 3px; color: #111827; }

  .sheet-slot { width: 100%; page-break-inside: avoid; break-inside: avoid; }
  .sheet-label-pc {
    text-align: center;
    padding: 2px 0 3px;
    margin-bottom: 3px;
    border-bottom: 1.5px solid #111827;
    font-size: ${headerFontSize};
    font-weight: 600;
    color: #111827;
    letter-spacing: 0.5px;
    font-family: Georgia, 'Times New Roman', serif;
  }

  /* ── Summary bar ── */
  .summary-bar { display: flex; gap: 14px; justify-content: center; margin-top: 8px; flex-wrap: wrap; }
  .summary-item {
    text-align: center;
    padding: 4px 12px;
    background: #F9FAFB;
    border-radius: 4px;
    border: 1px solid #D4D4D8;
    border-top: 2px solid #111827;
  }
  .summary-num {
    display: block;
    font-size: 14px;
    font-weight: 800;
    color: #111827;
    font-family: Georgia, serif;
  }
  .summary-label {
    display: block;
    font-size: ${headerFontSize};
    color: #6B7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .report-footer {
    margin-top: 10px;
    padding-top: 6px;
    border-top: 1px solid #D4D4D8;
    display: flex;
    justify-content: space-between;
    font-size: ${headerFontSize};
    color: #9CA3AF;
  }
  .watermark { font-size: 7px; color: #D4D4D8; font-style: italic; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .pc-table { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body${bodyClass}>
  ${tablesPerPage > 1 ? '' : `<div class="report-header">
    <div class="school-name">${esc(schoolName)}</div>
    <div class="report-title">Teacher Period Count Report</div>
    <div class="report-subtitle">${esc(daysLabel)} | Max ${maxPossiblePerTeacher} periods/teacher | ${teachersCount} teachers</div>
    ${customHeaderHtml}
  </div>`}

  ${tablesHtml}

  <div class="summary-bar">
    <div class="summary-item"><span class="summary-num">${teachersCount}</span><span class="summary-label">Teachers</span></div>
    <div class="summary-item"><span class="summary-num">${filteredSelectedDays.length}</span><span class="summary-label">Days</span></div>
    <div class="summary-item"><span class="summary-num">${maxPossiblePerTeacher}</span><span class="summary-label">Max Periods</span></div>
    <div class="summary-item"><span class="summary-num">${sorted.reduce((sum, t) => sum + t.totalForSelectedDays, 0)}</span><span class="summary-label">Total Assigned</span></div>
  </div>

  ${customFooterHtml}
  <div class="report-footer">
    <span>${esc(today)}</span>
    <span class="watermark">Generated by TimetableWiz</span>
    <span>Page <span class="page-num"></span></span>
  </div>
</body>
</html>`;
}

/* ====================================================================
   TeacherPeriodCountReport — View-only (no print/pdf buttons)
   ==================================================================== */

function TeacherPeriodCountReport() {
  const { entries, teachers, timings, classes, sections, subjects } = useTimetableStore();
  const reportRef = useRef<HTMLDivElement>(null);

  const activeDays = timings.days;
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [detailMode, setDetailMode] = useState<DetailMode>('show-periods');

  const toggleDay = (day: string) => {
    setSelectedDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  const filteredSelectedDays = activeDays.filter((d) => selectedDays.includes(d));

  const teacherData = useMemo(() => {
    return computeTeacherPeriodData(teachers, entries, activeDays, filteredSelectedDays, timings, subjects, classes, sections);
  }, [teachers, entries, activeDays, filteredSelectedDays, timings, subjects, classes, sections]);

  const nonBreakPeriodsCount = useMemo(() => countNonBreakPeriods(timings), [timings]);
  const maxPossiblePerTeacher = filteredSelectedDays.length * nonBreakPeriodsCount;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Teacher Period Count
          </CardTitle>
          <CardDescription>Calculate teacher workload distribution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                      ? 'bg-[#1B2A4A10] border-[#1B2A4A30] text-[#1B2A4A] font-medium'
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
                      ? 'bg-[#1B2A4A10] border-[#1B2A4A30]'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className={`text-sm font-medium ${detailMode === mode ? 'text-[#1B2A4A]' : ''}`}>{label}</div>
                  <div className="text-[10px] text-muted-foreground">{desc}</div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedDays.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Select days above to preview the period count report</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Choose one or more working days to calculate teacher workload</p>
          </CardContent>
        </Card>
      )}

      {selectedDays.length > 0 && (
        <Card ref={reportRef}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg">Preview</CardTitle>
                <CardDescription>
                  {filteredSelectedDays.length} day{filteredSelectedDays.length !== 1 ? 's' : ''} selected | {teachers.length} teachers
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {teachers.length} teachers
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border px-2 py-1.5 text-left text-xs font-semibold w-8 bg-[#1B2A4A] text-white">#</th>
                    <th className="border px-2 py-1.5 text-left text-xs font-semibold bg-[#1B2A4A] text-white">Teacher</th>
                    <th className="border px-2 py-1.5 text-center text-xs font-semibold bg-[#1B2A4A] text-white">Code</th>
                    {filteredSelectedDays.map((day) => (
                      <th key={day} className="border px-2 py-1.5 text-center text-xs font-semibold bg-[#1B2A4A] text-white">{day.slice(0, 3)}</th>
                    ))}
                    <th className="border px-2 py-1.5 text-center text-xs font-semibold bg-[#1B2A4A] text-white">Total</th>
                    {detailMode === 'show-periods' && (
                      <th className="border px-2 py-1.5 text-left text-xs font-semibold bg-[#1B2A4A] text-white">Periods</th>
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
                      <td className="border px-2 py-1 text-center text-sm font-bold bg-[#F0F5FF] text-[#1B2A4A]">
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
                    <td className="border px-2 py-1.5 text-center text-xs bg-[#E8EAF6] text-[#1B2A4A]">
                      {teacherData.reduce((sum, td) => sum + td.totalForSelectedDays, 0)}
                    </td>
                    {detailMode === 'show-periods' && <td className="border px-2 py-1.5" />}
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex flex-wrap gap-3 mt-4 justify-center">
              <div className="text-center px-4 py-2 bg-muted rounded-lg border">
                <div className="text-lg font-bold text-[#1B2A4A]">{teachers.length}</div>
                <div className="text-[10px] text-muted-foreground">Teachers</div>
              </div>
              <div className="text-center px-4 py-2 bg-muted rounded-lg border">
                <div className="text-lg font-bold text-[#1B2A4A]">{filteredSelectedDays.length}</div>
                <div className="text-[10px] text-muted-foreground">Days</div>
              </div>
              <div className="text-center px-4 py-2 bg-muted rounded-lg border">
                <div className="text-lg font-bold text-[#1B2A4A]">{maxPossiblePerTeacher}</div>
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

/* ====================================================================
   Class Timetable Report — View-only (no print/pdf buttons)
   ==================================================================== */

function ClassTimetableReport({ classId, sectionId, showBreaks, showEmpty }: { classId: string; sectionId: string; showBreaks: boolean; showEmpty: boolean }) {
  const { entries, teachers, subjects, timings, classes, sections } = useTimetableStore();

  const activeDays = timings.days;
  const cls = classes.find((c) => c.id === classId);
  const sec = sections.find((s) => s.id === sectionId);

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

  const colCount = activeDays.length + 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div>
          <CardTitle className="text-lg">{cls?.name} — {sec?.name}</CardTitle>
          <CardDescription>Weekly timetable report</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th className="w-[72px] border border-border bg-[#1B2A4A] text-white px-1.5 py-1.5 text-center text-[11px] font-semibold">Period</th>
                {activeDays.map((day) => (
                  <th key={day} className="border border-border bg-[#1B2A4A] text-white px-1 py-1.5 text-center text-[11px] font-semibold">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visiblePeriods.map((period) => {
                const isBreak = isBreakPeriod(period, timings);
                const time = getPeriodTime(period, timings);
                if (isBreak) {
                  return (
                    <tr key={`brk-${period}`} className="bg-amber-50 dark:bg-amber-950/20">
                      <td colSpan={colCount} className="border border-border px-2 py-1 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400">
                          <Coffee className="h-3 w-3" />
                          <span className="text-[11px] font-medium">{getPeriodLabel(period, timings)}</span>
                          <span className="text-[10px] text-muted-foreground">({time})</span>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={`row-${period}`}>
                    <td className="border border-border bg-muted/60 px-1.5 py-1 text-center align-middle">
                      <div className="flex flex-col items-center leading-tight">
                        <span className="text-[11px] font-semibold">{getPeriodLabel(period, timings)}</span>
                        <span className="text-[9px] text-muted-foreground">{time}</span>
                      </div>
                    </td>
                    {activeDays.map((day) => {
                      const entry = entries.find((e) => e.day === day && e.period === period && e.classId === classId && e.sectionId === sectionId);
                      const teacher = entry ? teachers.find((t) => t.id === entry.teacherId) : null;
                      const subject = entry ? subjects.find((s) => s.id === entry.subjectId) : null;
                      const colors = entry ? getSubjectColor(entry.subjectId) : null;
                      return (
                        <td key={`${day}-${period}`} className={`border border-border px-1 py-1.5 text-center align-middle min-h-[40px] ${entry ? `${colors?.bg || ''} ${colors?.border || ''}` : 'bg-card'}`}>
                          {entry ? (
                            <div className="flex flex-col items-center leading-tight">
                              <span className={`text-[11px] font-semibold ${colors?.text || ''}`}>{subject?.shortName || '?'}</span>
                              <span className="text-[9px] text-muted-foreground">{teacher?.name}</span>
                            </div>
                          ) : showEmpty ? (
                            <span className="text-[10px] text-muted-foreground/30">—</span>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ====================================================================
   Teacher Schedule Report — View-only (no print/pdf buttons)
   ==================================================================== */

function TeacherScheduleReport({ teacherId, showBreaks, showEmpty }: { teacherId: string; showBreaks: boolean; showEmpty: boolean }) {
  const { entries, classes, sections, subjects, timings, teachers } = useTimetableStore();

  const activeDays = timings.days;
  const teacher = teachers.find((t) => t.id === teacherId);

  const teacherEntries = useMemo(() => entries.filter((e) => e.teacherId === teacherId), [entries, teacherId]);

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

  const colCount = activeDays.length + 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div>
          <CardTitle className="text-lg flex items-center gap-2"><UserCheck className="h-4 w-4" />{teacher?.name}</CardTitle>
          <CardDescription>Weekly teaching schedule</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th className="w-[72px] border border-border bg-[#1B2A4A] text-white px-1.5 py-1.5 text-center text-[11px] font-semibold">Period</th>
                {activeDays.map((day) => (
                  <th key={day} className="border border-border bg-[#1B2A4A] text-white px-1 py-1.5 text-center text-[11px] font-semibold">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visiblePeriods.map((period) => {
                const isBreak = isBreakPeriod(period, timings);
                const time = getPeriodTime(period, timings);
                if (isBreak) {
                  return (
                    <tr key={`brk-${period}`} className="bg-amber-50 dark:bg-amber-950/20">
                      <td colSpan={colCount} className="border border-border px-2 py-1 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400">
                          <Coffee className="h-3 w-3" />
                          <span className="text-[11px] font-medium">{getPeriodLabel(period, timings)}</span>
                          <span className="text-[10px] text-muted-foreground">({time})</span>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={`row-${period}`}>
                    <td className="border border-border bg-muted/60 px-1.5 py-1 text-center align-middle">
                      <div className="flex flex-col items-center leading-tight">
                        <span className="text-[11px] font-semibold">{getPeriodLabel(period, timings)}</span>
                        <span className="text-[9px] text-muted-foreground">{time}</span>
                      </div>
                    </td>
                    {activeDays.map((day) => {
                      const entry = teacherEntries.find((e) => e.day === day && e.period === period);
                      const subject = entry ? subjects.find((s) => s.id === entry.subjectId) : null;
                      const cls = entry ? classes.find((c) => c.id === entry.classId) : null;
                      const sec = entry ? sections.find((s) => s.id === entry.sectionId) : null;
                      const colors = entry ? getSubjectColor(entry.subjectId) : null;
                      return (
                        <td key={`${day}-${period}`} className={`border border-border px-1 py-1.5 text-center align-middle min-h-[40px] ${entry ? `${colors?.bg || ''} ${colors?.border || ''}` : 'bg-card'}`}>
                          {entry ? (
                            <div className="flex flex-col items-center leading-tight">
                              <span className={`text-[11px] font-semibold ${colors?.text || ''}`}>{subject?.shortName || '?'}</span>
                              <span className="text-[9px] text-muted-foreground">{cls?.name}-{sec?.name}</span>
                            </div>
                          ) : showEmpty ? (
                            <span className="text-[10px] text-muted-foreground/30">—</span>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ====================================================================
   Daywise Schedule Report — View-only (no print/pdf buttons)
   ==================================================================== */

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
  const { entries, teachers, subjects, timings } = useTimetableStore();

  const activeDays = timings.days;
  const filteredSelectedDays = activeDays.filter((d) => selectedDays.includes(d));

  const visibleCombos = useMemo(() => {
    if (selectedClassSectionKeys.length === 0) return classSectionOpts;
    return classSectionOpts.filter((o) => selectedClassSectionKeys.includes(o.value));
  }, [selectedClassSectionKeys, classSectionOpts]);

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

  const colCount = visibleCombos.length + 1;

  return (
    <div className="space-y-4">
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
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th className="w-[72px] border border-border bg-[#1B2A4A] text-white px-1.5 py-1.5 text-center text-[11px] font-semibold">Period</th>
                    {visibleCombos.map((combo) => (
                      <th key={combo.value} className="border border-border bg-[#1B2A4A] text-white px-1 py-1.5 text-center text-[11px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{combo.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visiblePeriods.map((period) => {
                    const isBreak = isBreakPeriod(period, timings);
                    const time = getPeriodTime(period, timings);
                    if (isBreak) {
                      return (
                        <tr key={`brk-${day}-${period}`} className="bg-amber-50 dark:bg-amber-950/20">
                          <td colSpan={colCount} className="border border-border px-2 py-1 text-center">
                            <div className="flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400">
                              <Coffee className="h-3 w-3" />
                              <span className="text-[11px] font-medium">{getPeriodLabel(period, timings)}</span>
                              <span className="text-[10px] text-muted-foreground">({time})</span>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={`row-${day}-${period}`}>
                        <td className="border border-border bg-muted/60 px-1.5 py-1 text-center align-middle">
                          <div className="flex flex-col items-center leading-tight">
                            <span className="text-[11px] font-semibold">{getPeriodLabel(period, timings)}</span>
                            <span className="text-[9px] text-muted-foreground">{time}</span>
                          </div>
                        </td>
                        {visibleCombos.map((combo) => {
                          const entry = entries.find((e) => e.day === day && e.period === period && e.classId === combo.classId && e.sectionId === combo.sectionId);
                          const teacher = entry ? teachers.find((t) => t.id === entry.teacherId) : null;
                          const subject = entry ? subjects.find((s) => s.id === entry.subjectId) : null;
                          const colors = entry ? getSubjectColor(entry.subjectId) : null;
                          return (
                            <td key={`${combo.value}-${period}`} className={`border border-border px-1 py-1.5 text-center align-middle min-h-[40px] ${entry ? `${colors?.bg || ''} ${colors?.border || ''}` : 'bg-card'}`}>
                              {entry ? (
                                <div className="flex flex-col items-center leading-tight">
                                  <span className={`text-[11px] font-semibold ${colors?.text || ''}`}>{subject?.shortName || '?'}</span>
                                  <span className="text-[9px] text-muted-foreground">{teacher?.name}</span>
                                </div>
                              ) : showEmpty ? (
                                <span className="text-[10px] text-muted-foreground/30">—</span>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ====================================================================
   Inline HTML builders for PDF/Print
   ==================================================================== */

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---------- Shared professional CSS for timetable grid reports ---------- */

/* Clean grayscale palette for subject cells — print-friendly high contrast */
const SUBJECT_COLORS: { bg: string; fg: string; border: string }[] = [
  { bg: '#F3F4F6', fg: '#111827', border: '#9CA3AF' },  // Cool Gray
  { bg: '#F0F0F0', fg: '#1F2937', border: '#A1A1AA' },  // Neutral Gray
  { bg: '#EDEDED', fg: '#18181B', border: '#A8A29E' },  // Warm Gray
  { bg: '#F5F5F4', fg: '#1C1917', border: '#D6D3D1' },  // Stone
  { bg: '#EEEEF0', fg: '#1E1B2E', border: '#8B8B96' },  // Slate
  { bg: '#F1F1F3', fg: '#27272A', border: '#A3A3AD' },  // Zinc
  { bg: '#EFF0F2', fg: '#171717', border: '#9E9EA8' },  // Dark Gray
  { bg: '#F4F4F5', fg: '#09090B', border: '#B0B0B8' },  // Light Zinc
  { bg: '#ECECEE', fg: '#1A1A2E', border: '#90909A' },  // Graphite
  { bg: '#F2F2F4', fg: '#2D2D3A', border: '#ABABAF' },  // Silver
  { bg: '#F0EDE8', fg: '#292524', border: '#C8C2B8' },  // Warm Stone
  { bg: '#EFEFEF', fg: '#1A1A1A', border: '#A0A0A0' },  // Pure Gray
  { bg: '#F6F6F6', fg: '#0C0C0C', border: '#B8B8B8' },  // Light Gray
  { bg: '#EAEAEF', fg: '#1E1E2E', border: '#8585A0' },  // Muted Blue-Gray
  { bg: '#F3F3F3', fg: '#141414', border: '#ACACAC' },  // Medium Gray
  { bg: '#E8E9EB', fg: '#1F1F23', border: '#8E8E96' },  // Charcoal Tint
];

function getSubjectPrintColor(subjectId: string): { bg: string; fg: string; border: string } {
  let hash = 0;
  for (let i = 0; i < subjectId.length; i++) {
    hash = ((hash << 5) - hash) + subjectId.charCodeAt(i);
    hash |= 0;
  }
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

function buildTimetableCss(isLandscape: boolean, sheetsPerPage: number): string {
  const nUpCss = sheetsPerPage > 1 ? `
  body.sheets-multi {
    display: flex;
    flex-direction: column;
    gap: 0;
    height: 100vh;
    overflow: hidden;
  }
  body.sheets-multi .sheet-slot {
    flex: 0 0 calc(100vh / ${sheetsPerPage});
    max-height: calc(100vh / ${sheetsPerPage});
    min-height: 0;
    page-break-inside: avoid;
    break-inside: avoid;
    border: 1px solid #D4D4D8;
    border-radius: 3px;
    padding: 6px 8px;
    margin-bottom: 3px;
    overflow: hidden;
    contain: layout paint;
  }
  body.sheets-multi .sheet-slot:nth-child(${sheetsPerPage}n) {
    page-break-after: always;
    break-after: page;
    margin-bottom: 0;
  }
  body.sheets-multi .sheet-slot:last-child {
    page-break-after: auto;
    break-after: auto;
  }` : '\n  body.sheets-multi .sheet-slot { width: 100%; }';

  return `
  @page {
    size: A4 ${isLandscape ? 'landscape' : 'portrait'};
    margin: 10mm 10mm 14mm 10mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }

  /* ── Fonts ── */
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 9.5px;
    line-height: 1.45;
    color: #111827;
    background: #fff;
  }

  ${nUpCss}

  /* ── Compact headers in multi-sheet mode ── */
  body.sheets-multi .page-header {
    padding-bottom: 2px;
    margin-bottom: 3px;
  }
  body.sheets-multi .page-header .header-bar {
    height: 1.5px;
    margin-bottom: 2px;
  }
  body.sheets-multi .page-header .school-name { font-size: 9px; letter-spacing: 0.3px; }
  body.sheets-multi .page-header .report-title { font-size: 7px; margin-top: 0; }
  body.sheets-multi .page-header .report-sub { font-size: 6px; margin-top: 0; }
  body.sheets-multi .custom-header { font-size: 6px; margin-top: 1px; }
  body.sheets-multi table.tt { font-size: 6.5px; }
  body.sheets-multi table.tt th { font-size: 6px; letter-spacing: 0.4px; }
  body.sheets-multi table.tt td { padding: 1px 1px; }
  body.sheets-multi .tp { width: 44px; min-width: 44px; font-size: 6px; }
  body.sheets-multi .pl { font-size: 6px; }
  body.sheets-multi .tt-time { font-size: 5px; }
  body.sheets-multi .tf b { font-size: 6.5px; }
  body.sheets-multi .tn { font-size: 5px; }
  body.sheets-multi .sheet-label { padding: 1px 0 2px; margin-bottom: 2px; }
  body.sheets-multi .sheet-label-title { font-size: 7px; }
  body.sheets-multi .sheet-label-sub { font-size: 5.5px; }

  /* ── Page header ── */
  .page-header {
    text-align: center;
    padding-bottom: 6px;
    margin-bottom: 8px;
  }
  .page-header .header-bar {
    width: 100%;
    height: 2px;
    background: #111827;
    margin-bottom: 6px;
  }
  .page-header .school-name {
    font-size: 17px;
    font-weight: 800;
    color: #111827;
    letter-spacing: 0.5px;
    font-family: Georgia, 'Times New Roman', 'Noto Serif', serif;
  }
  .page-header .report-title {
    font-size: 10.5px;
    font-weight: 600;
    color: #374151;
    margin-top: 2px;
  }
  .page-header .report-sub {
    font-size: 9px;
    color: #6B7280;
    margin-top: 1px;
  }
  .custom-header {
    text-align: center;
    font-size: 8px;
    color: #6B7280;
    font-style: italic;
    margin-top: 3px;
  }

  /* ── Compact sheet label ── */
  .sheet-label {
    text-align: center;
    padding: 2px 0 4px;
    margin-bottom: 4px;
    border-bottom: 1.5px solid #111827;
  }
  .sheet-label-title {
    font-size: 10px;
    font-weight: 700;
    color: #111827;
    letter-spacing: 0.5px;
    font-family: Georgia, 'Times New Roman', serif;
  }
  .sheet-label-sub {
    font-size: 7.5px;
    color: #6B7280;
  }

  /* ── Footer ── */
  .page-footer {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    display: table;
    width: 100%;
    border-top: 1px solid #D4D4D8;
    padding-top: 3px;
    font-size: 6.5px;
    color: #9CA3AF;
  }
  .page-footer .f-left   { display: table-cell; text-align: left;   width: 33%; padding: 0 6px; }
  .page-footer .f-center { display: table-cell; text-align: center; width: 34%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .page-footer .f-right  { display: table-cell; text-align: right;  width: 33%; padding: 0 6px; }
  .watermark { color: #D4D4D8; font-style: italic; letter-spacing: 0.3px; }
  .custom-footer {
    text-align: center;
    font-size: 7.5px;
    color: #6B7280;
    font-style: italic;
    margin-top: 6px;
  }

  /* ── Timetable grid ── */
  table.tt {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #111827;
  }
  table.tt th, table.tt td {
    border: 0.5px solid #D4D4D8;
    padding: 3px 2px;
    text-align: center;
    vertical-align: middle;
  }

  /* ── Table header row ── */
  table.tt th {
    background: #111827;
    font-size: 7.5px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    padding: 4px 3px;
  }
  table.tt th:first-child {
    background: #374151;
  }

  /* ── Period label column ── */
  .tp {
    background: #F3F4F6 !important;
    font-size: 7.5px;
    width: 66px;
    min-width: 66px;
    border-right: 1px solid #9CA3AF !important;
  }
  .pl {
    display: block;
    font-weight: 700;
    color: #111827;
    font-size: 7.5px;
  }
  .tt-time {
    display: block;
    font-size: 5.5px;
    color: #6B7280;
    margin-top: 0.5px;
  }

  /* ── Subject cells (filled) ── */
  .tf {
    font-size: 8.5px;
  }
  .tf b {
    font-weight: 700;
    letter-spacing: 0.2px;
  }
  .tn {
    display: block;
    font-size: 6px;
    color: #4B5563;
    margin-top: 0.5px;
    font-weight: 400;
    font-style: italic;
    opacity: 0.75;
  }

  /* ── Break rows ── */
  .tb {
    font-size: 8px;
    color: #374151;
    background: #F3F4F6 !important;
    font-style: italic;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  .brk td {
    background: #F3F4F6 !important;
    border-color: #D4D4D8 !important;
  }

  /* ── Empty cells ── */
  .te { color: #D4D4D8; }

  /* ── Alternating row striping ── */
  table.tt tbody tr:nth-child(even) td.te,
  table.tt tbody tr:nth-child(even) td.tf { background: #FAFAFA; }
  table.tt tbody tr:nth-child(even) td.tp { background: #E5E7EB !important; }

  /* ── Summary stats ── */
  .sr { display: flex; gap: 10px; margin-bottom: 10px; justify-content: center; }
  .si {
    text-align: center;
    padding: 6px 16px;
    background: #F9FAFB;
    border-radius: 4px;
    border: 1px solid #D4D4D8;
    border-top: 2px solid #111827;
  }
  .sn2 { display: block; font-size: 18px; font-weight: 800; color: #111827; font-family: Georgia, serif; }
  .sl { display: block; font-size: 7px; color: #6B7280; margin-top: 1px; text-transform: uppercase; letter-spacing: 0.5px; }

  /* ── Cover page ── */
  .cover-page { text-align: center; padding: 40px 20px; page-break-after: always; break-after: page; }
  .cover-page .cover-school { font-size: 26px; font-weight: 800; color: #111827; margin-bottom: 8px; letter-spacing: 0.5px; font-family: Georgia, serif; }
  .cover-page .cover-title { font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 6px; }
  .cover-page .cover-date { font-size: 11px; color: #9CA3AF; margin-bottom: 20px; }
  .cover-page .cover-list { text-align: left; display: inline-block; max-width: 400px; }
  .cover-page .cover-item { padding: 4px 0; font-size: 10px; color: #6B7280; border-bottom: 1px solid #E5E7EB; }

  /* ── Day blocks ── */
  .db { margin-bottom: 8px; border: 1px solid #D4D4D8; overflow: hidden; border-left: 3px solid #111827; }
  .dh {
    background: #111827;
    padding: 5px 8px;
    font-weight: 700;
    font-size: 9.5px;
    color: #fff;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .fc { font-weight: 400; font-size: 7px; color: #9CA3AF; margin-left: 5px; text-transform: none; letter-spacing: 0; }
  .di { display: flex; flex-wrap: wrap; gap: 5px; padding: 6px 8px; }
  .fi {
    padding: 3px 8px;
    background: #F3F4F6;
    border: 1px solid #D4D4D8;
    border-radius: 3px;
    font-size: 7.5px;
    font-weight: 600;
    color: #111827;
    letter-spacing: 0.3px;
  }

  /* ── Individual timetable page ── */
  .timetable-page { padding-bottom: 12px; }
  .timetable-page:last-child { padding-bottom: 0; }

  /* ── Print optimization ── */
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page-footer { position: fixed; bottom: 0; }
    table.tt { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }`;
}

/* ---------- Combined Class Timetable HTML ---------- */

function buildCombinedClassTimetableHtml(
  schoolName: string,
  combos: { value: string; label: string; classId: string; sectionId: string }[],
  store: ReturnType<typeof useTimetableStore.getState>,
  showBreaks: boolean,
  showEmpty: boolean,
  printSettings: PrintSettings
): string {
  const s = printSettings;
  const isLandscape = s.orientation === 'landscape';
  const { timings, entries, teachers, classes, sections, subjects } = store;
  const activeDays = timings.days;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const reportTitle = 'Class Timetable Report';

  let timetablesHtml = '';
  for (let idx = 0; idx < combos.length; idx++) {
    const combo = combos[idx];
    const cls = classes.find((c) => c.id === combo.classId);
    const sec = sections.find((s) => s.id === combo.sectionId);
    const filteredEntries = entries.filter((e) => e.classId === combo.classId && e.sectionId === combo.sectionId);
    const subtitle = `${cls?.name || ''} — ${sec?.name || ''}`;
    const isFirstOnPage = idx % s.sheetsPerPage === 0;
    const customHeaderHtml = s.headerContent && isFirstOnPage ? `<div class="custom-header">${esc(s.headerContent)}</div>` : '';

    const getS = (id: string) => subjects.find((s) => s.id === id);
    const getT = (id: string) => teachers.find((t) => t.id === id);

    let rows = '';
    for (let p = 1; p <= timings.periodsPerDay; p++) {
      const isBreak = isBreakPeriod(p, timings);
      if (isBreak && !showBreaks) continue;
      const time = getPeriodTime(p, timings);
      const label = getPeriodLabel(p, timings);
      const rowClass = isBreak ? ' class="brk"' : '';
      rows += `<tr${rowClass}><td class="tp"><span class="pl">${esc(label)}</span><span class="tt-time">${esc(time)}</span></td>`;
      if (isBreak) {
        rows += `<td class="tb" colspan="${activeDays.length}" style="text-align:center;">&#9749; Break</td>`;
        rows += '</tr>';
        continue;
      }
      for (const day of activeDays) {
        const entry = filteredEntries.find((e) => e.day === day && e.period === p);
        if (entry) {
          const subj = getS(entry.subjectId);
          const tchr = getT(entry.teacherId);
          const sc = getSubjectPrintColor(entry.subjectId);
          rows += `<td class="tf" style="background:${sc.bg};color:${sc.fg};border-left:2px solid ${sc.border};"><b>${esc(subj?.shortName || '?')}</b><span class="tn" style="color:${sc.fg};opacity:0.7;">${esc(tchr?.name || '?')}</span></td>`;
        } else if (showEmpty) {
          rows += '<td class="te">\u2014</td>';
        } else {
          rows += '<td></td>';
        }
      }
      rows += '</tr>';
    }

    if (s.sheetsPerPage > 1) {
      // Multi-sheet mode: only generate the correct header type for this position
      const headerHtml = isFirstOnPage
        ? `<div class="page-header"><div class="header-bar"></div><div class="school-name">${esc(schoolName)}</div><div class="report-title">${esc(reportTitle)}</div><div class="report-sub">${esc(subtitle)}</div>${customHeaderHtml}</div>`
        : `<div class="sheet-label"><div class="sheet-label-title">${esc(reportTitle)}</div><div class="sheet-label-sub">${esc(subtitle)}</div></div>`;
      timetablesHtml += `
    <div class="sheet-slot">
      ${headerHtml}
      <table class="tt">
        <thead><tr><th>Day / Period</th>${activeDays.map((d: string) => `<th>${esc(d)}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
    } else {
      // Single sheet per page — each timetable on its own page
      timetablesHtml += `
    <div class="timetable-page">
      <div class="page-header">
        <div class="header-bar"></div>
        <div class="school-name">${esc(schoolName)}</div>
        <div class="report-title">${esc(reportTitle)}</div>
        <div class="report-sub">${esc(subtitle)}</div>
        ${customHeaderHtml}
      </div>
      <table class="tt">
        <thead><tr><th>Day / Period</th>${activeDays.map((d: string) => `<th>${esc(d)}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
    }
  }

  const customFooterHtml = s.footerContent ? `<div class="custom-footer">${esc(s.footerContent)}</div>` : '';
  const bodyClass = s.sheetsPerPage > 1 ? ' class="sheets-multi"' : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${buildTimetableCss(isLandscape, s.sheetsPerPage)}</style></head>
<body${bodyClass}>
  ${timetablesHtml}
  <div class="page-footer">
    <span class="f-left">${esc(today)}</span>
    <span class="f-center"><span class="watermark">Generated by TimetableWiz</span> &mdash; ${esc(schoolName)}</span>
    <span class="f-right">Page <span class="page-num"></span></span>
  </div>
  ${customFooterHtml}
</body></html>`;
}

/* ---------- Combined Teacher Schedule HTML ---------- */

function buildCombinedTeacherScheduleHtml(
  schoolName: string,
  teacherList: { id: string; name: string; shortName: string }[],
  store: ReturnType<typeof useTimetableStore.getState>,
  showBreaks: boolean,
  showEmpty: boolean,
  printSettings: PrintSettings
): string {
  const s = printSettings;
  const isLandscape = s.orientation === 'landscape';
  const { timings, entries, teachers, classes, sections, subjects } = store;
  const activeDays = timings.days;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const reportTitle = 'Teacher Schedule Report';

  let timetablesHtml = '';
  for (let idx = 0; idx < teacherList.length; idx++) {
    const tchr = teacherList[idx];
    const filteredEntries = entries.filter((e) => e.teacherId === tchr.id);
    const isFirstOnPage = idx % s.sheetsPerPage === 0;
    const customHeaderHtml = s.headerContent && isFirstOnPage ? `<div class="custom-header">${esc(s.headerContent)}</div>` : '';

    const getS = (id: string) => subjects.find((s) => s.id === id);
    const getC = (id: string) => classes.find((c) => c.id === id);
    const getSec = (id: string) => sections.find((s) => s.id === id);

    let rows = '';
    for (let p = 1; p <= timings.periodsPerDay; p++) {
      const isBreak = isBreakPeriod(p, timings);
      if (isBreak && !showBreaks) continue;
      const time = getPeriodTime(p, timings);
      const label = getPeriodLabel(p, timings);
      const rowClass = isBreak ? ' class="brk"' : '';
      rows += `<tr${rowClass}><td class="tp"><span class="pl">${esc(label)}</span><span class="tt-time">${esc(time)}</span></td>`;
      if (isBreak) {
        rows += `<td class="tb" colspan="${activeDays.length}" style="text-align:center;">&#9749; Break</td>`;
        rows += '</tr>';
        continue;
      }
      for (const day of activeDays) {
        const entry = filteredEntries.find((e) => e.day === day && e.period === p);
        if (entry) {
          const subj = getS(entry.subjectId);
          const cls = getC(entry.classId);
          const sec = getSec(entry.sectionId);
          const sc = getSubjectPrintColor(entry.subjectId);
          rows += `<td class="tf" style="background:${sc.bg};color:${sc.fg};border-left:2px solid ${sc.border};"><b>${esc(subj?.shortName || '?')}</b><span class="tn" style="color:${sc.fg};opacity:0.7;">${esc(cls?.name || '')}-${esc(sec?.name || '')}</span></td>`;
        } else if (showEmpty) {
          rows += '<td class="te">\u2014</td>';
        } else {
          rows += '<td></td>';
        }
      }
      rows += '</tr>';
    }

    if (s.sheetsPerPage > 1) {
      const headerHtml = isFirstOnPage
        ? `<div class="page-header"><div class="header-bar"></div><div class="school-name">${esc(schoolName)}</div><div class="report-title">${esc(reportTitle)}</div><div class="report-sub">${esc(tchr.name)}</div>${customHeaderHtml}</div>`
        : `<div class="sheet-label"><div class="sheet-label-title">${esc(reportTitle)}</div><div class="sheet-label-sub">${esc(tchr.name)}</div></div>`;
      timetablesHtml += `
    <div class="sheet-slot">
      ${headerHtml}
      <table class="tt">
        <thead><tr><th>Day / Period</th>${activeDays.map((d: string) => `<th>${esc(d)}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
    } else {
      timetablesHtml += `
    <div class="timetable-page">
      <div class="page-header">
        <div class="header-bar"></div>
        <div class="school-name">${esc(schoolName)}</div>
        <div class="report-title">${esc(reportTitle)}</div>
        <div class="report-sub">${esc(tchr.name)}</div>
        ${customHeaderHtml}
      </div>
      <table class="tt">
        <thead><tr><th>Day / Period</th>${activeDays.map((d: string) => `<th>${esc(d)}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
    }
  }

  const customFooterHtml = s.footerContent ? `<div class="custom-footer">${esc(s.footerContent)}</div>` : '';
  const bodyClass = s.sheetsPerPage > 1 ? ' class="sheets-multi"' : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${buildTimetableCss(isLandscape, s.sheetsPerPage)}</style></head>
<body${bodyClass}>
  ${timetablesHtml}
  <div class="page-footer">
    <span class="f-left">${esc(today)}</span>
    <span class="f-center"><span class="watermark">Generated by TimetableWiz</span> &mdash; ${esc(schoolName)}</span>
    <span class="f-right">Page <span class="page-num"></span></span>
  </div>
  ${customFooterHtml}
</body></html>`;
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
  const genTime = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
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
    if (isBreak) {
      rows += `<td class="tb" colspan="${activeDays.length}" style="text-align:center;">&#9749; Break</td>`;
      rows += '</tr>';
      continue;
    }
    for (const day of activeDays) {
      const entry = filteredEntries.find((e: any) => e.day === day && e.period === p);
      if (entry) {
        const subj = getS(entry.subjectId);
        const tchr = getT(entry.teacherId);
        const sc = getSubjectPrintColor(entry.subjectId);
        rows += `<td class="tf" style="background:${sc.bg};color:${sc.fg};border-left:2px solid ${sc.border};"><b>${esc(subj?.shortName || '?')}</b><span class="tn" style="color:${sc.fg};opacity:0.7;">${esc(tchr?.name || '?')}</span></td>`;
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
    ? `<div class="sheet-slot"><div class="page-header"><div class="header-bar"></div><div class="school-name">${esc(schoolName)}</div><div class="report-title">${esc(reportTitle)}</div><div class="report-sub">${esc(subtitle)}</div>${customHeaderHtml}</div>${tableHtml}</div>`
    : `<div class="page-header"><div class="header-bar"></div><div class="school-name">${esc(schoolName)}</div><div class="report-title">${esc(reportTitle)}</div><div class="report-sub">${esc(subtitle)}</div>${customHeaderHtml}</div>${tableHtml}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${buildTimetableCss(isLandscape, s.sheetsPerPage)}</style></head>
<body${bodyClass}>
  ${sheetContent}
  <div class="page-footer">
    <span class="f-left">${esc(genTime)}</span>
    <span class="f-center"><span class="watermark">Generated by TimetableWiz</span> &mdash; ${esc(schoolName)} &mdash; ${esc(reportTitle)}</span>
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
  const genTime = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
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
    if (isBreak) {
      rows += `<td class="tb" colspan="${activeDays.length}" style="text-align:center;">&#9749; Break</td>`;
      rows += '</tr>';
      continue;
    }
    for (const day of activeDays) {
      const entry = filteredEntries.find((e: any) => e.day === day && e.period === p);
      if (entry) {
        const subj = getS(entry.subjectId);
        const cls = getC(entry.classId);
        const sec = getSec(entry.sectionId);
        const sc = getSubjectPrintColor(entry.subjectId);
        rows += `<td class="tf" style="background:${sc.bg};color:${sc.fg};border-left:2px solid ${sc.border};"><b>${esc(subj?.shortName || '?')}</b><span class="tn" style="color:${sc.fg};opacity:0.7;">${esc(cls?.name || '')}-${esc(sec?.name || '')}</span></td>`;
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
    ? `<div class="sheet-slot"><div class="page-header"><div class="header-bar"></div><div class="school-name">${esc(schoolName)}</div><div class="report-title">${esc(reportTitle)}</div><div class="report-sub">${esc(teacherName)}</div>${customHeaderHtml}</div>${tableHtml}</div>`
    : `<div class="page-header"><div class="header-bar"></div><div class="school-name">${esc(schoolName)}</div><div class="report-title">${esc(reportTitle)}</div><div class="report-sub">${esc(teacherName)}</div>${customHeaderHtml}</div>${tableHtml}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${buildTimetableCss(isLandscape, s.sheetsPerPage)}</style></head>
<body${bodyClass}>
  ${sheetContent}
  <div class="page-footer">
    <span class="f-left">${esc(genTime)}</span>
    <span class="f-center"><span class="watermark">Generated by TimetableWiz</span> &mdash; ${esc(schoolName)} &mdash; ${esc(reportTitle)}</span>
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
  const genTime = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const reportTitle = 'Daywise Schedule';
  const daysLabel = selectedDays.length === timings.days.length
    ? 'All Days'
    : selectedDays.join(', ');

  const getS = (id: string) => subjects.find((s: any) => s.id === id);
  const getT = (id: string) => teachers.find((t: any) => t.id === id);

  let dayBlocksHtml = '';
  for (let idx = 0; idx < selectedDays.length; idx++) {
    const day = selectedDays[idx];
    let rows = '';
    for (let p = 1; p <= timings.periodsPerDay; p++) {
      const isBreak = isBreakPeriod(p, timings);
      if (isBreak && !showBreaks) continue;
      const time = getPeriodTime(p, timings);
      const label = getPeriodLabel(p, timings);
      const rowClass = isBreak ? ' class="brk"' : '';
      rows += `<tr${rowClass}><td class="tp"><span class="pl">${esc(label)}</span><span class="tt-time">${esc(time)}</span></td>`;
      if (isBreak) {
        rows += `<td class="tb" colspan="${combos.length}" style="text-align:center;">&#9749; Break</td>`;
        rows += '</tr>';
        continue;
      }
      for (const combo of combos) {
        const entry = entries.find((e: any) => e.day === day && e.period === p && e.classId === combo.classId && e.sectionId === combo.sectionId);
        if (entry) {
          const subj = getS(entry.subjectId);
          const tchr = getT(entry.teacherId);
          const sc = getSubjectPrintColor(entry.subjectId);
          rows += `<td class="tf" style="background:${sc.bg};color:${sc.fg};border-left:2px solid ${sc.border};"><b>${esc(subj?.shortName || '?')}</b><span class="tn" style="color:${sc.fg};opacity:0.7;">${esc(tchr?.name || '?')}</span></td>`;
        } else if (showEmpty) {
          rows += '<td class="te">\u2014</td>';
        } else {
          rows += '<td></td>';
        }
      }
      rows += '</tr>';
    }

    if (s.sheetsPerPage > 1) {
      const isFirstOnPage = idx % s.sheetsPerPage === 0;
      const dayHeaderHtml = isFirstOnPage
        ? `<div class="page-header"><div class="header-bar"></div><div class="school-name">${esc(schoolName)}</div><div class="report-title">${esc(reportTitle)}</div><div class="report-sub">${esc(day)} | ${combos.length} class${combos.length !== 1 ? 'es' : ''}</div>${s.headerContent ? `<div class="custom-header">${esc(s.headerContent)}</div>` : ''}</div>`
        : `<div class="sheet-label"><div class="sheet-label-title">${esc(day)}</div><div class="sheet-label-sub">${combos.length} class${combos.length !== 1 ? 'es' : ''}</div></div>`;
      dayBlocksHtml += `
    <div class="sheet-slot">
      ${dayHeaderHtml}
      <div class="day-block">
        <table class="tt">
          <thead><tr><th>Period</th>${combos.map((c) => `<th>${esc(c.label)}</th>`).join('')}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
    } else {
      // Single sheet per page
      dayBlocksHtml += `
    <div class="day-block">
      <div class="db"><div class="dh">${esc(day)}</div></div>
      <table class="tt">
        <thead><tr><th>Period</th>${combos.map((c) => `<th>${esc(c.label)}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
    }
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
  ${s.sheetsPerPage === 1 ? `<div class="page-header">
    <div class="header-bar"></div>
    <div class="school-name">${esc(schoolName)}</div>
    <div class="report-title">${esc(reportTitle)}</div>
    <div class="report-sub">${esc(daysLabel)} | ${combos.length} class${combos.length !== 1 ? 'es' : ''}</div>
    ${customHeaderHtml}
  </div>` : ''}
  <div class="page-footer">
    <span class="f-left">${esc(genTime)}</span>
    <span class="f-center"><span class="watermark">Generated by TimetableWiz</span> &mdash; ${esc(schoolName)} &mdash; ${esc(reportTitle)}</span>
    <span class="f-right">Page <span class="page-num"></span></span>
  </div>
  ${dayBlocksHtml}
  ${customFooterHtml}
</body></html>`;
}
