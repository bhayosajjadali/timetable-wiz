
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
  addClass: (name: string, sectionIds: string[]) => void;
  updateClass: (id: string, name: string, sectionIds: string[]) => void;
  deleteClass: (id: string) => void;
  
  // Teachers
  addTeacher: (name: string, shortName: string) => void;
  updateTeacher: (id: string, name: string, shortName: string) => void;
  deleteTeacher: (id: string) => void;
  
  // Subjects
  addSubject: (name: string, shortName: string) => void;
  updateSubject: (id: string, name: string, shortName: string) => void;
  deleteSubject: (id: string) => void;
  
  // Assignments
  addAssignment: (assignment: Omit<Assignment, 'id'>) => void;
  deleteAssignment: (id: string) => void;
  updateAssignment: (id: string, assignment: Omit<Assignment, 'id'>) => void;
  
  // Entries
  addEntry: (entry: Omit<Entry, 'id'>) => void;
  deleteEntry: (id: string) => void;
  
  // Substitutes
  addSubstitute: (sub: Omit<Substitute, 'id'>) => void;
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
          sectionIds: c.sectionIds.filter(sid => sid !== id)
        }))
      })),
      
      addClass: (name, sectionIds) => set((state) => ({
        classes: [...state.classes, { id: generateId(), name, sectionIds }]
      })),
      updateClass: (id, name, sectionIds) => set((state) => ({
        classes: state.classes.map(c => c.id === id ? { ...c, name, sectionIds } : c)
      })),
      deleteClass: (id) => set((state) => ({
        classes: state.classes.filter(c => c.id !== id)
      })),
      
      addTeacher: (name, shortName) => set((state) => ({
        teachers: [...state.teachers, { id: generateId(), name, shortName }]
      })),
      updateTeacher: (id, name, shortName) => set((state) => ({
        teachers: state.teachers.map(t => t.id === id ? { ...t, name, shortName } : t)
      })),
      deleteTeacher: (id) => set((state) => ({
        teachers: state.teachers.filter(t => t.id !== id)
      })),
      
      addSubject: (name, shortName) => set((state) => ({
        subjects: [...state.subjects, { id: generateId(), name, shortName }]
      })),
      updateSubject: (id, name, shortName) => set((state) => ({
        subjects: state.subjects.map(s => s.id === id ? { ...s, name, shortName } : s)
      })),
      deleteSubject: (id) => set((state) => ({
        subjects: state.subjects.filter(s => s.id !== id)
      })),
      
      addAssignment: (assignment) => set((state) => ({
        assignments: [...state.assignments, { ...assignment, id: generateId() }]
      })),
      deleteAssignment: (id) => set((state) => ({
        assignments: state.assignments.filter(a => a.id !== id)
      })),
      updateAssignment: (id, assignment) => set((state) => ({
        assignments: state.assignments.map(a => a.id === id ? { ...a, ...assignment } : a)
      })),
      
      addEntry: (entry) => set((state) => ({
        entries: [...state.entries, { ...entry, id: generateId() }]
      })),
      deleteEntry: (id) => set((state) => ({
        entries: state.entries.filter(e => e.id !== id)
      })),
      
      addSubstitute: (sub) => set((state) => ({
        substitutes: [...state.substitutes, { ...sub, id: generateId() }]
      })),
      deleteSubstitute: (id) => set((state) => ({
        substitutes: state.substitutes.filter(s => s.id !== id)
      })),
      
      clearAllData: () => set(DEFAULT_STATE),
      
      replaceAllData: (data) => {
        const newTimings = { ...DEFAULT_STATE.timings, ...(data.timings || {}) };
        const newState = { ...DEFAULT_STATE, ...data, timings: newTimings };
        set(newState);
      },
    }),
    {
      name: 'timetable-wiz-data',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : null as any)),
    }
  )
);
