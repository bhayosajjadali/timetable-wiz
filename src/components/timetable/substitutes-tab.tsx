'use client';

import { useState, useMemo } from 'react';
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
} from 'lucide-react';

/* ====================================================================
   Iframe-based Print Helper (same as reports-tab)
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
   Build Substitute Report HTML
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
  const { entries, teachers, subjects, classes, sections } = store;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const getTeacher = (id: string) => teachers.find((t) => t.id === id);
  const getSubject = (id: string) => subjects.find((s) => s.id === id);
  const getClass = (id: string) => classes.find((c) => c.id === id);
  const getSection = (id: string) => sections.find((s) => s.id === id);

  // Build rows sorted by period
  const rows = substitutes.map((sub) => {
    const entry = entries.find((e) => e.id === sub.entryId);
    const originalTeacher = getTeacher(sub.originalTeacherId);
    const subTeacher = getTeacher(sub.substituteTeacherId);
    const subject = entry ? getSubject(entry.subjectId) : null;
    const cls = entry ? getClass(entry.classId) : null;
    const sec = entry ? getSection(entry.sectionId) : null;

    return {
      period: entry?.period || 0,
      originalTeacher: originalTeacher?.name || '?',
      subTeacher: subTeacher?.name || '?',
      subject: subject?.shortName || '?',
      classSection: `${cls?.name || '?'}-${sec?.name || '?'}`,
    };
  }).sort((a, b) => a.period - b.period);

  let tableRows = '';
  rows.forEach((row, idx) => {
    const rowBg = idx % 2 === 0 ? 'background:#FFFFFF;' : 'background:#F8F9FA;';
    tableRows += `<tr style="${rowBg}">
      <td style="text-align:center;font-weight:600;">${row.period}</td>
      <td>${esc(row.originalTeacher)}</td>
      <td>${esc(row.subTeacher)}</td>
      <td>${esc(row.subject)}</td>
      <td>${esc(row.classSection)}</td>
    </tr>`;
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {
    size: A4 portrait;
    margin: 15mm 15mm 20mm 15mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 11px; color: #1D1D1F; background: #fff; }

  .report-header { text-align: center; padding-bottom: 8px; margin-bottom: 12px; }
  .header-bar { width: 100%; height: 3px; background: linear-gradient(to right, transparent, #1B2A4A, transparent); margin-bottom: 10px; }
  .school-name { font-size: 20px; font-weight: 700; color: #1B2A4A; letter-spacing: -0.3px; }
  .report-title { font-size: 14px; font-weight: 600; color: #333; margin-top: 4px; }
  .report-subtitle { font-size: 11px; color: #666; margin-top: 2px; }

  .summary-row { display: flex; gap: 20px; justify-content: center; margin: 16px 0; }
  .summary-stat { text-align: center; padding: 8px 20px; background: #F8F9FA; border-radius: 8px; border: 1px solid #DEE2E6; }
  .stat-num { display: block; font-size: 20px; font-weight: 700; color: #1B2A4A; }
  .stat-label { display: block; font-size: 9px; color: #86868B; margin-top: 2px; }

  .report-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .report-table th {
    background: #1B2A4A;
    color: #fff;
    padding: 8px 12px;
    text-align: center;
    font-weight: 600;
    font-size: 10px;
    border: 1px solid #1B2A4A;
  }
  .report-table th:first-child { border-radius: 6px 0 0 0; }
  .report-table th:last-child { border-radius: 0 6px 0 0; }
  .report-table td {
    padding: 6px 12px;
    text-align: center;
    font-size: 10px;
    border: 1px solid #E5E5EA;
  }

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
    <div class="report-title">Substitute Teacher Report</div>
    <div class="report-subtitle">${esc(date)} &mdash; ${esc(dayOfWeek)}</div>
  </div>

  <div class="summary-row">
    <div class="summary-stat">
      <span class="stat-num">${substitutes.length}</span>
      <span class="stat-label">Substitutions</span>
    </div>
    <div class="summary-stat">
      <span class="stat-num">${new Set(substitutes.map(s => s.substituteTeacherId)).size}</span>
      <span class="stat-label">Substitute Teachers</span>
    </div>
  </div>

  <table class="report-table">
    <thead>
      <tr>
        <th>Period</th>
        <th>Original Teacher</th>
        <th>Substitute Teacher</th>
        <th>Subject</th>
        <th>Class-Section</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="report-footer">
    <span>${esc(today)}</span>
    <span class="watermark">Generated by TimetableWiz</span>
    <span>Page <span class="page-num"></span></span>
  </div>
</body>
</html>`;
}

/* ====================================================================
   SubstitutesTab
   ==================================================================== */

