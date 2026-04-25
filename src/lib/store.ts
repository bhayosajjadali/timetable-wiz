
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Section,
  Class,
  Teacher,
  Subject,
  Timings,
  Assignment,
  Entry,
  Substitute,
  TimetableState
} from './types';

export interface TimetableActions {
  setSchoolName: (name: string) => void;
  setTimings: (timings: Partial<Timings>) => void;

  // Sections
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
  addTeacher: (name: string) => void;
  updateTeacher: (id: string, name: string) => void;
  deleteTeacher: (id: string) => void;

  // Subjects
  addSubject: (name: string) => void;
  updateSubject: (id: string, name: string) => void;
  deleteSubject: (id: string) => void;

  // Assignments
  addAssignment: (teacherId: string, classId: string, sectionId: string, subjectId: string) => void;
  deleteAssignment: (id: string) => void;

  // Entries
  addEntry: (day: string, period: number, teacherId: string, classId: string, sectionId: string, subjectId: string) => void;
  deleteEntry: (id: string) => void;

  // Substitutes
  addSubstitute: (date: string, day: string, entryId: string, originalTeacherId: string, substituteTeacherId: string) => void;
  deleteSubstitute: (id: string) => void;

  // Data Management
  replaceAllData: (data: Partial<TimetableState>) => void;
  clearAllData: () => void;
}

export type TimetableStore = TimetableState & TimetableActions;

function generateId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 9);
}

function deriveShortName(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.length === 1
    ? words[0].substring(0, 3).toUpperCase()
    : words.map(w => w[0]).join('').substring(0, 3).toUpperCase();
}

const DEFAULT_TIMINGS: Timings = {
  periodsPerDay: 8,
  startTime: '08:00',
  periodDuration: 40,
  breakAfterPeriod: 4,
  breakDuration: 20,
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  periodTimingMode: 'equal',
  customPeriodTimings: [],
};

const DEFAULT_STATE: TimetableState = {
  schoolName: 'My School',
  timings: DEFAULT_TIMINGS,
  sections: [],
  classes: [],
  teachers: [],
  subjects: [],
  assignments: [],
  entries: [],
  substitutes: [],
};

