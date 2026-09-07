/** SRS §10.3 WhatsApp Campaigns */


export type WhatsAppCampaignStatus =
  | "Draft"
  | "Scheduled"
  | "Running"
  | "Paused"
  | "Completed"
  | "Cancelled";

export type WhatsAppApprovalStatus =
  | "Draft"
  | "Pending Meta"
  | "Approved"
  | "Rejected";

export const WHATSAPP_CAMPAIGN_STATUSES: WhatsAppCampaignStatus[] = [
  "Draft",
  "Scheduled",
  "Running",
  "Paused",
  "Completed",
  "Cancelled",
];

export interface WhatsAppCampaignAuditEvent {
  id: string;
  at: string;
  action: string;
  actor: string;
}

export interface WhatsAppCampaign {
  id: string;
  campaignId: string;
  name: string;
  templateId: string;
  templateName: string;
  templateApproval: WhatsAppApprovalStatus;
  templateBody: string;
  templateHeader?: string;
  templateButtons?: string[];
  audience: string;
  status: WhatsAppCampaignStatus;
  scheduledAt?: string;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  replyCount: number;
  createdBy: string;
  createdAt: string;
  audit: WhatsAppCampaignAuditEvent[];
}

const STORE_KEY = "marketing:whatsapp:v1";

export const whatsappCampaigns: WhatsAppCampaign[] = [];

function readStore(): WhatsAppCampaign[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as WhatsAppCampaign[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: WhatsAppCampaign[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listWhatsAppCampaigns(): WhatsAppCampaign[] {
  return readStore() ?? whatsappCampaigns.map((c) => ({ ...c }));
}

export function upsertWhatsAppCampaign(c: WhatsAppCampaign) {
  const list = listWhatsAppCampaigns();
  const i = list.findIndex((x) => x.id === c.id);
  if (i >= 0) list[i] = c;
  else list.unshift(c);
  writeStore(list);
  return c;
}

export function deleteWhatsAppCampaign(id: string) {
  writeStore(listWhatsAppCampaigns().filter((c) => c.id !== id));
}

export function getWhatsAppCampaignById(id: string) {
  return listWhatsAppCampaigns().find((c) => c.id === id);
}

export function nextWhatsAppCampaignIds() {
  const list = listWhatsAppCampaigns();
  const nums = list
    .map((c) => Number(c.campaignId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 8000) + 1;
  return { id: `wc-${Date.now()}`, campaignId: `WA-${n}` };
}

export function formatWaAt(d = new Date()) {
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function readRate(c: WhatsAppCampaign) {
  if (!c.sentCount) return "";
  return `${Math.round((c.readCount / c.sentCount) * 100)}%`;
}
