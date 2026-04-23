'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useTimetableStore } from '@/lib/store';
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
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  CheckSquare,
  Layers,
} from 'lucide-react';

export function ClassesTab() {
  return (
    <div className="space-y-6">
      <ClassesPanel />
    </div>
  );
}

function ClassesPanel() {
  const { classes, sections, addClass, updateClass, deleteClass, assignSectionToClass, removeSectionFromClass } =
    useTimetableStore();
  const { toast } = useToast();
  const [newClassName, setNewClassName] = useState('');
  const [editingClass, setEditingClass] = useState<{ id: string; name: string } | null>(null);
  const [editingSectionsClassId, setEditingSectionsClassId] = useState<string | null>(null);

  const handleAdd = () => {
    const name = newClassName.trim();
    if (!name) {
      toast({ title: 'Error', description: 'Class name is required.', variant: 'destructive' });
      return;
    }
    addClass(name);
    setNewClassName('');
    toast({ title: 'Class added', description: `"${name}" has been created with no sections.` });
  };

  const handleUpdate = () => {
    if (!editingClass) return;
    const name = editingClass.name.trim();
    if (!name) {
      toast({ title: 'Error', description: 'Class name is required.', variant: 'destructive' });
      return;
    }
    updateClass(editingClass.id, name);
    setEditingClass(null);
    toast({ title: 'Class updated', description: `Class has been renamed to "${name}".` });
  };

  const handleDelete = (id: string, name: string) => {
    deleteClass(id);
    toast({ title: 'Class deleted', description: `"${name}" has been removed along with all related entries and assignments.` });
  };

  const handleToggleSection = (classId: string, sectionId: string, isChecked: boolean) => {
    if (isChecked) {
      assignSectionToClass(classId, sectionId);
    } else {
      removeSectionFromClass(classId, sectionId);
    }
  };

  const getSectionName = (sectionId: string) => {
    return sections.find((s) => s.id === sectionId)?.name || 'Unknown';
  };

  const getEditingClass = () => {
    return classes.find((c) => c.id === editingSectionsClassId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Classes
        </CardTitle>
        <CardDescription>
          Manage classes and assign sections from the master list. Classes start with no sections.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            placeholder="Class name (e.g., Grade 1, Class 10)"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="max-w-xs"
          />
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Class
          </Button>
        </div>

        {classes.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No classes yet. Add your first class above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="rounded-lg border bg-card p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <h3 className="font-semibold text-base truncate">{cls.name}</h3>
                    <Badge variant="secondary" className="shrink-0">
                      {cls.sectionIds.length} section{cls.sectionIds.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingSectionsClassId(cls.id)}
                      disabled={sections.length === 0}
                    >
                      <CheckSquare className="h-3.5 w-3.5 mr-1" />
                      Edit Sections
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingClass({ id: cls.id, name: cls.name })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Class &quot;{cls.name}&quot;?</DialogTitle>
                          <DialogDescription>
                            This will permanently delete the class and remove all related timetable entries and assignments.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="destructive" onClick={() => handleDelete(cls.id, cls.name)}>
                            Delete Class
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Assigned Sections */}
                {cls.sectionIds.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-1">
                    No sections assigned. Click &quot;Edit Sections&quot; to assign sections from the master list.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 pl-1">
                    {cls.sectionIds.map((sid) => (
                      <Badge key={sid} variant="outline">
                        Section {getSectionName(sid)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Edit Class Name Dialog */}
        <Dialog open={!!editingClass} onOpenChange={(open) => !open && setEditingClass(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Class Name</DialogTitle>
              <DialogDescription>Update the class name.</DialogDescription>
            </DialogHeader>
            {editingClass && (
              <Input
                value={editingClass.name}
                onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                autoFocus
              />
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingClass(null)}>Cancel</Button>
              <Button onClick={handleUpdate}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Sections Dialog */}
        <Dialog open={!!editingSectionsClassId} onOpenChange={(open) => !open && setEditingSectionsClassId(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Sections</DialogTitle>
              <DialogDescription>
                {getEditingClass()
                  ? `Select sections from the master list to assign to "${getEditingClass()!.name}".`
                  : 'Select sections to assign.'}
              </DialogDescription>
            </DialogHeader>
            {editingSectionsClassId && getEditingClass() && (
              <div className="space-y-3">
                {sections.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No sections available. Go to Setup tab to create sections first.
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {sections.map((section) => {
                      const isChecked = getEditingClass()!.sectionIds.includes(section.id);
                      return (
                        <label
                          key={section.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isChecked
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted/50'
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              handleToggleSection(editingSectionsClassId, section.id, !!checked)
                            }
                          />
                          <div>
                            <span className="font-medium">Section {section.name}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setEditingSectionsClassId(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
