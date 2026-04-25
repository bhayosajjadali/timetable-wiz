import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/* ========================================================================
   Types
   ======================================================================== */

export interface Timings {
  periods: number;
  assemblyTime: string;
  breakTime: string;
  breakAfterPeriod: number;
  periodTimes: string[];
}

export interface Teacher {
  id: string;
  name: string;
  shortName: string;
}

export interface Subject {
  id: string;
  name: string;
  shortName: string;
}

export interface Class {
  id: string;
  name: string;
  sectionIds: string[];
}

export interface Section {
  id: string;
  name: string;
  classId: string;
}

export interface Assignment {
  id: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  sectionId: string;
}

export interface Entry {
  id: string;
  day: string;
  period: number;
  teacherId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
}

export interface Substitute {
  id: string;
  date: string;
  day: string;
  period: number;
  entryId: string;
  originalTeacherId: string;
  substituteTeacherId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
}

export interface TimetableState {
  schoolName: string;
  organizationName: string;
  academicYear: string;
  headmasterName: string;
  timings: Timings;
  teachers: Teacher[];
  subjects: Subject[];
  classes: Class[];
  sections: Section[];
  assignments: Assignment[];
  entries: Entry[];
  substitutes: Substitute[];
}

export interface TimetableActions {
  setSchoolInfo: (
    info: Partial<
      Pick<
        TimetableState,
        'schoolName' | 'organizationName' | 'academicYear' | 'headmasterName'
      >
    >
  ) => void;
  setTimings: (timings: Partial<Timings>) => void;

  addTeacher: (name: string) => void;
  updateTeacher: (id: string, name: string) => void;
  deleteTeacher: (id: string) => void;

  addSubject: (name: string) => void;
  updateSubject: (id: string, name: string) => void;
  deleteSubject: (id: string) => void;

  addClass: (name: string) => void;
  updateClass: (id: string, name: string) => void;
  deleteClass: (id: string) => void;

  addSection: (name: string, classId: string) => void;
  updateSection: (id: string, name: string, classId?: string) => void;
  deleteSection: (id: string) => void;

  addAssignment: (
    teacherId: string,
    subjectId: string,
    classId: string,
    sectionId: string
  ) => void;
  deleteAssignment: (id: string) => void;

  addEntry: (
    day: string,
    period: number,
    teacherId: string,
    classId: string,
    sectionId: string,
    subjectId: string
  ) => void;
  deleteEntry: (id: string) => void;

  addSubstitute: (
    date: string,
    day: string,
    entryId: string,
    originalTeacherId: string,
    substituteTeacherId: string
  ) => void;
  deleteSubstitute: (id: string) => void;

  importBackup: (data: unknown) => void;
  clearAllData: () => void;
}

export type TimetableStore = TimetableState & TimetableActions;

/* ========================================================================
   Helpers
   ======================================================================== */

/**
 * Derives a short name from a full name.
 *
 * - Single word  → first 3 characters, upper‑cased.
 * - Multiple words → first character of each word (max 3), upper‑cased.
 */
function deriveShortName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  const words = trimmed.split(/\s+/);
  if (words.length === 1) {
    return trimmed.substring(0, 3).toUpperCase();
  }
  return words.map((w) => w[0]).join('').substring(0, 3).toUpperCase();
}

/**
 * Recomputes `sectionIds` for every class based on the current sections list.
 * Returns a *new* array of classes (new references for React re‑rendering).
 */
function recomputeClassSectionIds(
  classes: Class[],
  sections: Section[]
): Class[] {
  return classes.map((cls) => ({
    ...cls,
    sectionIds: sections
      .filter((s) => s.classId === cls.id)
      .map((s) => s.id),
  }));
}

/**
 * Parses a class display name of the form "ClassName (SectionName)"
 * into its constituent parts.
 *
 * Examples:
 *   "Class 10 (A)"       → { className: "Class 10", sectionName: "A" }
 *   "Class 10 (Section A)" → { className: "Class 10", sectionName: "Section A" }
 */
