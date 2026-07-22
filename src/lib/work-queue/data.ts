export type WorkQueueStatus = "Open" | "In Progress";
export type WorkQueuePriority = "High" | "LOW" | "IOW" | "Low";

export type WorkQueueActivity = "tasks" | "meetings" | "calls";

export interface WorkQueueTask {
  id: string;
  ownerId: string;
  title: string;
  category: string;
  project: string;
  projectHighlight?: boolean;
  dueDate: string | null;
  dueTime: string | null;
  status: WorkQueueStatus;
  assignee: {
    initials: string;
    color: string;
  };
}

export interface WorkQueueMeeting {
  id: string;
  ownerId: string;
  subject: string;
  priority: WorkQueuePriority;
  relatedTo: string;
  dueDate: string | null;
  dueTime: string | null;
  status: WorkQueueStatus;
}

export interface WorkQueueCall {
  id: string;
  ownerId: string;
  subject: string;
  relatedTo: string;
  startedDate: string | null;
  startedTime: string | null;
  status: WorkQueueStatus;
}

export interface WorkQueueLead {
  id: string;
  ownerId: string;
  leadId: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  phone: string;
  status: WorkQueueStatus;
}

export interface WorkQueuePerson {
  id: string;
  name: string;
}

export interface WorkQueueNavItem {
  id: string;
  label: string;
  count: number;
  icon: "clipboard" | "calendar" | "phone" | "leads" | "tag";
}

export const WORK_QUEUE_PEOPLE: WorkQueuePerson[] = [
  { id: "shiva", name: "Shiva Kadhka" },
  { id: "tejas", name: "Tejas Gokhe" },
  { id: "roshna", name: "Roshna Abraham" },
];

export const OPEN_ACTIVITY_ITEMS: WorkQueueNavItem[] = [
  { id: "tasks", label: "Tasks", count: 20, icon: "clipboard" },
  { id: "meetings", label: "Meetings", count: 20, icon: "calendar" },
  { id: "calls", label: "Calls", count: 20, icon: "phone" },
];

export const MY_WORKQUEUE_ITEMS: WorkQueueNavItem[] = [
  { id: "my-leads", label: "My Leads", count: 20, icon: "leads" },
  {
    id: "leads-3hrs",
    label: "lead assigned last 3hrs",
    count: 20,
    icon: "leads",
  },
  { id: "pendings", label: "Pendings Tag", count: 20, icon: "tag" },
];

