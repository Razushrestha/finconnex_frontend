/** SRS §10.3 WhatsApp Campaigns */

import { WHATSAPP_TEMPLATE_SEEDS } from "@/lib/marketing/templates/seed";

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

function wt(id: string) {
  return WHATSAPP_TEMPLATE_SEEDS.find((t) => t.id === id)!;
}

export const whatsappCampaigns: WhatsAppCampaign[] = [
  {
    id: "wc1",
    campaignId: "WA-8001",
    name: "Appointment reminders — this week",
    templateId: "wt1",
    templateName: wt("wt1").name,
    templateApproval: "Approved",
    templateBody: wt("wt1").body,
    templateHeader: wt("wt1").header,
    templateButtons: wt("wt1").buttons,
    audience: "Meetings · Tomorrow",
    status: "Completed",
    scheduledAt: "19/07/2026 16:00",
    sentCount: 18,
    deliveredCount: 17,
    readCount: 14,
    failedCount: 1,
    replyCount: 5,
    createdBy: "John Smith",
    createdAt: "18/07/2026",
    audit: [
      { id: "a1", at: "18/07/2026 10:00", action: "Created", actor: "John Smith" },
      {
        id: "a2",
        at: "18/07/2026 10:05",
        action: "Template already Approved",
        actor: "System",
      },
      { id: "a3", at: "19/07/2026 16:00", action: "Launched", actor: "System" },
      { id: "a4", at: "19/07/2026 16:10", action: "Completed", actor: "System" },
    ],
  },
  {
    id: "wc2",
    campaignId: "WA-8002",
    name: "Rate window promo",
    templateId: "wt2",
    templateName: wt("wt2").name,
    templateApproval: "Pending Meta",
    templateBody: wt("wt2").body,
    templateButtons: wt("wt2").buttons,
    audience: "Leads · Mortgage · Warm",
    status: "Draft",
    sentCount: 0,
    deliveredCount: 0,
    readCount: 0,
    failedCount: 0,
    replyCount: 0,
    createdBy: "Tejas Gokhe",
    createdAt: "20/07/2026",
    audit: [
      { id: "a1", at: "20/07/2026 11:00", action: "Created", actor: "Tejas Gokhe" },
      {
        id: "a2",
        at: "20/07/2026 11:05",
        action: "Submitted for Meta Approval",
        actor: "Tejas Gokhe",
      },
    ],
  },
  {
    id: "wc3",
    campaignId: "WA-8003",
    name: "Document request nudge",
    templateId: "wt3",
    templateName: wt("wt3").name,
    templateApproval: "Draft",
    templateBody: wt("wt3").body,
    audience: "Document Requests · Pending",
    status: "Draft",
    sentCount: 0,
    deliveredCount: 0,
    readCount: 0,
    failedCount: 0,
    replyCount: 0,
    createdBy: "Roshna Abraham",
    createdAt: "21/07/2026",
    audit: [
      {
        id: "a1",
        at: "21/07/2026 09:00",
        action: "Created",
        actor: "Roshna Abraham",
      },
    ],
  },
];

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
  if (!c.sentCount) return "—";
  return `${Math.round((c.readCount / c.sentCount) * 100)}%`;
}
