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
} from 'lucide-react';

export function SubstitutesTab() {
  const { substitutes, teachers, entries, timings, addSubstitute, deleteSubstitute } =
    useTimetableStore();
  const { toast } = useToast();

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
  const getSubject = (id: string) => useTimetableStore.getState().subjects.find((s) => s.id === id);
  const getClass = (id: string) => useTimetableStore.getState().classes.find((c) => c.id === id);
  const getSection = (id: string) => useTimetableStore.getState().sections.find((s) => s.id === id);

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
            <CardTitle className="text-lg">Active Substitutes for {selectedDate}</CardTitle>
            <CardDescription>{daySubstitutes.length} substitution{daySubstitutes.length !== 1 ? 's' : ''} active</CardDescription>
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