function parseClassDisplayName(
  displayName: string
): { className: string; sectionName: string } | null {
  const match = displayName.match(/^(.+?)\s*\((.+?)\)\s*$/);
  if (match) {
    return { className: match[1].trim(), sectionName: match[2].trim() };
  }
  return null;
}

/**
 * Creates a unique ID. Uses `crypto.randomUUID()` when available (modern
 * browsers & Node 19+), with a Math.random fallback for extremely old
 * environments.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback – extremely unlikely to be hit in practice
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/* ========================================================================
   Default State
   ======================================================================== */

const DEFAULT_TIMINGS: Timings = {
  periods: 7,
  assemblyTime: '07:30 AM - 08:00 AM',
  breakTime: '10:00 AM - 10:20 AM',
  breakAfterPeriod: 4,
  periodTimes: [
    '08:00 AM - 08:40 AM',
    '08:40 AM - 09:20 AM',
    '09:20 AM - 10:00 AM',
    '10:00 AM - 10:40 AM',
    '10:40 AM - 11:20 AM',
    '11:20 AM - 12:00 PM',
    '12:00 PM - 12:40 PM',
  ],
};

const DEFAULT_STATE: TimetableState = {
  schoolName: '',
  organizationName: '',
  academicYear: '',
  headmasterName: '',
  timings: DEFAULT_TIMINGS,
  teachers: [],
  subjects: [],
  classes: [],
  sections: [],
  assignments: [],
  entries: [],
  substitutes: [],
};

/* ========================================================================
   Array keys that must always be fully replaced (never shallow‑merged)
   ======================================================================== */

const ARRAY_KEYS: (keyof TimetableState)[] = [
  'teachers',
  'subjects',
  'classes',
  'sections',
  'assignments',
  'entries',
  'substitutes',
];

/* ========================================================================
   Custom merge for persist middleware
   ======================================================================== */

/**
 * Full‑replacement merge for the persist middleware.
 *
 * The default shallow merge (`{...current, ...persisted}`) already replaces
 * top‑level keys when using spread, but being explicit guarantees that every
 * array is a **new reference** so React / Zustand subscribers always detect
 * the change – even in edge‑cases where the persisted data was produced by
 * `JSON.stringify` → `JSON.parse` round‑tripping.
 */
function fullReplacementMerge(
  persisted: unknown,
  current: TimetableState
): TimetableState {
  const p = persisted as Partial<TimetableState> | undefined;
  if (!p) return current;

  const next: TimetableState = { ...current };

  // Scalar / object properties – override when present in persisted state
  if (p.schoolName !== undefined) next.schoolName = p.schoolName;
  if (p.organizationName !== undefined) next.organizationName = p.organizationName;
  if (p.academicYear !== undefined) next.academicYear = p.academicYear;
  if (p.headmasterName !== undefined) next.headmasterName = p.headmasterName;
  if (p.timings !== undefined) next.timings = p.timings;

  // Arrays – ALWAYS create a fresh reference (spread into new array)
  for (const key of ARRAY_KEYS) {
    if (p[key] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (next as any)[key] = [...(p[key] as unknown[])];
    }
  }

  return next;
}

/* ========================================================================
   Store
   ======================================================================== */

