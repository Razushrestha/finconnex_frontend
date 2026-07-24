/** Portal-scoped mock data for public client panes */

export interface PortalDeal {
  id: string;
  name: string;
  stage: string;
  amount: string;
  updatedAt: string;
}

export interface PortalDocument {
  id: string;
  name: string;
  status: string;
  type: string;
  signToken?: string;
}

export interface PortalTask {
  id: string;
  title: string;
  due: string;
  status: "Open" | "Done";
}

export function portalDealsForClient(clientName: string): PortalDeal[] {
  const all: Record<string, PortalDeal[]> = {
    "Greystone Realty": [
      {
        id: "d1",
        name: "Greystone refinance package",
        stage: "Closed Won",
        amount: "$1,250,000",
        updatedAt: "15/07/2026",
      },
      {
        id: "d2",
        name: "Greystone equity release",
        stage: "Proposal",
        amount: "$420,000",
        updatedAt: "19/07/2026",
      },
    ],
    "Harbour Loans": [
      {
        id: "d3",
        name: "Harbour first-home buyer",
        stage: "Negotiation",
        amount: "$680,000",
        updatedAt: "20/07/2026",
      },
    ],
    "Apex Property Group": [
      {
        id: "d4",
        name: "Apex commercial facility",
        stage: "On Hold",
        amount: "$2,100,000",
        updatedAt: "10/06/2026",
      },
    ],
  };
  return all[clientName] ?? [];
}

export function portalDocumentsForClient(clientName: string): PortalDocument[] {
  const all: Record<string, PortalDocument[]> = {
    "Greystone Realty": [
      {
        id: "doc1",
        name: "Engagement letter: refinance",
        status: "Signed",
        type: "Contract",
      },
      {
        id: "doc2",
        name: "ID verification pack",
        status: "Requested",
        type: "ID Proof",
      },
      {
        id: "doc3",
        name: "Variation letter",
        status: "Awaiting signature",
        type: "Contract",
        signToken: "sig-anderson-1",
      },
    ],
    "Harbour Loans": [
      {
        id: "doc4",
        name: "Broker authority form",
        status: "Awaiting signature",
        type: "Contract",
        signToken: "sig-marcus-draft",
      },
      {
        id: "doc5",
        name: "Payslips request",
        status: "Pending upload",
        type: "Financial",
      },
    ],
    "Apex Property Group": [
      {
        id: "doc6",
        name: "Facility term sheet",
        status: "Shared",
        type: "Proposal",
      },
    ],
  };
  return all[clientName] ?? [];
}

export function portalTasksForClient(clientName: string): PortalTask[] {
  const all: Record<string, PortalTask[]> = {
    "Greystone Realty": [
      {
        id: "t1",
        title: "Upload latest rates notice",
        due: "25/07/2026",
        status: "Open",
      },
      {
        id: "t2",
        title: "Confirm settlement date preference",
        due: "22/07/2026",
        status: "Open",
      },
      {
        id: "t3",
        title: "Review signed engagement letter",
        due: "12/07/2026",
        status: "Done",
      },
    ],
    "Harbour Loans": [
      {
        id: "t4",
        title: "Provide ID documents",
        due: "28/07/2026",
        status: "Open",
      },
    ],
    "Apex Property Group": [
      {
        id: "t5",
        title: "Respond to overdue invoice",
        due: "15/06/2026",
        status: "Open",
      },
    ],
  };
  return all[clientName] ?? [];
}

const TASK_STORE = "portal:tasks:v1";

export function listPortalTasks(clientName: string): PortalTask[] {
  if (typeof window === "undefined") return portalTasksForClient(clientName);
  try {
    const raw = sessionStorage.getItem(TASK_STORE);
    if (!raw) return portalTasksForClient(clientName);
    const map = JSON.parse(raw) as Record<string, PortalTask[]>;
    return map[clientName] ?? portalTasksForClient(clientName);
  } catch {
    return portalTasksForClient(clientName);
  }
}

export function savePortalTasks(clientName: string, tasks: PortalTask[]) {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(TASK_STORE);
    const map = raw ? (JSON.parse(raw) as Record<string, PortalTask[]>) : {};
    map[clientName] = tasks;
    sessionStorage.setItem(TASK_STORE, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}
