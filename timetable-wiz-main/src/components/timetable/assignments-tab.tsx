'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTimetableStore } from '@/lib/store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Trash2,
  UserCheck,
  AlertCircle,
  Pencil,
  ClipboardList,
  Users,
  BookOpen,
  GraduationCap,
  X,
} from 'lucide-react';

type AssignmentSubTab = 'new' | 'by-teacher' | 'by-class' | 'by-subject';

const SUB_TABS: { key: AssignmentSubTab; label: string; icon: typeof ClipboardList }[] = [
  { key: 'new', label: 'New Assignment', icon: Plus },
  { key: 'by-teacher', label: 'By Teacher', icon: Users },
  { key: 'by-class', label: 'By Class', icon: GraduationCap },
  { key: 'by-subject', label: 'By Subject', icon: BookOpen },
];

export function AssignmentsTab() {
  const [activeSubTab, setActiveSubTab] = useState<AssignmentSubTab>('new');

  return (
    <div className="space-y-4">
      {/* Sub-tab navigation */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 border ${
                isActive
                  ? 'bg-[#AF52DE10] border-[#AF52DE30] text-[#AF52DE] shadow-sm'
                  : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.03] border-transparent'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeSubTab === 'new' && <NewAssignmentCard />}
      {activeSubTab === 'by-teacher' && <ByTeacherView />}
      {activeSubTab === 'by-class' && <ByClassView />}
      {activeSubTab === 'by-subject' && <BySubjectView />}
    </div>
  );
}

/* ===== New Assignment (single + bulk) ===== */

function NewAssignmentCard() {
  const { teachers, classes, sections, subjects, addAssignment } = useTimetableStore();
  const { toast } = useToast();

  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState(false);

  const availableSections = selectedClass
    ? classes.find((c) => c.id === selectedClass)?.sectionIds || []
    : [];

  const handleSingleAdd = () => {
    if (!selectedTeacher || !selectedClass || !selectedSection || selectedSubjects.length === 0) {
      toast({ title: 'Error', description: 'Please select teacher, class, section and at least one subject.', variant: 'destructive' });
      return;
    }

    const teacher = teachers.find((t) => t.id === selectedTeacher);
    const cls = classes.find((c) => c.id === selectedClass);
    const section = sections.find((s) => s.id === selectedSection);

    for (const subjectId of selectedSubjects) {
      addAssignment(selectedTeacher, selectedClass, selectedSection, subjectId);
    }

    const subjectNames = selectedSubjects
      .map((sid) => subjects.find((s) => s.id === sid)?.name)
      .filter(Boolean)
      .join(', ');

    toast({
      title: `${selectedSubjects.length > 1 ? 'Assignments created' : 'Assignment created'}`,
      description: `${teacher?.name} assigned to ${cls?.name}-${section?.name} for: ${subjectNames}.`,
    });

    setSelectedSubjects([]);
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const hasData = teachers.length > 0 && classes.length > 0 && sections.length > 0 && subjects.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              New Assignment
            </CardTitle>
            <CardDescription>
              Assign teacher(s) to class, section, and subject(s)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Multi-Subject</Label>
            <button
              onClick={() => { setBulkMode(!bulkMode); setSelectedSubjects([]); }}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${bulkMode ? 'bg-[#AF52DE]' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${bulkMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              You need at least one teacher, class (with sections assigned), and subject before creating assignments.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Teacher</Label>
            <Select value={selectedTeacher} onValueChange={(v) => { setSelectedTeacher(v); setSelectedClass(''); setSelectedSection(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.shortName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedSection(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes
                  .filter((c) => c.sectionIds.length > 0)
                  .map((c) => (
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Subject{bulkMode ? 's' : ''}</Label>
              {bulkMode && selectedSubjects.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground"
                  onClick={() => setSelectedSubjects([])}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear ({selectedSubjects.length})
                </Button>
              )}
            </div>
            {bulkMode ? (
              <div className="border rounded-lg max-h-[160px] overflow-y-auto p-2 space-y-1">
                {subjects.map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                      selectedSubjects.includes(s.id)
                        ? 'bg-[#AF52DE10] border border-[#AF52DE30]'
                        : 'hover:bg-muted/50 border border-transparent'
                    }`}
                  >
                    <Checkbox
                      checked={selectedSubjects.includes(s.id)}
                      onCheckedChange={() => toggleSubject(s.id)}
                    />
                    <span className="text-sm">{s.name}</span>
                    <Badge variant="secondary" className="ml-auto text-[10px]">{s.shortName}</Badge>
                  </label>
                ))}
              </div>
            ) : (
              <Select
                value={selectedSubjects[0] || ''}
                onValueChange={(v) => setSelectedSubjects([v])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {bulkMode && selectedSubjects.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Selected:</span>
            {selectedSubjects.map((sid) => {
              const sub = subjects.find((s) => s.id === sid);
              return (
                <Badge key={sid} variant="secondary" className="text-xs">
                  {sub?.shortName || '?'}
                  <button onClick={() => toggleSubject(sid)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}

        <Button onClick={handleSingleAdd} disabled={!hasData || selectedSubjects.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          {bulkMode ? `Create ${selectedSubjects.length} Assignment${selectedSubjects.length !== 1 ? 's' : ''}` : 'Create Assignment'}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ===== By Teacher View ===== */

function ByTeacherView() {
  const { assignments, teachers, classes, sections, subjects, deleteAssignment, updateAssignment } = useTimetableStore();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [editingAssignment, setEditingAssignment] = useState<{
    id: string;
    teacherId: string;
    classId: string;
    sectionId: string;
    subjectId: string;
  } | null>(null);

  const getTeacher = (id: string) => teachers.find((t) => t.id === id);
  const getClass = (id: string) => classes.find((c) => c.id === id);
  const getSection = (id: string) => sections.find((s) => s.id === id);
  const getSubject = (id: string) => subjects.find((s) => s.id === id);

  const filteredTeachers = useMemo(() => {
    if (!search.trim()) return teachers;
    const q = search.toLowerCase();
    return teachers.filter((t) => t.name.toLowerCase().includes(q) || t.shortName.toLowerCase().includes(q));
  }, [teachers, search]);

  const groupedByTeacher = useMemo(() =>
    filteredTeachers.map((teacher) => ({
      teacher,
      assignments: assignments.filter((a) => a.teacherId === teacher.id),
    })).filter((g) => g.assignments.length > 0),
    [filteredTeachers, assignments]
  );

  const handleDelete = (id: string) => {
    deleteAssignment(id);
    toast({ title: 'Assignment deleted', description: 'The assignment and related timetable entries have been removed.' });
  };

  const handleUpdate = () => {
    if (!editingAssignment) return;
    updateAssignment(editingAssignment.id, editingAssignment.teacherId, editingAssignment.classId, editingAssignment.sectionId, editingAssignment.subjectId);
    toast({ title: 'Assignment updated', description: 'The assignment has been modified.' });
    setEditingAssignment(null);
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Search teachers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <Badge variant="secondary">{groupedByTeacher.reduce((sum, g) => sum + g.assignments.length, 0)} total</Badge>
      </div>

      {groupedByTeacher.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {search ? 'No matching teachers found.' : 'No assignments yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groupedByTeacher.map(({ teacher, assignments: tAssignments }) => (
            <Card key={teacher.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{teacher.shortName}</Badge>
                  <span className="font-medium">{teacher.name}</span>
                  <Badge variant="outline" className="ml-auto">{tAssignments.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {tAssignments.map((a) => {
                    const cls = getClass(a.classId);
                    const sec = getSection(a.sectionId);
                    const sub = getSubject(a.subjectId);
                    return (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className="min-w-0">
                          <span className="font-medium text-sm">{sub?.shortName || '?'}</span>
                          <span className="text-muted-foreground mx-1">—</span>
                          <span className="text-sm">{cls?.name || '?'}</span>
                          <span className="text-muted-foreground mx-0.5">-</span>
                          <span className="text-sm">{sec?.name || '?'}</span>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingAssignment(a)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(a.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Assignment Dialog */}
      <Dialog open={!!editingAssignment} onOpenChange={(open) => !open && setEditingAssignment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>Modify the teacher, class, section, or subject for this assignment.</DialogDescription>
          </DialogHeader>
          {editingAssignment && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Teacher</Label>
                <Select
                  value={editingAssignment.teacherId}
                  onValueChange={(v) => setEditingAssignment({ ...editingAssignment, teacherId: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name} ({t.shortName})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Class</Label>
                <Select
                  value={editingAssignment.classId}
                  onValueChange={(v) => setEditingAssignment({ ...editingAssignment, classId: v, sectionId: '' })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {classes.filter((c) => c.sectionIds.length > 0).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Select
                  value={editingAssignment.sectionId}
                  onValueChange={(v) => setEditingAssignment({ ...editingAssignment, sectionId: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {classes.find((c) => c.id === editingAssignment.classId)?.sectionIds.map((sid) => {
                      const s = sections.find((sec) => sec.id === sid);
                      return <SelectItem key={sid} value={sid}>Section {s?.name}</SelectItem>;
                    }) || []}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select
                  value={editingAssignment.subjectId}
                  onValueChange={(v) => setEditingAssignment({ ...editingAssignment, subjectId: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAssignment(null)}>Cancel</Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ===== By Class View ===== */

function ByClassView() {
  const { assignments, teachers, classes, sections, subjects, deleteAssignment } = useTimetableStore();
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  const getTeacher = (id: string) => teachers.find((t) => t.id === id);
  const getSection = (id: string) => sections.find((s) => s.id === id);
  const getSubject = (id: string) => subjects.find((s) => s.id === id);

  const filteredClasses = useMemo(() => {
    if (!search.trim()) return classes.filter((c) => c.sectionIds.length > 0);
    const q = search.toLowerCase();
    return classes.filter((c) => c.name.toLowerCase().includes(q) && c.sectionIds.length > 0);
  }, [classes, search]);

  const groupedByClass = useMemo(() =>
    filteredClasses.map((cls) => ({
      class: cls,
      assignments: assignments.filter((a) => a.classId === cls.id),
    })),
    [filteredClasses, assignments]
  );

  const handleDelete = (id: string) => {
    deleteAssignment(id);
    toast({ title: 'Assignment deleted', description: 'The assignment and related timetable entries have been removed.' });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Search classes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <Badge variant="secondary">{assignments.length} total</Badge>
      </div>

      {groupedByClass.filter((g) => g.assignments.length > 0).length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {search ? 'No matching classes found.' : 'No assignments yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groupedByClass.filter((g) => g.assignments.length > 0).map(({ class: cls, assignments: cAssignments }) => {
            // Group by section
            const bySection = cls.sectionIds
              .map((sid) => ({
                section: getSection(sid),
                assignments: cAssignments.filter((a) => a.sectionId === sid),
              }))
              .filter((g) => g.section && g.assignments.length > 0);

            return (
              <Card key={cls.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-[#007AFF]" />
                    <span className="font-semibold">{cls.name}</span>
                    <Badge variant="outline" className="ml-auto">{cAssignments.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {bySection.map(({ section, assignments: secAssignments }) => (
                    <div key={section!.id}>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Section {section!.name}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {secAssignments.map((a) => {
                          const teacher = getTeacher(a.teacherId);
                          const sub = getSubject(a.subjectId);
                          return (
                            <div key={a.id} className="flex items-center justify-between p-2 rounded-md border text-sm">
                              <div className="min-w-0">
                                <span className="font-medium">{sub?.shortName || '?'}</span>
                                <span className="text-muted-foreground mx-1">by</span>
                                <span>{teacher?.shortName || '?'}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(a.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ===== By Subject View ===== */

function BySubjectView() {
  const { assignments, teachers, classes, sections, subjects, deleteAssignment } = useTimetableStore();
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  const getTeacher = (id: string) => teachers.find((t) => t.id === id);
  const getClass = (id: string) => classes.find((c) => c.id === id);
  const getSection = (id: string) => sections.find((s) => s.id === id);

  const filteredSubjects = useMemo(() => {
    if (!search.trim()) return subjects;
    const q = search.toLowerCase();
    return subjects.filter((s) => s.name.toLowerCase().includes(q) || s.shortName.toLowerCase().includes(q));
  }, [subjects, search]);

  const groupedBySubject = useMemo(() =>
    filteredSubjects.map((subject) => ({
      subject,
      assignments: assignments.filter((a) => a.subjectId === subject.id),
    })),
    [filteredSubjects, assignments]
  );

  const handleDelete = (id: string) => {
    deleteAssignment(id);
    toast({ title: 'Assignment deleted', description: 'The assignment and related timetable entries have been removed.' });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Search subjects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <Badge variant="secondary">{assignments.length} total</Badge>
      </div>

      {groupedBySubject.filter((g) => g.assignments.length > 0).length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {search ? 'No matching subjects found.' : 'No assignments yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groupedBySubject.filter((g) => g.assignments.length > 0).map(({ subject, assignments: sAssignments }) => (
            <Card key={subject.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#34C759]" />
                  <span className="font-semibold">{subject.name}</span>
                  <Badge variant="secondary">{subject.shortName}</Badge>
                  <Badge variant="outline" className="ml-auto">{sAssignments.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {sAssignments.map((a) => {
                    const teacher = getTeacher(a.teacherId);
                    const cls = getClass(a.classId);
                    const sec = getSection(a.sectionId);
                    return (
                      <div key={a.id} className="flex items-center justify-between p-2 rounded-md border text-sm">
                        <div className="min-w-0">
                          <span className="font-medium">{teacher?.shortName || '?'}</span>
                          <span className="text-muted-foreground mx-1">—</span>
                          <span>{cls?.name || '?'}</span>
                          <span className="text-muted-foreground mx-0.5">-</span>
                          <span>{sec?.name || '?'}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(a.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