export const useTimetableStore = create<TimetableStore>()(
  persist(
    (set, get) => ({
      /* ── Default state ── */
      ...DEFAULT_STATE,

      /* ──────────────────────────────────────────────────────────────────
         School info
         ────────────────────────────────────────────────────────────────── */

      setSchoolInfo: (info) => {
        set({ ...info });
      },

      setTimings: (timings) => {
        set((state) => ({
          timings: { ...state.timings, ...timings },
        }));
      },

      /* ──────────────────────────────────────────────────────────────────
         Teachers
         ────────────────────────────────────────────────────────────────── */

      addTeacher: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const teacher: Teacher = {
          id: generateId(),
          name: trimmed,
          shortName: deriveShortName(trimmed),
        };
        set((state) => ({ teachers: [...state.teachers, teacher] }));
      },

      updateTeacher: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => ({
          teachers: state.teachers.map((t) =>
            t.id === id
              ? { ...t, name: trimmed, shortName: deriveShortName(trimmed) }
              : t
          ),
        }));
      },

      deleteTeacher: (id) => {
        set((state) => ({
          teachers: state.teachers.filter((t) => t.id !== id),
          assignments: state.assignments.filter((a) => a.teacherId !== id),
          entries: state.entries.filter((e) => e.teacherId !== id),
          substitutes: [
            ...state.substitutes.filter(
              (s) =>
                s.originalTeacherId !== id && s.substituteTeacherId !== id
            ),
          ],
        }));
      },

      /* ──────────────────────────────────────────────────────────────────
         Subjects
         ────────────────────────────────────────────────────────────────── */

      addSubject: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const subject: Subject = {
          id: generateId(),
          name: trimmed,
          shortName: deriveShortName(trimmed),
        };
        set((state) => ({ subjects: [...state.subjects, subject] }));
      },

      updateSubject: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => ({
          subjects: state.subjects.map((s) =>
            s.id === id
              ? { ...s, name: trimmed, shortName: deriveShortName(trimmed) }
              : s
          ),
        }));
      },

      deleteSubject: (id) => {
        set((state) => ({
          subjects: state.subjects.filter((s) => s.id !== id),
          assignments: state.assignments.filter((a) => a.subjectId !== id),
          entries: state.entries.filter((e) => e.subjectId !== id),
          substitutes: state.substitutes.filter((s) => s.subjectId !== id),
        }));
      },

      /* ──────────────────────────────────────────────────────────────────
         Classes
         ────────────────────────────────────────────────────────────────── */

      addClass: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const cls: Class = {
          id: generateId(),
          name: trimmed,
          sectionIds: [],
        };
        set((state) => ({ classes: [...state.classes, cls] }));
      },

      updateClass: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => ({
          classes: state.classes.map((c) =>
            c.id === id ? { ...c, name: trimmed } : c
          ),
        }));
      },

      deleteClass: (id) => {
        set((state) => {
          const remainingSections = state.sections.filter(
            (s) => s.classId !== id
          );
          return {
            // Recompute sectionIds for remaining classes
            classes: state.classes
              .filter((c) => c.id !== id)
              .map((c) => ({
                ...c,
                sectionIds: remainingSections
                  .filter((s) => s.classId === c.id)
                  .map((s) => s.id),
              })),
            sections: remainingSections,
            assignments: state.assignments.filter((a) => a.classId !== id),
            entries: state.entries.filter((e) => e.classId !== id),
            substitutes: state.substitutes.filter((s) => s.classId !== id),
          };
        });
      },

      /* ──────────────────────────────────────────────────────────────────
         Sections
         ────────────────────────────────────────────────────────────────── */

      addSection: (name, classId) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const section: Section = {
          id: generateId(),
          name: trimmed,
          classId,
        };
        set((state) => ({
          sections: [...state.sections, section],
          classes: recomputeClassSectionIds(state.classes, [
            ...state.sections,
            section,
          ]),
        }));
      },

      updateSection: (id, name, classId) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => {
          const updatedSections = state.sections.map((s) =>
            s.id === id
              ? {
                  ...s,
                  name: trimmed,
                  ...(classId !== undefined ? { classId } : {}),
                }
              : s
          );
          return {
            sections: updatedSections,
            classes: recomputeClassSectionIds(state.classes, updatedSections),
          };
        });
      },

      deleteSection: (id) => {
        set((state) => {
          const remainingSections = state.sections.filter((s) => s.id !== id);
          return {
            sections: remainingSections,
            classes: recomputeClassSectionIds(state.classes, remainingSections),
            assignments: state.assignments.filter((a) => a.sectionId !== id),
            entries: state.entries.filter((e) => e.sectionId !== id),
            substitutes: state.substitutes.filter((s) => s.sectionId !== id),
          };
        });
      },

      /* ──────────────────────────────────────────────────────────────────
         Assignments
         ────────────────────────────────────────────────────────────────── */

      addAssignment: (teacherId, subjectId, classId, sectionId) => {
        const assignment: Assignment = {
          id: generateId(),
          teacherId,
          subjectId,
          classId,
          sectionId,
        };
        set((state) => ({
          assignments: [...state.assignments, assignment],
        }));
      },

      deleteAssignment: (id) => {
        set((state) => ({
          assignments: state.assignments.filter((a) => a.id !== id),
        }));
      },

      /* ──────────────────────────────────────────────────────────────────
         Entries
         ────────────────────────────────────────────────────────────────── */

      addEntry: (day, period, teacherId, classId, sectionId, subjectId) => {
        const entry: Entry = {
          id: generateId(),
          day,
          period,
          teacherId,
          classId,
          sectionId,
          subjectId,
        };
        set((state) => ({ entries: [...state.entries, entry] }));
      },

      deleteEntry: (id) => {
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
          substitutes: state.substitutes.filter((s) => s.entryId !== id),
        }));
      },

      /* ──────────────────────────────────────────────────────────────────
         Substitutes
         ────────────────────────────────────────────────────────────────── */

      addSubstitute: (
        date,
        day,
        entryId,
        originalTeacherId,
        substituteTeacherId
      ) => {
        // Look up the original entry to inherit class/section/subject info
        const state = get();
        const originalEntry = state.entries.find((e) => e.id === entryId);
        if (!originalEntry) return;

        const substitute: Substitute = {
          id: generateId(),
          date,
          day,
          period: originalEntry.period,
          entryId,
          originalTeacherId,
          substituteTeacherId,
          classId: originalEntry.classId,
          sectionId: originalEntry.sectionId,
          subjectId: originalEntry.subjectId,
        };
        set((s) => ({ substitutes: [...s.substitutes, substitute] }));
      },

      deleteSubstitute: (id) => {
        set((state) => ({
          substitutes: state.substitutes.filter((s) => s.id !== id),
        }));
      },

      /* ──────────────────────────────────────────────────────────────────
         Backup Import / Export
         ────────────────────────────────────────────────────────────────── */

      /**
       * Imports a full state snapshot.
       *
       * Supports two formats:
       *
       * 1. **ID‑based** – entries have `teacherId`, `classId`, `sectionId`,
       *    `subjectId` fields (native store format).
       *
       * 2. **Human‑readable** – entries have `teacher`, `class`, `subject`
       *    name strings instead of IDs. The class field is formatted as
       *    `"ClassName (SectionName)"`. Substitutes similarly use
       *    `originalTeacher` / `substituteTeacher` name strings.
       *
       * The function auto‑detects the format and resolves names to IDs
       * using the teacher / subject / class / section data in the backup.
       */
      importBackup: (data: unknown) => {
        if (!data || typeof data !== 'object') return;

        const d = data as Record<string, unknown>;

        // ── Unwrap nested data wrappers ──
        // Some backups wrap data under .data, .state, or .school
        const raw =
          d.teachers || d.schoolName || d.timings
            ? d
            : (d.data as Record<string, unknown>) ||
              (d.state as Record<string, unknown>) ||
              d;

        const current = get();

        // ── Normalise reference data ──
        // The export format uses STRING arrays for teachers, subjects, classes.
        // We must handle both string arrays AND object arrays.

        const teachers: Teacher[] = Array.isArray(raw.teachers)
          ? (raw.teachers as unknown[]).map((t) => {
              // Handle string format: "John Smith"
              if (typeof t === 'string') {
                const name = t.trim();
                return { id: generateId(), name, shortName: deriveShortName(name) };
              }
              // Handle object format: { id, name, shortName }
              const obj = t as Record<string, unknown>;
              const name = String(obj.name || '');
              return {
                id: String(obj.id || generateId()),
                name,
                shortName: String(obj.shortName || deriveShortName(name)),
              };
            })
          : current.teachers;

        const subjects: Subject[] = Array.isArray(raw.subjects)
          ? (raw.subjects as unknown[]).map((s) => {
              if (typeof s === 'string') {
                const name = s.trim();
                return { id: generateId(), name, shortName: deriveShortName(name) };
              }
              const obj = s as Record<string, unknown>;
              const name = String(obj.name || '');
              return {
                id: String(obj.id || generateId()),
                name,
                shortName: String(obj.shortName || deriveShortName(name)),
              };
            })
          : current.subjects;

        // Classes: exported as string array ["Class 10", "Class 11"]
        const classes: Class[] = Array.isArray(raw.classes)
          ? (raw.classes as unknown[]).map((c) => {
              if (typeof c === 'string') {
                return { id: generateId(), name: c.trim(), sectionIds: [] as string[] };
              }
              const obj = c as Record<string, unknown>;
              return {
                id: String(obj.id || generateId()),
                name: String(obj.name || ''),
                sectionIds: (obj.sectionIds as string[]) || [],
              };
            })
          : current.classes;

        // Sections: exported as [{name: "A", class: "Class 10"}]
        // Note: the export uses "class" (name string) not "classId" (UUID)
        // Some exports (native ID-based) only have {id, name} — no classId or class field.
        // In that case, resolve classId by looking up which class.sectionIds contains this section's id.
        const sections: Section[] = Array.isArray(raw.sections)
          ? (raw.sections as unknown[]).map((s) => {
              const obj = s as Record<string, unknown>;
              const sectionName = String(obj.name || '');
              const sectionId = String(obj.id || generateId());

              // Priority 1: explicit classId field
              let classId = String(obj.classId || '');

              // Priority 2: resolve from "class" name string
              if (!classId && obj.class) {
                const className = String(obj.class).trim();
                const match = classes.find(
                  (c) => c.name.toLowerCase() === className.toLowerCase()
                );
                classId = match?.id || '';
              }

              // Priority 3: reverse-lookup via class.sectionIds (native backup format)
              if (!classId && Array.isArray(raw.classes)) {
                const ownerClass = (raw.classes as Record<string, unknown>[]).find(
                  (c) =>
                    Array.isArray(c.sectionIds) &&
                    (c.sectionIds as string[]).includes(sectionId)
                );
                if (ownerClass) {
                  // Find the matching constructed class object by name
                  const matched = classes.find(
                    (c) => c.name === String(ownerClass.name || '')
                  );
                  classId = matched?.id || String(ownerClass.id || '');
                }
              }

              return {
                id: sectionId,
                name: sectionName,
                classId,
              };
            })
          : current.sections;

        // Recompute sectionIds for classes based on resolved sections
        const finalClasses = recomputeClassSectionIds(classes, sections);

        // ── Detect entry format ──
        const rawEntries = Array.isArray(raw.entries)
          ? (raw.entries as Record<string, unknown>[])
          : [];

        const isHumanReadable =
          rawEntries.length > 0 &&
          typeof rawEntries[0].teacher === 'string' &&
          typeof rawEntries[0].teacherId !== 'string';

        // ── Helper: resolve class display name → classId + sectionId ──
        const resolveClass = (
          classDisplay: string
        ): { classId: string; sectionId: string } => {
          const parsed = parseClassDisplayName(classDisplay);
          if (!parsed) return { classId: '', sectionId: '' };

          const cls = classes.find(
            (c) => c.name.toLowerCase() === parsed.className.toLowerCase()
          );
          if (!cls) return { classId: '', sectionId: '' };

          const section = sections.find(
            (s) =>
              s.classId === cls.id &&
              s.name.toLowerCase() === parsed.sectionName.toLowerCase()
          );
          return {
            classId: cls.id,
            sectionId: section?.id || '',
          };
        };

        // ── Transform entries ──
        let entries: Entry[];

        if (isHumanReadable) {
          entries = rawEntries.map((e) => {
            const teacherName = String(e.teacher || '');
            const subjectName = String(e.subject || '');
            const classDisplay = String(e.class || '');

            const teacher = teachers.find(
              (t) => t.name.toLowerCase() === teacherName.toLowerCase()
            );
            const subject = subjects.find(
              (s) => s.name.toLowerCase() === subjectName.toLowerCase()
            );
            const { classId, sectionId } = resolveClass(classDisplay);

            return {
              id: generateId(),
              day: String(e.day || ''),
              period: Number(e.period) || 0,
              teacherId: teacher?.id || '',
              classId,
              sectionId,
              subjectId: subject?.id || '',
            };
          });
        } else {
          entries = rawEntries.map((e) => ({
            id: String((e as unknown as Entry).id || generateId()),
            day: String(e.day || ''),
            period: Number(e.period) || 0,
            teacherId: String(e.teacherId || ''),
            classId: String(e.classId || ''),
            sectionId: String(e.sectionId || ''),
            subjectId: String(e.subjectId || ''),
          }));
        }

        // ── Transform substitutes ──
        const rawSubstitutes = Array.isArray(raw.substitutes)
          ? (raw.substitutes as Record<string, unknown>[])
          : [];

        const isSubHumanReadable =
          rawSubstitutes.length > 0 &&
          typeof rawSubstitutes[0].originalTeacher === 'string' &&
          typeof rawSubstitutes[0].originalTeacherId !== 'string';

        let substitutes: Substitute[];

        if (isSubHumanReadable) {
          substitutes = rawSubstitutes.map((s) => {
            const origName = String(s.originalTeacher || '');
            const subName = String(s.substituteTeacher || '');
            const subjectName = String(s.subject || '');
            const classDisplay = String(s.class || '');
            const day = String(s.day || '');
            const period = Number(s.period) || 0;

            const origTeacher = teachers.find(
              (t) => t.name.toLowerCase() === origName.toLowerCase()
            );
            const subTeacher = teachers.find(
              (t) => t.name.toLowerCase() === subName.toLowerCase()
            );
            const subject = subjects.find(
              (sub) => sub.name.toLowerCase() === subjectName.toLowerCase()
            );
            const { classId, sectionId } = resolveClass(classDisplay);

            // Find matching entry by day + period + original teacher + class/section/subject
            const matchingEntry = entries.find(
              (e) =>
                e.day === day &&
                e.period === period &&
                e.teacherId === (origTeacher?.id || '') &&
                e.classId === classId &&
                e.sectionId === sectionId &&
                e.subjectId === (subject?.id || '')
            );

            return {
              id: generateId(),
              date: String(s.date || ''),
              day,
              period,
              entryId: matchingEntry?.id || '',
              originalTeacherId: origTeacher?.id || '',
              substituteTeacherId: subTeacher?.id || '',
              classId,
              sectionId,
              subjectId: subject?.id || '',
            };
          });
        } else {
          substitutes = rawSubstitutes.map((s) => ({
            id: String((s as unknown as Substitute).id || generateId()),
            date: String(s.date || ''),
            day: String(s.day || ''),
            period: Number(s.period) || 0,
            entryId: String(s.entryId || ''),
            originalTeacherId: String(s.originalTeacherId || ''),
            substituteTeacherId: String(s.substituteTeacherId || ''),
            classId: String(s.classId || ''),
            sectionId: String(s.sectionId || ''),
            subjectId: String(s.subjectId || ''),
          }));
        }

        // ── Transform assignments ──
        // Export format: [{teacher: "Name", class: "Class 10 (A)", subject: "Math"}]
        // ID-based format:  [{teacherId, subjectId, classId, sectionId}]
        const rawAssignments = Array.isArray(raw.assignments)
          ? (raw.assignments as Record<string, unknown>[])
          : [];

        const isAssignHumanReadable =
          rawAssignments.length > 0 &&
          typeof rawAssignments[0].teacher === 'string' &&
          typeof rawAssignments[0].teacherId !== 'string';

        let assignments: Assignment[];

        if (isAssignHumanReadable) {
          assignments = rawAssignments.map((a) => {
            const teacherName = String(a.teacher || '');
            const subjectName = String(a.subject || '');
            const classDisplay = String(a.class || '');

            const teacher = teachers.find(
              (t) => t.name.toLowerCase() === teacherName.toLowerCase()
            );
            const subject = subjects.find(
              (s) => s.name.toLowerCase() === subjectName.toLowerCase()
            );
            const { classId, sectionId } = resolveClass(classDisplay);

            return {
              id: generateId(),
              teacherId: teacher?.id || '',
              subjectId: subject?.id || '',
              classId,
              sectionId,
            };
          });
        } else {
          assignments = rawAssignments.map((a) => ({
            id: String(a.id || generateId()),
            teacherId: String(a.teacherId || ''),
            subjectId: String(a.subjectId || ''),
            classId: String(a.classId || ''),
            sectionId: String(a.sectionId || ''),
          }));
        }

        // ── Set the full state ──
        // Use `raw` for all reads (handles .data/.state wrappers)
        // Use `finalClasses` which has recomputed sectionIds
        set({
          schoolName:
            typeof raw.schoolName === 'string'
              ? raw.schoolName
              : typeof (raw.school as Record<string, unknown>)?.name === 'string'
                ? String((raw.school as Record<string, unknown>).name)
                : '',
          organizationName:
            typeof raw.organizationName === 'string'
              ? raw.organizationName
              : typeof (raw.school as Record<string, unknown>)?.organization === 'string'
                ? String((raw.school as Record<string, unknown>).organization)
                : '',
          academicYear:
            typeof raw.academicYear === 'string'
              ? raw.academicYear
              : typeof (raw.school as Record<string, unknown>)?.academicYear === 'string'
                ? String((raw.school as Record<string, unknown>).academicYear)
                : '',
          headmasterName:
            typeof raw.headmasterName === 'string'
              ? raw.headmasterName
              : typeof (raw.school as Record<string, unknown>)?.headmaster === 'string'
                ? String((raw.school as Record<string, unknown>).headmaster)
                : '',
          timings:
            raw.timings && typeof raw.timings === 'object'
              ? { ...DEFAULT_TIMINGS, ...(raw.timings as Partial<Timings>) }
              : DEFAULT_TIMINGS,
          teachers,
          subjects,
          classes: finalClasses,
          sections,
          assignments,
          entries,
          substitutes,
        });
      },

      /**
       * Resets the entire store to its default state.
       */
      clearAllData: () => {
        set({ ...DEFAULT_STATE });
      },
    }),
    {
      name: 'timetable-wiz-data',
      storage: createJSONStorage(() => {
        // SSR guard: localStorage is only available in the browser
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      merge: (persisted: unknown, current: TimetableStore): TimetableStore =>
        fullReplacementMerge(persisted, current) as TimetableStore,

      // Only persist state data (not action functions)
      partialize: (state: TimetableStore): TimetableState => ({
        schoolName: state.schoolName,
        organizationName: state.organizationName,
        academicYear: state.academicYear,
        headmasterName: state.headmasterName,
        timings: state.timings,
        teachers: state.teachers,
        subjects: state.subjects,
        classes: state.classes,
        sections: state.sections,
        assignments: state.assignments,
        entries: state.entries,
        substitutes: state.substitutes,
      }),
    }
  )
);