export const WORK_QUEUE_TASKS: WorkQueueTask[] = [
  // —— Shiva Kadhka ——
  {
    id: "ZWA-T56",
    ownerId: "shiva",
    title: "Release Announcement",
    category: "Launch",
    project: "Zylsoft Web App",
    projectHighlight: true,
    dueDate: "28/06/2024",
    dueTime: "03:30 AM",
    status: "Open",
    assignee: { initials: "JD", color: "bg-amber-300 text-amber-950" },
  },
  {
    id: "DS1-T17",
    ownerId: "shiva",
    title: "Painting - Base Coat",
    category: "Electricity and wiring",
    project: "Downtown Office Renovation",
    dueDate: "28/06/2024",
    dueTime: "03:30 AM",
    status: "In Progress",
    assignee: { initials: "TP", color: "bg-pink-300 text-pink-950" },
  },
  {
    id: "DS1-T13",
    ownerId: "shiva",
    title: "Painting - Base Coat",
    category: "Electricity and wiring",
    project: "Downtown Office Renovation",
    dueDate: null,
    dueTime: null,
    status: "Open",
    assignee: { initials: "MR", color: "bg-violet-300 text-violet-950" },
  },
  {
    id: "DS1-T16",
    ownerId: "shiva",
    title: "Painting - Base Coat",
    category: "Electricity and wiring",
    project: "Downtown Office Renovation",
    dueDate: "28/06/2024",
    dueTime: "03:30 AM",
    status: "Open",
    assignee: { initials: "AS", color: "bg-orange-300 text-orange-950" },
  },
  {
    id: "DS1-T15",
    ownerId: "shiva",
    title: "Painting - Base Coat",
    category: "Electricity and wiring",
    project: "Downtown Office Renovation",
    dueDate: "28/06/2024",
    dueTime: "03:30 AM",
    status: "Open",
    assignee: { initials: "KL", color: "bg-rose-300 text-rose-950" },
  },
  {
    id: "ZWA-T57",
    ownerId: "shiva",
    title: "Design Review Meeting",
    category: "Math",
    project: "Zylsoft Web App",
    projectHighlight: true,
    dueDate: "28/06/2024",
    dueTime: "03:30 AM",
    status: "Open",
    assignee: { initials: "RJ", color: "bg-sky-300 text-sky-950" },
  },
  {
    id: "ZWA-T61",
    ownerId: "shiva",
    title: "QA Checklist Update",
    category: "Launch",
    project: "Zylsoft Web App",
    projectHighlight: true,
    dueDate: "29/06/2024",
    dueTime: "11:00 AM",
    status: "In Progress",
    assignee: { initials: "NK", color: "bg-emerald-300 text-emerald-950" },
  },
  {
    id: "DS1-T21",
    ownerId: "shiva",
    title: "Site Inspection Notes",
    category: "Electricity and wiring",
    project: "Downtown Office Renovation",
    dueDate: "30/06/2024",
    dueTime: "02:15 PM",
    status: "Open",
    assignee: { initials: "VB", color: "bg-indigo-300 text-indigo-950" },
  },

  // —— Tejas Gokhe ——
  {
    id: "ZWA-T56",
    ownerId: "tejas",
    title: "Release Announcement",
    category: "Launch",
    project: "Zylsoft Web App",
    projectHighlight: true,
    dueDate: "28/06/2024",
    dueTime: "03:30 AM",
    status: "Open",
    assignee: { initials: "JD", color: "bg-amber-300 text-amber-950" },
  },
  {
    id: "DS1-T17",
    ownerId: "tejas",
    title: "Painting - Base Coat",
    category: "Electricity and wiring",
    project: "Downtown Office Renovation",
    dueDate: "28/06/2024",
    dueTime: "03:30 AM",
    status: "In Progress",
    assignee: { initials: "TP", color: "bg-pink-300 text-pink-950" },
  },
  {
    id: "DS1-T13",
    ownerId: "tejas",
    title: "Painting - Base Coat",
    category: "Electricity and wiring",
    project: "Downtown Office Renovation",
    dueDate: null,
    dueTime: null,
    status: "Open",
    assignee: { initials: "MR", color: "bg-violet-300 text-violet-950" },
  },
  {
    id: "Sm-T11",
    ownerId: "tejas",
    title: "Data assessment",
    category: "Math",
    project: "Donelley site construction",
    dueDate: "28/06/2024",
    dueTime: "03:30 AM",
    status: "Open",
    assignee: { initials: "AL", color: "bg-orange-200 text-orange-900" },
  },
  {
    id: "Sm-T12",
    ownerId: "tejas",
    title: "Survey Follow-up",
    category: "Math",
    project: "Donelley site construction",
    dueDate: "29/06/2024",
    dueTime: "09:00 AM",
    status: "In Progress",
    assignee: { initials: "KN", color: "bg-slate-300 text-slate-800" },
  },
  {
    id: "ZWA-T62",
    ownerId: "tejas",
    title: "Client Demo Script",
    category: "Launch",
    project: "Zylsoft Web App",
    projectHighlight: true,
    dueDate: "01/07/2024",
    dueTime: "04:00 PM",
    status: "Open",
    assignee: { initials: "RV", color: "bg-orange-100 text-orange-800" },
  },
  {
    id: "Sm-T14",
    ownerId: "tejas",
    title: "Budget Recheck",
    category: "Math",
    project: "Donelley site construction",
    dueDate: "02/07/2024",
    dueTime: "10:30 AM",
    status: "Open",
    assignee: { initials: "JD", color: "bg-amber-300 text-amber-950" },
  },
  {
    id: "DS1-T22",
    ownerId: "tejas",
    title: "Vendor Coordination",
    category: "Electricity and wiring",
    project: "Downtown Office Renovation",
    dueDate: "03/07/2024",
    dueTime: "01:45 PM",
    status: "In Progress",
    assignee: { initials: "TP", color: "bg-pink-300 text-pink-950" },
  },

  // —— Roshna Abraham ——
  {
    id: "ZWA-T70",
    ownerId: "roshna",
    title: "Sprint Planning Notes",
    category: "Launch",
    project: "Zylsoft Web App",
    projectHighlight: true,
    dueDate: "27/06/2024",
    dueTime: "10:00 AM",
    status: "In Progress",
    assignee: { initials: "RA", color: "bg-fuchsia-300 text-fuchsia-950" },
  },
  {
    id: "HR-T04",
    ownerId: "roshna",
    title: "Onboarding Checklist",
    category: "People Ops",
    project: "Internal Ops Hub",
    dueDate: "28/06/2024",
    dueTime: "01:00 PM",
    status: "Open",
    assignee: { initials: "SK", color: "bg-teal-300 text-teal-950" },
  },
  {
    id: "Sm-T20",
    ownerId: "roshna",
    title: "Permit Submission",
    category: "Math",
    project: "Donelley site construction",
    dueDate: "28/06/2024",
    dueTime: "03:30 AM",
    status: "Open",
    assignee: { initials: "AL", color: "bg-orange-200 text-orange-900" },
  },
  {
    id: "DS1-T30",
    ownerId: "roshna",
    title: "Safety Briefing",
    category: "Electricity and wiring",
    project: "Downtown Office Renovation",
    dueDate: null,
    dueTime: null,
    status: "Open",
    assignee: { initials: "MR", color: "bg-violet-300 text-violet-950" },
  },
  {
    id: "ZWA-T71",
    ownerId: "roshna",
    title: "Release Notes Draft",
    category: "Launch",
    project: "Zylsoft Web App",
    projectHighlight: true,
    dueDate: "29/06/2024",
    dueTime: "05:15 PM",
    status: "In Progress",
    assignee: { initials: "KN", color: "bg-slate-300 text-slate-800" },
  },
  {
    id: "HR-T05",
    ownerId: "roshna",
    title: "Interview Feedback",
    category: "People Ops",
    project: "Internal Ops Hub",
    dueDate: "30/06/2024",
    dueTime: "11:30 AM",
    status: "Open",
    assignee: { initials: "RV", color: "bg-orange-100 text-orange-800" },
  },
  {
    id: "Sm-T21",
    ownerId: "roshna",
    title: "Material Order Review",
    category: "Math",
    project: "Donelley site construction",
    dueDate: "01/07/2024",
    dueTime: "08:45 AM",
    status: "Open",
    assignee: { initials: "JD", color: "bg-amber-300 text-amber-950" },
  },
  {
    id: "ZWA-T72",
    ownerId: "roshna",
    title: "Accessibility Pass",
    category: "Launch",
    project: "Zylsoft Web App",
    projectHighlight: true,
    dueDate: "02/07/2024",
    dueTime: "02:00 PM",
    status: "In Progress",
    assignee: { initials: "TP", color: "bg-pink-300 text-pink-950" },
  },
];