export const useTimetableStore = create<TimetableStore>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      setSchoolName: (schoolName) => set({ schoolName }),
      setTimings: (timings) => set((state) => ({ timings: { ...state.timings, ...timings } })),

      addSection: (name) => set((state) => ({
        sections: [...state.sections, { id: generateId(), name }]
      })),
      updateSection: (id, name) => set((state) => ({
        sections: state.sections.map(s => s.id === id ? { ...s, name } : s)
      })),
      deleteSection: (id) => set((state) => ({
        sections: state.sections.filter(s => s.id !== id),
        classes: state.classes.map(c => ({
          ...c,
          sectionIds: (c.sectionIds || []).filter(sid => sid !== id)
        })),
        assignments: state.assignments.filter(a => a.sectionId !== id),
        entries: state.entries.filter(e => e.sectionId !== id)
      })),

      addClass: (name) => set((state) => ({
        classes: [...state.classes, { id: generateId(), name, sectionIds: [] }]
      })),
      updateClass: (id, name) => set((state) => ({
        classes: state.classes.map(c => c.id === id ? { ...c, name } : c)
      })),
      deleteClass: (id) => set((state) => ({
        classes: state.classes.filter(c => c.id !== id),
        assignments: state.assignments.filter(a => a.classId !== id),
        entries: state.entries.filter(e => e.classId !== id)
      })),
      assignSectionToClass: (classId, sectionId) => set((state) => ({
        classes: state.classes.map(c =>
          c.id === classId
            ? { ...c, sectionIds: Array.from(new Set([...(c.sectionIds || []), sectionId])) }
            : c
        )
      })),
      removeSectionFromClass: (classId, sectionId) => set((state) => ({
        classes: state.classes.map(c =>
          c.id === classId
            ? { ...c, sectionIds: (c.sectionIds || []).filter(id => id !== sectionId) }
            : c
        ),
        assignments: state.assignments.filter(a => !(a.classId === classId && a.sectionId === sectionId)),
        entries: state.entries.filter(e => !(e.classId === classId && e.sectionId === sectionId))
      })),

      addTeacher: (name) => set((state) => ({
        teachers: [...state.teachers, { id: generateId(), name, shortName: deriveShortName(name) }]
      })),
      updateTeacher: (id, name) => set((state) => ({
        teachers: state.teachers.map(t => t.id === id ? { ...t, name, shortName: deriveShortName(name) } : t)
      })),
      deleteTeacher: (id) => set((state) => ({
        teachers: state.teachers.filter(t => t.id !== id),
        assignments: state.assignments.filter(a => a.teacherId !== id),
        entries: state.entries.filter(e => e.teacherId !== id)
      })),

      addSubject: (name) => set((state) => ({
        subjects: [...state.subjects, { id: generateId(), name, shortName: deriveShortName(name) }]
      })),
      updateSubject: (id, name) => set((state) => ({
        subjects: state.subjects.map(s => s.id === id ? { ...s, name, shortName: deriveShortName(name) } : s)
      })),
      deleteSubject: (id) => set((state) => ({
        subjects: state.subjects.filter(s => s.id !== id),
        assignments: state.assignments.filter(a => a.subjectId !== id),
        entries: state.entries.filter(e => e.subjectId !== id)
      })),

      addAssignment: (teacherId, classId, sectionId, subjectId) => set((state) => ({
        assignments: [...state.assignments, { id: generateId(), teacherId, classId, sectionId, subjectId }]
      })),
      deleteAssignment: (id) => set((state) => ({
        assignments: state.assignments.filter(a => a.id !== id)
      })),

      addEntry: (day, period, teacherId, classId, sectionId, subjectId) => set((state) => {
        const exists = state.entries.some(e => e.day === day && e.period === period && e.classId === classId && e.sectionId === sectionId);
        if (exists) return state;
        return {
          entries: [...state.entries, { id: generateId(), day, period, teacherId, classId, sectionId, subjectId }]
        };
      }),
      deleteEntry: (id) => set((state) => ({
        entries: state.entries.filter(e => e.id !== id)
      })),

      addSubstitute: (date, day, entryId, originalTeacherId, substituteTeacherId) => set((state) => ({
        substitutes: [...state.substitutes, { id: generateId(), date, day, entryId, originalTeacherId, substituteTeacherId }]
      })),
      deleteSubstitute: (id) => set((state) => ({
        substitutes: state.substitutes.filter(s => s.id !== id)
      })),

      clearAllData: () => set({ ...DEFAULT_STATE }),

      /**
       * Robust full-data replacement used by JSON backup import.
       *
       * Fixes a previous bug where Timetable / Substitute / Reports tabs
       * stayed empty after import. Root causes addressed:
       *  - Class.sectionIds missing/stale -> tabs filter `c.sectionIds.length > 0`
       *    and hid every class. Repaired from entries + assignments.
       *  - Entries / assignments / substitutes referencing IDs that no longer
       *    exist (e.g. partial export, hand-edited JSON, schema drift) silently
       *    rendered empty grids. Now filtered with full referential integrity.
       *  - Missing `id` fields on imported records (legacy exports) caused
       *    React key collisions and blank grids. Now re-generated.
       *  - `entries[].period` arriving as string (JSON of stringified numbers)
       *    broke `===` comparisons in grids. Now coerced to number.
       *  - `entries[].day` whitespace/case mismatch with `timings.days` left
       *    grids empty. Now normalized to the matching day from timings.days.
       */
      replaceAllData: (data) => {
        const safeArr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

        // 1. Normalize primary entities (ensure id + required fields)
        const sections: Section[] = safeArr<any>(data.sections)
          .filter((s) => s && typeof s.name === 'string')
          .map((s) => ({ id: String(s.id ?? generateId()), name: String(s.name) }));

        const teachers: Teacher[] = safeArr<any>(data.teachers)
          .filter((t) => t && typeof t.name === 'string')
          .map((t) => ({
            id: String(t.id ?? generateId()),
            name: String(t.name),
            shortName: String(t.shortName ?? deriveShortName(t.name)),
          }));

        const subjects: Subject[] = safeArr<any>(data.subjects)
          .filter((s) => s && typeof s.name === 'string')
          .map((s) => ({
            id: String(s.id ?? generateId()),
            name: String(s.name),
            shortName: String(s.shortName ?? deriveShortName(s.name)),
          }));

        const sectionIdSet = new Set(sections.map((s) => s.id));
        const teacherIdSet = new Set(teachers.map((t) => t.id));
        const subjectIdSet = new Set(subjects.map((s) => s.id));

        const rawClasses = safeArr<any>(data.classes)
          .filter((c) => c && typeof c.name === 'string')
          .map((c) => ({
            id: String(c.id ?? generateId()),
            name: String(c.name),
            sectionIds: Array.isArray(c.sectionIds) ? c.sectionIds.map(String) : [],
          }));
        const classIdSet = new Set(rawClasses.map((c) => c.id));

        // 2. Normalize entries / assignments / substitutes BEFORE class repair
        //    so we can use their references to repair sectionIds.
        const normalizedDays: string[] = Array.isArray(data.timings?.days) && data.timings!.days.length > 0
          ? data.timings!.days.map(String)
          : DEFAULT_TIMINGS.days;
        const dayLookup = new Map(normalizedDays.map((d) => [d.trim().toLowerCase(), d]));

        const entries: Entry[] = safeArr<any>(data.entries)
          .map((e) => {
            if (!e) return null;
            const day = typeof e.day === 'string'
              ? (dayLookup.get(e.day.trim().toLowerCase()) ?? e.day)
              : '';
            const period = Number(e.period);
            const classId = String(e.classId ?? '');
            const sectionId = String(e.sectionId ?? '');
            const teacherId = String(e.teacherId ?? '');
            const subjectId = String(e.subjectId ?? '');
            if (!day || !Number.isFinite(period) || !classId || !sectionId) return null;
            if (!classIdSet.has(classId) || !sectionIdSet.has(sectionId)) return null;
            if (teacherId && !teacherIdSet.has(teacherId)) return null;
            if (subjectId && !subjectIdSet.has(subjectId)) return null;
            return {
              id: String(e.id ?? generateId()),
              day,
              period,
              teacherId,
              classId,
              sectionId,
              subjectId,
            } as Entry;
          })
          .filter((e): e is Entry => e !== null);

        const assignments: Assignment[] = safeArr<any>(data.assignments)
          .map((a) => {
            if (!a) return null;
            const teacherId = String(a.teacherId ?? '');
            const classId = String(a.classId ?? '');
            const sectionId = String(a.sectionId ?? '');
            const subjectId = String(a.subjectId ?? '');
            if (!teacherIdSet.has(teacherId) || !classIdSet.has(classId)
              || !sectionIdSet.has(sectionId) || !subjectIdSet.has(subjectId)) return null;
            return {
              id: String(a.id ?? generateId()),
              teacherId, classId, sectionId, subjectId,
            } as Assignment;
          })
          .filter((a): a is Assignment => a !== null);

        const entryIdSet = new Set(entries.map((e) => e.id));
        const substitutes: Substitute[] = safeArr<any>(data.substitutes)
          .map((s) => {
            if (!s) return null;
            const entryId = String(s.entryId ?? '');
            const originalTeacherId = String(s.originalTeacherId ?? '');
            const substituteTeacherId = String(s.substituteTeacherId ?? '');
            if (!entryIdSet.has(entryId)) return null;
            if (originalTeacherId && !teacherIdSet.has(originalTeacherId)) return null;
            if (substituteTeacherId && !teacherIdSet.has(substituteTeacherId)) return null;
            return {
              id: String(s.id ?? generateId()),
              date: String(s.date ?? ''),
              day: String(s.day ?? ''),
              entryId,
              originalTeacherId,
              substituteTeacherId,
            } as Substitute;
          })
          .filter((s): s is Substitute => s !== null);

        // 3. Repair class.sectionIds using entries + assignments + existing
        const classes: Class[] = rawClasses.map((c) => {
          const fromEntries = entries.filter((e) => e.classId === c.id).map((e) => e.sectionId);
          const fromAssign = assignments.filter((a) => a.classId === c.id).map((a) => a.sectionId);
          const merged = Array.from(new Set([...c.sectionIds, ...fromEntries, ...fromAssign]))
            .filter((sid) => sectionIdSet.has(sid));
          return { ...c, sectionIds: merged };
        });

        // 4. Normalize timings (fall back to defaults for missing fields)
        const incomingTimings = (data.timings && typeof data.timings === 'object') ? data.timings : {};
        const timings: Timings = {
          ...DEFAULT_TIMINGS,
          ...incomingTimings,
          days: normalizedDays,
          customPeriodTimings: Array.isArray((incomingTimings as any).customPeriodTimings)
            ? (incomingTimings as any).customPeriodTimings
            : [],
        };

        const schoolName = typeof data.schoolName === 'string' && data.schoolName.trim()
          ? data.schoolName
          : DEFAULT_STATE.schoolName;

        // 5. Atomic replace — explicit field assignment, no spread surprises
        set({
          schoolName,
          timings,
          sections,
          classes,
          teachers,
          subjects,
          assignments,
          entries,
          substitutes,
        });
      },
    }),
    {
      name: 'timetable-wiz-data',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : (null as any))),
    }
  )
);
