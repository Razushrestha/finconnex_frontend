import {
  ensureCrmAccess,
  ensureCrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import type {
  EmailCampaign,
  EmailCampaignStatus,
  EmailCampaignType,
} from "@/lib/marketing/email/types";
import type {
  SmsCampaign,
  SmsCampaignStatus,
  SmsCampaignType,
} from "@/lib/marketing/sms/types";

export type CrmCampaignChannel = "EMAIL" | "SMS" | "UNKNOWN";

export type CrmCampaignQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  channel?: string;
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function toNum(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

export function campaignsPath(suffix = ""): string {
  return `/v1/campaigns${suffix}`;
}

async function resolveAuth() {
  const scoped = await ensureCrmSession();
  if (scoped) return scoped;
  return ensureCrmAccess();
}

function extractRecords(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (
      data.length === 2 &&
      Array.isArray(data[0]) &&
      (typeof data[1] === "number" || data[1] == null)
    ) {
      return (data[0] as unknown[]).filter(
        (row): row is Record<string, unknown> =>
          !!row && typeof row === "object" && !Array.isArray(row),
      );
    }
    return data.filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === "object" && !Array.isArray(row),
    );
  }
  if (typeof data === "object") {
    const rec = data as { items?: unknown; campaigns?: unknown };
    if (Array.isArray(rec.items)) return extractRecords(rec.items);
    if (Array.isArray(rec.campaigns)) return extractRecords(rec.campaigns);
  }
  return [];
}

function mapEmailStatus(raw: string): EmailCampaignStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("schedul")) return "Scheduled";
  if (value.includes("run") || value.includes("launch") || value.includes("active")) {
    return "Running";
  }
  if (value.includes("pause")) return "Paused";
  if (value.includes("complete") || value.includes("sent") || value.includes("done")) {
    return "Completed";
  }
  if (value.includes("cancel")) return "Cancelled";
  return "Draft";
}

function mapSmsStatus(raw: string): SmsCampaignStatus {
  return mapEmailStatus(raw) as SmsCampaignStatus;
}

function mapEmailType(raw: string): EmailCampaignType {
  const value = raw.toLowerCase();
  if (value.includes("news")) return "Newsletter";
  if (value.includes("promo")) return "Promotional";
  if (value.includes("drip")) return "Drip";
  if (value.includes("auto")) return "Automated";
  return "One-time";
}

function mapSmsType(raw: string): SmsCampaignType {
  const value = raw.toLowerCase();
  if (value.includes("promo")) return "Promotional";
  if (value.includes("auto") || value.includes("alert")) return "Automated";
  if (value.includes("remind")) return "Reminder";
  return "Transactional";
}

function detectChannel(raw: Record<string, unknown>): CrmCampaignChannel {
  const channel = pickStr(
    raw.channel,
    raw.medium,
    raw.campaignChannel,
    raw.type,
  ).toUpperCase();
  if (channel.includes("SMS") || channel.includes("TEXT")) return "SMS";
  if (channel.includes("EMAIL") || channel.includes("MAIL")) return "EMAIL";
  if (pickStr(raw.message) && !pickStr(raw.subject, raw.bodyHtml, raw.body)) {
    return "SMS";
  }
  return "EMAIL";
}

export function campaignChannel(raw: Record<string, unknown>): CrmCampaignChannel {
  return detectChannel(raw);
}

export function normalizeEmailCampaign(
  raw: Record<string, unknown>,
  index: number,
): EmailCampaign {
  const id = pickStr(raw.id, raw.uuid, raw.campaignId) || `crm-camp-${index}`;
  const name = pickStr(raw.name, raw.title, raw.subject, "Untitled campaign");
  return {
    id,
    campaignId: pickStr(raw.campaignCode, raw.code, raw.campaignId, id),
    name,
    type: mapEmailType(pickStr(raw.campaignType, raw.type, "One-time")),
    status: mapEmailStatus(pickStr(raw.status, raw.state, "DRAFT")),
    audience: pickStr(raw.audience, raw.audienceName, raw.segment, "All"),
    templateId: pickStr(raw.templateId, "et1"),
    templateName: pickStr(raw.templateName, raw.template, "CRM template"),
    subject: pickStr(raw.subject, name),
    fromName: pickStr(raw.fromName, raw.senderName, "FinConnex"),
    fromEmail: pickStr(raw.fromEmail, raw.senderEmail, "noreply@finconnex.example"),
    scheduledAt: pickStr(raw.scheduledAt, raw.startsAt) || undefined,
    sentCount: toNum(raw.sentCount ?? raw.sent),
    openCount: toNum(raw.openCount ?? raw.opens),
    clickCount: toNum(raw.clickCount ?? raw.clicks),
    bounceCount: toNum(raw.bounceCount ?? raw.bounces),
    unsubscribeCount: toNum(raw.unsubscribeCount ?? raw.unsubscribes),
    previewText: pickStr(raw.previewText, raw.preheader) || undefined,
    body: pickStr(raw.body, raw.bodyHtml, raw.content) || undefined,
    createdBy: pickStr(raw.createdByName, raw.createdBy, raw.ownerName, "—"),
    createdAt: pickStr(raw.createdAt, raw.createdOn, ""),
    audit: [],
  };
}

