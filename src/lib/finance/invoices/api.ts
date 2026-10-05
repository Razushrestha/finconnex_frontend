import {
  ensureCrmAccess,
  ensureCrmSession,
} from "@/lib/activity-timeline/auth";
import {
  crmErrorMessage,
  crmWorkspaceFetch,
} from "@/lib/crm/request";
import {
  financeClientName,
  financeContactName,
  financeDealName,
  financeDocumentCopy,
  financeLineItems,
  financeNotes,
  financeOwnerName,
  financeUuid,
  mapFinanceLine,
  type FinanceLineItem,
} from "@/lib/finance/shared";
import {
  type Invoice,
  type InvoiceAttachment,
  type InvoiceStatus,
  upsertInvoice,
} from "@/lib/finance/invoices/types";
import { rewritePublicSalesUrl } from "@/lib/finance/public-sales/api";

export type CrmInvoiceQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
};

export type InvoiceStripePayment = {
  clientSecret?: string;
  paymentIntentId?: string;
  url?: string;
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

export function invoicesPath(suffix = ""): string {
  return `/v1/invoices${suffix}`;
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
    for (const key of ["items", "invoices", "records", "rows", "result"]) {
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

export function mapInvoiceStatus(raw: string): InvoiceStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("partial")) return "Partially Paid";
  if (value.includes("overdue")) return "Overdue";
  if (value.includes("cancel")) return "Cancelled";
  if (value.includes("void")) return "Void";
  if (value.includes("paid") && !value.includes("unpaid")) return "Paid";
  if (value.includes("send") || value.includes("sent")) return "Sent";
  return "Draft";
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
  return raw.map((entry, index) =>
    mapFinanceLine(
      entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {},
      index,
      "ili",
    ),
  );
}

export function normalizeInvoiceAttachment(
  raw: Record<string, unknown>,
  index: number,
): InvoiceAttachment {
  return {
    id: pickStr(raw.id, raw.attachmentId, raw.uuid) || `inva-${index}`,
    name: pickStr(raw.name, raw.fileName, raw.filename, "Attachment"),
    sizeLabel: pickStr(raw.sizeLabel, raw.size) || undefined,
    url: pickStr(raw.url, raw.href) || undefined,
  };
}

export function normalizeInvoice(
  raw: Record<string, unknown>,
  index: number,
): Invoice {
  const client =
    raw.client && typeof raw.client === "object"
      ? (raw.client as Record<string, unknown>)
      : null;
  const contact =
    raw.contact && typeof raw.contact === "object"
      ? (raw.contact as Record<string, unknown>)
      : null;
  const id = pickStr(raw.id, raw.uuid, raw.invoiceId) || `crm-inv-${index}`;
  const copy = financeDocumentCopy(raw, "Invoice");
  const lineItems = mapLines(raw.lineItems ?? raw.lines ?? raw.items);
  const totalsHint = toNum(raw.total ?? raw.amount ?? raw.grandTotal);
  const amountPaid = toNum(raw.amountPaid ?? raw.paid ?? raw.paidAmount);
  const total =
    totalsHint ||
    lineItems.reduce(
      (s, l) => s + l.quantity * l.unitPrice * (1 + l.taxRate / 100),
      0,
    );
  const amountDueHint = toNum(raw.amountDue ?? raw.balance ?? raw.due);
  const attachments = extractRecords(raw.attachments ?? raw.files).map(
    (row, i) => normalizeInvoiceAttachment(row, i),
  );
  return {
    id,
    invoiceId: pickStr(raw.number, raw.invoiceNumber, raw.reference, `INV-${index + 1}`),
    title: copy.title,
    status: mapInvoiceStatus(pickStr(raw.status, raw.state, "DRAFT")),
    clientId: pickStr(client && client.id, raw.clientId, raw.contactId, raw.customerId),
    clientName: financeClientName(raw) || "—",
    contactName: financeContactName(raw) || "—",
    contactEmail: pickStr(
      contact && contact.email,
      raw.contactEmail,
      raw.email,
      "",
    ),
    dealName: financeDealName(raw) || undefined,
    owner: financeOwnerName(raw) || "—",
    issueDate: formatDate(raw.issueDate ?? raw.issuedAt ?? raw.createdAt),
    dueDate: formatDate(raw.dueDate ?? raw.dueAt),
    notes: copy.notes,
    lineItems,
    subtotal:
      toNum(raw.subtotal) ||
      lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
    tax: toNum(raw.tax ?? raw.taxTotal),
    total,
    amountPaid,
    amountDue: amountDueHint || Math.max(0, total - amountPaid),
    quotationId: pickStr(raw.quotationId, raw.quoteId) || undefined,
    quotationRef: pickStr(raw.quotationRef, raw.quoteNumber) || undefined,
    publicLink: pickStr(raw.publicLink, raw.publicUrl) || undefined,
    attachments,
    createdBy: financeOwnerName(raw) || "—",
    createdAt: formatDate(raw.createdAt),
    sentAt: pickStr(raw.sentAt) || undefined,
    audit: [],
  };
}

export function normalizeInvoices(data: unknown): Invoice[] {
  return extractRecords(data).map((row, index) => normalizeInvoice(row, index));
}

async function invoicesRequest(
  suffix: string,
  init?: RequestInit,
): Promise<unknown> {
  return crmWorkspaceFetch(invoicesPath(suffix), init);
}

async function invoicesBlob(suffix: string): Promise<Blob> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to download invoice PDF");
  const res = await fetch(`${auth.baseUrl}${invoicesPath(suffix)}`, {
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

function asInvoice(data: unknown): Invoice | null {
  const items = normalizeInvoices(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeInvoice(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function listCrmInvoices(
  query: CrmInvoiceQuery = {},
): Promise<Invoice[]> {
  return normalizeInvoices(
    await invoicesRequest(
      toQuery({
        page: query.page,
        limit: query.limit ?? 100,
        search: query.search,
        status: query.status,
      }),
    ),
  );
}

export async function getCrmInvoice(id: string): Promise<Invoice | null> {
  return asInvoice(await invoicesRequest(`/${id}`));
}

export async function createCrmInvoice(
  body: Record<string, unknown>,
): Promise<Invoice | null> {
  return asInvoice(
    await invoicesRequest("", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

export async function updateCrmInvoice(
  id: string,
  patch: Record<string, unknown>,
): Promise<Invoice | null> {
  return asInvoice(
    await invoicesRequest(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteCrmInvoice(id: string): Promise<void> {
  await invoicesRequest(`/${id}`, { method: "DELETE" });
}

export async function sendCrmInvoice(id: string): Promise<Invoice | null> {
  return asInvoice(
    await invoicesRequest(`/${id}/send`, {
      method: "POST",
      body: "{}",
    }),
  );
}

export async function getCrmInvoicePublicLink(
  id: string,
): Promise<{ url: string } | null> {
  const data = await invoicesRequest(`/${id}/public-link`);
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

export async function downloadCrmInvoicePdf(id: string): Promise<Blob> {
  return invoicesBlob(`/${id}/pdf`);
}

export async function listCrmInvoiceAttachments(
  id: string,
): Promise<InvoiceAttachment[]> {
  return extractRecords(await invoicesRequest(`/${id}/attachments`)).map(
    (row, index) => normalizeInvoiceAttachment(row, index),
  );
}

export async function addCrmInvoiceAttachment(
  id: string,
  file: File,
): Promise<InvoiceAttachment | null> {
  const form = new FormData();
  form.append("file", file);
  form.append("filename", file.name);
  const data = await invoicesRequest(`/${id}/attachments`, {
    method: "POST",
    body: form,
  });
  const rows = extractRecords(data);
  if (rows[0]) return normalizeInvoiceAttachment(rows[0], 0);
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeInvoiceAttachment(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function deleteCrmInvoiceAttachment(
  id: string,
  attachmentId: string,
): Promise<void> {
  await invoicesRequest(`/${id}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
}

export async function createCrmInvoiceStripePayment(
  id: string,
  body: Record<string, unknown> = {},
): Promise<InvoiceStripePayment | null> {
  const data = await invoicesRequest(`/${id}/payments/stripe`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    return {
      clientSecret: pickStr(rec.clientSecret, rec.client_secret) || undefined,
      paymentIntentId: pickStr(
        rec.paymentIntentId,
        rec.paymentIntent,
        rec.id,
      ) || undefined,
      url: pickStr(rec.url, rec.checkoutUrl, rec.href) || undefined,
      status: pickStr(rec.status) || undefined,
    };
  }
  return null;
}

export async function tryCrmInvoice<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemoteInvoice(row: Invoice | null) {
  if (row) upsertInvoice(row);
  return row;
}

export function toCreateInvoiceBody(input: {
  title: string;
  clientName: string;
  clientId?: string;
  contactName?: string;
  contactEmail?: string;
  dealName?: string;
  notes?: string;
  status: InvoiceStatus;
  owner: string;
  issueDate: string;
  dueDate: string;
  lineItems: FinanceLineItem[];
}): Record<string, unknown> {
  const issueDate = toIsoDate(input.issueDate);
  const dueDate = toIsoDate(input.dueDate);
  const contactId = financeUuid(input.clientId);
  const notes = financeNotes(input.title, input.notes);
  return {
    invoiceNumber: `INV-${Date.now()}`,
    issueDate,
    dueDate,
    currency: "AUD",
    ...(contactId ? { contactId } : {}),
    ...(notes ? { notes } : {}),
    lineItems: financeLineItems(input.lineItems),
  };
}

export function isCrmInvoiceId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
}