export const WORK_QUEUE_MEETINGS: WorkQueueMeeting[] = [
  // —— Shiva ——
  {
    id: "ZWA-T56",
    ownerId: "shiva",
    subject: "Release Announcement",
    priority: "High",
    relatedTo: "Zylsoft Web App",
    dueDate: "28/06/2024",
    dueTime: "03:30 AM",
    status: "Open",
  },
  {
    id: "DS1-T17",
    ownerId: "shiva",
    subject: "Painting - Base Coat",
    priority: "IOW",
    relatedTo: "Downtown Office Renovation",
    dueDate: "28/06/2024",
    dueTime: "03:30 AM",
    status: "In Progress",
  },
  {
    id: "DS1-T13",
    ownerId: "shiva",
    subject: "Painting - Base Coat",
    priority: "High",
    relatedTo: "Downtown Office Renovation",
    dueDate: null,
    dueTime: null,
    status: "Open",
  },
  {
    id: "DS1-T16",
    ownerId: "shiva",
    subject: "Painting - Base Coat",
    priority: "LOW",
    relatedTo: "Downtown Office Renovation",
    dueDate: "28/06/2024",
    dueTime: "03:30 AM",
    status: "Open",
  },
  {
    id: "DS1-T15",
    ownerId: "shiva",
    subject: "Painting - Base Coat",
    priority: "High",
    relatedTo: "Downtown Office Renovation",
    dueDate: "28/06/2024",
    dueTime: "03:30 AM",
    status: "Open",
  },
  {
    id: "ZWA-T57",
    ownerId: "shiva",
    subject: "Design Review Meeting",
    priority: "IOW",
    relatedTo: "Zylsoft Web App",
    dueDate: "28/06/2024",
    dueTime: "03:30 AM",
    status: "Open",
  },
  {
    id: "ZWA-T63",
    ownerId: "shiva",
    subject: "Stakeholder Sync",
    priority: "High",
    relatedTo: "Zylsoft Web App",
    dueDate: "29/06/2024",
    dueTime: "10:00 AM",
    status: "In Progress",
  },
  {
    id: "DS1-T23",
    ownerId: "shiva",
    subject: "Contractor Kickoff",
    priority: "LOW",
    relatedTo: "Downtown Office Renovation",
    dueDate: "30/06/2024",
    dueTime: "02:00 PM",
    status: "Open",
  },

  // —— Tejas ——
  {
    id: "ZWA-T56",
    ownerId: "tejas",
    subject: "Release Announcement",
    priority: "High",
    relatedTo: "Zylsoft Web App",
    dueDate: "28/06/2024",
    dueTime: "03:30 AM",
    status: "Open",
  },
  {
    id: "Sm-T11",
    ownerId: "tejas",
    subject: "Data assessment review",
    priority: "IOW",
    relatedTo: "Donelley site construction",
    dueDate: "28/06/2024",
    dueTime: "03:30 AM",
    status: "Open",
  },
  {
    id: "DS1-T17",
    ownerId: "tejas",
    subject: "Painting - Base Coat",
    priority: "High",
    relatedTo: "Downtown Office Renovation",
    dueDate: "28/06/2024",
    dueTime: "03:30 AM",
    status: "In Progress",
  },
  {
    id: "Sm-T15",
    ownerId: "tejas",
    subject: "Budget alignment call",
    priority: "LOW",
    relatedTo: "Donelley site construction",
    dueDate: "29/06/2024",
    dueTime: "11:15 AM",
    status: "Open",
  },
  {
    id: "ZWA-T64",
    ownerId: "tejas",
    subject: "Demo dry run",
    priority: "High",
    relatedTo: "Zylsoft Web App",
    dueDate: "01/07/2024",
    dueTime: "04:00 PM",
    status: "In Progress",
  },
  {
    id: "Sm-T16",
    ownerId: "tejas",
    subject: "Site walkthrough",
    priority: "IOW",
    relatedTo: "Donelley site construction",
    dueDate: "02/07/2024",
    dueTime: "09:30 AM",
    status: "Open",
  },
  {
    id: "DS1-T24",
    ownerId: "tejas",
    subject: "Vendor status meeting",
    priority: "High",
    relatedTo: "Downtown Office Renovation",
    dueDate: "03/07/2024",
    dueTime: "01:00 PM",
    status: "Open",
  },
  {
    id: "ZWA-T65",
    ownerId: "tejas",
    subject: "Launch checklist sync",
    priority: "LOW",
    relatedTo: "Zylsoft Web App",
    dueDate: null,
    dueTime: null,
    status: "Open",
  },

  // —— Roshna ——
  {
    id: "ZWA-T70",
    ownerId: "roshna",
    subject: "Sprint planning",
    priority: "High",
    relatedTo: "Zylsoft Web App",
    dueDate: "27/06/2024",
    dueTime: "10:00 AM",
    status: "In Progress",
  },
  {
    id: "HR-T04",
    ownerId: "roshna",
    subject: "Onboarding huddle",
    priority: "IOW",
    relatedTo: "Internal Ops Hub",
    dueDate: "28/06/2024",
    dueTime: "01:00 PM",
    status: "Open",
  },
  {
    id: "Sm-T20",
    ownerId: "roshna",
    subject: "Permit review meeting",
    priority: "High",
    relatedTo: "Donelley site construction",
    dueDate: "28/06/2024",
    dueTime: "03:30 AM",
    status: "Open",
  },
  {
    id: "DS1-T30",
    ownerId: "roshna",
    subject: "Safety briefing",
    priority: "LOW",
    relatedTo: "Downtown Office Renovation",
    dueDate: null,
    dueTime: null,
    status: "Open",
  },
  {
    id: "ZWA-T71",
    ownerId: "roshna",
    subject: "Release notes review",
    priority: "High",
    relatedTo: "Zylsoft Web App",
    dueDate: "29/06/2024",
    dueTime: "05:15 PM",
    status: "In Progress",
  },
  {
    id: "HR-T05",
    ownerId: "roshna",
    subject: "Interview panel sync",
    priority: "IOW",
    relatedTo: "Internal Ops Hub",
    dueDate: "30/06/2024",
    dueTime: "11:30 AM",
    status: "Open",
  },
  {
    id: "Sm-T21",
    ownerId: "roshna",
    subject: "Material order meeting",
    priority: "High",
    relatedTo: "Donelley site construction",
    dueDate: "01/07/2024",
    dueTime: "08:45 AM",
    status: "Open",
  },
  {
    id: "ZWA-T72",
    ownerId: "roshna",
    subject: "Accessibility review",
    priority: "LOW",
    relatedTo: "Zylsoft Web App",
    dueDate: "02/07/2024",
    dueTime: "02:00 PM",
    status: "In Progress",
  },
];

