/** SRS §10.1 Email Campaigns */

import { EMAIL_TEMPLATE_SEEDS } from "@/lib/marketing/templates/seed";

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

function tpl(id: string) {
  return EMAIL_TEMPLATE_SEEDS.find((t) => t.id === id)!;
}

export const emailCampaigns: EmailCampaign[] = [
  {
    id: "ec1",
    campaignId: "EM-4001",
    name: "July rate-lock nurture",
    type: "Promotional",
    status: "Completed",
    audience: "Leads · Mortgage · Warm",
    templateId: "et1",
    templateName: tpl("et1").name,
    subject: tpl("et1").subject,
    fromName: "John Smith",
    fromEmail: "john@finconnex.example",
    scheduledAt: "12/07/2026 09:00",
    sentCount: 428,
    openCount: 180,
    clickCount: 47,
    bounceCount: 6,
    unsubscribeCount: 3,
    previewText: tpl("et1").previewText,
    body: tpl("et1").bodyHtml,
    createdBy: "John Smith",
    createdAt: "10/07/2026",
    audit: [
      { id: "a1", at: "10/07/2026 10:00", action: "Created", actor: "John Smith" },
      { id: "a2", at: "11/07/2026 16:00", action: "Scheduled", actor: "John Smith" },
      { id: "a3", at: "12/07/2026 09:00", action: "Launched", actor: "System" },
      { id: "a4", at: "12/07/2026 11:30", action: "Completed", actor: "System" },
    ],
  },
  {
    id: "ec2",
    campaignId: "EM-4002",
    name: "Greystone proposal follow-up",
    type: "One-time",
    status: "Scheduled",
    audience: "Deal: Greystone Realty",
    templateId: "et2",
    templateName: tpl("et2").name,
    subject: tpl("et2").subject,
    fromName: "Tejas Gokhe",
    fromEmail: "tejas@finconnex.example",
    scheduledAt: "23/07/2026 09:00",
    sentCount: 0,
    openCount: 0,
    clickCount: 0,
    bounceCount: 0,
    unsubscribeCount: 0,
    previewText: tpl("et2").previewText,
    body: tpl("et2").bodyHtml,
    createdBy: "Tejas Gokhe",
    createdAt: "19/07/2026",
    audit: [
      { id: "a1", at: "19/07/2026 14:00", action: "Created", actor: "Tejas Gokhe" },
      { id: "a2", at: "19/07/2026 14:20", action: "Scheduled", actor: "Tejas Gokhe" },
    ],
  },
  {
    id: "ec3",
    campaignId: "EM-4003",
    name: "Document request reminder blast",
    type: "Automated",
    status: "Draft",
    audience: "Document Requests · Pending",
    templateId: "et3",
    templateName: tpl("et3").name,
    subject: tpl("et3").subject,
    fromName: "Roshna Abraham",
    fromEmail: "roshna@finconnex.example",
    sentCount: 0,
    openCount: 0,
    clickCount: 0,
    bounceCount: 0,
    unsubscribeCount: 0,
    previewText: tpl("et3").previewText,
    body: tpl("et3").bodyHtml,
    createdBy: "Roshna Abraham",
    createdAt: "20/07/2026",
    audit: [
      { id: "a1", at: "20/07/2026 09:15", action: "Created", actor: "Roshna Abraham" },
    ],
  },
  {
    id: "ec4",
    campaignId: "EM-4004",
    name: "Q3 newsletter",
    type: "Newsletter",
    status: "Paused",
    audience: "Contacts · Active",
    templateId: "et4",
    templateName: tpl("et4").name,
    subject: tpl("et4").subject,
    fromName: "FinConnex Team",
    fromEmail: "hello@finconnex.example",
    scheduledAt: "01/08/2026 08:00",
    sentCount: 210,
    openCount: 88,
    clickCount: 19,
    bounceCount: 4,
    unsubscribeCount: 2,
    previewText: tpl("et4").previewText,
    body: tpl("et4").bodyHtml,
    createdBy: "Shiva Kadhka",
    createdAt: "15/07/2026",
    audit: [
      { id: "a1", at: "15/07/2026 11:00", action: "Created", actor: "Shiva Kadhka" },
      { id: "a2", at: "16/07/2026 08:00", action: "Launched", actor: "Shiva Kadhka" },
      { id: "a3", at: "16/07/2026 10:40", action: "Paused", actor: "Shiva Kadhka" },
    ],
  },
  {
    id: "ec5",
    campaignId: "EM-4005",
    name: "Drip — warm lead week 1",
    type: "Drip",
    status: "Running",
    audience: "Leads · Mortgage · Warm",
    templateId: "et1",
    templateName: tpl("et1").name,
    subject: "Day 3: still exploring rates?",
    fromName: "John Smith",
    fromEmail: "john@finconnex.example",
    sentCount: 96,
    openCount: 41,
    clickCount: 12,
    bounceCount: 1,
    unsubscribeCount: 0,
    createdBy: "John Smith",
    createdAt: "18/07/2026",
    audit: [
      { id: "a1", at: "18/07/2026 09:00", action: "Created", actor: "John Smith" },
      { id: "a2", at: "18/07/2026 09:30", action: "Launched", actor: "John Smith" },
    ],
  },
];

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
  if (!c.sentCount) return "—";
  return `${Math.round((c.openCount / c.sentCount) * 100)}%`;
}

export function clickRate(c: EmailCampaign) {
  if (!c.sentCount) return "—";
  return `${Math.round((c.clickCount / c.sentCount) * 100)}%`;
}
