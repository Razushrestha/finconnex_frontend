import {
  ensureCrmAccess,
  ensureCrmSession,
} from "@/lib/activity-timeline/auth";
import { crmErrorMessage, crmFetch, unwrapCrmData } from "@/lib/crm/request";
import type { FinanceLineItem } from "@/lib/finance/shared";
import {
  type Quotation,
  type QuotationAttachment,
  type QuotationStatus,
  upsertQuotation,
} from "@/lib/finance/quotations/types";
import { rewritePublicSalesUrl } from "@/lib/finance/public-sales/api";

export type CrmQuoteQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
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

export function quotesPath(suffix = ""): string {
  return `/v1/quotes${suffix}`;
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
    const rec = data as Record<string, unknown>;
    for (const key of ["items", "quotes", "quotations", "records", "rows", "result"]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  }
  return [];
}

function toIsoDate(raw: string): string {
  const au = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (au) {
    const [, day, month, year] = au;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(raw.trim())) return raw.trim().slice(0, 10);
  return raw.trim();
}

export function mapQuoteStatus(raw: string): QuotationStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("invoice")) return "Invoiced";
  if (value.includes("accept")) return "Accepted";
  if (value.includes("reject")) return "Rejected";
  if (value.includes("expir")) return "Expired";
  if (value.includes("send") || value.includes("sent")) return "Sent";
  return "Draft";
}

function apiStatus(status: QuotationStatus): string {
  return status.toUpperCase();
}

function formatDate(raw: unknown): string {
  const value = pickStr(raw);
  if (!value) return "";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleDateString("en-AU");
}

function mapLines(raw: unknown): FinanceLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry, index) => {
    const row =
      entry && typeof entry === "object"
        ? (entry as Record<string, unknown>)
        : {};
    return {
      id: pickStr(row.id) || `qli-${index}`,
      name: pickStr(row.name, row.description, row.title, "Line"),
      quantity: toNum(row.quantity) || 1,
      unitPrice: toNum(row.unitPrice ?? row.amount ?? row.price),
      taxRate: toNum(row.taxRate ?? row.tax),
    };
  });
}

export function normalizeQuoteAttachment(
  raw: Record<string, unknown>,
  index: number,
): QuotationAttachment {
  return {
    id: pickStr(raw.id, raw.attachmentId, raw.uuid) || `quo-att-${index}`,
    name: pickStr(raw.name, raw.fileName, raw.filename, "Attachment"),
    sizeLabel: pickStr(raw.sizeLabel, raw.size) || undefined,
    url: pickStr(raw.url, raw.href) || undefined,
  };
}

export function normalizeQuote(
  raw: Record<string, unknown>,
  index: number,
): Quotation {
  const client =
    raw.client && typeof raw.client === "object"
      ? (raw.client as Record<string, unknown>)
      : null;
  const contact =
    raw.contact && typeof raw.contact === "object"
      ? (raw.contact as Record<string, unknown>)
      : null;
  const id = pickStr(raw.id, raw.uuid, raw.quoteId, raw.quotationId) || `crm-quo-${index}`;
  const lineItems = mapLines(raw.lineItems ?? raw.lines ?? raw.items);
  const totalsHint = toNum(raw.total ?? raw.amount ?? raw.grandTotal);
  const attachments = extractRecords(raw.attachments ?? raw.files).map(
    (row, i) => normalizeQuoteAttachment(row, i),
  );
  return {
    id,
    quotationId: pickStr(
      raw.number,
      raw.quoteNumber,
      raw.quotationNumber,
      raw.reference,
      `QUO-${index + 1}`,
    ),
    title: pickStr(raw.title, raw.subject, raw.name, "Quote"),
    status: mapQuoteStatus(pickStr(raw.status, raw.state, "DRAFT")),
    clientId: pickStr(client && client.id, raw.clientId, raw.customerId),
    clientName: pickStr(
      client && pickStr(client.name, client.title),
      raw.clientName,
      raw.customerName,
      "—",
    ),
    contactName: pickStr(
      contact && pickStr(contact.name, contact.fullName),
      raw.contactName,
      "—",
    ),
    contactEmail: pickStr(
      contact && contact.email,
      raw.contactEmail,
      raw.email,
      "",
    ),
    dealName: pickStr(raw.dealName, raw.relatedTo) || undefined,
    owner: pickStr(raw.ownerName, raw.createdBy, raw.owner, "—"),
    validUntil: formatDate(raw.validUntil ?? raw.expiryDate ?? raw.dueDate),
    notes: pickStr(raw.notes, raw.description) || undefined,
    lineItems,
    subtotal:
      toNum(raw.subtotal) ||
      lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
    tax: toNum(raw.tax ?? raw.taxTotal),
    total:
      totalsHint ||
      lineItems.reduce(
        (s, l) => s + l.quantity * l.unitPrice * (1 + l.taxRate / 100),
        0,
      ),
    estimateId: pickStr(raw.estimateId) || undefined,
    estimateRef: pickStr(raw.estimateRef, raw.estimateNumber) || undefined,
    invoiceId: pickStr(raw.invoiceId) || undefined,
    publicLink: pickStr(raw.publicLink, raw.publicUrl) || undefined,
    attachments,
    createdBy: pickStr(raw.createdBy, raw.ownerName, "—"),
    createdAt: formatDate(raw.createdAt),
    sentAt: pickStr(raw.sentAt) || undefined,
    audit: [],
  };
}

export function normalizeQuotes(data: unknown): Quotation[] {
  return extractRecords(data).map((row, index) => normalizeQuote(row, index));
}

