'use client';

import { useMemo } from 'react';
import { useTimetableStore } from '@/lib/store';
import {
  Users,
  BookOpen,
  GraduationCap,
  CalendarDays,
  ArrowLeftRight,
  Layers,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  School,
} from 'lucide-react';

export function DashboardTab() {
  const {
    schoolName,
    teachers,
    subjects,
    classes,
    sections,
    assignments,
    entries,
    substitutes,
    timings,
  } = useTimetableStore();

  const today = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  }, []);

  const todayDate = useMemo(() => {
    return new Date().toLocaleDateString('en-PK', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const todayDateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Today's substitutes
  const todaySubstitutes = useMemo(() => {
    return substitutes.filter((s) => s.date === todayDateStr);
  }, [substitutes, todayDateStr]);

  // Today's scheduled entries
  const todayEntries = useMemo(() => {
    return entries.filter((e) => e.day === today);
  }, [entries, today]);

  // Teachers with timetable today
  const activeTeachersToday = useMemo(() => {
    const ids = new Set(todayEntries.map((e) => e.teacherId));
    return teachers.filter((t) => ids.has(t.id));
  }, [todayEntries, teachers]);

  // Unassigned teachers today
  const idleTeachersToday = useMemo(() => {
    const ids = new Set(todayEntries.map((e) => e.teacherId));
    return teachers.filter((t) => !ids.has(t.id));
  }, [todayEntries, teachers]);

  // Total class-sections
  const totalClassSections = useMemo(() => {
    return classes.reduce((acc, c) => acc + (c.sectionIds?.length || 0), 0);
  }, [classes]);

  // Timetable fill rate
  const fillRate = useMemo(() => {
    const slots = timings.periodsPerDay * timings.days.length * totalClassSections;
    if (slots === 0) return 0;
    return Math.round((entries.length / slots) * 100);
  }, [entries, timings, totalClassSections]);

  // Unassigned subjects count
  const unassignedSubjects = useMemo(() => {
    const assignedSubjectIds = new Set(assignments.map((a) => a.subjectId));
    return subjects.filter((s) => !assignedSubjectIds.has(s.id)).length;
  }, [assignments, subjects]);

  // Recent substitutes (last 7 days)
  const recentSubstitutes = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return substitutes
      .filter((s) => new Date(s.date) >= cutoff)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [substitutes]);

  const getTeacherName = (id: string) => teachers.find((t) => t.id === id)?.name ?? 'Unknown';
  const getSubjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? '—';
  const getClassName = (classId: string, sectionId: string) => {
    const cls = classes.find((c) => c.id === classId)?.name ?? '?';
    const sec = sections.find((s) => s.id === sectionId)?.name ?? '?';
    return `${cls} - ${sec}`;
  };

  const isTodaySchoolDay = timings.days.includes(today);

  return (
    <div className="space-y-5 pb-4">
      {/* School Name Header */}
      <div className="text-center py-6 px-4 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 shadow-xl shadow-violet-200 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative">
          <div className="flex items-center justify-center gap-2 mb-2">
            <School className="h-5 w-5 text-violet-200" />
            <span className="text-violet-200 text-xs font-semibold uppercase tracking-widest">Timetable Wiz</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{schoolName}</h1>
          <p className="text-violet-200 text-sm mt-1">{todayDate}</p>
          {!isTodaySchoolDay && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 text-white text-xs px-3 py-1 rounded-full">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>No school today ({today})</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Teachers"
          value={teachers.length}
          icon={Users}
          gradient="from-blue-500 to-indigo-600"
          bg="bg-blue-50"
          text="text-blue-700"
          sub={`${activeTeachersToday.length} active today`}
        />
        <StatCard
          label="Classes"
          value={classes.length}
          icon={GraduationCap}
          gradient="from-emerald-500 to-green-600"
          bg="bg-emerald-50"
          text="text-emerald-700"
          sub={`${totalClassSections} sections total`}
        />
        <StatCard
          label="Subjects"
          value={subjects.length}
          icon={BookOpen}
          gradient="from-amber-500 to-orange-500"
          bg="bg-amber-50"
          text="text-amber-700"
          sub={unassignedSubjects > 0 ? `${unassignedSubjects} unassigned` : 'All assigned'}
        />
        <StatCard
          label="Periods"
          value={timings.periodsPerDay}
          icon={Clock}
          gradient="from-fuchsia-500 to-purple-600"
          bg="bg-fuchsia-50"
          text="text-fuchsia-700"
          sub={`${timings.days.length} school days`}
        />
      </div>

      {/* Timetable Fill Rate */}
      <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sm text-gray-800">Timetable Fill Rate</span>
          </div>
          <span className="text-2xl font-bold text-teal-600">{fillRate}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full bg-gradient-to-r from-teal-400 to-cyan-500 transition-all duration-700"
            style={{ width: `${Math.min(fillRate, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {entries.length} periods filled · {assignments.length} assignments · {totalClassSections} class-sections
        </p>
      </div>

      {/* Today's Substitutes */}
      <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
            <ArrowLeftRight className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-sm text-gray-800">Today's Substitutes</span>
          {todaySubstitutes.length > 0 && (
            <span className="ml-auto bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {todaySubstitutes.length}
            </span>
          )}
        </div>

        {todaySubstitutes.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>No substitutes scheduled for today</span>
          </div>
        ) : (
          <div className="space-y-2">
            {todaySubstitutes.map((sub) => {
              const entry = entries.find((e) => e.id === sub.entryId);
              return (
                <div key={sub.id} className="flex items-center gap-2 bg-white/80 rounded-xl px-3 py-2 text-sm shadow-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
                      <span>Period {entry?.period ?? '?'}</span>
                      <span>·</span>
                      <span>{entry ? getClassName(entry.classId, entry.sectionId) : '—'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-red-500 font-medium line-through">{getTeacherName(sub.originalTeacherId)}</span>
                      <span className="text-gray-400">→</span>
                      <span className="text-emerald-600 font-semibold">{getTeacherName(sub.substituteTeacherId)}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{getSubjectName(entry?.subjectId ?? '')}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Today's Schedule Summary */}
      {isTodaySchoolDay && (
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <CalendarDays className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sm text-gray-800">Today — {today}</span>
            <span className="ml-auto text-xs text-blue-600 font-medium">{todayEntries.length} periods</span>
          </div>

          {idleTeachersToday.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1.5 font-medium">No periods today:</p>
              <div className="flex flex-wrap gap-1.5">
                {idleTeachersToday.map((t) => (
                  <span key={t.id} className="text-xs bg-white/80 border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-gray-500 mb-1.5 font-medium">Active teachers ({activeTeachersToday.length}):</p>
            <div className="flex flex-wrap gap-1.5">
              {activeTeachersToday.map((t) => {
                const periodCount = todayEntries.filter((e) => e.teacherId === t.id).length;
                return (
                  <span key={t.id} className="text-xs bg-blue-500 text-white px-2.5 py-1 rounded-full font-medium">
                    {t.name} <span className="opacity-75">×{periodCount}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recent Substitutes */}
      {recentSubstitutes.length > 0 && (
        <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sm text-gray-800">Recent Substitutions (7 days)</span>
          </div>
          <div className="space-y-2">
            {recentSubstitutes.map((sub) => {
              const entry = entries.find((e) => e.id === sub.entryId);
              const dateLabel = sub.date === todayDateStr
                ? 'Today'
                : new Date(sub.date).toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric' });
              return (
                <div key={sub.id} className="flex items-center gap-3 text-xs">
                  <span className="text-gray-400 w-16 shrink-0">{dateLabel}</span>
                  <span className="text-gray-700 font-medium truncate">{getTeacherName(sub.substituteTeacherId)}</span>
                  <span className="text-gray-400">for</span>
                  <span className="text-gray-500 truncate">{getTeacherName(sub.originalTeacherId)}</span>
                  {entry && (
                    <span className="ml-auto shrink-0 text-gray-400">{getClassName(entry.classId, entry.sectionId)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Setup Status */}
      <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <Layers className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-sm text-gray-800">Setup Status</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatusRow label="School name" done={schoolName !== 'My School' && schoolName.trim().length > 0} />
          <StatusRow label="Teachers" done={teachers.length > 0} count={teachers.length} />
          <StatusRow label="Subjects" done={subjects.length > 0} count={subjects.length} />
          <StatusRow label="Sections" done={sections.length > 0} count={sections.length} />
          <StatusRow label="Classes" done={classes.length > 0} count={classes.length} />
          <StatusRow label="Timetable" done={entries.length > 0} count={entries.length} />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, gradient, bg, text, sub,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  gradient: string;
  bg: string;
  text: string;
  sub: string;
}) {
  return (
    <div className={`rounded-2xl border border-white/60 ${bg} p-3.5 shadow-sm`}>
      <div className={`inline-flex p-1.5 rounded-xl bg-gradient-to-br ${gradient} mb-2 shadow-sm`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className={`text-2xl font-bold ${text}`}>{value}</div>
      <div className="text-xs font-semibold text-gray-700 mt-0.5">{label}</div>
      <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{sub}</div>
    </div>
  );
}

function StatusRow({ label, done, count }: { label: string; done: boolean; count?: number }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
      )}
      <span className="text-xs text-gray-600">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="ml-auto text-xs font-semibold text-gray-400">{count}</span>
      )}
    </div>
  );
}
