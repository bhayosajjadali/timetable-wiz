'use client';

import { useState } from 'react';
import { SetupTab } from './setup-tab';
import { ClassesTab } from './classes-tab';
import { AssignmentsTab } from './assignments-tab';
import { TimetableTab } from './timetable-tab';
import { DataManagementTab } from './data-management-tab';
import {
  Settings,
  GraduationCap,
  UserCheck,
  CalendarDays,
  Database,
} from 'lucide-react';

type ConfigSubTab = 'setup' | 'classes' | 'assignments' | 'timetable' | 'data';

const SUB_TABS: {
  key: ConfigSubTab;
  label: string;
  icon: typeof Settings;
  color: string;
  gradient: string;
  bg: string;
  border: string;
  text: string;
}[] = [
  {
    key: 'setup',
    label: 'Setup',
    icon: Settings,
    color: '#8B5CF6',
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-600',
  },
  {
    key: 'classes',
    label: 'Classes',
    icon: GraduationCap,
    color: '#007AFF',
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-600',
  },
  {
    key: 'assignments',
    label: 'Assign',
    icon: UserCheck,
    color: '#AF52DE',
    gradient: 'from-fuchsia-500 to-purple-600',
    bg: 'bg-fuchsia-50',
    border: 'border-fuchsia-200',
    text: 'text-fuchsia-600',
  },
  {
    key: 'timetable',
    label: 'Timetable',
    icon: CalendarDays,
    color: '#34C759',
    gradient: 'from-emerald-500 to-green-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-600',
  },
  {
    key: 'data',
    label: 'Data',
    icon: Database,
    color: '#5AC8FA',
    gradient: 'from-cyan-500 to-sky-600',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    text: 'text-cyan-600',
  },
];

const SUB_COMPONENTS: Record<ConfigSubTab, () => React.JSX.Element> = {
  setup: SetupTab,
  classes: ClassesTab,
  assignments: AssignmentsTab,
  timetable: TimetableTab,
  data: DataManagementTab,
};

export function ConfigurationTab() {
  const [active, setActive] = useState<ConfigSubTab>('setup');
  const ActiveComponent = SUB_COMPONENTS[active];

  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {SUB_TABS.map((tab) => {
          const isActive = active === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`
                flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium
                transition-all duration-200 whitespace-nowrap shrink-0
                ${isActive
                  ? `bg-gradient-to-r ${tab.gradient} text-white shadow-md`
                  : `${tab.bg} ${tab.text} ${tab.border} border hover:shadow-sm`
                }
              `}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active sub-panel */}
      <div className="animate-in fade-in-0 duration-200">
        <ActiveComponent key={active} />
      </div>
    </div>
  );
}
