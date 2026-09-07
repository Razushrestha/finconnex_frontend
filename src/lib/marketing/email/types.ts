/** SRS §10.1 Email Campaigns */


export type EmailCampaignType =
  | "Newsletter"
  | "Promotional"
  | "Drip"
  | "Automated"
  | "One-time";

export type EmailCampaignStatus =
  | "Draft"
  | "Scheduled"
  | "Running"
  | "Paused"
  | "Completed"
  | "Cancelled";

export const EMAIL_CAMPAIGN_TYPES: EmailCampaignType[] = [
  "Newsletter",
  "Promotional",
  "Drip",
  "Automated",
  "One-time",
];

export const EMAIL_CAMPAIGN_STATUSES: EmailCampaignStatus[] = [
  "Draft",
  "Scheduled",
  "Running",
  "Paused",
  "Completed",
  "Cancelled",
];

export interface EmailCampaignAuditEvent {
  id: string;
  at: string;
  action: string;
  actor: string;
}

export interface EmailCampaign {
  id: string;
  campaignId: string;
  name: string;
  type: EmailCampaignType;
  status: EmailCampaignStatus;
  audience: string;
  templateId: string;
  templateName: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  scheduledAt?: string;
  sentCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  unsubscribeCount: number;
  previewText?: string;
  body?: string;
  createdBy: string;
  createdAt: string;
  audit: EmailCampaignAuditEvent[];
}

const STORE_KEY = "marketing:email:v2";

export const emailCampaigns: EmailCampaign[] = [];

function readStore(): EmailCampaign[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as EmailCampaign[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: EmailCampaign[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listEmailCampaigns(): EmailCampaign[] {
  return readStore() ?? emailCampaigns.map((c) => ({ ...c }));
}

export function upsertEmailCampaign(c: EmailCampaign) {
  const list = listEmailCampaigns();
  const i = list.findIndex((x) => x.id === c.id);
  if (i >= 0) list[i] = c;
  else list.unshift(c);
  writeStore(list);
  return c;
}

export function mergeCrmEmailCampaigns(remote: EmailCampaign[]) {
  if (!remote.length) return;
  const remoteIds = new Set(remote.map((c) => c.id));
  const local = listEmailCampaigns().filter((c) => !remoteIds.has(c.id));
  writeStore([...remote, ...local]);
}

export function deleteEmailCampaign(id: string) {
  writeStore(listEmailCampaigns().filter((c) => c.id !== id));
}

export function getEmailCampaignById(id: string) {
  return listEmailCampaigns().find((c) => c.id === id);
}

export function nextEmailCampaignIds() {
  const list = listEmailCampaigns();
  const nums = list
    .map((c) => Number(c.campaignId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 4000) + 1;
  return { id: `ec-${Date.now()}`, campaignId: `EM-${n}` };
}

export function formatCampaignAt(d = new Date()) {
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function openRate(c: EmailCampaign) {
  if (!c.sentCount) return "";
  return `${Math.round((c.openCount / c.sentCount) * 100)}%`;
}

export function clickRate(c: EmailCampaign) {
  if (!c.sentCount) return "";
  return `${Math.round((c.clickCount / c.sentCount) * 100)}%`;
}
