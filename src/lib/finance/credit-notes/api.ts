import {
  ensureCrmAccess,
  ensureCrmSession,
} from "@/lib/activity-timeline/auth";
import { crmErrorMessage, crmFetch, unwrapCrmData } from "@/lib/crm/request";
import type { FinanceLineItem } from "@/lib/finance/shared";
import {
  type CreditNote,
  type CreditNoteAttachment,
  type CreditNoteStatus,
  upsertCreditNote,
} from "@/lib/finance/credit-notes/types";

export type CrmCreditNoteQuery = {
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

export function creditNotesPath(suffix = ""): string {
  return `/v1/credit-notes${suffix}`;
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
    for (const key of ["items", "creditNotes", "records", "rows", "result"]) {
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

export function mapCreditNoteStatus(raw: string): CreditNoteStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("send") || value.includes("sent")) return "Sent";
  if (value.includes("appl")) return "Applied";
  if (value.includes("void")) return "Void";
  if (value.includes("cancel")) return "Cancelled";
  return "Draft";
}

function apiStatus(status: CreditNoteStatus): string {
  return status.toUpperCase().replace(/ /g, "_");
}

function formatDate(raw: unknown): string {
  const value = pickStr(raw);
  if (!value) return new Date().toLocaleDateString("en-AU");
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
      id: pickStr(row.id) || `cnli-${index}`,
      name: pickStr(row.name, row.description, row.title, "Line"),
      quantity: toNum(row.quantity) || 1,
      unitPrice: toNum(row.unitPrice ?? row.amount ?? row.price),
      taxRate: toNum(row.taxRate ?? row.tax),
    };
  });
}

export function normalizeCreditNoteAttachment(
  raw: Record<string, unknown>,
  index: number,
): CreditNoteAttachment {
  return {
    id: pickStr(raw.id, raw.attachmentId, raw.uuid) || `cna-${index}`,
    name: pickStr(raw.name, raw.fileName, raw.filename, "Attachment"),
    sizeLabel: pickStr(raw.sizeLabel, raw.size) || undefined,
    url: pickStr(raw.url, raw.href) || undefined,
  };
}

export function normalizeCreditNote(
  raw: Record<string, unknown>,
  index: number,
): CreditNote {
  const client =
    raw.client && typeof raw.client === "object"
      ? (raw.client as Record<string, unknown>)
      : null;
  const invoice =
    raw.invoice && typeof raw.invoice === "object"
      ? (raw.invoice as Record<string, unknown>)
      : null;
  const id = pickStr(raw.id, raw.uuid, raw.creditNoteId) || `crm-cn-${index}`;
  const lineItems = mapLines(raw.lineItems ?? raw.lines ?? raw.items);
  const totalsHint = toNum(raw.total ?? raw.amount ?? raw.grandTotal);
  const attachments = extractRecords(
    raw.attachments ?? raw.files,
  ).map((row, i) => normalizeCreditNoteAttachment(row, i));

  return {
    id,
    creditNoteId: pickStr(raw.number, raw.creditNoteNumber, raw.reference, `CN-${index + 1}`),
    title: pickStr(raw.title, raw.subject, raw.reason, "Credit note"),
    status: mapCreditNoteStatus(pickStr(raw.status, raw.state, "DRAFT")),
    clientName: pickStr(
      client && pickStr(client.name, client.title),
      raw.clientName,
      raw.customerName,
      "—",
    ),
    invoiceId: pickStr(invoice && invoice.id, raw.invoiceId) || undefined,
    invoiceRef: pickStr(
      invoice && pickStr(invoice.number, invoice.invoiceId),
      raw.invoiceRef,
      raw.invoiceNumber,
    ) || undefined,
    owner: pickStr(raw.ownerName, raw.createdBy, raw.owner, "—"),
    issueDate: formatDate(raw.issueDate ?? raw.issuedAt ?? raw.createdAt),
    reason: pickStr(raw.reason, raw.memo) || undefined,
    notes: pickStr(raw.notes, raw.description) || undefined,
    lineItems,
    subtotal: toNum(raw.subtotal) || lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
    tax: toNum(raw.tax ?? raw.taxTotal),
    total:
      totalsHint ||
      lineItems.reduce(
        (s, l) => s + l.quantity * l.unitPrice * (1 + l.taxRate / 100),
        0,
      ),
    publicLink: pickStr(raw.publicLink, raw.publicUrl) || undefined,
    attachments,
    createdBy: pickStr(raw.createdBy, raw.ownerName, "—"),
    createdAt: formatDate(raw.createdAt),
    sentAt: pickStr(raw.sentAt) || undefined,
    audit: [],
  };
}

export function normalizeCreditNotes(data: unknown): CreditNote[] {
  return extractRecords(data).map((row, index) => normalizeCreditNote(row, index));
}

