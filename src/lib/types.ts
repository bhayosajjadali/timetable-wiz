export interface Section {
  id: string;
  name: string;
}

export interface Class {
  id: string;
  name: string;
  sectionIds: string[];
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

export interface CustomPeriodTiming {
  period: number;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
}

export interface Timings {
  periodsPerDay: number;
  startTime: string;
  periodDuration: number;
  breakAfterPeriod: number;
  breakDuration: number;
  days: string[];
  periodTimingMode: 'equal' | 'custom';
  customPeriodTimings: CustomPeriodTiming[];
}

export interface Assignment {
  id: string;
  teacherId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
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
  entryId: string;
  originalTeacherId: string;
  substituteTeacherId: string;
}

export interface SchoolSettings {
  schoolName: string;
  timings: Timings;
}

export interface TimetableState {
  schoolName: string;
  timings: Timings;
  sections: Section[];
  classes: Class[];
  teachers: Teacher[];
  subjects: Subject[];
  assignments: Assignment[];
  entries: Entry[];
  substitutes: Substitute[];
}
