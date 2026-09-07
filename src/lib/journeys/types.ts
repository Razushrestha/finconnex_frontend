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

export const JOURNEY_OWNERS: readonly string[] = [];

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

export const seedJourneys: LifecycleJourney[] = [];

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

/** Full replace of the local cache with data fetched from the CRM backend. */
export function replaceCrmJourneys(remote: LifecycleJourney[]) {
  writeStore(remote.map((j) => ({ ...j })));
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
