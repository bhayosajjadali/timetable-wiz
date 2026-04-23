import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Section, Class, Teacher, Subject, Timings, Assignment, Entry, Substitute, CustomPeriodTiming } from './types';

const defaultTimings: Timings = {
  periodsPerDay: 8,
  startTime: '08:00',
  periodDuration: 45,
  breakAfterPeriod: 4,
  breakDuration: 20,
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  periodTimingMode: 'equal',
  customPeriodTimings: [],
};

interface TimetableStore {
  // State
  schoolName: string;
  timings: Timings;
  sections: Section[];
  classes: Class[];
  teachers: Teacher[];
  subjects: Subject[];
  assignments: Assignment[];
  entries: Entry[];
  substitutes: Substitute[];

  // School Settings
  setSchoolName: (name: string) => void;
  setTimings: (timings: Timings) => void;

  // Sections (Master List)
  addSection: (name: string) => void;
  updateSection: (id: string, name: string) => void;
  deleteSection: (id: string) => void;

  // Classes
  addClass: (name: string) => void;
  updateClass: (id: string, name: string) => void;
  deleteClass: (id: string) => void;
  assignSectionToClass: (classId: string, sectionId: string) => void;
  removeSectionFromClass: (classId: string, sectionId: string) => void;

  // Teachers
  addTeacher: (name: string, shortName: string) => void;
  updateTeacher: (id: string, name: string, shortName: string) => void;
  deleteTeacher: (id: string) => void;

  // Subjects
  addSubject: (name: string, shortName: string) => void;
  updateSubject: (id: string, name: string, shortName: string) => void;
  deleteSubject: (id: string) => void;

  // Assignments
  addAssignment: (teacherId: string, classId: string, sectionId: string, subjectId: string) => void;
  updateAssignment: (id: string, teacherId: string, classId: string, sectionId: string, subjectId: string) => void;
  deleteAssignment: (id: string) => void;
  deleteAssignmentsByIds: (ids: string[]) => void;

  // Entries
  addEntry: (day: string, period: number, teacherId: string, classId: string, sectionId: string, subjectId: string) => void;
  deleteEntry: (id: string) => void;
  deleteEntriesByClassSection: (classId: string, sectionId: string) => void;

  // Substitutes
  addSubstitute: (date: string, day: string, entryId: string, originalTeacherId: string, substituteTeacherId: string) => void;
  deleteSubstitute: (id: string) => void;

  // Bulk Import
  bulkImportSections: (names: string[]) => { added: number; skipped: number };
  bulkImportClasses: (items: { name: string; sectionNames: string[] }[]) => { added: number; skipped: number };
  bulkImportTeachers: (items: { name: string; shortName: string }[]) => { added: number; skipped: number };
  bulkImportSubjects: (items: { name: string; shortName: string }[]) => { added: number; skipped: number };
  bulkImportEntries: (items: { day: string; period: number; teacherName: string; className: string; sectionName: string; subjectName: string }[]) => { added: number; skipped: number; errors: string[] };
  bulkImportPeriodTimings: (items: CustomPeriodTiming[]) => { added: number; errors: string[] };
  replaceAllData: (data: {
    schoolName?: string;
    timings?: Timings;
    sections?: Section[];
    classes?: Class[];
    teachers?: Teacher[];
    subjects?: Subject[];
    assignments?: Assignment[];
    entries?: Entry[];
    substitutes?: Substitute[];
  }) => void;
  clearAllData: () => void;
}