export const WORK_QUEUE_CALLS: WorkQueueCall[] = [
  // —— Shiva ——
  {
    id: "call-s1",
    ownerId: "shiva",
    subject: "Release Announcement",
    relatedTo: "Zylsoft Web App",
    startedDate: "28/06/2024",
    startedTime: "03:30 AM",
    status: "Open",
  },
  {
    id: "call-s2",
    ownerId: "shiva",
    subject: "Painting - Base Coat",
    relatedTo: "Donelley site construction",
    startedDate: "28/05/2025",
    startedTime: "07:48 PM",
    status: "Open",
  },
  {
    id: "call-s3",
    ownerId: "shiva",
    subject: "Safety Unit Check",
    relatedTo: "Donelley site construction",
    startedDate: "02/02/2026",
    startedTime: "02:30 AM",
    status: "Open",
  },
  {
    id: "call-s4",
    ownerId: "shiva",
    subject: "Data assessment",
    relatedTo: "New York Pet Drive",
    startedDate: "12/09/2018",
    startedTime: "05:00 PM",
    status: "In Progress",
  },
  {
    id: "call-s5",
    ownerId: "shiva",
    subject: "Addition exercise",
    relatedTo: "Zylker airlines mobile app",
    startedDate: "20/02/2020",
    startedTime: "02:30 AM",
    status: "In Progress",
  },
  {
    id: "call-s6",
    ownerId: "shiva",
    subject: "Vendor follow-up",
    relatedTo: "Downtown Office Renovation",
    startedDate: "01/07/2024",
    startedTime: "11:15 AM",
    status: "Open",
  },
  {
    id: "call-s7",
    ownerId: "shiva",
    subject: "QA status check",
    relatedTo: "Zylsoft Web App",
    startedDate: "03/07/2024",
    startedTime: "09:00 AM",
    status: "Open",
  },
  {
    id: "call-s8",
    ownerId: "shiva",
    subject: "Client confirmation",
    relatedTo: "Zylsoft Web App",
    startedDate: "04/07/2024",
    startedTime: "04:20 PM",
    status: "In Progress",
  },

  // —— Tejas ——
  {
    id: "call-t1",
    ownerId: "tejas",
    subject: "Budget clarification",
    relatedTo: "Donelley site construction",
    startedDate: "28/06/2024",
    startedTime: "10:00 AM",
    status: "Open",
  },
  {
    id: "call-t2",
    ownerId: "tejas",
    subject: "Survey callback",
    relatedTo: "Donelley site construction",
    startedDate: "29/06/2024",
    startedTime: "02:15 PM",
    status: "In Progress",
  },
  {
    id: "call-t3",
    ownerId: "tejas",
    subject: "Demo scheduling",
    relatedTo: "Zylsoft Web App",
    startedDate: "30/06/2024",
    startedTime: "03:30 AM",
    status: "Open",
  },
  {
    id: "call-t4",
    ownerId: "tejas",
    subject: "Painting - Base Coat",
    relatedTo: "Downtown Office Renovation",
    startedDate: "01/07/2024",
    startedTime: "07:48 PM",
    status: "Open",
  },
  {
    id: "call-t5",
    ownerId: "tejas",
    subject: "Data assessment",
    relatedTo: "New York Pet Drive",
    startedDate: "12/09/2018",
    startedTime: "05:00 PM",
    status: "In Progress",
  },
  {
    id: "call-t6",
    ownerId: "tejas",
    subject: "Release Announcement",
    relatedTo: "Zylsoft Web App",
    startedDate: "28/06/2024",
    startedTime: "03:30 AM",
    status: "Open",
  },
  {
    id: "call-t7",
    ownerId: "tejas",
    subject: "Safety Unit Check",
    relatedTo: "Donelley site construction",
    startedDate: "02/02/2026",
    startedTime: "02:30 AM",
    status: "Open",
  },
  {
    id: "call-t8",
    ownerId: "tejas",
    subject: "Addition exercise",
    relatedTo: "Zylker airlines mobile app",
    startedDate: "20/02/2020",
    startedTime: "02:30 AM",
    status: "In Progress",
  },

  // —— Roshna ——
  {
    id: "call-r1",
    ownerId: "roshna",
    subject: "Onboarding intro call",
    relatedTo: "Internal Ops Hub",
    startedDate: "27/06/2024",
    startedTime: "09:30 AM",
    status: "Open",
  },
  {
    id: "call-r2",
    ownerId: "roshna",
    subject: "Interview screening",
    relatedTo: "Internal Ops Hub",
    startedDate: "28/06/2024",
    startedTime: "01:00 PM",
    status: "In Progress",
  },
  {
    id: "call-r3",
    ownerId: "roshna",
    subject: "Permit clarification",
    relatedTo: "Donelley site construction",
    startedDate: "28/06/2024",
    startedTime: "03:30 AM",
    status: "Open",
  },
  {
    id: "call-r4",
    ownerId: "roshna",
    subject: "Release Announcement",
    relatedTo: "Zylsoft Web App",
    startedDate: "29/06/2024",
    startedTime: "11:45 AM",
    status: "Open",
  },
  {
    id: "call-r5",
    ownerId: "roshna",
    subject: "Safety Unit Check",
    relatedTo: "Downtown Office Renovation",
    startedDate: "02/02/2026",
    startedTime: "02:30 AM",
    status: "Open",
  },
  {
    id: "call-r6",
    ownerId: "roshna",
    subject: "Data assessment",
    relatedTo: "New York Pet Drive",
    startedDate: "12/09/2018",
    startedTime: "05:00 PM",
    status: "In Progress",
  },
  {
    id: "call-r7",
    ownerId: "roshna",
    subject: "Addition exercise",
    relatedTo: "Zylker airlines mobile app",
    startedDate: "20/02/2020",
    startedTime: "02:30 AM",
    status: "In Progress",
  },
  {
    id: "call-r8",
    ownerId: "roshna",
    subject: "Accessibility walkthrough",
    relatedTo: "Zylsoft Web App",
    startedDate: "02/07/2024",
    startedTime: "02:00 PM",
    status: "Open",
  },
];

