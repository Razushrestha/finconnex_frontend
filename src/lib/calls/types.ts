export type CallStatus = "Scheduled" | "Completed" | "Missed" | "Cancelled";

export interface Call {
  id: string;
  relatedTo: string;
  callOwner: string;
  subject: string;
  callType: "Outbound" | "Inbound" | "Missed";
  callStartTime: string;
  callDuration?: string;
  callPurpose?: string;
  description?: string;
  status: CallStatus;
}

export interface CallColumn {
  id: string;
  title: string;
  count: number;
  badgeColorClass: string;
  calls: Call[];
}

export const totalCallRecords = 1427;

export const calls: Call[] = [
  {
    id: "c1",
    relatedTo: "Shiva Khadka",
    callOwner: "Bishnu Aryal",
    subject: "Call scheduled with Shiva Khadka",
    callType: "Outbound",
    callStartTime: "24/05/2029 01:00 PM",
    status: "Scheduled",
  },
  {
    id: "c2",
    relatedTo: "Sithira Dasith",
    callOwner: "Admin",
    subject: "Call scheduled with Sithira Dasith",
    callType: "Outbound",
    callStartTime: "23/06/2027 12:00 AM",
    callPurpose: "Prospecting",
    status: "Scheduled",
  },
  {
    id: "c3",
    relatedTo: "Aneesh Kumar Kulandhaigounder",
    callOwner: "Admin",
    subject: "Call scheduled with Aneesh Kumar Kulandhaigounder",
    callType: "Outbound",
    callStartTime: "03/06/2027 09:00 AM",
    callPurpose: "Prospecting",
    status: "Completed",
  },
  {
    id: "c4",
    relatedTo: "Shoieb Mohammed",
    callOwner: "Admin",
    subject: "Call scheduled with Shoieb Mohammed",
    callType: "Outbound",
    callStartTime: "25/05/2027 05:00 PM",
    status: "Completed",
  },
  {
    id: "c5",
    relatedTo: "Ravisingh Rawat",
    callOwner: "Admin",
    subject: "Call scheduled with Ravisingh Rawat",
    callType: "Outbound",
    callStartTime: "15/04/2027 09:00 AM",
    callPurpose: "Prospecting",
    status: "Completed",
  },
  {
    id: "c6",
    relatedTo: "Thanju Paragahathora Pathirage Dona",
    callOwner: "Admin",
    subject: "Call scheduled with Thanju Paragahathora Pathirage Dona",
    callType: "Outbound",
    callStartTime: "15/03/2027 07:00 AM",
    callPurpose: "Prospecting",
    status: "Missed",
  },
  {
    id: "c7",
    relatedTo: "Thanju Paragahathora Pathirage Dona",
    callOwner: "Admin",
    subject: "Call scheduled with THANUJI PARAGAHATHORA PATHIRAGE DONA",
    callType: "Outbound",
    callStartTime: "15/03/2027 07:00 AM",
    callPurpose: "Prospecting",
    status: "Missed",
  },
  {
    id: "c8",
    relatedTo: "Ramchandra Umakant Patil",
    callOwner: "Admin",
    subject: "Call scheduled with Ramchandra Umakant Patil",
    callType: "Outbound",
    callStartTime: "13/02/2027 07:00 AM",
    status: "Cancelled",
  },
  {
    id: "c9",
    relatedTo: "Tejas Gokhe",
    callOwner: "Admin",
    subject: "Call scheduled with Tejas Gokhe",
    callType: "Outbound",
    callStartTime: "05/01/2027 12:00 AM",
    callPurpose: "Prospecting",
    status: "Cancelled",
  },
  {
    id: "c10",
    relatedTo: "Roshna Abraham",
    callOwner: "Admin",
    subject: "Call scheduled with Roshna Abraham",
    callType: "Outbound",
    callStartTime: "15/12/2026 12:00 AM",
    callPurpose: "Prospecting",
    status: "Completed",
  },
];

export const callColumns: CallColumn[] = [
  {
    id: "scheduled",
    title: "Scheduled",
    count: 412,
    badgeColorClass: "bg-sky-500 text-white",
    calls: calls.filter((c) => c.status === "Scheduled"),
  },
  {
    id: "completed",
    title: "Completed",
    count: 861,
    badgeColorClass: "bg-emerald-400 text-white",
    calls: calls.filter((c) => c.status === "Completed"),
  },
  {
    id: "missed",
    title: "Missed",
    count: 98,
    badgeColorClass: "bg-rose-400 text-white",
    calls: calls.filter((c) => c.status === "Missed"),
  },
  {
    id: "cancelled",
    title: "Cancelled",
    count: 56,
    badgeColorClass: "bg-slate-400 text-white",
    calls: calls.filter((c) => c.status === "Cancelled"),
  },
];
