'use client';

import { useState, Fragment, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useTimetableStore } from '@/lib/store';
import { getSubjectColor, getPeriodTime, isBreakPeriod, getPeriodLabel } from '@/lib/timetable-utils';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import type { Entry } from '@/lib/types';
import {
  Calendar,
  Plus,
  Trash2,
  Coffee,
  AlertCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';

export function TimetableTab() {
  const { classes, sections, timings, clearAllEntries, clearClassSectionEntries, entries } = useTimetableStore();
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [showClearClassDialog, setShowClearClassDialog] = useState(false);

  const availableClasses = classes.filter((c) => c.sectionIds.length > 0);
  const availableSections = selectedClass
    ? classes.find((c) => c.id === selectedClass)?.sectionIds || []
    : [];

  const selectedClassName = classes.find((c) => c.id === selectedClass)?.name || '';
  const selectedSectionName = sections.find((s) => s.id === selectedSection)?.name || '';

  const classHasEntries = selectedClass && selectedSection
    ? entries.some((e) => e.classId === selectedClass && e.sectionId === selectedSection)
    : false;

  const handleClearAll = () => {
    clearAllEntries();
    toast({ title: 'Timetable cleared', description: 'All timetable assignments have been removed.' });
    setShowClearAllDialog(false);
  };

  const handleClearClass = () => {
    clearClassSectionEntries(selectedClass, selectedSection);
    toast({ title: 'Class timetable deleted', description: `All entries for ${selectedClassName} — Section ${selectedSectionName} removed.` });
    setShowClearClassDialog(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Class Timetable
              </CardTitle>
              <CardDescription>Select a class and section to view/edit the weekly timetable</CardDescription>
            </div>
            {entries.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
                onClick={() => setShowClearAllDialog(true)}
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Clear All
              </Button>
            )}
          </div>
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
            <>
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

              {classHasEntries && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setShowClearClassDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete {selectedClassName} — Section {selectedSectionName} Timetable
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedClass && selectedSection && (
        <TimetableGrid
          classId={selectedClass}
          sectionId={selectedSection}
        />
      )}

      <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Timetable Assignments?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all timetable entries for every class and section. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleClearAll}
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClearClassDialog} onOpenChange={setShowClearClassDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedClassName} — Section {selectedSectionName} Timetable?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all timetable entries for this class and section only. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleClearClass}
            >
              Delete Class Timetable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Cell action types ────────────────────────────────────────────────────────
type CellAction =
  | { type: 'add'; day: string; period: number }
  | { type: 'menu'; entry: Entry; day: string; period: number }
  | { type: 'change'; entry: Entry; day: string; period: number };

