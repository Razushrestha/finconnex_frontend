/** SRS: Customer Journey & Lifecycle Automation (on top of §27.4 workflows) */

export type JourneyTrigger =
  | "Lead Created"
  | "Deal Stage Change"
  | "Form Submitted"
  | "Date-Based"
  | "Manual";

export type JourneyStepType =
  | "Wait"
  | "Send Email"
  | "Send SMS"
  | "Send WhatsApp"
  | "Create Task"
  | "Update Field"
  | "Branch Condition";

export type JourneyStatus = "Draft" | "Active" | "Paused";

export type EnrollmentStatus = "Active" | "Completed" | "Exited";

export interface JourneyStep {
  id: string;
  type: JourneyStepType;
  label: string;
  /** Free-form config shown in the inspector */
  detail: string;
  enrolledCount: number;
  /** Contacts who progressed past this step */
  convertedCount: number;
}

export interface JourneyEnrollment {
  id: string;
  contactName: string;
  email: string;
  currentStepId: string;
  enteredAt: string;
  status: EnrollmentStatus;
}

export interface LifecycleJourney {
  id: string;
  journeyId: string;
  name: string;
  trigger: JourneyTrigger;
  status: JourneyStatus;
  exitConditions: string[];
  steps: JourneyStep[];
  enrollments: JourneyEnrollment[];
  createdBy: string;
  updatedAt: string;
  lastTestRunAt?: string;
}

export const JOURNEY_TRIGGERS: JourneyTrigger[] = [
  "Lead Created",
  "Deal Stage Change",
  "Form Submitted",
  "Date-Based",
  "Manual",
];

export const JOURNEY_STEP_TYPES: JourneyStepType[] = [
  "Wait",
  "Send Email",
  "Send SMS",
  "Send WhatsApp",
  "Create Task",
  "Update Field",
  "Branch Condition",
];

export const JOURNEY_STATUSES: JourneyStatus[] = [
  "Draft",
  "Active",
  "Paused",
];

export const JOURNEY_OWNERS = [
  "John Smith",
  "Tejas Gokhe",
  "Roshna Abraham",
  "Shiva Kadhka",
] as const;

export const EXIT_CONDITION_PRESETS = [
  "Deal stage = Closed Won",
  "Deal stage = Closed Lost",
  "Unsubscribed from email",
  "Opted out of SMS",
  "Manually exited",
  "Completed final step",
] as const;

export const JOURNEY_STATUS_STYLE: Record<JourneyStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Active: "bg-emerald-50 text-emerald-700",
  Paused: "bg-amber-50 text-amber-800",
};

export const JOURNEY_STEP_STYLE: Record<JourneyStepType, string> = {
  Wait: "bg-slate-100 text-slate-600",
  "Send Email": "bg-sky-50 text-sky-700",
  "Send SMS": "bg-violet-50 text-violet-700",
  "Send WhatsApp": "bg-emerald-50 text-emerald-700",
  "Create Task": "bg-amber-50 text-amber-800",
  "Update Field": "bg-indigo-50 text-indigo-700",
  "Branch Condition": "bg-rose-50 text-rose-700",
};

export const DEFAULT_STEP_DETAIL: Record<JourneyStepType, string> = {
  Wait: "Wait 2 days",
  "Send Email": "Template: Welcome nurture #1",
  "Send SMS": "SMS: Booking reminder",
  "Send WhatsApp": "WhatsApp: Proposal follow-up",
  "Create Task": "Task: Call contact: due +1 day",
  "Update Field": "Set Lead Status → Contacted",
  "Branch Condition": "If Deal Stage = Proposal Sent",
};

const STORE_KEY = "lifecycle-journeys:v1";

