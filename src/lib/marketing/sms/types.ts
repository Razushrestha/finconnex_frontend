/** SRS §10.2 SMS Campaigns */

import { SMS_TEMPLATE_SEEDS } from "@/lib/marketing/templates/seed";

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

export const smsCampaigns: SmsCampaign[] = [
  {
    id: "sc1",
    campaignId: "SM-5001",
    name: "Appointment reminder — tomorrow",
    type: "Reminder",
    status: "Completed",
    audience: "Meetings · Tomorrow",
    message: SMS_TEMPLATE_SEEDS[0].body,
    templateId: "st1",
    scheduledAt: "19/07/2026 16:00",
    sentCount: 18,
    deliveredCount: 17,
    failedCount: 1,
    replyCount: 4,
    createdBy: "John Smith",
    createdAt: "19/07/2026",
    audit: [
      { id: "a1", at: "19/07/2026 10:00", action: "Created", actor: "John Smith" },
      { id: "a2", at: "19/07/2026 16:00", action: "Launched", actor: "System" },
      { id: "a3", at: "19/07/2026 16:05", action: "Completed", actor: "System" },
    ],
  },
  {
    id: "sc2",
    campaignId: "SM-5002",
    name: "Missing docs nudge",
    type: "Transactional",
    status: "Draft",
    audience: "Document Requests · Pending",
    message: SMS_TEMPLATE_SEEDS[1].body,
    templateId: "st2",
    sentCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    replyCount: 0,
    createdBy: "Shiva Kadhka",
    createdAt: "20/07/2026",
    audit: [
      { id: "a1", at: "20/07/2026 09:00", action: "Created", actor: "Shiva Kadhka" },
    ],
  },
  {
    id: "sc3",
    campaignId: "SM-5003",
    name: "Open house weekend",
    type: "Promotional",
    status: "Scheduled",
    audience: "Leads · Real Estate",
    message:
      "This weekend: Greystone open house Sat 10–2. Reply YES for the address pin.",
    scheduledAt: "25/07/2026 16:00",
    sentCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    replyCount: 0,
    createdBy: "Tejas Gokhe",
    createdAt: "18/07/2026",
    audit: [
      { id: "a1", at: "18/07/2026 11:00", action: "Created", actor: "Tejas Gokhe" },
      { id: "a2", at: "18/07/2026 11:20", action: "Scheduled", actor: "Tejas Gokhe" },
    ],
  },
  {
    id: "sc4",
    campaignId: "SM-5004",
    name: "Warm lead drip SMS",
    type: "Automated",
    status: "Running",
    audience: "Leads · Mortgage · Warm",
    message:
      "Hi {{first_name}}, still exploring options? Book a 15-min call: finconnex.example/book",
    sentCount: 64,
    deliveredCount: 61,
    failedCount: 3,
    replyCount: 9,
    createdBy: "John Smith",
    createdAt: "17/07/2026",
    audit: [
      { id: "a1", at: "17/07/2026 08:00", action: "Created", actor: "John Smith" },
      { id: "a2", at: "17/07/2026 08:30", action: "Launched", actor: "John Smith" },
    ],
  },
];

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
  if (!c.sentCount) return "—";
  return `${Math.round((c.deliveredCount / c.sentCount) * 100)}%`;
}
