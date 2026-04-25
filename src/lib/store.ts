import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/* ========================================================================
   Types
   ======================================================================== */

export interface PeriodTiming {
  startTime: string;
  endTime: string;
  isBreak: boolean;
  label?: string;
}

export interface Timings {
  periodsPerDay: number;
  startTime: string;
  periodDuration: number;
  periodTimingMode: 'automatic' | 'custom';
  customPeriodTimings: PeriodTiming[];
}

export interface Teacher { id: string; name: string; shortName: string; }
export interface Subject { id: string; name: string; shortName: string; }
export interface Class { id: string; name: string; sectionIds: string[]; }
export interface Section { id: string; name: string; classId: string; }
export interface Assignment { id: string; teacherId: string; subjectId: string; classId: string; sectionId: string; }
export interface Entry { id: string; day: string; period: number; teacherId: string; classId: string; sectionId: string; subjectId: string; }
export interface Substitute { id: string; date: string; day: string; period: number; entryId: string; originalTeacherId: string; substituteTeacherId: string; classId: string; sectionId: string; subjectId: string; }

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
  setSchoolInfo: (info: Partial<Pick<TimetableState, 'schoolName' | 'organizationName' | 'academicYear' | 'headmasterName'>>) => void;
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
  addAssignment: (t: string, s: string, c: string, sec: string) => void;
  deleteAssignment: (id: string) => void;
  addEntry: (d: string, p: number, t: string, c: string, s: string, sub: string) => void;
  deleteEntry: (id: string) => void;
  addSubstitute: (dt: string, dy: string, eid: string, ot: string, st: string) => void;
  deleteSubstitute: (id: string) => void;
  importBackup: (data: unknown) => void;
  clearAllData: () => void;
}

export type TimetableStore = TimetableState & TimetableActions;

/* ========================================================================
   Helpers & Defaults
   ======================================================================== */

function generateId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
}

function deriveShortName(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.length === 1 ? words[0].substring(0, 3).toUpperCase() : words.map(w => w[0]).join('').substring(0, 3).toUpperCase();
}

const DEFAULT_TIMINGS: Timings = {
  periodsPerDay: 7,
  startTime: '08:00',
  periodDuration: 40,
  periodTimingMode: 'automatic',
  customPeriodTimings: [],
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
   Store Implementation
   ======================================================================== */

export const useTimetableStore = create<TimetableStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,
      setSchoolInfo: (info) => set({ ...info }),
      setTimings: (timings) => set((state) => ({ timings: { ...state.timings, ...timings } })),
      
      // ... (Rest of your logic remains same, just ensure it uses DEFAULT_TIMINGS)
      addTeacher: (name) => set(s => ({ teachers: [...s.teachers, { id: generateId(), name, shortName: deriveShortName(name) }] })),
      addClass: (name) => set(s => ({ classes: [...s.classes, { id: generateId(), name, sectionIds: [] }] })),
      addSection: (name, classId) => set(s => ({ sections: [...s.sections, { id: generateId(), name, classId }] })),
      // Simplified for brevity, add back your full logic for entries/substitutes here
      
      clearAllData: () => set({ ...DEFAULT_STATE }),
      importBackup: (data: any) => set({ ...data }), 
    }),
    {
      name: 'timetable-wiz-data',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : null as any)),
    }
  )
);
