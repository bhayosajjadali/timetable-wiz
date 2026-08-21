'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTimetableStore } from '@/lib/store';
import { getDayOfWeek, getPeriodLabel } from '@/lib/timetable-utils';
import { useToast } from '@/hooks/use-toast';
import {
  UserMinus,
  ArrowRightLeft,
  Trash2,
  Plus,
  CalendarDays,
  AlertCircle,
  Download,
  Loader2,
  Users,
  CheckCircle2,
  X,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  Pencil,
  Printer,
  UserCheck,
  UserX,
} from 'lucide-react';

/* ====================================================================
   Iframe-based Print Helper
   ==================================================================== */

function printViaIframe(htmlContent: string, _title: string): Promise<void> {
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

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ====================================================================
   Types
   ==================================================================== */

interface SubOption {
  teacher: { id: string; name: string; shortName: string };
  isAlreadyAssigned: boolean;
  assignedPeriod?: number;
  assignedSubId?: string;
  assignedOriginalTeacher?: string;
}

/* ====================================================================
   Build Substitute Report HTML (Enhanced with Signatures)
   ==================================================================== */

function buildSubstituteReportHtml(
  schoolName: string,
  date: string,
  dayOfWeek: string,
  substitutes: {
    originalTeacherId: string;
    substituteTeacherId: string;
    entryId: string;
  }[],
  store: ReturnType<typeof useTimetableStore.getState>
): string {
  const { entries, teachers, subjects, classes, sections, timings } = store;

  const getTeacher = (id: string) => teachers.find((t) => t.id === id);
  const getSubject = (id: string) => subjects.find((s) => s.id === id);
  const getClass = (id: string) => classes.find((c) => c.id === id);
  const getSection = (id: string) => sections.find((s) => s.id === id);

  // Build rows sorted by period
  const rows = substitutes
    .map((sub) => {
      const entry = entries.find((e) => e.id === sub.entryId);
      const originalTeacher = getTeacher(sub.originalTeacherId);
      const subTeacher = getTeacher(sub.substituteTeacherId);
      const subject = entry ? getSubject(entry.subjectId) : null;
      const cls = entry ? getClass(entry.classId) : null;
      const sec = entry ? getSection(entry.sectionId) : null;
      const isKeepEmpty = sub.substituteTeacherId === '__KEEP_EMPTY__';

      return {
        period: entry?.period || 0,
        periodLabel: entry ? getPeriodLabel(entry.period, timings) : '?',
        originalTeacher: originalTeacher?.name || '?',
        subTeacher: isKeepEmpty ? '\u2014' : (subTeacher?.name || '?'),
        subTeacherId: sub.substituteTeacherId,
        subject: subject?.shortName || '?',
        classSection: `${cls?.name || '?'}-${sec?.name || '?'}`,
        isKeepEmpty,
      };
    })
    .sort((a, b) => a.period - b.period);

  // Build table rows with signature column
  let tableRows = '';
  rows.forEach((row, idx) => {
    const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA';
    tableRows += `<tr style="background:${rowBg};">
      <td style="text-align:center;font-weight:600;width:90px;">${esc(date)}</td>
      <td style="text-align:center;font-weight:500;">${esc(row.originalTeacher)}</td>
      <td style="text-align:center;font-weight:600;width:60px;">${row.periodLabel}</td>
      <td style="text-align:center;font-weight:500;${row.isKeepEmpty ? 'color:#999;font-style:italic;' : ''}">${esc(row.subTeacher)}</td>
      <td style="width:160px;height:48px;vertical-align:bottom;padding-bottom:6px;">
        <div style="border-bottom:1px solid #999;width:85%;margin:0 auto;"></div>
      </td>
      <td style="width:100px;"></td>
    </tr>`;
  });

  // Pad with blank rows so the table fills the page nicely
  const minRows = 14;
  let blankRows = '';
  for (let i = rows.length; i < minRows; i++) {
    const bg = i % 2 === 0 ? '#FFFFFF' : '#F8F9FA';
    blankRows += `<tr style="background:${bg};">
      <td style="height:38px;">&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td style="width:160px;">
        <div style="border-bottom:1px solid #ddd;width:85%;margin:0 auto;"></div>
      </td>
      <td>&nbsp;</td>
    </tr>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: A4 portrait;
    margin: 10mm 12mm 10mm 12mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 11px; color: #1D1D1F; background: #fff; }

  .report-header {
    text-align: center;
    padding-bottom: 6px;
    margin-bottom: 8px;
    border-bottom: 2px solid #1B2A4A;
  }
  .school-name { font-size: 20px; font-weight: 700; color: #1B2A4A; letter-spacing: -0.2px; }
  .report-subtitle { font-size: 12px; font-weight: 600; color: #333; margin-top: 2px; }
  .report-day { font-size: 10px; color: #666; margin-top: 1px; }

  .report-table { width: 100%; border-collapse: collapse; margin-top: 2px; }
  .report-table th {
    background: #1B2A4A;
    color: #fff;
    padding: 6px 6px;
    text-align: center;
    font-weight: 600;
    font-size: 9.5px;
    border: 1px solid #1B2A4A;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .report-table th:first-child { border-radius: 5px 0 0 0; }
  .report-table th:last-child { border-radius: 0 5px 0 0; }
  .report-table td {
    padding: 4px 6px;
    text-align: center;
    font-size: 10px;
    border: 1px solid #DEE2E6;
    vertical-align: middle;
  }

  .headmaster-section {
    margin-top: 36px;
    display: flex;
    justify-content: flex-end;
  }
  .headmaster-block { text-align: center; width: 200px; }
  .headmaster-label { font-size: 10px; font-weight: 600; color: #333; margin-bottom: 4px; }
  .headmaster-line { border-bottom: 1.5px solid #333; width: 100%; height: 28px; }
  .headmaster-title { font-size: 9px; color: #666; margin-top: 3px; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="report-header">
    <div class="school-name">${esc(schoolName)}</div>
    <div class="report-subtitle">Substitute Teachers for ${esc(date)}</div>
    <div class="report-day">${esc(dayOfWeek)}</div>
  </div>

  <table class="report-table">
    <thead>
      <tr>
        <th>Date</th>
        <th>Absent Teacher</th>
        <th>Period</th>
        <th>Assigned Teacher</th>
        <th style="width:160px;">Signature</th>
        <th style="width:100px;">Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      ${blankRows}
    </tbody>
  </table>

  <div class="headmaster-section">
    <div class="headmaster-block">
      <div class="headmaster-label">Headmaster</div>
      <div class="headmaster-line"></div>
      <div class="headmaster-title">Signature &amp; Stamp</div>
    </div>
  </div>
</body>
</html>`;
}

/* ====================================================================
   SubstitutesTab
   ==================================================================== */

export function SubstitutesTab() {
  const {
    substitutes,
    teachers,
    entries,
    timings,
    schoolName,
    subjects,
    classes,
    sections,
    addSubstitute,
    deleteSubstitute,
  } = useTimetableStore();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  // Date state
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Absent teachers multi-select
  const [absentTeacherIds, setAbsentTeacherIds] = useState<string[]>([]);
  const [absentPopoverOpen, setAbsentPopoverOpen] = useState(false);
  const [absentSearchQuery, setAbsentSearchQuery] = useState('');
  const absentSearchRef = useRef<HTMLInputElement>(null);

  // Substitute assignment popover per entry
  const [activeSubPopover, setActiveSubPopover] = useState<string | null>(null);
  const [subSearchQuery, setSubSearchQuery] = useState('');

  // Reassign confirmation dialog
  const [reassignDialog, setReassignDialog] = useState<{
    open: boolean;
    subTeacherId: string;
    oldSubId: string;
    newEntryId: string;
    oldPeriod: number;
    oldOriginalTeacher: string;
    newOriginalTeacher: string;
  } | null>(null);

  const dayOfWeek = getDayOfWeek(selectedDate);

  // Get entries for the selected day
  const dayEntries = useMemo(
    () => entries.filter((e) => e.day === dayOfWeek && timings.days.includes(dayOfWeek)),
    [entries, dayOfWeek, timings.days]
  );

  // Get substitutes for selected date
  const daySubstitutes = useMemo(
    () => substitutes.filter((s) => s.date === selectedDate),
    [substitutes, selectedDate]
  );

  // Map: substituteTeacherId -> their substitute record info
  const substituteAssignmentMap = useMemo(() => {
    const map = new Map<
      string,
      {
        subId: string;
        entryId: string;
        period: number;
        originalTeacherId: string;
        originalTeacherName: string;
      }
    >();
    daySubstitutes.forEach((sub) => {
      // Skip keep-empty entries — they don't occupy a real teacher
      if (sub.substituteTeacherId === '__KEEP_EMPTY__') return;
      const entry = entries.find((e) => e.id === sub.entryId);
      const origTeacher = teachers.find((t) => t.id === sub.originalTeacherId);
      if (entry && origTeacher) {
        map.set(sub.substituteTeacherId, {
          subId: sub.id,
          entryId: sub.entryId,
          period: entry.period,
          originalTeacherId: sub.originalTeacherId,
          originalTeacherName: origTeacher.name,
        });
      }
    });
    return map;
  }, [daySubstitutes, entries, teachers]);

  // Set of already-substituted entry IDs
  const substitutedEntryIds = useMemo(
    () => new Set(daySubstitutes.map((s) => s.entryId)),
    [daySubstitutes]
  );

  // Entries belonging to absent teachers on this day
  const absentTeacherEntries = useMemo(() => {
    return dayEntries
      .filter((e) => absentTeacherIds.includes(e.teacherId))
      .sort((a, b) => a.period - b.period);
  }, [dayEntries, absentTeacherIds]);

  // Total periods to cover vs covered
  const totalPeriods = absentTeacherEntries.length;
  const coveredPeriods = absentTeacherEntries.filter((e) => substitutedEntryIds.has(e.id)).length;
  const allCovered = totalPeriods > 0 && coveredPeriods === totalPeriods;

  // Group absent entries by teacher
  const absentEntriesByTeacher = useMemo(() => {
    const map = new Map<string, typeof dayEntries>();
    absentTeacherEntries.forEach((e) => {
      const list = map.get(e.teacherId) || [];
      list.push(e);
      map.set(e.teacherId, list);
    });
    return map;
  }, [absentTeacherEntries]);

  // Helper getters
  const getTeacher = useCallback((id: string) => teachers.find((t) => t.id === id), [teachers]);
  const getSubject = useCallback((id: string) => subjects.find((s) => s.id === id), [subjects]);
  const getClass = useCallback((id: string) => classes.find((c) => c.id === id), [classes]);
  const getSection = useCallback((id: string) => sections.find((s) => s.id === id), [sections]);

  // Get substitute options for a specific period entry
  const getSubstituteOptions = useCallback(
    (entryPeriod: number, currentEntryId: string, absentTeacherId: string): SubOption[] => {
      // Teachers busy with their own class at this period
      const busyTeacherIds = new Set(
        entries
          .filter((e) => e.day === dayOfWeek && e.period === entryPeriod)
          .map((e) => e.teacherId)
      );

      return teachers
        .filter((t) => !busyTeacherIds.has(t.id) && t.id !== absentTeacherId)
        .map((t) => {
          const existing = substituteAssignmentMap.get(t.id);
          // If this teacher is already assigned to THIS specific entry, don't show them
          if (existing && existing.entryId === currentEntryId) return null;
          return {
            teacher: t,
            isAlreadyAssigned: !!existing,
            assignedPeriod: existing?.period,
            assignedSubId: existing?.subId,
            assignedOriginalTeacher: existing?.originalTeacherName,
          };
        })
        .filter((opt): opt is SubOption => opt !== null)
        .sort((a, b) => {
          // Put non-assigned teachers first
          if (a.isAlreadyAssigned && !b.isAlreadyAssigned) return 1;
          if (!a.isAlreadyAssigned && b.isAlreadyAssigned) return -1;
          return a.teacher.name.localeCompare(b.teacher.name);
        });
    },
    [entries, dayOfWeek, teachers, substituteAssignmentMap]
  );

  // Toggle absent teacher selection
  const toggleAbsentTeacher = useCallback(
    (teacherId: string) => {
      setAbsentTeacherIds((prev) =>
        prev.includes(teacherId) ? prev.filter((id) => id !== teacherId) : [...prev, teacherId]
      );
    },
    []
  );

  // Remove an absent teacher and all their substitute assignments
  const removeAbsentTeacher = useCallback(
    (teacherId: string) => {
      // Remove all substitute assignments for this absent teacher's entries
      const teacherDayEntries = dayEntries.filter((e) => e.teacherId === teacherId);
      teacherDayEntries.forEach((entry) => {
        const sub = daySubstitutes.find((s) => s.entryId === entry.id);
        if (sub) deleteSubstitute(sub.id);
      });
      setAbsentTeacherIds((prev) => prev.filter((id) => id !== teacherId));
      toast({ title: 'Absent teacher removed', description: 'All related substitute assignments have been cancelled.' });
    },
    [dayEntries, daySubstitutes, deleteSubstitute, toast]
  );

  // Handle assigning a substitute teacher
  const handleAssignSubstitute = useCallback(
    (entryId: string, subTeacherId: string) => {
      const entry = entries.find((e) => e.id === entryId);
      if (!entry) return;

      // Check for conflict (teacher has own class at this period)
      const hasConflict = entries.some(
        (e) => e.day === dayOfWeek && e.period === entry.period && e.teacherId === subTeacherId
      );
      if (hasConflict) {
        toast({
          title: 'Conflict detected',
          description: 'This teacher already has their own class at this period.',
          variant: 'destructive',
        });
        return;
      }

      addSubstitute(selectedDate, dayOfWeek, entryId, entry.teacherId, subTeacherId);
      const subTeacher = getTeacher(subTeacherId);
      toast({
        title: 'Substitute assigned',
        description: `${subTeacher?.name || 'Teacher'} assigned successfully.`,
      });
      setActiveSubPopover(null);
      setSubSearchQuery('');
    },
    [entries, dayOfWeek, addSubstitute, selectedDate, getTeacher, toast]
  );

  // Handle remove & reassign
  const handleReassign = useCallback(() => {
    if (!reassignDialog) return;

    // Remove old assignment
    deleteSubstitute(reassignDialog.oldSubId);

    // Add new assignment
    const entry = entries.find((e) => e.id === reassignDialog.newEntryId);
    if (entry) {
      addSubstitute(
        selectedDate,
        dayOfWeek,
        reassignDialog.newEntryId,
        entry.teacherId,
        reassignDialog.subTeacherId
      );
    }

    const subTeacher = getTeacher(reassignDialog.subTeacherId);
    toast({
      title: 'Teacher reassigned',
      description: `${subTeacher?.name || 'Teacher'} moved from ${getPeriodLabel(reassignDialog.oldPeriod, timings)} to new assignment.`,
    });

    setReassignDialog(null);
    setActiveSubPopover(null);
    setSubSearchQuery('');
  }, [reassignDialog, deleteSubstitute, entries, addSubstitute, selectedDate, dayOfWeek, getTeacher, toast]);

  // Handle removing a single substitute assignment
  const handleRemoveSubstitute = useCallback(
    (subId: string) => {
      deleteSubstitute(subId);
      toast({ title: 'Substitute removed', description: 'The assignment has been cancelled.' });
    },
    [deleteSubstitute, toast]
  );

  // Handle keeping a period intentionally empty (no substitute)
  const handleKeepEmpty = useCallback(
    (entryId: string) => {
      const entry = entries.find((e) => e.id === entryId);
      if (!entry) return;
      addSubstitute(selectedDate, dayOfWeek, entryId, entry.teacherId, '__KEEP_EMPTY__');
      toast({
        title: 'Period kept empty',
        description: 'No substitute will be assigned for this period.',
      });
      setActiveSubPopover(null);
      setSubSearchQuery('');
    },
    [entries, dayOfWeek, addSubstitute, selectedDate, toast]
  );

  // Download substitute report
  const handleDownloadReport = async () => {
    setIsGenerating(true);
    try {
      const html = buildSubstituteReportHtml(
        schoolName,
        selectedDate,
        dayOfWeek,
        daySubstitutes.map((s) => ({
          originalTeacherId: s.originalTeacherId,
          substituteTeacherId: s.substituteTeacherId,
          entryId: s.entryId,
        })),
        useTimetableStore.getState()
      );
      await printViaIframe(html, `Substitute_Report_${selectedDate}`);
      toast({
        title: 'Print dialog opened',
        description: 'Choose "Save as PDF" to download the report.',
      });
    } catch (err) {
      console.error('Report generation failed:', err);
      toast({
        title: 'Print failed',
        description: 'An error occurred while preparing the report.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Filtered absent teacher list for search
  const filteredAbsentTeachers = useMemo(() => {
    const query = absentSearchQuery.toLowerCase();
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.shortName.toLowerCase().includes(query)
    );
  }, [teachers, absentSearchQuery]);

  // Reset sub search when popover changes
  useEffect(() => {
    if (!activeSubPopover) setSubSearchQuery('');
  }, [activeSubPopover]);

  // Focus search input when popover opens
  useEffect(() => {
    if (absentPopoverOpen && absentSearchRef.current) {
      setTimeout(() => absentSearchRef.current?.focus(), 50);
    }
  }, [absentPopoverOpen]);

  return (
    <div className="space-y-6">
      {/* ──────── Section 1: Date Selection ──────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserMinus className="h-5 w-5" />
            Substitute Management
          </CardTitle>
          <CardDescription>Select date and mark absent teachers to arrange substitutes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4 justify-between">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="subDate" className="text-xs font-medium">Date</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="subDate"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setAbsentTeacherIds([]);
                    }}
                    className="max-w-[200px]"
                  />
                  <Badge variant={timings.days.includes(dayOfWeek) ? 'default' : 'destructive'}>
                    {dayOfWeek}
                    {!timings.days.includes(dayOfWeek) && ' (Off Day)'}
                  </Badge>
                </div>
              </div>
            </div>
            {/* Print button always visible at top when there are substitutes */}
            <Button
              onClick={handleDownloadReport}
              disabled={isGenerating || daySubstitutes.length === 0}
              size="sm"
              className="gap-1.5 shrink-0"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              Print Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ──────── Section 2: Select Absent Teachers ──────── */}
      {timings.days.includes(dayOfWeek) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserX className="h-5 w-5 text-red-500" />
                  Mark Absent Teachers
                </CardTitle>
                <CardDescription className="mt-1">
                  Select teachers who are absent today to see their periods and assign substitutes
                </CardDescription>
              </div>
              {absentTeacherIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    setAbsentTeacherIds([]);
                    toast({ title: 'Cleared', description: 'All absent teachers removed.' });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Multi-select dropdown for absent teachers */}
            <Popover open={absentPopoverOpen} onOpenChange={setAbsentPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between font-normal h-10"
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {absentTeacherIds.length === 0
                      ? 'Select absent teachers...'
                      : `${absentTeacherIds.length} teacher${absentTeacherIds.length > 1 ? 's' : ''} marked absent`}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <div className="p-2 border-b">
                  <Input
                    ref={absentSearchRef}
                    placeholder="Search teachers..."
                    value={absentSearchQuery}
                    onChange={(e) => setAbsentSearchQuery(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto p-1">
                  {filteredAbsentTeachers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No teachers found.</p>
                  ) : (
                    filteredAbsentTeachers.map((teacher) => {
                      const isSelected = absentTeacherIds.includes(teacher.id);
                      const hasEntries = dayEntries.some((e) => e.teacherId === teacher.id);
                      return (
                        <button
                          key={teacher.id}
                          onClick={() => toggleAbsentTeacher(teacher.id)}
                          disabled={!hasEntries}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left transition-colors
                            ${isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}
                            ${!hasEntries ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <div
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                              ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{teacher.name}</span>
                            <span className="text-muted-foreground ml-2">({teacher.shortName})</span>
                          </div>
                          {!hasEntries && (
                            <span className="text-xs text-muted-foreground">No classes</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Selected absent teacher chips */}
            {absentTeacherIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {absentTeacherIds.map((id) => {
                  const teacher = getTeacher(id);
                  if (!teacher) return null;
                  const entryCount = dayEntries.filter((e) => e.teacherId === id).length;
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-full text-xs font-medium"
                    >
                      <UserX className="h-3 w-3" />
                      {teacher.shortName}
                      <span className="text-red-400 dark:text-red-500">({entryCount} periods)</span>
                      <button
                        onClick={() => removeAbsentTeacher(id)}
                        className="ml-0.5 hover:bg-red-200 dark:hover:bg-red-800 rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ──────── Section 3: Substitute Assignments ──────── */}
      {absentTeacherIds.length > 0 && absentTeacherEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-blue-500" />
                  Assign Substitutes
                </CardTitle>
                <CardDescription className="mt-1">
                  {coveredPeriods}/{totalPeriods} periods covered
                  {allCovered && (
                    <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
                      <CheckCircle2 className="inline h-3.5 w-3.5 mr-0.5" />
                      All assigned!
                    </span>
                  )}
                </CardDescription>
              </div>
              {allCovered && (
                <Button
                  onClick={handleDownloadReport}
                  disabled={isGenerating}
                  size="sm"
                  className="gap-1.5"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Printer className="h-4 w-4" />
                  )}
                  Print Signature Report
                </Button>
              )}
            </div>
            {/* Progress bar */}
            {totalPeriods > 0 && (
              <div className="mt-3">
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${allCovered ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${(coveredPeriods / totalPeriods) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {Array.from(absentEntriesByTeacher.entries()).map(([teacherId, tEntries]) => {
                const teacher = getTeacher(teacherId);
                if (!teacher) return null;
                const teacherCovered = tEntries.filter((e) => substitutedEntryIds.has(e.id)).length;
                const teacherComplete = teacherCovered === tEntries.length;

                return (
                  <div
                    key={teacherId}
                    className={`rounded-lg border p-4 space-y-2 ${
                      teacherComplete
                        ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                        : 'bg-card border-border'
                    }`}
                  >
                    {/* Absent teacher header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="gap-1">
                          <UserX className="h-3 w-3" />
                          Absent
                        </Badge>
                        <span className="font-semibold text-sm">{teacher.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({teacher.shortName})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {teacherComplete ? (
                          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-700 dark:bg-green-900/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {teacherCovered}/{tEntries.length} covered
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:bg-amber-900/30">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {teacherCovered}/{tEntries.length} covered
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Period rows */}
                    <div className="space-y-1.5 ml-1">
                      {tEntries
                        .sort((a, b) => a.period - b.period)
                        .map((entry) => {
                          const isSubbed = substitutedEntryIds.has(entry.id);
                          const sub = daySubstitutes.find((s) => s.entryId === entry.id);
                          const subTeacher = sub ? getTeacher(sub.substituteTeacherId) : null;
                          const subject = getSubject(entry.subjectId);
                          const cls = getClass(entry.classId);
                          const sec = getSection(entry.sectionId);
                          const subOptions = getSubstituteOptions(entry.period, entry.id, teacherId);
                          const filteredOptions = subSearchQuery
                            ? subOptions.filter(
                                (o) =>
                                  o.teacher.name.toLowerCase().includes(subSearchQuery.toLowerCase()) ||
                                  o.teacher.shortName.toLowerCase().includes(subSearchQuery.toLowerCase())
                              )
                            : subOptions;

                          return (
                            <div
                              key={entry.id}
                              className={`flex items-center justify-between p-2.5 rounded-lg text-sm transition-colors ${
                                isSubbed
                                  ? 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800'
                                  : 'bg-muted/30 border border-dashed border-muted-foreground/25'
                              }`}
                            >
                              {/* Left: Period info */}
                              <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                                <Badge
                                  variant="outline"
                                  className="shrink-0 text-xs font-mono bg-white dark:bg-gray-900"
                                >
                                  {getPeriodLabel(entry.period, timings)}
                                </Badge>
                                <span className="font-medium text-xs">{subject?.shortName || '?'}</span>
                                <span className="text-muted-foreground text-xs">|</span>
                                <span className="text-xs text-muted-foreground">
                                  {cls?.name || '?'}-{sec?.name || '?'}
                                </span>
                              </div>

                              {/* Right: Substitute assignment */}
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                {isSubbed ? (
                                  <>
                                    {sub?.substituteTeacherId === '__KEEP_EMPTY__' ? (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 gap-1"
                                      >
                                        <UserX className="h-3 w-3" />
                                        Kept Empty
                                      </Badge>
                                    ) : subTeacher ? (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700 gap-1"
                                    >
                                      <UserCheck className="h-3 w-3" />
                                      {subTeacher.shortName}
                                    </Badge>
                                    ) : null}
                                    {/* Change button - opens popover */}
                                    <Popover
                                      open={activeSubPopover === entry.id}
                                      onOpenChange={(open) => {
                                        setActiveSubPopover(open ? entry.id : null);
                                        if (open) setSubSearchQuery('');
                                      }}
                                    >
                                      <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-72 p-0" align="end">
                                        <SubstitutePickerContent
                                          entry={entry}
                                          options={filteredOptions}
                                          searchQuery={subSearchQuery}
                                          onSearchChange={setSubSearchQuery}
                                          onAssign={handleAssignSubstitute}
                                          onKeepEmpty={handleKeepEmpty}
                                          onReassignRequest={(opt) => {
                                            setReassignDialog({
                                              open: true,
                                              subTeacherId: opt.teacher.id,
                                              oldSubId: opt.assignedSubId!,
                                              newEntryId: entry.id,
                                              oldPeriod: opt.assignedPeriod!,
                                              oldOriginalTeacher: opt.assignedOriginalTeacher!,
                                              newOriginalTeacher: teacher.name,
                                            });
                                          }}
                                          currentSubId={sub.id}
                                          timings={timings}
                                        />
                                      </PopoverContent>
                                    </Popover>
                                    {/* Remove button */}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => handleRemoveSubstitute(sub.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                ) : (
                                  <Popover
                                    open={activeSubPopover === entry.id}
                                    onOpenChange={(open) => {
                                      setActiveSubPopover(open ? entry.id : null);
                                      if (open) setSubSearchQuery('');
                                    }}
                                  >
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs gap-1 border-dashed border-primary/40 text-primary hover:bg-primary/5"
                                      >
                                        <Plus className="h-3 w-3" />
                                        Assign Substitute
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 p-0" align="end">
                                      <SubstitutePickerContent
                                        entry={entry}
                                        options={filteredOptions}
                                        searchQuery={subSearchQuery}
                                        onSearchChange={setSubSearchQuery}
                                        onAssign={handleAssignSubstitute}
                                        onKeepEmpty={handleKeepEmpty}
                                        onReassignRequest={(opt) => {
                                          setReassignDialog({
                                            open: true,
                                            subTeacherId: opt.teacher.id,
                                            oldSubId: opt.assignedSubId!,
                                            newEntryId: entry.id,
                                            oldPeriod: opt.assignedPeriod!,
                                            oldOriginalTeacher: opt.assignedOriginalTeacher!,
                                            newOriginalTeacher: teacher.name,
                                          });
                                        }}
                                        timings={timings}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ──────── No entries message ──────── */}
      {absentTeacherIds.length > 0 && absentTeacherEntries.length === 0 && timings.days.includes(dayOfWeek) && (
        <Card>
          <CardContent className="py-8 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Selected teachers have no scheduled classes on {dayOfWeek}.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ──────── Active Substitutes Summary ──────── */}
      {daySubstitutes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-green-500" />
                  Active Substitutes Summary
                </CardTitle>
                <CardDescription className="mt-0.5">
                  {daySubstitutes.length} substitution{daySubstitutes.length !== 1 ? 's' : ''} for {selectedDate}
                </CardDescription>
              </div>
              {allCovered && (
                <Button
                  onClick={handleDownloadReport}
                  disabled={isGenerating}
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Printer className="h-4 w-4" />
                  )}
                  Print Report
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {daySubstitutes
                .map((sub) => {
                  const origTeacher = getTeacher(sub.originalTeacherId);
                  const subTeacher = getTeacher(sub.substituteTeacherId);
                  const entry = entries.find((e) => e.id === sub.entryId);
                  const subject = entry ? getSubject(entry.subjectId) : null;
                  const cls = entry ? getClass(entry.classId) : null;
                  const sec = entry ? getSection(entry.sectionId) : null;
                  return {
                    ...sub,
                    period: entry?.period || 0,
                    periodLabel: getPeriodLabel(entry?.period || 0, timings),
                    origName: origTeacher?.shortName || '?',
                    subName: sub.substituteTeacherId === '__KEEP_EMPTY__' ? '\u2014' : (subTeacher?.shortName || '?'),
                    isKeepEmpty: sub.substituteTeacherId === '__KEEP_EMPTY__',
                    subjectName: subject?.shortName || '?',
                    classSection: `${cls?.name || '?'}-${sec?.name || '?'}`,
                  };
                })
                .sort((a, b) => a.period - b.period)
                .map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between p-2 rounded-md text-xs bg-muted/30"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs font-mono shrink-0">
                        {row.periodLabel}
                      </Badge>
                      <span className="text-muted-foreground line-through">{row.origName}</span>
                      <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                      {row.isKeepEmpty ? (
                        <span className="text-muted-foreground italic">Kept Empty</span>
                      ) : (
                        <span className="font-medium text-green-700 dark:text-green-400">{row.subName}</span>
                      )}
                      <span className="text-muted-foreground">
                        {row.subjectName} | {row.classSection}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveSubstitute(row.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ──────── Reassign Confirmation Dialog ──────── */}
      <Dialog
        open={!!reassignDialog?.open}
        onOpenChange={(open) => !open && setReassignDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-500" />
              Reassign Substitute Teacher
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">{getTeacher(reassignDialog?.subTeacherId || '')?.name}</span> is currently
                  assigned for <span className="font-medium">{reassignDialog?.oldPeriod != null ? getPeriodLabel(reassignDialog.oldPeriod, timings) : '?'}</span> (replacing{' '}
                  <span className="font-medium">{reassignDialog?.oldOriginalTeacher}</span>).
                </p>
                <p>
                  Do you want to remove that assignment and reassign them for this period (replacing{' '}
                  <span className="font-medium">{reassignDialog?.newOriginalTeacher}</span>)?
                </p>
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 mt-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-xs text-amber-700 dark:text-amber-300">
                    {reassignDialog?.oldPeriod != null ? getPeriodLabel(reassignDialog.oldPeriod, timings) : '?'} will become unassigned after this action. You will need to
                    assign a different substitute for that period.
                  </span>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReassignDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReassign}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Remove & Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ====================================================================
   SubstitutePickerContent — Inner dropdown content for picking a substitute
   ==================================================================== */

function SubstitutePickerContent({
  entry,
  options,
  searchQuery,
  onSearchChange,
  onAssign,
  onKeepEmpty,
  onReassignRequest,
  currentSubId,
  timings,
}: {
  entry: { id: string; period: number; teacherId: string };
  options: SubOption[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAssign: (entryId: string, subTeacherId: string) => void;
  onKeepEmpty: (entryId: string) => void;
  onReassignRequest: (opt: SubOption) => void;
  currentSubId?: string;
  timings: { days: string[] } & Record<string, unknown>;
}) {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, []);

  const availableOptions = options.filter((o) => !o.isAlreadyAssigned);
  const assignedOptions = options.filter((o) => o.isAlreadyAssigned);

  return (
    <>
      <div className="p-2 border-b">
        <Input
          ref={searchRef}
          placeholder="Search substitute..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
      {/* Keep Empty option */}
      <div className="border-b">
        <button
          onClick={() => onKeepEmpty(entry.id)}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors text-left cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
            <UserX className="h-3 w-3 text-gray-500 dark:text-gray-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-xs text-gray-600 dark:text-gray-300">Keep Empty</div>
            <div className="text-[10px] text-muted-foreground">No substitute for this period</div>
          </div>
        </button>
      </div>
      <div className="max-h-56 overflow-y-auto p-1">
        {options.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No teachers available for this period.</p>
        ) : (
          <>
            {/* Available teachers */}
            {availableOptions.length > 0 && (
              <div className="mb-1">
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Available
                </div>
                {availableOptions.map((opt) => (
                  <button
                    key={opt.teacher.id}
                    onClick={() => onAssign(entry.id, opt.teacher.id)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm hover:bg-muted transition-colors text-left cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                      <UserCheck className="h-3 w-3 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-xs">{opt.teacher.name}</div>
                      <div className="text-[10px] text-muted-foreground">{opt.teacher.shortName}</div>
                    </div>
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            {/* Already assigned teachers */}
            {assignedOptions.length > 0 && (
              <div>
                <div className="px-2 py-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Already Assigned
                </div>
                {assignedOptions.map((opt) => (
                  <button
                    key={opt.teacher.id}
                    onClick={() => onReassignRequest(opt)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors text-left cursor-pointer group"
                  >
                    <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-xs flex items-center gap-1.5">
                        {opt.teacher.name}
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 h-4 text-amber-600 border-amber-300 bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:bg-amber-900/30"
                        >
                          {opt.assignedPeriod != null ? getPeriodLabel(opt.assignedPeriod, timings) : '?'}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400">
                        Replacing {opt.assignedOriginalTeacher}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <RotateCcw className="h-3 w-3 text-amber-500" />
                      <span className="text-[10px] text-amber-600 dark:text-amber-400">Reassign</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
