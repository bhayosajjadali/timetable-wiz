'use client';

import { useState } from 'react';
import { SetupTab } from '@/components/timetable/setup-tab';
import { ClassesTab } from '@/components/timetable/classes-tab';
import { AssignmentsTab } from '@/components/timetable/assignments-tab';
import { TimetableTab } from '@/components/timetable/timetable-tab';
import { SubstitutesTab } from '@/components/timetable/substitutes-tab';
import { ReportsTab } from '@/components/timetable/reports-tab';
import { DataManagementTab } from '@/components/timetable/data-management-tab';
import { useTimetableStore } from '@/lib/store';
import {
  Settings,
  GraduationCap,
  UserCheck,
  CalendarDays,
  ArrowLeftRight,
  FileText,
  Database,
  School,
} from 'lucide-react';

type TabKey = 'setup' | 'classes' | 'assignments' | 'timetable' | 'substitutes' | 'reports' | 'data';

interface NavItem {
  key: TabKey;
  label: string;
  icon: typeof Settings;
  color: string;
  gradient: string;
  activeBg: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'setup', label: 'Setup', icon: Settings, color: '#8B5CF6', gradient: 'from-violet-500 to-purple-600', activeBg: '#8B5CF618' },
  { key: 'classes', label: 'Classes', icon: GraduationCap, color: '#007AFF', gradient: 'from-blue-500 to-indigo-600', activeBg: '#007AFF18' },
  { key: 'assignments', label: 'Assign', icon: UserCheck, color: '#AF52DE', gradient: 'from-fuchsia-500 to-purple-600', activeBg: '#AF52DE18' },
  { key: 'timetable', label: 'Timetable', icon: CalendarDays, color: '#34C759', gradient: 'from-emerald-500 to-green-600', activeBg: '#34C75918' },
  { key: 'substitutes', label: 'Substitute', icon: ArrowLeftRight, color: '#FF9500', gradient: 'from-amber-500 to-orange-600', activeBg: '#FF950018' },
  { key: 'reports', label: 'Reports', icon: FileText, color: '#FF3B30', gradient: 'from-rose-500 to-red-600', activeBg: '#FF3B3018' },
  { key: 'data', label: 'Data', icon: Database, color: '#5AC8FA', gradient: 'from-cyan-500 to-sky-600', activeBg: '#5AC8FA18' },
];

const TAB_COMPONENTS: Record<TabKey, () => React.JSX.Element> = {
  setup: SetupTab,
  classes: ClassesTab,
  assignments: AssignmentsTab,
  timetable: TimetableTab,
  substitutes: SubstitutesTab,
  reports: ReportsTab,
  data: DataManagementTab,
};

export default function Home() {
  const schoolName = useTimetableStore((s) => s.schoolName);
  const [activeTab, setActiveTab] = useState<TabKey>('setup');

  const ActiveComponent = TAB_COMPONENTS[activeTab];
  const activeItem = NAV_ITEMS.find((i) => i.key === activeTab)!;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Animated background with colorful gradients */}
      <div className="fixed inset-0 -z-10">
        {/* Base layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/20" />
        {/* Floating color orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-violet-200/30 to-purple-200/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-cyan-200/30 to-blue-200/20 blur-3xl animate-pulse [animation-delay:2s]" />
        <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] rounded-full bg-gradient-to-br from-emerald-200/20 to-green-200/10 blur-3xl animate-pulse [animation-delay:4s]" />
        <div className="absolute bottom-[30%] left-[10%] w-[25%] h-[25%] rounded-full bg-gradient-to-br from-amber-200/20 to-orange-200/10 blur-3xl animate-pulse [animation-delay:6s]" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle, #888 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>

      {/* Header - Premium glass effect */}
      <header className="sticky top-0 z-40">
        <div className="bg-white/60 backdrop-blur-2xl border-b border-white/30 shadow-[0_1px_30px_rgba(0,0,0,0.04)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-14 sm:h-16 gap-3">
              <div className={`flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-gradient-to-br ${activeItem.gradient} shadow-lg shrink-0 transition-all duration-500`}>
                <School className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-[#1D1D1F] tracking-tight truncate">
                  {schoolName}
                </h1>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium tracking-wide uppercase hidden sm:block">Timetable Manager</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop horizontal navigation */}
      <div className="hidden sm:block sticky top-14 sm:top-16 z-30">
        <div className="bg-white/40 backdrop-blur-xl border-b border-white/20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-center gap-1.5 h-12">
              {NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.key;
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className={`
                      relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                      ${isActive
                        ? 'text-white shadow-lg shadow-black/10 scale-[1.02]'
                        : 'text-[#6B7280] hover:text-[#374151] hover:bg-white/40'
                      }
                    `}
                    style={isActive ? {
                      background: `linear-gradient(135deg, ${item.color}DD, ${item.color}BB)`,
                      boxShadow: `0 4px 14px ${item.color}40`,
                    } : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {isActive && (
                      <div
                        className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 w-5 h-1 rounded-full transition-all duration-300"
                        style={{ backgroundColor: item.color }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 sm:pb-8">
        <div className="animate-in fade-in-0 duration-300">
          <ActiveComponent key={activeTab} />
        </div>
      </main>

      {/* Bottom Navigation - Mobile (glass morphism) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-slate-50 via-blue-50/30 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-slate-50 via-blue-50/30 to-transparent z-10 pointer-events-none" />
        </div>

        <div className="bg-white/50 backdrop-blur-2xl border-t border-white/30 shadow-[0_-4px_30px_rgba(0,0,0,0.06)]">
          <div className="flex items-stretch overflow-x-auto scrollbar-hide px-1 pt-1 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.key;
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className="flex flex-col items-center justify-center gap-0.5 min-w-[3.5rem] flex-1 py-1 rounded-2xl transition-all duration-300 active:scale-[0.90] relative"
                >
                  {isActive && (
                    <div
                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-1 rounded-full transition-all duration-500 shadow-sm"
                      style={{ backgroundColor: item.color, boxShadow: `0 2px 8px ${item.color}60` }}
                    />
                  )}
                  <div
                    className={`p-1.5 rounded-2xl transition-all duration-500 ${
                      isActive ? 'shadow-lg' : ''
                    }`}
                    style={isActive ? {
                      backgroundColor: `${item.color}20`,
                      boxShadow: `0 4px 12px ${item.color}30`,
                    } : undefined}
                  >
                    <Icon
                      className="h-[18px] w-[18px] transition-all duration-300"
                      style={{
                        color: isActive ? item.color : '#9CA3AF',
                        strokeWidth: isActive ? 2.2 : 1.5,
                      }}
                    />
                  </div>
                  <span
                    className={`text-[10px] leading-none font-medium transition-all duration-300 ${
                      isActive ? 'font-bold' : 'font-medium'
                    }`}
                    style={{ color: isActive ? item.color : '#9CA3AF' }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
