'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTimetableStore } from '@/lib/store';
import { getPeriodLabel } from '@/lib/timetable-utils';
import type { CustomPeriodTiming } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  School,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Users,
  BookOpen,
  Layers,
  Save,
  Timer,
  ArrowUpDown,
} from 'lucide-react';

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type SetupSubTab = 'school' | 'sections' | 'teachers' | 'subjects';

const SUB_TABS: { key: SetupSubTab; label: string; icon: typeof School; gradient: string; bg: string; border: string; text: string; activeText: string }[] = [
  { key: 'school', label: 'School', icon: School, gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-600', activeText: 'text-white' },
  { key: 'sections', label: 'Sections', icon: Layers, gradient: 'from-cyan-500 to-blue-600', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-600', activeText: 'text-white' },
  { key: 'teachers', label: 'Teachers', icon: Users, gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', activeText: 'text-white' },
  { key: 'subjects', label: 'Subjects', icon: BookOpen, gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', activeText: 'text-white' },
];

export function SetupTab() {
  const [activeSubTab, setActiveSubTab] = useState<SetupSubTab>('school');

  return (
    <div className="space-y-5">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        {SUB_TABS.map((tab) => {
          const isActive = activeSubTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0
                ${isActive
                  ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg`
                  : `${tab.bg} ${tab.text} ${tab.border} border hover:shadow-md`
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeSubTab === 'school' && <SchoolSettings />}
      {activeSubTab === 'sections' && <MasterSections />}
      {activeSubTab === 'teachers' && <TeachersPanel />}
      {activeSubTab === 'subjects' && <SubjectsPanel />}
    </div>
  );
}

function SchoolSettings() {
  const { schoolName, timings, setSchoolName, setTimings } = useTimetableStore();
  const { toast } = useToast();
  const [showTimingDialog, setShowTimingDialog] = useState(false);

  const handleDayToggle = (day: string) => {
    const newDays = timings.days.includes(day)
      ? timings.days.filter((d) => d !== day)
      : [...timings.days, day];
    setTimings({ ...timings, days: newDays });
  };

  const handleSave = () => {
    toast({ title: 'Settings saved', description: 'School settings have been updated.' });
  };

  const handleTimingModeChange = (mode: 'equal' | 'custom') => {
    if (mode === 'custom') {
      const customTimings = generateCustomTimingsFromEqual(timings);
      setTimings({ ...timings, periodTimingMode: 'custom', customPeriodTimings: customTimings });
    } else {
      setTimings({ ...timings, periodTimingMode: 'equal' });
    }
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white via-violet-50/30 to-purple-50/20 backdrop-blur-sm overflow-hidden">
      {/* Colored top accent bar */}
      <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-md">
            <School className="h-4 w-4 text-white" />
          </div>
          School Settings
        </CardTitle>
        <CardDescription>Configure your school name and timetable timings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="schoolName">School Name</Label>
          <Input
            id="schoolName"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="Enter school name"
            className="bg-white/70 backdrop-blur-sm border-violet-200/50 focus:border-violet-400"
          />
        </div>

        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="periodsPerDay">Periods Per Day</Label>
            <Input
              id="periodsPerDay"
              type="number"
              min={1}
              max={15}
              value={timings.periodsPerDay}
              onChange={(e) => {
                const newCount = parseInt(e.target.value) || 1;
                const updated = { ...timings, periodsPerDay: newCount };
                if (updated.periodTimingMode === 'custom') {
                  updated.customPeriodTimings = regenerateCustomTimings(updated.customPeriodTimings, newCount, updated.startTime);
                }
                setTimings(updated);
              }}
              className="bg-white/70 backdrop-blur-sm border-violet-200/50 focus:border-violet-400"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time</Label>
            <Input
              id="startTime"
              type="time"
              value={timings.startTime}
              onChange={(e) => {
                const updated = { ...timings, startTime: e.target.value };
                if (updated.periodTimingMode === 'custom' && updated.customPeriodTimings.length > 0) {
                  const [newH, newM] = e.target.value.split(':').map(Number);
                  const [oldH, oldM] = timings.startTime.split(':').map(Number);
                  const delta = (newH * 60 + newM) - (oldH * 60 + oldM);
                  updated.customPeriodTimings = shiftCustomTimings(updated.customPeriodTimings, delta);
                }
                setTimings(updated);
              }}
              className="bg-white/70 backdrop-blur-sm border-violet-200/50 focus:border-violet-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="periodTimingMode">Period Timings</Label>
            <Select
              value={timings.periodTimingMode}
              onValueChange={(v) => handleTimingModeChange(v as 'equal' | 'custom')}
            >
              <SelectTrigger className="bg-white/70 backdrop-blur-sm border-violet-200/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equal">Equal Timings</SelectItem>
                <SelectItem value="custom">Custom Timings</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {timings.periodTimingMode === 'equal' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodDuration">Period Duration (min)</Label>
              <Input
                id="periodDuration"
                type="number"
                min={10}
                max={120}
                value={timings.periodDuration}
                onChange={(e) => setTimings({ ...timings, periodDuration: parseInt(e.target.value) || 45 })}
                className="bg-white/70 backdrop-blur-sm border-violet-200/50 focus:border-violet-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="breakAfterPeriod">Break After Period #</Label>
              <Input
                id="breakAfterPeriod"
                type="number"
                min={0}
                max={15}
                value={timings.breakAfterPeriod}
                onChange={(e) => setTimings({ ...timings, breakAfterPeriod: parseInt(e.target.value) || 0 })}
                className="bg-white/70 backdrop-blur-sm border-violet-200/50 focus:border-violet-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="breakDuration">Break Duration (min)</Label>
              <Input
                id="breakDuration"
                type="number"
                min={0}
                max={60}
                value={timings.breakDuration}
                onChange={(e) => setTimings({ ...timings, breakDuration: parseInt(e.target.value) || 0 })}
                className="bg-white/70 backdrop-blur-sm border-violet-200/50 focus:border-violet-400"
              />
            </div>
          </div>
        )}

        {timings.periodTimingMode === 'custom' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Set individual start and end times for each period. Duration is calculated automatically.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTimingDialog(true)}
                className="border-violet-300 text-violet-600 hover:bg-violet-50"
              >
                <Timer className="h-4 w-4 mr-1.5" />
                Configure Periods
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-violet-100 bg-white/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-violet-50/50">
                    <th className="text-left py-1.5 px-2 font-medium text-violet-700">Period</th>
                    <th className="text-left py-1.5 px-2 font-medium text-violet-700">Start</th>
                    <th className="text-left py-1.5 px-2 font-medium text-violet-700">End</th>
                    <th className="text-left py-1.5 px-2 font-medium text-violet-700">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {timings.customPeriodTimings.map((pt) => {
                    const duration = calcDuration(pt.startTime, pt.endTime);
                    return (
                      <tr key={pt.period} className="border-b last:border-0">
                        <td className="py-1.5 px-2">
                          {pt.isBreak ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200">Break</Badge>
                          ) : (
                            <span className="font-medium">{getPeriodLabel(pt.period, timings)}</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-muted-foreground">{pt.startTime}</td>
                        <td className="py-1.5 px-2 text-muted-foreground">{pt.endTime}</td>
                        <td className="py-1.5 px-2">
                          <Badge variant="outline" className="font-mono text-xs border-violet-200">
                            {duration} min
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Working Days</Label>
          <div className="flex flex-wrap gap-2">
            {ALL_DAYS.map((day) => (
              <Badge
                key={day}
                variant={timings.days.includes(day) ? 'default' : 'outline'}
                className={`cursor-pointer select-none transition-all duration-200 hover:opacity-80 ${
                  timings.days.includes(day)
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 shadow-sm'
                    : 'border-violet-200 text-violet-500 hover:bg-violet-50'
                }`}
                onClick={() => handleDayToggle(day)}
              >
                {day.slice(0, 3)}
              </Badge>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} className="w-full sm:w-auto bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-md">
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </CardContent>

      <CustomPeriodTimingsDialog
        open={showTimingDialog}
        onOpenChange={setShowTimingDialog}
      />
    </Card>
  );
}

// Helper: calculate duration in minutes between two time strings
function calcDuration(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

// Helper: generate custom timings from equal settings
function generateCustomTimingsFromEqual(timings: { periodsPerDay: number; startTime: string; periodDuration: number; breakAfterPeriod: number; breakDuration: number }): CustomPeriodTiming[] {
  const result: CustomPeriodTiming[] = [];
  const [startH, startM] = timings.startTime.split(':').map(Number);
  let currentMinutes = startH * 60 + startM;

  for (let i = 1; i <= timings.periodsPerDay; i++) {
    const isBreak = i === timings.breakAfterPeriod;
    const duration = isBreak ? timings.breakDuration : timings.periodDuration;
    const endMinutes = currentMinutes + duration;
    const formatTime = (m: number) => {
      const h = Math.floor(m / 60);
      const min = m % 60;
      return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    };
    result.push({
      period: i,
      startTime: formatTime(currentMinutes),
      endTime: formatTime(endMinutes),
      isBreak,
    });
    currentMinutes = endMinutes;
  }

  return result;
}

// Helper: regenerate custom timings when period count changes
function regenerateCustomTimings(
  existing: CustomPeriodTiming[],
  newCount: number,
  defaultStart: string
): CustomPeriodTiming[] {
  const result: CustomPeriodTiming[] = [];
  const [startH, startM] = defaultStart.split(':').map(Number);
  let currentMinutes = startH * 60 + startM;

  for (let i = 1; i <= newCount; i++) {
    const existingEntry = existing.find((e) => e.period === i);
    if (existingEntry) {
      result.push(existingEntry);
      const [eh, em] = existingEntry.endTime.split(':').map(Number);
      currentMinutes = eh * 60 + em;
    } else {
      const duration = 45;
      const endMinutes = currentMinutes + duration;
      const formatTime = (m: number) => {
        const h = Math.floor(m / 60);
        const min = m % 60;
        return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      };
      result.push({
        period: i,
        startTime: formatTime(currentMinutes),
        endTime: formatTime(endMinutes),
        isBreak: false,
      });
      currentMinutes = endMinutes;
    }
  }

  return result;
}

// Helper: shift all custom timings by a delta in minutes
function shiftCustomTimings(timings: CustomPeriodTiming[], deltaMinutes: number): CustomPeriodTiming[] {
  return timings.map((pt) => {
    const [sh, sm] = pt.startTime.split(':').map(Number);
    const [eh, em] = pt.endTime.split(':').map(Number);
    const newStart = sh * 60 + sm + deltaMinutes;
    const newEnd = eh * 60 + em + deltaMinutes;
    const formatTime = (m: number) => {
      const h = Math.floor(Math.max(0, Math.min(1439, m)) / 60);
      const min = Math.max(0, Math.min(59, m % 60));
      return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    };
    return {
      ...pt,
      startTime: formatTime(newStart),
      endTime: formatTime(newEnd),
    };
  });
}

// Custom Period Timings Dialog Component
function CustomPeriodTimingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { timings, setTimings } = useTimetableStore();
  const { toast } = useToast();
  const [localTimings, setLocalTimings] = useState<CustomPeriodTiming[]>([]);

  useEffect(() => {
    if (open) {
      if (timings.customPeriodTimings.length === 0) {
        const generated = generateCustomTimingsFromEqual(timings);
        setLocalTimings(generated);
      } else {
        setLocalTimings([...timings.customPeriodTimings]);
      }
    }
  }, [open, timings]);

  const updateTiming = useCallback((period: number, field: 'startTime' | 'endTime' | 'isBreak', value: string | boolean) => {
    setLocalTimings((prev) =>
      prev.map((pt) => (pt.period === period ? { ...pt, [field]: value } : pt))
    );
  }, []);

  const handleSave = () => {
    for (const pt of localTimings) {
      const duration = calcDuration(pt.startTime, pt.endTime);
      if (duration <= 0) {
        toast({
          title: 'Validation Error',
          description: `Period ${pt.period}: End time must be after start time.`,
          variant: 'destructive',
        });
        return;
      }
    }
    for (let i = 0; i < localTimings.length - 1; i++) {
      const current = localTimings[i];
      const next = localTimings[i + 1];
      if (current.endTime > next.startTime) {
        toast({
          title: 'Overlap Detected',
          description: `Period ${current.period} ends at ${current.endTime} but Period ${next.period} starts at ${next.startTime}.`,
          variant: 'destructive',
        });
        return;
      }
    }

    setTimings({ ...timings, periodTimingMode: 'custom', customPeriodTimings: localTimings });
    toast({ title: 'Period timings saved', description: 'Custom period timings have been applied.' });
    onOpenChange(false);
  };

  const handleAutoFill = () => {
    const generated = generateCustomTimingsFromEqual(timings);
    setLocalTimings(generated);
    toast({ title: 'Auto-filled', description: 'Period timings reset based on equal timing settings.' });
  };

  const handleToggleBreak = (period: number) => {
    setLocalTimings((prev) =>
      prev.map((pt) => (pt.period === period ? { ...pt, isBreak: !pt.isBreak } : pt))
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-violet-600" />
            Configure Period Timings
          </DialogTitle>
          <DialogDescription>
            Set start and end time for each period. Duration is calculated automatically.
            You can also mark periods as breaks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-[60px_1fr_1fr_80px_80px] gap-2 px-1 text-xs font-medium text-muted-foreground">
            <span>Period</span>
            <span>Start Time</span>
            <span>End Time</span>
            <span className="text-center">Duration</span>
            <span className="text-center">Break</span>
          </div>

          {localTimings.map((pt) => {
            const duration = calcDuration(pt.startTime, pt.endTime);
            return (
              <div
                key={pt.period}
                className={`grid grid-cols-[60px_1fr_1fr_80px_80px] gap-2 px-1 items-center rounded-lg p-2 transition-colors ${
                  pt.isBreak ? 'bg-amber-50 dark:bg-amber-950/20' : 'hover:bg-muted/50'
                }`}
              >
                <span className="text-sm font-medium">
                  {pt.isBreak ? 'Break' : getPeriodLabel(pt.period, timings)}
                </span>
                <Input
                  type="time"
                  value={pt.startTime}
                  onChange={(e) => updateTiming(pt.period, 'startTime', e.target.value)}
                  className="h-9"
                />
                <Input
                  type="time"
                  value={pt.endTime}
                  onChange={(e) => updateTiming(pt.period, 'endTime', e.target.value)}
                  className="h-9"
                />
                <div className="text-center">
                  <Badge
                    variant={duration <= 0 ? 'destructive' : 'outline'}
                    className="font-mono text-xs"
                  >
                    {duration} min
                  </Badge>
                </div>
                <div className="flex justify-center">
                  <Button
                    variant={pt.isBreak ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleToggleBreak(pt.period)}
                  >
                    {pt.isBreak ? 'Yes' : 'No'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleAutoFill} className="sm:mr-auto">
            <ArrowUpDown className="h-4 w-4 mr-1.5" />
            Auto-fill from Equal Settings
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white">
            <Save className="h-4 w-4 mr-1.5" />
            Save Timings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MasterSections() {
  const { sections, classes, addSection, updateSection, deleteSection } = useTimetableStore();
  const { toast } = useToast();
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSection, setEditingSection] = useState<{ id: string; name: string } | null>(null);

  const handleAdd = () => {
    const name = newSectionName.trim();
    if (!name) {
      toast({ title: 'Error', description: 'Section name is required.', variant: 'destructive' });
      return;
    }
    if (sections.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: 'Error', description: 'A section with this name already exists.', variant: 'destructive' });
      return;
    }
    addSection(name);
    setNewSectionName('');
    toast({ title: 'Section added', description: `"${name}" has been added to the master list.` });
  };

  const handleUpdate = () => {
    if (!editingSection) return;
    const name = editingSection.name.trim();
    if (!name) {
      toast({ title: 'Error', description: 'Section name is required.', variant: 'destructive' });
      return;
    }
    updateSection(editingSection.id, name);
    setEditingSection(null);
    toast({ title: 'Section updated', description: `Section has been renamed to "${name}".` });
  };

  const handleDelete = (id: string, name: string) => {
    deleteSection(id);
    toast({ title: 'Section deleted', description: `"${name}" has been removed from all classes, assignments, and timetable entries.` });
  };

  const getClassCountForSection = (sectionId: string) => {
    return classes.filter((c) => c.sectionIds.includes(sectionId)).length;
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white via-cyan-50/30 to-blue-50/20 backdrop-blur-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md">
            <Layers className="h-4 w-4 text-white" />
          </div>
          Master Sections
        </CardTitle>
        <CardDescription>
          Create and manage sections (e.g., A, B, C). Sections deleted here are automatically removed from all classes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            placeholder="Section name (e.g., A, B, C)"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="max-w-xs bg-white/70 backdrop-blur-sm border-cyan-200/50 focus:border-cyan-400"
          />
          <Button onClick={handleAdd} size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-md">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {sections.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-cyan-50 mb-3">
              <Layers className="h-6 w-6 text-cyan-400" />
            </div>
            <p className="text-sm text-muted-foreground">No sections yet. Add your first section above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sections.map((section) => {
              const classCount = getClassCountForSection(section.id);
              return (
                <div
                  key={section.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-cyan-100 bg-white/60 backdrop-blur-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0 shadow-sm shrink-0">
                      {section.name}
                    </Badge>
                    {classCount > 0 && (
                      <span className="text-xs text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded-md whitespace-nowrap font-medium">
                        {classCount} class{classCount !== 1 ? 'es' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-cyan-600 hover:bg-cyan-50"
                      onClick={() => setEditingSection({ id: section.id, name: section.name })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Section &quot;{section.name}&quot;?</DialogTitle>
                          <DialogDescription>
                            This will remove the section from the master list and automatically unassign it
                            from {classCount} class{classCount !== 1 ? 'es' : ''}.
                            All related timetable entries and assignments will also be removed.
                            This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="destructive" onClick={() => handleDelete(section.id, section.name)}>
                            Delete Section
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={!!editingSection} onOpenChange={(open) => !open && setEditingSection(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Section</DialogTitle>
              <DialogDescription>Update the section name.</DialogDescription>
            </DialogHeader>
            {editingSection && (
              <Input
                value={editingSection.name}
                onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                autoFocus
              />
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSection(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white">
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function TeachersPanel() {
  const { teachers, addTeacher, updateTeacher, deleteTeacher } = useTimetableStore();
  const { toast } = useToast();
  const [newName, setNewName] = useState('');
  const [newShortName, setNewShortName] = useState('');
  const [editingTeacher, setEditingTeacher] = useState<{ id: string; name: string; shortName: string } | null>(null);

  const handleAdd = () => {
    if (!newName.trim() || !newShortName.trim()) {
      toast({ title: 'Error', description: 'Both name and short name are required.', variant: 'destructive' });
      return;
    }
    addTeacher(newName.trim(), newShortName.trim());
    setNewName('');
    setNewShortName('');
    toast({ title: 'Teacher added', description: `${newName.trim()} has been added.` });
  };

  const handleUpdate = () => {
    if (!editingTeacher) return;
    if (!editingTeacher.name.trim() || !editingTeacher.shortName.trim()) {
      toast({ title: 'Error', description: 'Both name and short name are required.', variant: 'destructive' });
      return;
    }
    updateTeacher(editingTeacher.id, editingTeacher.name.trim(), editingTeacher.shortName.trim());
    setEditingTeacher(null);
    toast({ title: 'Teacher updated', description: 'Teacher details have been updated.' });
  };

  const handleDelete = (id: string, name: string) => {
    deleteTeacher(id);
    toast({ title: 'Teacher deleted', description: `${name} has been removed. Related entries and assignments are also removed.` });
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white via-amber-50/30 to-orange-50/20 backdrop-blur-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-md">
            <Users className="h-4 w-4 text-white" />
          </div>
          Teachers
        </CardTitle>
        <CardDescription>Manage your teaching staff</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Full Name"
            className="sm:max-w-[200px] bg-white/70 backdrop-blur-sm border-amber-200/50 focus:border-amber-400"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Input
            value={newShortName}
            onChange={(e) => setNewShortName(e.target.value)}
            placeholder="Short Name"
            className="sm:max-w-[120px] bg-white/70 backdrop-blur-sm border-amber-200/50 focus:border-amber-400"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button onClick={handleAdd} size="sm" className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md">
            <Plus className="h-4 w-4 mr-1" />
            Add Teacher
          </Button>
        </div>

        {teachers.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-amber-50 mb-3">
              <Users className="h-6 w-6 text-amber-400" />
            </div>
            <p className="text-sm text-muted-foreground">No teachers yet. Add your first teacher above.</p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="flex items-center justify-between p-3 rounded-xl border border-amber-100 bg-white/60 backdrop-blur-sm hover:shadow-md transition-shadow"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{teacher.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[10px] px-1.5 shadow-sm">
                      {teacher.shortName}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Teacher</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                    onClick={() => setEditingTeacher(teacher)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Teacher?</DialogTitle>
                        <DialogDescription>
                          Delete &quot;{teacher.name}&quot;? All timetable entries and assignments for this teacher will be removed.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="destructive" onClick={() => handleDelete(teacher.id, teacher.name)}>
                          Delete
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!editingTeacher} onOpenChange={(open) => !open && setEditingTeacher(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Teacher</DialogTitle>
            </DialogHeader>
            {editingTeacher && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Full Name</Label>
                  <Input
                    value={editingTeacher.name}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Short Name</Label>
                  <Input
                    value={editingTeacher.shortName}
                    onChange={(e) => setEditingTeacher({ ...editingTeacher, shortName: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTeacher(null)}>Cancel</Button>
              <Button onClick={handleUpdate} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white">
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function SubjectsPanel() {
  const { subjects, addSubject, updateSubject, deleteSubject } = useTimetableStore();
  const { toast } = useToast();
  const [newName, setNewName] = useState('');
  const [newShortName, setNewShortName] = useState('');
  const [editingSubject, setEditingSubject] = useState<{ id: string; name: string; shortName: string } | null>(null);

  const handleAdd = () => {
    if (!newName.trim() || !newShortName.trim()) {
      toast({ title: 'Error', description: 'Both name and short name are required.', variant: 'destructive' });
      return;
    }
    addSubject(newName.trim(), newShortName.trim());
    setNewName('');
    setNewShortName('');
    toast({ title: 'Subject added', description: `${newName.trim()} has been added.` });
  };

  const handleUpdate = () => {
    if (!editingSubject) return;
    if (!editingSubject.name.trim() || !editingSubject.shortName.trim()) {
      toast({ title: 'Error', description: 'Both name and short name are required.', variant: 'destructive' });
      return;
    }
    updateSubject(editingSubject.id, editingSubject.name.trim(), editingSubject.shortName.trim());
    setEditingSubject(null);
    toast({ title: 'Subject updated', description: 'Subject details have been updated.' });
  };

  const handleDelete = (id: string, name: string) => {
    deleteSubject(id);
    toast({ title: 'Subject deleted', description: `${name} has been removed. Related entries and assignments are also removed.` });
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 backdrop-blur-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 shadow-md">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          Subjects
        </CardTitle>
        <CardDescription>Manage subjects taught at your school</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Subject Name"
            className="sm:max-w-[200px] bg-white/70 backdrop-blur-sm border-emerald-200/50 focus:border-emerald-400"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Input
            value={newShortName}
            onChange={(e) => setNewShortName(e.target.value)}
            placeholder="Short Name"
            className="sm:max-w-[120px] bg-white/70 backdrop-blur-sm border-emerald-200/50 focus:border-emerald-400"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button onClick={handleAdd} size="sm" className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md">
            <Plus className="h-4 w-4 mr-1" />
            Add Subject
          </Button>
        </div>

        {subjects.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-emerald-50 mb-3">
              <BookOpen className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-sm text-muted-foreground">No subjects yet. Add your first subject above.</p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="flex items-center justify-between p-3 rounded-xl border border-emerald-100 bg-white/60 backdrop-blur-sm hover:shadow-md transition-shadow"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{subject.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 text-[10px] px-1.5 shadow-sm">
                      {subject.shortName}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Subject</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                    onClick={() => setEditingSubject(subject)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Subject?</DialogTitle>
                        <DialogDescription>
                          Delete &quot;{subject.name}&quot;? All timetable entries and assignments for this subject will be removed.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="destructive" onClick={() => handleDelete(subject.id, subject.name)}>
                          Delete
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!editingSubject} onOpenChange={(open) => !open && setEditingSubject(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Subject</DialogTitle>
            </DialogHeader>
            {editingSubject && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Subject Name</Label>
                  <Input
                    value={editingSubject.name}
                    onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Short Name</Label>
                  <Input
                    value={editingSubject.shortName}
                    onChange={(e) => setEditingSubject({ ...editingSubject, shortName: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSubject(null)}>Cancel</Button>
              <Button onClick={handleUpdate} className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white">
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