function TimetableGrid({ classId, sectionId }: { classId: string; sectionId: string }) {
  const {
    entries,
    assignments,
    teachers,
    subjects,
    timings,
    classes,
    sections,
    addEntry,
    deleteEntry,
    clearClassSectionEntries,
  } = useTimetableStore();
  const { toast } = useToast();

  // Active cell action state
  const [cellAction, setCellAction] = useState<CellAction | null>(null);

  // For add/change dialog
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const [showClearClassDialog, setShowClearClassDialog] = useState(false);

  // Undo state: stores the deleted entry for 5s
  const [undoEntry, setUndoEntry] = useState<Entry | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeDays = timings.days;
  const filteredAssignments = assignments.filter(
    (a) => a.classId === classId && a.sectionId === sectionId
  );
  const classEntries = entries.filter(
    (e) => e.classId === classId && e.sectionId === sectionId
  );

  const getEntry = (day: string, period: number) =>
    entries.find(
      (e) => e.day === day && e.period === period && e.classId === classId && e.sectionId === sectionId
    );

  const getTeacher = (id: string) => teachers.find((t) => t.id === id);
  const getSubject = (id: string) => subjects.find((s) => s.id === id);

  const selectedClassName = classes.find((c) => c.id === classId)?.name || '';
  const selectedSectionName = sections.find((s) => s.id === sectionId)?.name || '';

  // ── Cell tap handler ────────────────────────────────────────────────────────
  const handleCellClick = (day: string, period: number) => {
    const existing = getEntry(day, period);
    if (existing) {
      setCellAction({ type: 'menu', entry: existing, day, period });
    } else {
      setCellAction({ type: 'add', day, period });
      setSelectedTeacher('');
      setSelectedSubject('');
      setSelectedDays([day]);
    }
  };

  // ── Open change dialog from menu ────────────────────────────────────────────
  const openChangeDialog = (entry: Entry, day: string, period: number) => {
    setCellAction({ type: 'change', entry, day, period });
    setSelectedTeacher(entry.teacherId);
    setSelectedSubject(entry.subjectId);
    setSelectedDays([day]);
  };

  // ── Delete with undo ────────────────────────────────────────────────────────
  const handleDelete = (entry: Entry) => {
    setCellAction(null);
    deleteEntry(entry.id);

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoEntry(entry);

    const teacher = getTeacher(entry.teacherId);
    const subject = getSubject(entry.subjectId);

    toast({
      title: 'Entry deleted',
      description: `${subject?.shortName || '?'} (${teacher?.shortName || '?'}) removed.`,
      action: (
        <ToastAction altText="Undo" onClick={() => handleUndo(entry)}>
          Undo
        </ToastAction>
      ),
    });

    undoTimerRef.current = setTimeout(() => {
      setUndoEntry(null);
    }, 5500);
  };

  const handleUndo = (entry: Entry) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoEntry(null);
    addEntry(entry.day, entry.period, entry.teacherId, entry.classId, entry.sectionId, entry.subjectId);
    toast({ title: 'Restored', description: 'Entry has been restored.' });
  };

  // ── Add / Change submit ─────────────────────────────────────────────────────
  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const selectAllDays = () => {
    const period = cellAction && (cellAction.type === 'add' || cellAction.type === 'change')
      ? cellAction.period : 0;
    const freeDays = activeDays.filter((d) => !getEntry(d, period));
    setSelectedDays(freeDays);
  };

  const clearDays = () => {
    if (cellAction && (cellAction.type === 'add' || cellAction.type === 'change')) {
      setSelectedDays([cellAction.day]);
    }
  };

  const handleFill = () => {
    if (!cellAction || cellAction.type === 'menu') return;
    if (!selectedTeacher || !selectedSubject || selectedDays.length === 0) {
      toast({ title: 'Error', description: 'Please select teacher, subject, and at least one day.', variant: 'destructive' });
      return;
    }

    // For "change": delete the existing entry first
    if (cellAction.type === 'change') {
      deleteEntry(cellAction.entry.id);
    }

    let addedCount = 0;
    const prevLen = entries.length;

    for (const day of selectedDays) {
      addEntry(day, cellAction.period, selectedTeacher, classId, sectionId, selectedSubject);
    }

    addedCount = entries.length - prevLen + (cellAction.type === 'change' ? 1 : 0);

    const teacher = getTeacher(selectedTeacher);
    const subject = getSubject(selectedSubject);
    const action = cellAction.type === 'change' ? 'updated' : 'added';
    toast({
      title: `Entry ${action}`,
      description: `${teacher?.shortName} - ${subject?.shortName} on ${selectedDays.join(', ')}.`,
    });
    setCellAction(null);
  };

  const handleClearClass = () => {
    clearClassSectionEntries(classId, sectionId);
    toast({ title: 'Class timetable cleared', description: `All entries for ${selectedClassName} - Section ${selectedSectionName} removed.` });
    setShowClearClassDialog(false);
  };

  const isAddOrChange = cellAction?.type === 'add' || cellAction?.type === 'change';
  const dialogPeriod = isAddOrChange ? cellAction!.period : 0;

  const availableTeachersForCell = isAddOrChange
    ? teachers.filter((t) => filteredAssignments.some((a) => a.teacherId === t.id))
    : [];

  const availableSubjectsForTeacher = selectedTeacher
    ? filteredAssignments
        .filter((a) => a.teacherId === selectedTeacher)
        .map((a) => subjects.find((s) => s.id === a.subjectId)!)
        .filter(Boolean)
    : [];

  // For menu display
  const menuEntry = cellAction?.type === 'menu' ? cellAction.entry : null;
  const menuTeacher = menuEntry ? getTeacher(menuEntry.teacherId) : null;
  const menuSubject = menuEntry ? getSubject(menuEntry.subjectId) : null;
  const menuColors = menuEntry ? getSubjectColor(menuEntry.subjectId) : null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-lg">
                {selectedClassName} — Section {selectedSectionName}
              </CardTitle>
              <CardDescription>{activeDays.length} days, {timings.periodsPerDay} periods/day</CardDescription>
            </div>
            {classEntries.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
                onClick={() => setShowClearClassDialog(true)}
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Clear Class
              </Button>
            )}
          </div>
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
            <div style={{ minWidth: `${100 + activeDays.length * 80}px` }}>
              <div className="grid gap-px bg-border rounded-lg overflow-hidden" style={{ gridTemplateColumns: `100px repeat(${activeDays.length}, minmax(80px, 1fr))` }}>
                <div className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground flex items-center justify-center">
                  Day / Period
                </div>
                {activeDays.map((day) => (
                  <div key={day} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
                    {day.slice(0, 3)}
                  </div>
                ))}

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
                        <span className="text-xs font-medium">{getPeriodLabel(period, timings)}</span>
                        <span className="text-[10px] text-muted-foreground">{time}</span>
                      </div>
                      {isBreak ? (
                        <div
                          className="bg-amber-50 dark:bg-amber-950/10 p-2 flex items-center justify-center gap-1.5 text-amber-600"
                          style={{ gridColumn: `span ${activeDays.length}` }}
                        >
                          <Coffee className="h-3 w-3 text-amber-400" />
                          <span className="text-xs font-medium text-amber-500">Break</span>
                        </div>
                      ) : (
                        activeDays.map((day) => {
                          const entry = getEntry(day, period);
                          const teacher = entry ? getTeacher(entry.teacherId) : null;
                          const subject = entry ? getSubject(entry.subjectId) : null;
                          const colors = entry ? getSubjectColor(entry.subjectId) : null;

                          return (
                            <div
                              key={`${day}-${period}`}
                              onClick={() => handleCellClick(day, period)}
                              className={`p-1.5 min-h-[56px] transition-all cursor-pointer select-none ${
                                entry
                                  ? `${colors?.bg || ''} ${colors?.border || ''} border hover:brightness-95 active:scale-95`
                                  : 'bg-card hover:bg-muted/50 active:bg-muted'
                              }`}
                            >
                              {entry ? (
                                <div className="flex flex-col items-center justify-center gap-0.5 h-full">
                                  <span className={`text-xs font-semibold ${colors?.text || ''}`}>
                                    {subject?.shortName || '?'}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {teacher?.shortName || '?'}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <Plus className="h-4 w-4 text-muted-foreground/30" />
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Cell Action Sheet (tap on filled cell) ── */}
      <Sheet open={cellAction?.type === 'menu'} onOpenChange={(open) => !open && setCellAction(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-base">
              {cellAction?.type === 'menu'
                ? `${getPeriodLabel(cellAction.period, timings)} — ${cellAction.day}`
                : ''}
            </SheetTitle>
            {menuEntry && (
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${menuColors?.bg || ''} ${menuColors?.border || ''} border w-fit mx-auto`}>
                <span className={`text-sm font-semibold ${menuColors?.text || ''}`}>
                  {menuSubject?.name || '?'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {menuTeacher?.name || '?'}
                </span>
              </div>
            )}
          </SheetHeader>

          <div className="grid grid-cols-2 gap-3 pb-4">
            <Button
              variant="outline"
              className="h-14 flex-col gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => {
                if (cellAction?.type === 'menu') {
                  openChangeDialog(cellAction.entry, cellAction.day, cellAction.period);
                }
              }}
            >
              <RefreshCw className="h-5 w-5" />
              <span className="text-xs font-medium">Change</span>
            </Button>
            <Button
              variant="outline"
              className="h-14 flex-col gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => {
                if (cellAction?.type === 'menu') {
                  handleDelete(cellAction.entry);
                }
              }}
            >
              <Trash2 className="h-5 w-5" />
              <span className="text-xs font-medium">Delete</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Add / Change Dialog ── */}
      <Dialog
        open={isAddOrChange}
        onOpenChange={(open) => !open && setCellAction(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {cellAction?.type === 'change' ? 'Change Entry' : 'Add Entry'} — {isAddOrChange ? getPeriodLabel(dialogPeriod, timings) : ''}
            </DialogTitle>
            <DialogDescription>
              {cellAction?.type === 'change'
                ? 'Select a new teacher and subject for this slot.'
                : 'Select teacher, subject, and days.'}
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
                    <SelectItem value="_none" disabled>No assigned teachers</SelectItem>
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
                    <SelectItem value="_none" disabled>No assigned subjects</SelectItem>
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

            {/* Multi-day selector only for Add */}
            {cellAction?.type === 'add' && (
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
                    const isFilled = !!getEntry(day, dialogPeriod);
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
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCellAction(null)}>Cancel</Button>
            <Button
              onClick={handleFill}
              disabled={cellAction?.type === 'add' ? selectedDays.length === 0 : false}
            >
              {cellAction?.type === 'change' ? (
                <><RefreshCw className="h-4 w-4 mr-1.5" />Update</>
              ) : (
                <><Plus className="h-4 w-4 mr-1.5" />Add to {selectedDays.length} Day{selectedDays.length !== 1 ? 's' : ''}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Clear Class Dialog ── */}
      <AlertDialog open={showClearClassDialog} onOpenChange={setShowClearClassDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear {selectedClassName} — Section {selectedSectionName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all timetable entries for this class-section. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleClearClass}
            >
              Clear Class
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