async function quotesSend(
  auth: { baseUrl: string; accessToken: string },
  suffix: string,
  init?: RequestInit,
) {
  const form = init?.body instanceof FormData;
  const res = await fetch(`${auth.baseUrl}${quotesPath(suffix)}`, {
    ...init,
    headers: {
      Accept: form ? "*/*" : "application/json",
      Authorization: `Bearer ${auth.accessToken}`,
      ...(init?.body && !form ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  return { res, json };
}

async function quotesRequest(
  suffix: string,
  init?: RequestInit,
): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage quotes");
  if (init?.body instanceof FormData) {
    let { res, json } = await quotesSend(auth, suffix, init);
    if ([401, 403, 404, 405].includes(res.status)) {
      const retried = await resolveAuth();
      if (retried?.accessToken && retried.accessToken !== auth.accessToken) {
        ({ res, json } = await quotesSend(retried, suffix, init));
      }
    }
    if (!res.ok) {
      throw new Error(crmErrorMessage(json, `Quote failed (${res.status})`));
    }
    return unwrapCrmData(json);
  }
  return crmFetch(auth, quotesPath(suffix), init);
}

async function quotesBlob(suffix: string): Promise<Blob> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to download quote PDF");
  const res = await fetch(`${auth.baseUrl}${quotesPath(suffix)}`, {
    headers: {
      Accept: "application/pdf,application/octet-stream,*/*",
      Authorization: `Bearer ${auth.accessToken}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    throw new Error(crmErrorMessage(json, `PDF download failed (${res.status})`));
  }
  return res.blob();
}

function asQuote(data: unknown): Quotation | null {
  const items = normalizeQuotes(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeQuote(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function listCrmQuotes(
  query: CrmQuoteQuery = {},
): Promise<Quotation[]> {
  return normalizeQuotes(
    await quotesRequest(
      toQuery({
        page: query.page,
        limit: query.limit ?? 100,
        search: query.search,
        status: query.status,
      }),
    ),
  );
}

export async function getCrmQuote(id: string): Promise<Quotation | null> {
  return asQuote(await quotesRequest(`/${id}`));
}

export async function createCrmQuote(
  body: Record<string, unknown>,
): Promise<Quotation | null> {
  return asQuote(
    await quotesRequest("", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

export async function updateCrmQuote(
  id: string,
  patch: Record<string, unknown>,
): Promise<Quotation | null> {
  return asQuote(
    await quotesRequest(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteCrmQuote(id: string): Promise<void> {
  await quotesRequest(`/${id}`, { method: "DELETE" });
}

export async function sendCrmQuote(id: string): Promise<Quotation | null> {
  return asQuote(
    await quotesRequest(`/${id}/send`, {
      method: "POST",
      body: "{}",
    }),
  );
}

export async function getCrmQuotePublicLink(
  id: string,
): Promise<{ url: string } | null> {
  const data = await quotesRequest(`/${id}/public-link`);
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    const url = pickStr(rec.url, rec.publicLink, rec.href, rec.link);
    if (url) return { url: rewritePublicSalesUrl(url) };
  }
  if (typeof data === "string" && data.trim()) {
    return { url: rewritePublicSalesUrl(data.trim()) };
  }
  return null;
}

export async function downloadCrmQuotePdf(id: string): Promise<Blob> {
  return quotesBlob(`/${id}/pdf`);
}

export async function listCrmQuoteAttachments(
  id: string,
): Promise<QuotationAttachment[]> {
  return extractRecords(await quotesRequest(`/${id}/attachments`)).map(
    (row, index) => normalizeQuoteAttachment(row, index),
  );
}

export async function addCrmQuoteAttachment(
  id: string,
  file: File,
): Promise<QuotationAttachment | null> {
  const form = new FormData();
  form.append("file", file);
  form.append("filename", file.name);
  const data = await quotesRequest(`/${id}/attachments`, {
    method: "POST",
    body: form,
  });
  const rows = extractRecords(data);
  if (rows[0]) return normalizeQuoteAttachment(rows[0], 0);
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeQuoteAttachment(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function deleteCrmQuoteAttachment(
  id: string,
  attachmentId: string,
): Promise<void> {
  await quotesRequest(`/${id}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
}

export async function tryCrmQuote<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemoteQuote(row: Quotation | null) {
  if (row) upsertQuotation(row);
  return row;
}

export function toCreateQuoteBody(input: {
  title: string;
  clientName: string;
  clientId?: string;
  contactName?: string;
  contactEmail?: string;
  dealName?: string;
  notes?: string;
  status: QuotationStatus;
  owner: string;
  validUntil: string;
  lineItems: FinanceLineItem[];
}): Record<string, unknown> {
  const subtotal = input.lineItems.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );
  const tax = input.lineItems.reduce(
    (sum, line) =>
      sum + (line.quantity * line.unitPrice * line.taxRate) / 100,
    0,
  );
  const validUntil = toIsoDate(input.validUntil);
  const clientId =
    input.clientId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input.clientId,
    )
      ? input.clientId
      : undefined;
  return {
    title: input.title,
    subject: input.title,
    clientName: input.clientName,
    customerName: input.clientName,
    ...(clientId ? { clientId, customerId: clientId } : {}),
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    dealName: input.dealName,
    notes: input.notes,
    description: input.notes,
    status: apiStatus(input.status),
    ownerName: input.owner,
    owner: input.owner,
    validUntil,
    expiryDate: validUntil,
    currency: "AUD",
    subtotal,
    tax,
    taxTotal: tax,
    total: subtotal + tax,
    amount: subtotal + tax,
    lineItems: input.lineItems.map((line) => ({
      name: line.name,
      description: line.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      taxRate: line.taxRate,
      amount: line.quantity * line.unitPrice,
    })),
  };
}

export function isCrmQuoteId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
}