export function formatJourneyAt(d = new Date()) {
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function newStepId() {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createStep(
  type: JourneyStepType,
  overrides?: Partial<JourneyStep>,
): JourneyStep {
  return {
    id: newStepId(),
    type,
    label: type,
    detail: DEFAULT_STEP_DETAIL[type],
    enrolledCount: 0,
    convertedCount: 0,
    ...overrides,
  };
}

function seedStepsFirstHome(): JourneyStep[] {
  return [
    {
      id: "s1",
      type: "Send Email",
      label: "Welcome email",
      detail: "Template: FHB welcome",
      enrolledCount: 42,
      convertedCount: 38,
    },
    {
      id: "s2",
      type: "Wait",
      label: "Wait 3 days",
      detail: "Wait 3 days",
      enrolledCount: 38,
      convertedCount: 34,
    },
    {
      id: "s3",
      type: "Send SMS",
      label: "Book a call nudge",
      detail: "SMS: Ready to book discovery?",
      enrolledCount: 34,
      convertedCount: 22,
    },
    {
      id: "s4",
      type: "Branch Condition",
      label: "Call booked?",
      detail: "If Meeting Status = Booked",
      enrolledCount: 22,
      convertedCount: 18,
    },
    {
      id: "s5",
      type: "Create Task",
      label: "Prep proposal pack",
      detail: "Task: Assemble FHB proposal",
      enrolledCount: 18,
      convertedCount: 15,
    },
    {
      id: "s6",
      type: "Send Email",
      label: "Proposal sent",
      detail: "Template: Proposal ready",
      enrolledCount: 15,
      convertedCount: 12,
    },
    {
      id: "s7",
      type: "Update Field",
      label: "Mark onboarding",
      detail: "Set Lifecycle Stage → Onboarding",
      enrolledCount: 12,
      convertedCount: 10,
    },
  ];
}

export const seedJourneys: LifecycleJourney[] = [
  {
    id: "lj1",
    journeyId: "JRN-7001",
    name: "First-home buyer lifecycle",
    trigger: "Lead Created",
    status: "Active",
    exitConditions: [
      "Deal stage = Closed Won",
      "Deal stage = Closed Lost",
      "Unsubscribed from email",
    ],
    steps: seedStepsFirstHome(),
    enrollments: [
      {
        id: "e1",
        contactName: "Priya Sharma",
        email: "priya@example.com",
        currentStepId: "s3",
        enteredAt: "18/07/2026 09:00",
        status: "Active",
      },
      {
        id: "e2",
        contactName: "Marcus Chen",
        email: "marcus@example.com",
        currentStepId: "s5",
        enteredAt: "15/07/2026 11:20",
        status: "Active",
      },
      {
        id: "e3",
        contactName: "Harbour Lending",
        email: "ops@harbour.example",
        currentStepId: "s7",
        enteredAt: "10/07/2026 14:00",
        status: "Completed",
      },
      {
        id: "e4",
        contactName: "Alex Rivera",
        email: "alex@example.com",
        currentStepId: "s2",
        enteredAt: "20/07/2026 08:30",
        status: "Active",
      },
      {
        id: "e5",
        contactName: "Sam Okonkwo",
        email: "sam@example.com",
        currentStepId: "s1",
        enteredAt: "12/07/2026 16:10",
        status: "Exited",
      },
    ],
    createdBy: "John Smith",
    updatedAt: "22/07/2026 10:00",
  },
  {
    id: "lj2",
    journeyId: "JRN-7002",
    name: "Refinance nurture → renewal",
    trigger: "Deal Stage Change",
    status: "Paused",
    exitConditions: ["Opted out of SMS", "Manually exited"],
    steps: [
      createStep("Send Email", {
        id: "r1",
        label: "Rate check-in",
        detail: "Template: Refinance rates",
        enrolledCount: 20,
        convertedCount: 16,
      }),
      createStep("Wait", {
        id: "r2",
        label: "Wait 5 days",
        detail: "Wait 5 days",
        enrolledCount: 16,
        convertedCount: 14,
      }),
      createStep("Send WhatsApp", {
        id: "r3",
        label: "WhatsApp follow-up",
        detail: "WhatsApp: Still looking to refinance?",
        enrolledCount: 14,
        convertedCount: 9,
      }),
      createStep("Create Task", {
        id: "r4",
        label: "Broker call",
        detail: "Task: Refinance discovery call",
        enrolledCount: 9,
        convertedCount: 7,
      }),
    ],
    enrollments: [
      {
        id: "e6",
        contactName: "Westfield Partners",
        email: "hello@westfield.example",
        currentStepId: "r3",
        enteredAt: "19/07/2026 12:00",
        status: "Active",
      },
    ],
    createdBy: "Roshna Abraham",
    updatedAt: "21/07/2026 15:30",
  },
  {
    id: "lj3",
    journeyId: "JRN-7003",
    name: "Form → booked call (draft)",
    trigger: "Form Submitted",
    status: "Draft",
    exitConditions: ["Completed final step"],
    steps: [
      createStep("Send Email", {
        id: "d1",
        label: "Thanks for submitting",
        detail: "Template: Form thank-you",
      }),
      createStep("Wait", {
        id: "d2",
        label: "Wait 1 day",
        detail: "Wait 1 day",
      }),
      createStep("Create Task", {
        id: "d3",
        label: "Schedule discovery",
        detail: "Task: Book discovery call",
      }),
    ],
    enrollments: [],
    createdBy: "Tejas Gokhe",
    updatedAt: "22/07/2026 09:15",
  },
];

function readStore(): LifecycleJourney[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as LifecycleJourney[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: LifecycleJourney[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listJourneys(): LifecycleJourney[] {
  return (
    readStore() ??
    seedJourneys.map((j) => ({
      ...j,
      exitConditions: [...j.exitConditions],
      steps: j.steps.map((s) => ({ ...s })),
      enrollments: j.enrollments.map((e) => ({ ...e })),
    }))
  );
}

export function upsertJourney(j: LifecycleJourney) {
  const list = listJourneys();
  const i = list.findIndex((x) => x.id === j.id);
  if (i >= 0) list[i] = j;
  else list.unshift(j);
  writeStore(list);
  return j;
}

export function deleteJourney(id: string) {
  writeStore(listJourneys().filter((j) => j.id !== id));
}

export function getJourneyById(id: string) {
  return listJourneys().find((j) => j.id === id);
}

export function nextJourneyIds() {
  const list = listJourneys();
  const nums = list
    .map((j) => Number(j.journeyId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 7000) + 1;
  return { id: `lj-${Date.now()}`, journeyId: `JRN-${n}` };
}

export function cloneJourney(source: LifecycleJourney): LifecycleJourney {
  const ids = nextJourneyIds();
  const stepIdMap = new Map<string, string>();
  const steps = source.steps.map((s) => {
    const nid = newStepId();
    stepIdMap.set(s.id, nid);
    return {
      ...s,
      id: nid,
      enrolledCount: 0,
      convertedCount: 0,
    };
  });
  return {
    ...source,
    id: ids.id,
    journeyId: ids.journeyId,
    name: `${source.name} (copy)`,
    status: "Draft",
    steps,
    enrollments: [],
    updatedAt: formatJourneyAt(),
    lastTestRunAt: undefined,
  };
}

export function activeEnrollmentCount(j: LifecycleJourney) {
  return j.enrollments.filter((e) => e.status === "Active").length;
}

export function stepConversionRate(step: JourneyStep) {
  if (step.enrolledCount <= 0) return 0;
  return Math.round((step.convertedCount / step.enrolledCount) * 100);
}

export function overallConversion(j: LifecycleJourney) {
  const first = j.steps[0];
  const last = j.steps[j.steps.length - 1];
  if (!first || first.enrolledCount <= 0) return 0;
  const completed = last?.convertedCount ?? 0;
  return Math.round((completed / first.enrolledCount) * 100);
}

export function enrollmentsForStep(j: LifecycleJourney, stepId: string) {
  return j.enrollments.filter(
    (e) => e.currentStepId === stepId && e.status === "Active",
  );
}

export function exitEnrollment(
  j: LifecycleJourney,
  enrollmentId: string,
): LifecycleJourney {
  return {
    ...j,
    updatedAt: formatJourneyAt(),
    enrollments: j.enrollments.map((e) =>
      e.id === enrollmentId ? { ...e, status: "Exited" as const } : e,
    ),
  };
}

export function runTestJourney(j: LifecycleJourney): LifecycleJourney {
  return {
    ...j,
    lastTestRunAt: formatJourneyAt(),
    updatedAt: formatJourneyAt(),
  };
}

export function reorderSteps(
  steps: JourneyStep[],
  fromIndex: number,
  toIndex: number,
): JourneyStep[] {
  const next = [...steps];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return steps;
  next.splice(toIndex, 0, item);
  return next;
}