async function creditNotesSend(
  auth: { baseUrl: string; accessToken: string },
  suffix: string,
  init?: RequestInit,
) {
  const form = init?.body instanceof FormData;
  const res = await fetch(`${auth.baseUrl}${creditNotesPath(suffix)}`, {
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

async function creditNotesRequest(
  suffix: string,
  init?: RequestInit,
): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage credit notes");
  if (init?.body instanceof FormData) {
    let { res, json } = await creditNotesSend(auth, suffix, init);
    if ([401, 403, 404, 405].includes(res.status)) {
      const retried = await resolveAuth();
      if (retried?.accessToken && retried.accessToken !== auth.accessToken) {
        ({ res, json } = await creditNotesSend(retried, suffix, init));
      }
    }
    if (!res.ok) {
      throw new Error(crmErrorMessage(json, `Credit note failed (${res.status})`));
    }
    return unwrapCrmData(json);
  }
  return crmFetch(auth, creditNotesPath(suffix), init);
}

async function creditNotesBlob(suffix: string): Promise<Blob> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to download credit note PDF");
  const res = await fetch(`${auth.baseUrl}${creditNotesPath(suffix)}`, {
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

function asNote(data: unknown): CreditNote | null {
  const items = normalizeCreditNotes(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeCreditNote(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function listCrmCreditNotes(
  query: CrmCreditNoteQuery = {},
): Promise<CreditNote[]> {
  return normalizeCreditNotes(
    await creditNotesRequest(
      toQuery({
        page: query.page,
        limit: query.limit ?? 100,
        search: query.search,
        status: query.status,
      }),
    ),
  );
}

export async function getCrmCreditNote(id: string): Promise<CreditNote | null> {
  return asNote(await creditNotesRequest(`/${id}`));
}

export async function createCrmCreditNote(
  body: Record<string, unknown>,
): Promise<CreditNote | null> {
  return asNote(
    await creditNotesRequest("", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

export async function updateCrmCreditNote(
  id: string,
  patch: Record<string, unknown>,
): Promise<CreditNote | null> {
  return asNote(
    await creditNotesRequest(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteCrmCreditNote(id: string): Promise<void> {
  await creditNotesRequest(`/${id}`, { method: "DELETE" });
}

export async function sendCrmCreditNote(id: string): Promise<CreditNote | null> {
  return asNote(
    await creditNotesRequest(`/${id}/send`, {
      method: "POST",
      body: "{}",
    }),
  );
}

export async function getCrmCreditNotePublicLink(
  id: string,
): Promise<{ url: string } | null> {
  const data = await creditNotesRequest(`/${id}/public-link`);
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    const url = pickStr(rec.url, rec.publicLink, rec.href, rec.link);
    if (url) return { url };
  }
  if (typeof data === "string" && data.trim()) return { url: data.trim() };
  return null;
}

export async function downloadCrmCreditNotePdf(id: string): Promise<Blob> {
  return creditNotesBlob(`/${id}/pdf`);
}

export async function listCrmCreditNoteAttachments(
  id: string,
): Promise<CreditNoteAttachment[]> {
  return extractRecords(await creditNotesRequest(`/${id}/attachments`)).map(
    (row, index) => normalizeCreditNoteAttachment(row, index),
  );
}

export async function addCrmCreditNoteAttachment(
  id: string,
  file: File,
): Promise<CreditNoteAttachment | null> {
  const form = new FormData();
  form.append("file", file);
  form.append("filename", file.name);
  const data = await creditNotesRequest(`/${id}/attachments`, {
    method: "POST",
    body: form,
  });
  const rows = extractRecords(data);
  if (rows[0]) return normalizeCreditNoteAttachment(rows[0], 0);
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeCreditNoteAttachment(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function deleteCrmCreditNoteAttachment(
  id: string,
  attachmentId: string,
): Promise<void> {
  await creditNotesRequest(`/${id}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
}

export async function tryCrmCreditNote<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemoteCreditNote(note: CreditNote | null) {
  if (note) upsertCreditNote(note);
  return note;
}

export function toCreateBody(input: {
  title: string;
  clientName: string;
  clientId?: string;
  invoiceId?: string;
  invoiceRef?: string;
  reason?: string;
  notes?: string;
  status: CreditNoteStatus;
  owner: string;
  issueDate: string;
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
  const issueDate = toIsoDate(input.issueDate);
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
    invoiceRef: input.invoiceRef,
    invoiceNumber: input.invoiceRef,
    invoiceId: input.invoiceId,
    reason: input.reason,
    memo: input.reason,
    notes: input.notes,
    description: input.notes,
    status: apiStatus(input.status),
    ownerName: input.owner,
    owner: input.owner,
    issueDate,
    issuedAt: issueDate,
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
