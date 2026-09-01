/** Swagger workflow-rules — global JWT CRUD + NL suggest */

export type WorkflowRuleStatus = "Active" | "Draft" | "Disabled";

export type WorkflowRuleTrigger =
  | "Lead Created"
  | "Deal Stage Change"
  | "Task Overdue"
  | "Form Submitted"
  | "Record Updated"
  | "Manual";

export interface WorkflowRule {
  id: string;
  ruleId: string;
  name: string;
  description: string;
  trigger: WorkflowRuleTrigger;
  conditions: string;
  actions: string;
  enabled: boolean;
  status: WorkflowRuleStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const WORKFLOW_RULE_TRIGGERS: WorkflowRuleTrigger[] = [
  "Lead Created",
  "Deal Stage Change",
  "Task Overdue",
  "Form Submitted",
  "Record Updated",
  "Manual",
];

export const WORKFLOW_RULE_STATUSES: WorkflowRuleStatus[] = [
  "Active",
  "Draft",
  "Disabled",
];

const STORE_KEY = "workflow-rules:v1";

export function formatWorkflowRuleAt(d = new Date()) {
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const seedWorkflowRules: WorkflowRule[] = [
  {
    id: "wr-demo-1",
    ruleId: "WR-1001",
    name: "Assign new leads to round-robin",
    description: "When a lead is created, assign the next available owner.",
    trigger: "Lead Created",
    conditions: "source is not empty",
    actions: "Assign owner · Create follow-up task",
    enabled: true,
    status: "Active",
    createdBy: "John Smith",
    createdAt: "12/07/2026 09:10",
    updatedAt: "20/07/2026 11:20",
  },
  {
    id: "wr-demo-2",
    ruleId: "WR-1002",
    name: "Escalate overdue tasks",
    description: "Notify the manager when a task is more than 24 hours overdue.",
    trigger: "Task Overdue",
    conditions: "overdueHours > 24",
    actions: "Notify team · Raise priority",
    enabled: false,
    status: "Draft",
    createdBy: "Tejas Gokhe",
    createdAt: "15/07/2026 14:00",
    updatedAt: "18/07/2026 08:40",
  },
];

function readStore(): WorkflowRule[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as WorkflowRule[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: WorkflowRule[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listWorkflowRules(): WorkflowRule[] {
  return readStore() ?? seedWorkflowRules.map((row) => ({ ...row }));
}

export function upsertWorkflowRule(row: WorkflowRule) {
  const list = listWorkflowRules();
  const i = list.findIndex((x) => x.id === row.id);
  if (i >= 0) list[i] = row;
  else list.unshift(row);
  writeStore(list);
  return row;
}

export function replaceCrmWorkflowRules(remote: WorkflowRule[]) {
  writeStore(remote.map((row) => ({ ...row })));
}

export function deleteWorkflowRule(id: string) {
  writeStore(listWorkflowRules().filter((row) => row.id !== id));
}

export function getWorkflowRuleById(id: string) {
  return listWorkflowRules().find((row) => row.id === id);
}

export function nextWorkflowRuleIds() {
  const list = listWorkflowRules();
  const nums = list
    .map((row) => Number(row.ruleId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 1000) + 1;
  return { id: `wr-${Date.now()}`, ruleId: `WR-${n}` };
}

export const WORKFLOW_RULE_STATUS_STYLE: Record<WorkflowRuleStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  Draft: "bg-amber-50 text-amber-800",
  Disabled: "bg-slate-100 text-slate-600",
};