export function normalizeSmsCampaign(
  raw: Record<string, unknown>,
  index: number,
): SmsCampaign {
  const id = pickStr(raw.id, raw.uuid, raw.campaignId) || `crm-sms-${index}`;
  const name = pickStr(raw.name, raw.title, "Untitled SMS");
  return {
    id,
    campaignId: pickStr(raw.campaignCode, raw.code, raw.campaignId, id),
    name,
    type: mapSmsType(pickStr(raw.campaignType, raw.type, "Transactional")),
    status: mapSmsStatus(pickStr(raw.status, raw.state, "DRAFT")),
    audience: pickStr(raw.audience, raw.audienceName, raw.segment, "All"),
    message: pickStr(raw.message, raw.body, raw.content, name),
    scheduledAt: pickStr(raw.scheduledAt, raw.startsAt) || undefined,
    sentCount: toNum(raw.sentCount ?? raw.sent),
    deliveredCount: toNum(raw.deliveredCount ?? raw.delivered),
    failedCount: toNum(raw.failedCount ?? raw.failed),
    replyCount: toNum(raw.replyCount ?? raw.replies),
    createdBy: pickStr(raw.createdByName, raw.createdBy, raw.ownerName, "—"),
    createdAt: pickStr(raw.createdAt, raw.createdOn, ""),
    audit: [],
  };
}

async function campaignsGet(suffix: string, query = ""): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to load campaigns");
  return crmFetch(auth, `${campaignsPath(suffix)}${query}`);
}

async function campaignsMutate(
  suffix: string,
  init: RequestInit,
): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage campaigns");
  return crmFetch(auth, campaignsPath(suffix), init);
}

export async function listCrmCampaigns(
  query: CrmCampaignQuery = {},
): Promise<Record<string, unknown>[]> {
  const data = await campaignsGet(
    "",
    toQuery({
      page: query.page,
      limit: query.limit ?? 100,
      search: query.search,
      status: query.status,
      channel: query.channel,
    }),
  );
  return extractRecords(data);
}

export async function listCrmEmailCampaigns(
  query: CrmCampaignQuery = {},
): Promise<EmailCampaign[]> {
  const rows = await listCrmCampaigns(query);
  return rows
    .filter((row) => detectChannel(row) !== "SMS")
    .map((row, index) => normalizeEmailCampaign(row, index));
}

export async function listCrmSmsCampaigns(
  query: CrmCampaignQuery = {},
): Promise<SmsCampaign[]> {
  const rows = await listCrmCampaigns({ ...query, channel: query.channel ?? "SMS" });
  const sms = rows
    .filter((row) => detectChannel(row) === "SMS")
    .map((row, index) => normalizeSmsCampaign(row, index));
  if (sms.length) return sms;
  // Some backends omit channel; re-list all and filter.
  const all = await listCrmCampaigns(query);
  return all
    .filter((row) => detectChannel(row) === "SMS")
    .map((row, index) => normalizeSmsCampaign(row, index));
}

export async function getCrmCampaign(id: string): Promise<Record<string, unknown> | null> {
  const data = await campaignsGet(`/${id}`);
  const rows = extractRecords(data);
  if (rows[0]) return rows[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return null;
}

export async function createCrmCampaign(
  body: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const data = await campaignsMutate("", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const rows = extractRecords(data);
  if (rows[0]) return rows[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return null;
}

export async function updateCrmCampaign(
  id: string,
  patch: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const data = await campaignsMutate(`/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  const rows = extractRecords(data);
  return rows[0] ?? null;
}

export async function deleteCrmCampaign(id: string): Promise<void> {
  await campaignsMutate(`/${id}`, { method: "DELETE" });
}

export async function launchCrmCampaign(id: string): Promise<Record<string, unknown> | null> {
  const data = await campaignsMutate(`/${id}/launch`, {
    method: "POST",
    body: "{}",
  });
  const rows = extractRecords(data);
  return rows[0] ?? null;
}

export async function tryCrm<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}
