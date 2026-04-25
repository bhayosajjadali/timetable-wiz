
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
      
      clearAllData: () => set(DEFAULT_STATE),
      
      replaceAllData: (data) => {
        // Ensure all arrays exist
        const sections = data.sections || [];
        const classes = data.classes || [];
        const entries = data.entries || [];
        const assignments = data.assignments || [];
        
        // Repair class.sectionIds if they are missing but entries/assignments exist
        const repairedClasses = classes.map(c => {
          const sectionIds = c.sectionIds || [];
          
          // Find sections linked to this class in entries
          const entrySectionIds = entries
            .filter(e => e.classId === c.id)
            .map(e => e.sectionId);
            
          // Find sections linked to this class in assignments
          const assignmentSectionIds = assignments
            .filter(a => a.classId === c.id)
            .map(a => a.sectionId);
            
          // Merge all unique section IDs
          const allSectionIds = Array.from(new Set([...sectionIds, ...entrySectionIds, ...assignmentSectionIds]));
          
          // Only keep section IDs that actually exist in the sections array
          const validSectionIds = allSectionIds.filter(sid => sections.some(s => s.id === sid));
          
          return { ...c, sectionIds: validSectionIds };
        });

        const newTimings = { ...DEFAULT_TIMINGS, ...(data.timings || {}) };
        
        // Ensure days array is not empty
        if (!newTimings.days || newTimings.days.length === 0) {
          newTimings.days = DEFAULT_TIMINGS.days;
        }

        const newState = { 
          ...DEFAULT_STATE, 
          ...data, 
          classes: repairedClasses,
          timings: newTimings 
        };
        set(newState);
      },
    }),
    {
      name: 'timetable-wiz-data',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : null as any)),
    }
  )
);