export function SubstitutesTab() {
  const { substitutes, teachers, entries, timings, schoolName, subjects, classes, sections, addSubstitute, deleteSubstitute } =
    useTimetableStore();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return today;
  });
  const [entryToSub, setEntryToSub] = useState<string | null>(null);
  const [selectedSubTeacher, setSelectedSubTeacher] = useState('');

  const dayOfWeek = getDayOfWeek(selectedDate);

  // Get entries for the selected day
  const dayEntries = useMemo(
    () => entries.filter((e) => e.day === dayOfWeek && timings.days.includes(dayOfWeek)),
    [entries, dayOfWeek, timings.days]
  );

  // Group by teacher
  const teacherSchedule = useMemo(() => {
    const map = new Map<string, typeof dayEntries>();
    dayEntries.forEach((e) => {
      const list = map.get(e.teacherId) || [];
      list.push(e);
      map.set(e.teacherId, list);
    });
    return map;
  }, [dayEntries]);

  // Get substitutes for selected date
  const daySubstitutes = substitutes.filter((s) => s.date === selectedDate);
  const substitutedEntryIds = new Set(daySubstitutes.map((s) => s.entryId));

  const getTeacher = (id: string) => teachers.find((t) => t.id === id);
  const getSubject = (id: string) => subjects.find((s) => s.id === id);
  const getClass = (id: string) => classes.find((c) => c.id === id);
  const getSection = (id: string) => sections.find((s) => s.id === id);

  const handleAddSubstitute = () => {
    if (!entryToSub || !selectedSubTeacher) {
      toast({ title: 'Error', description: 'Please select a substitute teacher.', variant: 'destructive' });
      return;
    }

    const entry = entries.find((e) => e.id === entryToSub);
    if (!entry) return;

    // Check for conflict
    const hasConflict = entries.some(
      (e) =>
        e.day === dayOfWeek &&
        e.period === entry.period &&
        e.teacherId === selectedSubTeacher
    );

    if (hasConflict) {
      toast({
        title: 'Conflict detected',
        description: 'The substitute teacher already has a class at this time.',
        variant: 'destructive',
      });
      return;
    }

    addSubstitute(selectedDate, dayOfWeek, entryToSub, entry.teacherId, selectedSubTeacher);

    const subTeacher = getTeacher(selectedSubTeacher);
    toast({
      title: 'Substitute assigned',
      description: `${subTeacher?.name} will substitute on ${selectedDate}.`,
    });

    setEntryToSub(null);
    setSelectedSubTeacher('');
  };

  const handleDelete = (id: string) => {
    deleteSubstitute(id);
    toast({ title: 'Substitute removed', description: 'The substitute assignment has been cancelled.' });
  };

  // Get available substitute teachers for an entry (not already teaching at that period)
  const getAvailableSubstitutes = (entryPeriod: number) => {
    const busyTeacherIds = new Set(
      entries
        .filter((e) => e.day === dayOfWeek && e.period === entryPeriod)
        .map((e) => e.teacherId)
    );

    return teachers.filter((t) => !busyTeacherIds.has(t.id));
  };

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

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5" />
            Substitute Management
          </CardTitle>
          <CardDescription>Select a date to manage teacher absences and substitutes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subDate">Date</Label>
            <div className="flex items-center gap-3">
              <Input
                id="subDate"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="max-w-[200px]"
              />
              <Badge variant={timings.days.includes(dayOfWeek) ? 'default' : 'destructive'}>
                {dayOfWeek}
                {!timings.days.includes(dayOfWeek) && ' (Non-working day)'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Substitutes */}
      {daySubstitutes.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg">Active Substitutes for {selectedDate}</CardTitle>
                <CardDescription>{daySubstitutes.length} substitution{daySubstitutes.length !== 1 ? 's' : ''} active</CardDescription>
              </div>
              <Button
                onClick={handleDownloadReport}
                disabled={isGenerating}
                size="sm"
                className="gap-1.5"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download Substitute Report
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {daySubstitutes.map((sub) => {
                const originalTeacher = getTeacher(sub.originalTeacherId);
                const subTeacher = getTeacher(sub.substituteTeacherId);
                const entry = entries.find((e) => e.id === sub.entryId);
                const subject = entry ? getSubject(entry.subjectId) : null;
                const cls = entry ? getClass(entry.classId) : null;
                const sec = entry ? getSection(entry.sectionId) : null;

                return (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <Badge variant="outline" className="shrink-0">
                        Period {entry?.period || '?'}
                      </Badge>
                      <span className="font-medium text-sm">{originalTeacher?.shortName || '?'}</span>
                      <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm">{subTeacher?.shortName || '?'}</span>
                      <span className="text-xs text-muted-foreground">
                        — {subject?.shortName || '?'} | {cls?.name || '?'}-{sec?.name || '?'}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(sub.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teacher Schedule for the Day */}
      {timings.days.includes(dayOfWeek) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Teacher Schedule — {dayOfWeek}
            </CardTitle>
            <CardDescription>
              Click on any entry to assign a substitute teacher
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teachers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No teachers configured.</p>
            ) : dayEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No timetable entries for {dayOfWeek}.
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {teachers.map((teacher) => {
                  const teacherEntries = teacherSchedule.get(teacher.id) || [];
                  if (teacherEntries.length === 0) return null;

                  return (
                    <div key={teacher.id} className="rounded-lg border bg-card p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{teacher.shortName}</Badge>
                        <span className="font-medium text-sm">{teacher.name}</span>
                      </div>
                      <div className="space-y-1">
                        {teacherEntries
                          .sort((a, b) => a.period - b.period)
                          .map((entry) => {
                            const isSubbed = substitutedEntryIds.has(entry.id);
                            const sub = daySubstitutes.find((s) => s.entryId === entry.id);
                            const subTeacher = sub ? getTeacher(sub.substituteTeacherId) : null;
                            const subject = getSubject(entry.subjectId);
                            const cls = getClass(entry.classId);
                            const sec = getSection(entry.sectionId);

                            return (
                              <div
                                key={entry.id}
                                onClick={() => !isSubbed && setEntryToSub(entry.id)}
                                className={`flex items-center justify-between p-2 rounded-md text-sm ${
                                  isSubbed
                                    ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800'
                                    : 'hover:bg-muted/50 cursor-pointer border border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="shrink-0 text-xs">
                                    {getPeriodLabel(entry.period, timings)}
                                  </Badge>
                                  <span>{subject?.shortName || '?'}</span>
                                  <span className="text-muted-foreground">|</span>
                                  <span>{cls?.name || '?'}-{sec?.name || '?'}</span>
                                  {isSubbed && (
                                    <>
                                      <span className="text-muted-foreground">→</span>
                                      <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700">
                                        {subTeacher?.shortName || '?'}
                                      </Badge>
                                    </>
                                  )}
                                </div>
                                {!isSubbed && (
                                  <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0">
                                    <Plus className="h-3 w-3 mr-1" />
                                    Assign Substitute
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assign Substitute Dialog */}
      <Dialog open={!!entryToSub} onOpenChange={(open) => !open && setEntryToSub(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Substitute Teacher</DialogTitle>
            <DialogDescription>
              {(() => {
                const entry = entries.find((e) => e.id === entryToSub);
                const teacher = entry ? getTeacher(entry.teacherId) : null;
                const subject = entry ? getSubject(entry.subjectId) : null;
                const cls = entry ? getClass(entry.classId) : null;
                const sec = entry ? getSection(entry.sectionId) : null;
                return `Replacing ${teacher?.name} for ${subject?.shortName} (${cls?.name}-${sec?.name}) Period ${entry?.period}`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Substitute Teacher</Label>
              <Select value={selectedSubTeacher} onValueChange={setSelectedSubTeacher}>
                <SelectTrigger>
                  <SelectValue placeholder="Select substitute" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const entry = entries.find((e) => e.id === entryToSub);
                    if (!entry) return [];
                    const available = getAvailableSubstitutes(entry.period);
                    return available.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.shortName})
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryToSub(null)}>Cancel</Button>
            <Button onClick={handleAddSubstitute}>Assign Substitute</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