export function getTasksForPerson(ownerId: string): WorkQueueTask[] {
  return WORK_QUEUE_TASKS.filter((task) => task.ownerId === ownerId);
}

export function getMeetingsForPerson(ownerId: string): WorkQueueMeeting[] {
  return WORK_QUEUE_MEETINGS.filter((meeting) => meeting.ownerId === ownerId);
}

export function getCallsForPerson(ownerId: string): WorkQueueCall[] {
  return WORK_QUEUE_CALLS.filter((call) => call.ownerId === ownerId);
}

export const WORK_QUEUE_LEADS: WorkQueueLead[] = [
  // —— Shiva ——
  {
    id: "lead-s1",
    ownerId: "shiva",
    leadId: "001",
    firstName: "John",
    lastName: "shrestha",
    email: "john@gmail.com",
    company: "Zylsoft Web App",
    phone: "28062024",
    status: "Open",
  },
  {
    id: "lead-s2",
    ownerId: "shiva",
    leadId: "001",
    firstName: "John",
    lastName: "shrestha",
    email: "john@gmail.com",
    company: "Zylsoft Web App",
    phone: "28062024",
    status: "Open",
  },
  {
    id: "lead-s3",
    ownerId: "shiva",
    leadId: "001",
    firstName: "John",
    lastName: "shrestha",
    email: "john@gmail.com",
    company: "Zylsoft Web App",
    phone: "28062024",
    status: "Open",
  },
  {
    id: "lead-s4",
    ownerId: "shiva",
    leadId: "001",
    firstName: "John",
    lastName: "shrestha",
    email: "john@gmail.com",
    company: "Zylsoft Web App",
    phone: "28062024",
    status: "Open",
  },
  {
    id: "lead-s5",
    ownerId: "shiva",
    leadId: "002",
    firstName: "Anita",
    lastName: "Gurung",
    email: "anita@zylsoft.com",
    company: "Zylsoft Web App",
    phone: "9812345670",
    status: "In Progress",
  },
  {
    id: "lead-s6",
    ownerId: "shiva",
    leadId: "003",
    firstName: "Bikash",
    lastName: "Thapa",
    email: "bikash@donelley.com",
    company: "Donelley site construction",
    phone: "9801122334",
    status: "Open",
  },
  {
    id: "lead-s7",
    ownerId: "shiva",
    leadId: "004",
    firstName: "Sita",
    lastName: "Rai",
    email: "sita@ops.com",
    company: "Internal Ops Hub",
    phone: "9745566778",
    status: "Open",
  },
  {
    id: "lead-s8",
    ownerId: "shiva",
    leadId: "005",
    firstName: "Hari",
    lastName: "Karki",
    email: "hari@zylker.com",
    company: "Zylker airlines mobile app",
    phone: "9850011223",
    status: "In Progress",
  },

  // —— Tejas ——
  {
    id: "lead-t1",
    ownerId: "tejas",
    leadId: "101",
    firstName: "Priya",
    lastName: "Sharma",
    email: "priya@gmail.com",
    company: "Donelley site construction",
    phone: "9876501234",
    status: "Open",
  },
  {
    id: "lead-t2",
    ownerId: "tejas",
    leadId: "102",
    firstName: "Amit",
    lastName: "Patel",
    email: "amit@zylsoft.com",
    company: "Zylsoft Web App",
    phone: "9811122233",
    status: "In Progress",
  },
  {
    id: "lead-t3",
    ownerId: "tejas",
    leadId: "103",
    firstName: "Neha",
    lastName: "Joshi",
    email: "neha@petdrive.com",
    company: "New York Pet Drive",
    phone: "9822233344",
    status: "Open",
  },
  {
    id: "lead-t4",
    ownerId: "tejas",
    leadId: "104",
    firstName: "Rohan",
    lastName: "Mehta",
    email: "rohan@zylker.com",
    company: "Zylker airlines mobile app",
    phone: "9833344455",
    status: "Open",
  },
  {
    id: "lead-t5",
    ownerId: "tejas",
    leadId: "105",
    firstName: "Kavita",
    lastName: "Nair",
    email: "kavita@donelley.com",
    company: "Donelley site construction",
    phone: "9844455566",
    status: "In Progress",
  },
  {
    id: "lead-t6",
    ownerId: "tejas",
    leadId: "106",
    firstName: "Vikram",
    lastName: "Singh",
    email: "vikram@zylsoft.com",
    company: "Zylsoft Web App",
    phone: "9855566677",
    status: "Open",
  },
  {
    id: "lead-t7",
    ownerId: "tejas",
    leadId: "001",
    firstName: "John",
    lastName: "shrestha",
    email: "john@gmail.com",
    company: "Zylsoft Web App",
    phone: "28062024",
    status: "Open",
  },
  {
    id: "lead-t8",
    ownerId: "tejas",
    leadId: "107",
    firstName: "Meera",
    lastName: "Desai",
    email: "meera@ops.com",
    company: "Internal Ops Hub",
    phone: "9866677788",
    status: "Open",
  },

  // —— Roshna ——
  {
    id: "lead-r1",
    ownerId: "roshna",
    leadId: "201",
    firstName: "Lina",
    lastName: "Abraham",
    email: "lina@ops.com",
    company: "Internal Ops Hub",
    phone: "9700011122",
    status: "Open",
  },
  {
    id: "lead-r2",
    ownerId: "roshna",
    leadId: "202",
    firstName: "David",
    lastName: "Chen",
    email: "david@zylsoft.com",
    company: "Zylsoft Web App",
    phone: "9711122233",
    status: "In Progress",
  },
  {
    id: "lead-r3",
    ownerId: "roshna",
    leadId: "001",
    firstName: "John",
    lastName: "shrestha",
    email: "john@gmail.com",
    company: "Zylsoft Web App",
    phone: "28062024",
    status: "Open",
  },
  {
    id: "lead-r4",
    ownerId: "roshna",
    leadId: "203",
    firstName: "Sara",
    lastName: "Williams",
    email: "sara@donelley.com",
    company: "Donelley site construction",
    phone: "9722233344",
    status: "Open",
  },
  {
    id: "lead-r5",
    ownerId: "roshna",
    leadId: "204",
    firstName: "Omar",
    lastName: "Hassan",
    email: "omar@petdrive.com",
    company: "New York Pet Drive",
    phone: "9733344455",
    status: "In Progress",
  },
  {
    id: "lead-r6",
    ownerId: "roshna",
    leadId: "205",
    firstName: "Elena",
    lastName: "Garcia",
    email: "elena@zylker.com",
    company: "Zylker airlines mobile app",
    phone: "9744455566",
    status: "Open",
  },
  {
    id: "lead-r7",
    ownerId: "roshna",
    leadId: "206",
    firstName: "Noah",
    lastName: "Kim",
    email: "noah@ops.com",
    company: "Internal Ops Hub",
    phone: "9755566677",
    status: "Open",
  },
  {
    id: "lead-r8",
    ownerId: "roshna",
    leadId: "207",
    firstName: "Maya",
    lastName: "Lopez",
    email: "maya@zylsoft.com",
    company: "Zylsoft Web App",
    phone: "9766677788",
    status: "In Progress",
  },
];

export function getLeadsForPerson(ownerId: string): WorkQueueLead[] {
  return WORK_QUEUE_LEADS.filter((lead) => lead.ownerId === ownerId);
}

export function getActivityTitle(activity: string): string {
  switch (activity) {
    case "meetings":
      return "Meetings";
    case "calls":
      return "Calls";
    case "my-leads":
    case "leads-3hrs":
    case "pendings":
      return "My Leads";
    default:
      return "Tasks";
  }
}
