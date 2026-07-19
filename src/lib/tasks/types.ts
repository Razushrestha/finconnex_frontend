export type TaskType =
  | "Call"
  | "Email"
  | "Meeting"
  | "Followup"
  | "Demo"
  | "Research"
  | "Other";
export type Priority = "High" | "Medium" | "Low";
export type TaskStatus =
  | "Not Started"
  | "In Progress"
  | "Completed"
  | "Deferred"
  | "Cancelled";

export interface Task {
  taskId: string;
  title: string;
  taskType: TaskType;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  assignedTo: string;

  relatedTo?: string;
  reminderDate?: string;
  createdBy?: string;
  description?: string;
  completedDate?: string;
  notes?: string[];
  collaborators?: string[];

  category: string;
  project: string;
  urgent?: boolean;
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
    id: "new",
    title: "New",
    count: 603,
    badgeColorClass: "bg-sky-500 text-white",
    tasks: [
      {
        taskId: "ZWA-T56",
        title: "Release Announcement",
        category: "Launch",
        project: "Zylsoft Web App",
        taskType: "Meeting",
        priority: "High",
        status: "Not Started",
        dueDate: "28/06/2026 03:30 AM",
        assignedTo: "John Doe",
        assignee: { initials: "JD", colorClass: "bg-amber-100 text-amber-700" },
        urgent: true,
      },
      {
        taskId: "DS1-T17",
        title: "Painting - Base Coat",
        category: "Electricity and wiring",
        project: "Donelley site construction",
        taskType: "Research",
        priority: "High",
        status: "Not Started",
        dueDate: "28/05/2026 07:48 PM",
        assignedTo: "Tom P",
        assignee: { initials: "TP", colorClass: "bg-rose-100 text-rose-700" },
        urgent: true,
      },
      {
        taskId: "DS1-T9",
        title: "Safety Unit Check",
        category: "Electricity and wiring- All tasks",
        project: "Donelley site construction",
        taskType: "Followup",
        priority: "High",
        status: "Not Started",
        dueDate: "02/02/2026 02:30 AM",
        assignedTo: "Mike R",
        assignee: {
          initials: "MR",
          colorClass: "bg-indigo-100 text-indigo-700",
        },
        urgent: true,
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
        taskType: "Research",
        priority: "High",
        status: "In Progress",
        dueDate: "12/09/2026 05:00 PM",
        assignedTo: "Alex L",
        assignee: { initials: "AL", colorClass: "bg-amber-100 text-amber-700" },
        urgent: true,
      },
      {
        taskId: "SC1-T9",
        title: "Set Roof trusses",
        category: "Roof and Basement carpentry",
        project: "Supermarket Construction",
        taskType: "Other",
        priority: "High",
        status: "In Progress",
        dueDate: "17/07/2026 09:00 AM",
        assignedTo: "Kate N",
        assignee: { initials: "KN", colorClass: "bg-slate-200 text-slate-700" },
        urgent: true,
      },
      {
        taskId: "A7NC-T2",
        title: "Addition exercise",
        category: "Math",
        project: "Zylker airlines mobile app",
        taskType: "Demo",
        priority: "High",
        status: "In Progress",
        dueDate: "20/02/2026 02:30 AM",
        assignedTo: "Rob V",
        assignee: {
          initials: "RV",
          colorClass: "bg-orange-100 text-orange-700",
        },
        urgent: true,
      },
    ],
  },
  {
    id: "pending",
    title: "Pending",
    count: 7,
    badgeColorClass: "bg-emerald-400 text-white",
    tasks: [
      {
        taskId: "XYA-T43",
        title: "Spell check",
        category: "Event management",
        project: "Zylker Product Launch",
        taskType: "Other",
        priority: "Medium",
        status: "Deferred",
        dueDate: "06/05/2026 02:00 AM",
        assignedTo: "Zara",
        assignee: { initials: "Z", colorClass: "bg-emerald-500 text-white" },
        urgent: false,
      },
      {
        taskId: "E8-T5",
        title: "Check Usage",
        category: "General",
        project: "Industrial Equipments Design",
        taskType: "Research",
        priority: "Low",
        status: "Deferred",
        dueDate: "07/11/2026 10:00 AM",
        assignedTo: "Paul N",
        assignee: { initials: "PN", colorClass: "bg-rose-100 text-rose-700" },
        urgent: false,
      },
      {
        taskId: "ZWA-T10",
        title: "UI Design",
        category: "Design",
        project: "Zylsoft Web App",
        taskType: "Demo",
        priority: "High",
        status: "Deferred",
        dueDate: "04/06/2026 03:30 AM",
        assignedTo: "Sam G",
        assignee: { initials: "SG", colorClass: "bg-amber-100 text-amber-700" },
        urgent: true,
      },
    ],
  },
  {
    id: "complete",
    title: "Complete",
    count: 9,
    badgeColorClass: "bg-sky-500 text-white",
    tasks: [
      {
        taskId: "DS1-T79",
        title: "Import screws",
        category: "General",
        project: "Donelley site",
        taskType: "Other",
        priority: "Low",
        status: "Completed",
        dueDate: "17/07/2026 12:00 PM",
        assignedTo: "Tom P",
        assignee: { initials: "TP", colorClass: "bg-rose-100 text-rose-700" },
        urgent: false,
      },
      {
        taskId: "AC1-T108",
        title: "Import screws",
        category: "Hardware- All tasks",
        project: "Apt. Construction",
        taskType: "Other",
        priority: "Low",
        status: "Completed",
        dueDate: "17/07/2026 12:00 PM",
        assignedTo: "Kate N",
        assignee: { initials: "KN", colorClass: "bg-slate-200 text-slate-700" },
        urgent: false,
      },
      {
        taskId: "AC1-T168",
        title: "Install windows",
        category: "Roof and Basement",
        project: "Apt. Construction",
        taskType: "Other",
        priority: "Medium",
        status: "Completed",
        dueDate: "17/07/2026 12:00 PM",
        assignedTo: "Mike R",
        assignee: {
          initials: "MR",
          colorClass: "bg-indigo-100 text-indigo-700",
        },
        urgent: false,
      },
    ],
  },
];
