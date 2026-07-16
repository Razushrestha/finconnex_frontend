export interface Task {
  taskId: string;
  title: string;
  category: string;
  project: string;
  urgent?: boolean;
  hasComment?: boolean;
  hasSchedule?: boolean;
  dueDate?: string;
  overdue?: boolean;
  assignee: {
    initials: string;
    colorClass: string;
  };
}

export interface TaskColumn {
  id: string;
  title: string;
  count: number;
  badgeColorClass: string;
  tasks: Task[];
}

export const taskColumns: TaskColumn[] = [
  {
    id: "open",
    title: "Open",
    count: 603,
    badgeColorClass: "bg-sky-500 text-white",
    tasks: [
      {
        taskId: "ZWA-T56",
        title: "Release Announcement",
        category: "Launch",
        project: "Zylsoft Web App",
        urgent: true,
        hasSchedule: true,
        dueDate: "28/06/2024 03:30 AM",
        overdue: true,
        assignee: { initials: "JD", colorClass: "bg-amber-100 text-amber-700" },
      },
      {
        taskId: "DS1-T17",
        title: "Painting - Base Coat",
        category: "Electricity and wiring",
        project: "Donelley site construction",
        urgent: true,
        hasSchedule: true,
        hasComment: true,
        dueDate: "28/05/2025 07:48 PM",
        overdue: true,
        assignee: { initials: "TP", colorClass: "bg-rose-100 text-rose-700" },
      },
      {
        taskId: "DS1-T9",
        title: "Safety Unit Check",
        category: "Electricity and wiring- All tasks",
        project: "Donelley site construction",
        urgent: true,
        hasSchedule: true,
        dueDate: "02/02/2026 02:30 AM",
        overdue: true,
        assignee: {
          initials: "MR",
          colorClass: "bg-indigo-100 text-indigo-700",
        },
      },
    ],
  },
  {
    id: "in-progress",
    title: "In Progress",
    count: 78,
    badgeColorClass: "bg-slate-400 text-white",
    tasks: [
      {
        taskId: "Sm-T11",
        title: "Data assessment",
        category: "Evaluation and debriefing",
        project: "New York Pet Drive",
        urgent: true,
        hasSchedule: true,
        dueDate: "12/09/2018 05:00 PM",
        overdue: true,
        assignee: { initials: "AL", colorClass: "bg-amber-100 text-amber-700" },
      },
      {
        taskId: "SC1-T9",
        title: "Set Roof trusses",
        category: "Roof and Basement carpentry",
        project: "Supermarket Construction",
        urgent: true,
        hasSchedule: true,
        hasComment: true,
        assignee: { initials: "KN", colorClass: "bg-slate-200 text-slate-700" },
      },
      {
        taskId: "A7NC-T2",
        title: "Addition exercise",
        category: "Math",
        project: "Zylker airlines mobile app",
        urgent: true,
        hasSchedule: true,
        dueDate: "20/02/2020 02:30 AM",
        overdue: true,
        assignee: {
          initials: "RV",
          colorClass: "bg-orange-100 text-orange-700",
        },
      },
    ],
  },
  {
    id: "design-research",
    title: "Design Research",
    count: 7,
    badgeColorClass: "bg-emerald-400 text-white",
    tasks: [
      {
        taskId: "XYA-T43",
        title: "Spell check",
        category: "Event management",
        project: "Zylker Product Launch",
        urgent: true,
        hasSchedule: true,
        dueDate: "06/05/2021 02:00 AM",
        overdue: true,
        assignee: { initials: "Z", colorClass: "bg-emerald-500 text-white" },
      },
      {
        taskId: "E8-T5",
        title: "Check Usage",
        category: "General",
        project: "Industrial Equipments Design",
        urgent: true,
        hasSchedule: true,
        dueDate: "07/11/2017 10:00 AM",
        overdue: true,
        assignee: { initials: "PN", colorClass: "bg-rose-100 text-rose-700" },
      },
      {
        taskId: "ZWA-T10",
        title: "UI Design",
        category: "Design",
        project: "Zylsoft Web App",
        urgent: true,
        hasSchedule: true,
        dueDate: "04/06/2024 03:30 AM",
        overdue: true,
        assignee: { initials: "SG", colorClass: "bg-amber-100 text-amber-700" },
      },
    ],
  },
  {
    id: "new",
    title: "New",
    count: 9,
    badgeColorClass: "bg-sky-500 text-white",
    tasks: [
      {
        taskId: "DS1-T79",
        title: "Import screws",
        category: "General",
        project: "Donelley site",
        urgent: true,
        hasSchedule: true,
        assignee: { initials: "TP", colorClass: "bg-rose-100 text-rose-700" },
      },
      {
        taskId: "AC1-T108",
        title: "Import screws",
        category: "Hardware- All tasks",
        project: "Apt. Construction",
        urgent: true,
        hasSchedule: true,
        assignee: { initials: "KN", colorClass: "bg-slate-200 text-slate-700" },
      },
      {
        taskId: "AC1-T168",
        title: "Install windows",
        category: "Roof and Basement",
        project: "Apt. Construction",
        urgent: true,
        hasSchedule: true,
        assignee: {
          initials: "MR",
          colorClass: "bg-indigo-100 text-indigo-700",
        },
      },
    ],
  },
];
