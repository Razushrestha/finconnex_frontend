/** SRS §10.2 SMS Campaigns */


export type SmsCampaignType =
  | "Promotional"
  | "Transactional"
  | "Reminder"
  | "Automated";

export type SmsCampaignStatus =
  | "Draft"
  | "Scheduled"
  | "Running"
  | "Paused"
  | "Completed"
  | "Cancelled";

export const SMS_CAMPAIGN_TYPES: SmsCampaignType[] = [
  "Promotional",
  "Transactional",
  "Reminder",
  "Automated",
];

export const SMS_CAMPAIGN_STATUSES: SmsCampaignStatus[] = [
  "Draft",
  "Scheduled",
  "Running",
  "Paused",
  "Completed",
  "Cancelled",
];

export interface SmsCampaignAuditEvent {
  id: string;
  at: string;
  action: string;
  actor: string;
}

export interface SmsCampaign {
  id: string;
  campaignId: string;
  name: string;
  type: SmsCampaignType;
  status: SmsCampaignStatus;
  audience: string;
  message: string;
  templateId?: string;
  scheduledAt?: string;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  replyCount: number;
  createdBy: string;
  createdAt: string;
  audit: SmsCampaignAuditEvent[];
}

const STORE_KEY = "marketing:sms:v2";

export const smsCampaigns: SmsCampaign[] = [];

function readStore(): SmsCampaign[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as SmsCampaign[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: SmsCampaign[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listSmsCampaigns(): SmsCampaign[] {
  return readStore() ?? smsCampaigns.map((c) => ({ ...c }));
}

export function upsertSmsCampaign(c: SmsCampaign) {
  const list = listSmsCampaigns();
  const i = list.findIndex((x) => x.id === c.id);
  if (i >= 0) list[i] = c;
  else list.unshift(c);
  writeStore(list);
  return c;
}

export function mergeCrmSmsCampaigns(remote: SmsCampaign[]) {
  if (!remote.length) return;
  const remoteIds = new Set(remote.map((c) => c.id));
  const local = listSmsCampaigns().filter((c) => !remoteIds.has(c.id));
  writeStore([...remote, ...local]);
}

export function deleteSmsCampaign(id: string) {
  writeStore(listSmsCampaigns().filter((c) => c.id !== id));
}

export function getSmsCampaignById(id: string) {
  return listSmsCampaigns().find((c) => c.id === id);
}

export function nextSmsCampaignIds() {
  const list = listSmsCampaigns();
  const nums = list
    .map((c) => Number(c.campaignId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 5000) + 1;
  return { id: `sc-${Date.now()}`, campaignId: `SM-${n}` };
}

export function formatSmsAt(d = new Date()) {
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function deliveryRate(c: SmsCampaign) {
  if (!c.sentCount) return "";
  return `${Math.round((c.deliveredCount / c.sentCount) * 100)}%`;
}
