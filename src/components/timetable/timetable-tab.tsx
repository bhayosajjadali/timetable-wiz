'use client';

import { useState, Fragment, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { getSubjectColor, getPeriodTime, isBreakPeriod } from '@/lib/timetable-utils';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  Plus,
  Trash2,
  Coffee,
  AlertCircle,
  Copy,
} from 'lucide-react';

export function TimetableTab() {
  const { classes, sections, timings } = useTimetableStore();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const availableClasses = classes.filter((c) => c.sectionIds.length > 0);
  const availableSections = selectedClass
    ? classes.find((c) => c.id === selectedClass)?.sectionIds || []
    : [];

  const activeDays = timings.days;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Class Timetable
          </CardTitle>
          <CardDescription>Select a class and section to view/edit the weekly timetable</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {availableClasses.length === 0 ? (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                No classes with sections available. Create classes and assign sections first.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedSection(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Section</Label>
                <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedClass ? 'Select section' : 'Select class first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSections.map((sid) => {
                      const section = sections.find((s) => s.id === sid);
                      return (
                        <SelectItem key={sid} value={sid}>
                          Section {section?.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedClass && selectedSection && (
        <TimetableGrid
          classId={selectedClass}
          sectionId={selectedSection}
        />
      )}
    </div>
  );
}

function TimetableGrid({ classId, sectionId }: { classId: string; sectionId: string }) {
  const {
    entries,
    assignments,
    teachers,
    subjects,
    timings,
    addEntry,
    deleteEntry,
  } = useTimetableStore();
  const { toast } = useToast();

  const [cellToFill, setCellToFill] = useState<{ day: string; period: number } | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [copyMode, setCopyMode] = useState(false);

  const activeDays = timings.days;
  const filteredAssignments = assignments.filter(
    (a) => a.classId === classId && a.sectionId === sectionId
  );

  const getEntry = (day: string, period: number) =>
    entries.find(
      (e) => e.day === day && e.period === period && e.classId === classId && e.sectionId === sectionId
    );

  const getTeacher = (id: string) => teachers.find((t) => t.id === id);
  const getSubject = (id: string) => subjects.find((s) => s.id === id);

  const handleCellClick = (day: string, period: number) => {
    const existing = getEntry(day, period);
    if (existing) return;
    setCellToFill({ day, period });
    setSelectedTeacher('');
    setSelectedSubject('');
    setSelectedDays([day]);
    setCopyMode(false);
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const selectAllDays = () => {
    // Only select days where this period is free
    const freeDays = activeDays.filter(
      (d) => !getEntry(d, cellToFill?.period || 0)
    );
    setSelectedDays(freeDays);
  };

  const clearDays = () => {
    // Keep only the original clicked day
    if (cellToFill) {
      setSelectedDays([cellToFill.day]);
    }
  };

  const handleFill = () => {
    if (!cellToFill || !selectedTeacher || !selectedSubject || selectedDays.length === 0) {
      toast({ title: 'Error', description: 'Please select teacher, subject, and at least one day.', variant: 'destructive' });
      return;
    }

    let addedCount = 0;
    let conflictCount = 0;
    const prevLen = entries.length;

    for (const day of selectedDays) {
      addEntry(day, cellToFill.period, selectedTeacher, classId, sectionId, selectedSubject);
    }

    const newLen = entries.length;
    addedCount = newLen - prevLen;
    conflictCount = selectedDays.length - addedCount;

    if (addedCount === 0) {
      toast({
        title: 'Conflict detected',
        description: 'All selected slots conflict with existing entries.',
        variant: 'destructive',
      });
      return;
    }

    const teacher = getTeacher(selectedTeacher);
    const subject = getSubject(selectedSubject);
    const dayList = selectedDays.join(', ');
    let msg = `${teacher?.shortName} - ${subject?.shortName} added to Period ${cellToFill.period} on: ${dayList}.`;
    if (conflictCount > 0) {
      msg += ` (${conflictCount} conflict${conflictCount > 1 ? 's' : ''} skipped)`;
    }
    toast({ title: `${addedCount} entr${addedCount > 1 ? 'ies' : 'y'} added`, description: msg });
    setCellToFill(null);
  };

  const handleDelete = (entryId: string) => {
    deleteEntry(entryId);
    toast({ title: 'Entry removed', description: 'Timetable entry has been removed.' });
  };

  const availableTeachersForCell = cellToFill
    ? teachers.filter((t) =>
        filteredAssignments.some((a) => a.teacherId === t.id)
      )
    : [];

  const availableSubjectsForTeacher = selectedTeacher
    ? filteredAssignments
        .filter((a) => a.teacherId === selectedTeacher)
        .map((a) => subjects.find((s) => s.id === a.subjectId)!)
        .filter(Boolean)
    : [];

  // Count how many of the selected days are free for this period
  const freeDayCount = cellToFill
    ? activeDays.filter((d) => !getEntry(d, cellToFill.period)).length
    : 0;

  const selectedClassName = useTimetableStore.getState().classes.find((c) => c.id === classId)?.name || '';
  const selectedSectionName = useTimetableStore.getState().sections.find((s) => s.id === sectionId)?.name || '';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedClassName} — Section {selectedSectionName}
          </CardTitle>
          <CardDescription>{activeDays.length} days, {timings.periodsPerDay} periods/day</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAssignments.length === 0 ? (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 mb-4">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                No assignments found for this class-section. Go to the Assignments tab to create teacher assignments first.
              </p>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Header row */}
              <div className="grid gap-px bg-border rounded-lg overflow-hidden" style={{ gridTemplateColumns: '100px repeat(' + activeDays.length + ', 1fr)' }}>
                <div className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground flex items-center justify-center">
                  Day / Period
                </div>
                {activeDays.map((day) => (
                  <div key={day} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
                    {day.slice(0, 3)}
                  </div>
                ))}

                {/* Period rows */}
                {Array.from({ length: timings.periodsPerDay }, (_, i) => i + 1).map((period) => {
                  const isBreak = isBreakPeriod(period, timings);
                  const time = getPeriodTime(period, timings);

                  return (
                    <Fragment key={`row-${period}`}>
                      <div
                        className={`bg-muted/50 p-2 flex flex-col items-center justify-center gap-0.5 ${
                          isBreak ? 'bg-amber-100 dark:bg-amber-900/20' : ''
                        }`}
                      >
                        <span className="text-xs font-medium">{isBreak ? 'Break' : `P${period}`}</span>
                        <span className="text-[10px] text-muted-foreground">{time}</span>
                      </div>
                      {activeDays.map((day) => {
                        const entry = getEntry(day, period);
                        const teacher = entry ? getTeacher(entry.teacherId) : null;
                        const subject = entry ? getSubject(entry.subjectId) : null;
                        const colors = entry ? getSubjectColor(entry.subjectId) : null;

                        if (isBreak) {
                          return (
                            <div
                              key={`${day}-${period}`}
                              className="bg-amber-50 dark:bg-amber-950/10 p-2 flex items-center justify-center"
                            >
                              <Coffee className="h-3 w-3 text-amber-400" />
                            </div>
                          );
                        }

                        return (
                          <div
                            key={`${day}-${period}`}
                            onClick={() => handleCellClick(day, period)}
                            className={`p-1.5 min-h-[56px] transition-colors ${
                              entry
                                ? `${colors?.bg || ''} ${colors?.border || ''} border cursor-default`
                                : 'bg-card cursor-pointer hover:bg-muted/50'
                            }`}
                          >
                            {entry ? (
                              <div className="flex flex-col items-center justify-center gap-0.5 relative group">
                                <span className={`text-xs font-semibold ${colors?.text || ''}`}>
                                  {subject?.shortName || '?'}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {teacher?.shortName || '?'}
                                </span>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="absolute -top-1 -right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(entry.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <Plus className="h-4 w-4 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fill Cell Dialog with Multi-Day Support */}
      <Dialog open={!!cellToFill} onOpenChange={(open) => !open && setCellToFill(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add Entry — Period {cellToFill?.period}
            </DialogTitle>
            <DialogDescription>
              Select teacher, subject, and days. Check multiple days to assign the same period across days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Teacher</Label>
              <Select value={selectedTeacher} onValueChange={(v) => { setSelectedTeacher(v); setSelectedSubject(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {availableTeachersForCell.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      No assigned teachers
                    </SelectItem>
                  ) : (
                    availableTeachersForCell.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.shortName})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder={selectedTeacher ? 'Select subject' : 'Select teacher first'} />
                </SelectTrigger>
                <SelectContent>
                  {availableSubjectsForTeacher.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      No assigned subjects
                    </SelectItem>
                  ) : (
                    availableSubjectsForTeacher.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.shortName})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Assign to Days</Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAllDays}>
                    Select All Free
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearDays}>
                    Clear
                  </Button>
                </div>
              </div>
              <div className="border rounded-lg p-2 space-y-1 max-h-[180px] overflow-y-auto">
                {activeDays.map((day) => {
                  const isFilled = cellToFill ? !!getEntry(day, cellToFill.period) : false;
                  const isChecked = selectedDays.includes(day);
                  return (
                    <label
                      key={day}
                      className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
                        isFilled
                          ? 'opacity-40 cursor-not-allowed bg-muted/30'
                          : isChecked
                          ? 'bg-[#34C75910] border border-[#34C75930] cursor-pointer'
                          : 'hover:bg-muted/50 cursor-pointer border border-transparent'
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        disabled={isFilled}
                        onCheckedChange={() => !isFilled && toggleDay(day)}
                      />
                      <span className="text-sm">{day}</span>
                      {isFilled && (
                        <span className="text-[10px] text-muted-foreground ml-auto">Already filled</span>
                      )}
                    </label>
                  );
                })}
              </div>
              {selectedDays.length > 1 && (
                <p className="text-xs text-[#34C759] font-medium">
                  {selectedDays.length} days selected — same period will be assigned to all
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCellToFill(null)}>Cancel</Button>
            <Button onClick={handleFill} disabled={selectedDays.length === 0}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add to {selectedDays.length} Day{selectedDays.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