export const useTimetableStore = create<TimetableStore>()(
  persist(
    (set) => ({
      // Initial State
      schoolName: 'My School',
      timings: defaultTimings,
      sections: [],
      classes: [],
      teachers: [],
      subjects: [],
      assignments: [],
      entries: [],
      substitutes: [],

      // School Settings
      setSchoolName: (name) => set({ schoolName: name }),
      setTimings: (timings) => set({ timings }),

      // Sections (Master List)
      addSection: (name) =>
        set((state) => ({
          sections: [...state.sections, { id: crypto.randomUUID(), name }],
        })),

      updateSection: (id, name) =>
        set((state) => ({
          sections: state.sections.map((s) => (s.id === id ? { ...s, name } : s)),
        })),

      deleteSection: (id) =>
        set((state) => {
          const removedEntryIds = new Set(
            state.entries.filter((e) => e.sectionId === id).map((e) => e.id)
          );
          return {
            // 1. Remove from master sections list
            sections: state.sections.filter((s) => s.id !== id),
            // 2. Remove sectionId from ALL classes' sectionIds arrays
            classes: state.classes.map((c) => ({
              ...c,
              sectionIds: c.sectionIds.filter((sid) => sid !== id),
            })),
            // 3. Remove all entries that reference this sectionId
            entries: state.entries.filter((e) => e.sectionId !== id),
            // 4. Remove all assignments that reference this sectionId
            assignments: state.assignments.filter((a) => a.sectionId !== id),
            // 5. Clean up substitutes referencing removed entries
            substitutes: state.substitutes.filter((s) => !removedEntryIds.has(s.entryId)),
          };
        }),

      // Classes
      addClass: (name) =>
        set((state) => ({
          classes: [...state.classes, { id: crypto.randomUUID(), name, sectionIds: [] }],
        })),

      updateClass: (id, name) =>
        set((state) => ({
          classes: state.classes.map((c) => (c.id === id ? { ...c, name } : c)),
        })),

      deleteClass: (id) =>
        set((state) => {
          const removedEntryIds = new Set(
            state.entries.filter((e) => e.classId === id).map((e) => e.id)
          );
          return {
            classes: state.classes.filter((c) => c.id !== id),
            entries: state.entries.filter((e) => e.classId !== id),
            assignments: state.assignments.filter((a) => a.classId !== id),
            substitutes: state.substitutes.filter((s) => !removedEntryIds.has(s.entryId)),
          };
        }),

      assignSectionToClass: (classId, sectionId) =>
        set((state) => ({
          classes: state.classes.map((c) =>
            c.id === classId && !c.sectionIds.includes(sectionId)
              ? { ...c, sectionIds: [...c.sectionIds, sectionId] }
              : c
          ),
        })),

      removeSectionFromClass: (classId, sectionId) =>
        set((state) => ({
          classes: state.classes.map((c) =>
            c.id === classId
              ? { ...c, sectionIds: c.sectionIds.filter((sid) => sid !== sectionId) }
              : c
          ),
        })),

      // Teachers
      addTeacher: (name, shortName) =>
        set((state) => ({
          teachers: [...state.teachers, { id: crypto.randomUUID(), name, shortName }],
        })),

      updateTeacher: (id, name, shortName) =>
        set((state) => ({
          teachers: state.teachers.map((t) => (t.id === id ? { ...t, name, shortName } : t)),
        })),

      deleteTeacher: (id) =>
        set((state) => ({
          teachers: state.teachers.filter((t) => t.id !== id),
          entries: state.entries.filter((e) => e.teacherId !== id),
          assignments: state.assignments.filter((a) => a.teacherId !== id),
          substitutes: state.substitutes.filter((s) => s.originalTeacherId !== id && s.substituteTeacherId !== id),
        })),

      // Subjects
      addSubject: (name, shortName) =>
        set((state) => ({
          subjects: [...state.subjects, { id: crypto.randomUUID(), name, shortName }],
        })),

      updateSubject: (id, name, shortName) =>
        set((state) => ({
          subjects: state.subjects.map((s) => (s.id === id ? { ...s, name, shortName } : s)),
        })),

      deleteSubject: (id) =>
        set((state) => ({
          subjects: state.subjects.filter((s) => s.id !== id),
          entries: state.entries.filter((e) => e.subjectId !== id),
          assignments: state.assignments.filter((a) => a.subjectId !== id),
        })),

      // Assignments
      addAssignment: (teacherId, classId, sectionId, subjectId) =>
        set((state) => ({
          assignments: [
            ...state.assignments,
            { id: crypto.randomUUID(), teacherId, classId, sectionId, subjectId },
          ],
        })),

      updateAssignment: (id, teacherId, classId, sectionId, subjectId) =>
        set((state) => ({
          assignments: state.assignments.map((a) =>
            a.id === id ? { ...a, teacherId, classId, sectionId, subjectId } : a
          ),
        })),

      deleteAssignment: (id) =>
        set((state) => {
          const assignment = state.assignments.find((a) => a.id === id);
          if (!assignment) return state;

          // Cascade: remove timetable entries that match this assignment's teacher+class+section+subject
          const removedEntryIds = new Set(
            state.entries
              .filter(
                (e) =>
                  e.teacherId === assignment.teacherId &&
                  e.classId === assignment.classId &&
                  e.sectionId === assignment.sectionId &&
                  e.subjectId === assignment.subjectId
              )
              .map((e) => e.id)
          );

          return {
            assignments: state.assignments.filter((a) => a.id !== id),
            entries: state.entries.filter((e) => !removedEntryIds.has(e.id)),
            substitutes: state.substitutes.filter((s) => !removedEntryIds.has(s.entryId)),
          };
        }),

      deleteAssignmentsByIds: (ids) =>
        set((state) => {
          const idSet = new Set(ids);
          const assignmentsToRemove = state.assignments.filter((a) => idSet.has(a.id));

          // Cascade: remove timetable entries matching any of the removed assignments
          const removedEntryIds = new Set<string>();
          for (const assignment of assignmentsToRemove) {
            state.entries.forEach((e) => {
              if (
                e.teacherId === assignment.teacherId &&
                e.classId === assignment.classId &&
                e.sectionId === assignment.sectionId &&
                e.subjectId === assignment.subjectId
              ) {
                removedEntryIds.add(e.id);
              }
            });
          }

          return {
            assignments: state.assignments.filter((a) => !idSet.has(a.id)),
            entries: state.entries.filter((e) => !removedEntryIds.has(e.id)),
            substitutes: state.substitutes.filter((s) => !removedEntryIds.has(s.entryId)),
          };
        }),

      // Entries
      addEntry: (day, period, teacherId, classId, sectionId, subjectId) =>
        set((state) => {
          // Check for conflict: same teacher at same day+period
          const hasConflict = state.entries.some(
            (e) => e.day === day && e.period === period && e.teacherId === teacherId
          );
          if (hasConflict) return state;

          // Check for conflict: same class+section at same day+period
          const hasClassConflict = state.entries.some(
            (e) => e.day === day && e.period === period && e.classId === classId && e.sectionId === sectionId
          );
          if (hasClassConflict) return state;

          return {
            entries: [
              ...state.entries,
              { id: crypto.randomUUID(), day, period, teacherId, classId, sectionId, subjectId },
            ],
          };
        }),

      deleteEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
          substitutes: state.substitutes.filter((s) => s.entryId !== id),
        })),

      deleteEntriesByClassSection: (classId, sectionId) =>
        set((state) => {
          const removedEntryIds = new Set(
            state.entries.filter((e) => e.classId === classId && e.sectionId === sectionId).map((e) => e.id)
          );
          return {
            entries: state.entries.filter(
              (e) => !(e.classId === classId && e.sectionId === sectionId)
            ),
            substitutes: state.substitutes.filter((s) => !removedEntryIds.has(s.entryId)),
          };
        }),

      // Substitutes
      addSubstitute: (date, day, entryId, originalTeacherId, substituteTeacherId) =>
        set((state) => ({
          substitutes: [
            ...state.substitutes,
            { id: crypto.randomUUID(), date, day, entryId, originalTeacherId, substituteTeacherId },
          ],
        })),

      deleteSubstitute: (id) =>
        set((state) => ({
          substitutes: state.substitutes.filter((s) => s.id !== id),
        })),

      // Bulk Import
      bulkImportSections: (names) => {
        let added = 0;
        let skipped = 0;
        const existingNames = new Set(useTimetableStore.getState().sections.map((s) => s.name.toLowerCase()));
        const newSections: Section[] = [];
        for (const name of names) {
          const trimmed = name.trim();
          if (!trimmed || existingNames.has(trimmed.toLowerCase())) {
            skipped++;
            continue;
          }
          existingNames.add(trimmed.toLowerCase());
          newSections.push({ id: crypto.randomUUID(), name: trimmed });
          added++;
        }
        set((state) => ({ sections: [...state.sections, ...newSections] }));
        return { added, skipped };
      },

      bulkImportClasses: (items) => {
        let added = 0;
        let skipped = 0;
        const state = useTimetableStore.getState();
        const existingNames = new Set(state.classes.map((c) => c.name.toLowerCase()));
        const sectionMap = new Map(state.sections.map((s) => [s.name.toLowerCase(), s.id]));
        const newClasses: Class[] = [];
        for (const item of items) {
          const trimmed = item.name.trim();
          if (!trimmed || existingNames.has(trimmed.toLowerCase())) {
            skipped++;
            continue;
          }
          existingNames.add(trimmed.toLowerCase());
          const sectionIds: string[] = [];
          for (const sn of item.sectionNames) {
            const sid = sectionMap.get(sn.trim().toLowerCase());
            if (sid) sectionIds.push(sid);
          }
          newClasses.push({ id: crypto.randomUUID(), name: trimmed, sectionIds });
          added++;
        }
        set((state) => ({ classes: [...state.classes, ...newClasses] }));
        return { added, skipped };
      },

      bulkImportTeachers: (items) => {
        let added = 0;
        let skipped = 0;
        const existingKeys = new Set(useTimetableStore.getState().teachers.map((t) => t.name.toLowerCase()));
        const newTeachers: Teacher[] = [];
        for (const item of items) {
          const name = item.name.trim();
          if (!name || existingKeys.has(name.toLowerCase())) {
            skipped++;
            continue;
          }
          existingKeys.add(name.toLowerCase());
          newTeachers.push({ id: crypto.randomUUID(), name, shortName: item.shortName.trim() || name.slice(0, 2).toUpperCase() });
          added++;
        }
        set((state) => ({ teachers: [...state.teachers, ...newTeachers] }));
        return { added, skipped };
      },

      bulkImportSubjects: (items) => {
        let added = 0;
        let skipped = 0;
        const existingKeys = new Set(useTimetableStore.getState().subjects.map((s) => s.name.toLowerCase()));
        const newSubjects: Subject[] = [];
        for (const item of items) {
          const name = item.name.trim();
          if (!name || existingKeys.has(name.toLowerCase())) {
            skipped++;
            continue;
          }
          existingKeys.add(name.toLowerCase());
          newSubjects.push({ id: crypto.randomUUID(), name, shortName: item.shortName.trim() || name.slice(0, 2).toUpperCase() });
          added++;
        }
        set((state) => ({ subjects: [...state.subjects, ...newSubjects] }));
        return { added, skipped };
      },

      bulkImportEntries: (items) => {
        let added = 0;
        let skipped = 0;
        const errors: string[] = [];
        const state = useTimetableStore.getState();
        const teacherMap = new Map(state.teachers.map((t) => [t.name.toLowerCase(), t.id]));
        const classMap = new Map(state.classes.map((c) => [c.name.toLowerCase(), c.id]));
        const sectionMap = new Map(state.sections.map((s) => [s.name.toLowerCase(), s.id]));
        const subjectMap = new Map(state.subjects.map((s) => [s.name.toLowerCase(), s.id]));
        const newEntries: Entry[] = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const rowNum = i + 2; // CSV header is row 1
          const teacherId = teacherMap.get(item.teacherName.trim().toLowerCase());
          const classId = classMap.get(item.className.trim().toLowerCase());
          const sectionId = sectionMap.get(item.sectionName.trim().toLowerCase());
          const subjectId = subjectMap.get(item.subjectName.trim().toLowerCase());
          if (!teacherId) { errors.push(`Row ${rowNum}: Teacher "${item.teacherName}" not found`); skipped++; continue; }
          if (!classId) { errors.push(`Row ${rowNum}: Class "${item.className}" not found`); skipped++; continue; }
          if (!sectionId) { errors.push(`Row ${rowNum}: Section "${item.sectionName}" not found`); skipped++; continue; }
          if (!subjectId) { errors.push(`Row ${rowNum}: Subject "${item.subjectName}" not found`); skipped++; continue; }
          newEntries.push({ id: crypto.randomUUID(), day: item.day.trim(), period: item.period, teacherId, classId, sectionId, subjectId });
          added++;
        }
        set((state) => ({ entries: [...state.entries, ...newEntries] }));
        return { added, skipped, errors };
      },

      bulkImportPeriodTimings: (items) => {
        let added = 0;
        const errors: string[] = [];
        if (items.length === 0) {
          errors.push('CSV file is empty or has no valid period rows.');
          return { added, errors };
        }
        // Validate all items
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const rowNum = i + 2;
          if (!item.startTime || !item.endTime) {
            errors.push(`Row ${rowNum}: Start time and end time are required.`);
            continue;
          }
          const [sh, sm] = item.startTime.split(':').map(Number);
          const [eh, em] = item.endTime.split(':').map(Number);
          if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) {
            errors.push(`Row ${rowNum}: Invalid time format. Use HH:MM.`);
            continue;
          }
          const duration = (eh * 60 + em) - (sh * 60 + sm);
          if (duration <= 0) {
            errors.push(`Row ${rowNum}: End time must be after start time.`);
            continue;
          }
          added++;
        }
        if (added > 0) {
          const timings = useTimetableStore.getState().timings;
          // Also check for overlaps
          const validItems = items.filter((item) => {
            return item.startTime && item.endTime;
          }).filter((item) => {
            const [sh, sm] = item.startTime.split(':').map(Number);
            const [eh, em] = item.endTime.split(':').map(Number);
            return (eh * 60 + em) - (sh * 60 + sm) > 0;
          });
          for (let i = 0; i < validItems.length - 1; i++) {
            if (validItems[i].endTime > validItems[i + 1].startTime) {
              errors.push(`Overlap: Period ${validItems[i].period} (${validItems[i].endTime}) overlaps Period ${validItems[i + 1].period} (${validItems[i + 1].startTime}).`);
            }
          }
          set((state) => ({
            timings: {
              ...state.timings,
              periodTimingMode: 'custom' as const,
              periodsPerDay: validItems.length,
              startTime: validItems[0]?.startTime || state.timings.startTime,
              customPeriodTimings: validItems,
            },
          }));
        }
        return { added, errors };
      },

      replaceAllData: (data) =>
        set((state) => ({
          schoolName: data.schoolName ?? state.schoolName,
          timings: data.timings ?? state.timings,
          sections: data.sections ?? state.sections,
          classes: data.classes ?? state.classes,
          teachers: data.teachers ?? state.teachers,
          subjects: data.subjects ?? state.subjects,
          assignments: data.assignments ?? state.assignments,
          entries: data.entries ?? state.entries,
          substitutes: data.substitutes ?? state.substitutes,
        })),

      clearAllData: () =>
        set({
          sections: [],
          classes: [],
          teachers: [],
          subjects: [],
          assignments: [],
          entries: [],
          substitutes: [],
        }),
    }),
    {
      name: 'timetable-storage',
    }
  )
);
