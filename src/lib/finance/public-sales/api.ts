import { getCrmApiBaseUrl } from "@/lib/activity-timeline/auth";
import { crmErrorMessage, unwrapCrmData } from "@/lib/crm/request";
import {
  formatAUD,
  totalsFromLines,
  type FinanceLineItem,
} from "@/lib/finance/shared";

export type PublicSalesKind = "quotes" | "estimates" | "invoices";

export type PublicSalesPayIntent = {
  clientSecret?: string;
  paymentIntentId?: string;
  url?: string;
  status?: string;
};

export interface PublicSalesDocument {
  kind: PublicSalesKind;
  id: string;
  number: string;
  title: string;
  status: string;
  clientName: string;
  contactName?: string;
  notes?: string;
  validUntil?: string;
  issueDate?: string;
  dueDate?: string;
  lineItems: FinanceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  amountDue?: number;
  amountPaid?: number;
}

export function publicSalesPath(
  kind: PublicSalesKind,
  id: string,
  hash: string,
  suffix = "",
): string {
  return `/v1/public/sales/${kind}/${id}/${hash}${suffix}`;
}

export function appPublicSalesPath(
  kind: PublicSalesKind,
  id: string,
  hash: string,
): string {
  return `/public/sales/${kind}/${id}/${hash}`;
}

/** Map a CRM public-link URL onto the in-app viewer when possible. */
export function rewritePublicSalesUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return value;
  const match = value.match(
    /\/v1\/public\/sales\/(quotes|estimates|invoices)\/([^/]+)\/([^/?#]+)/i,
  );
  if (!match) return value;
  return appPublicSalesPath(
    match[1].toLowerCase() as PublicSalesKind,
    match[2],
    match[3],
  );
}

function crmBase(): string {
  return (
    getCrmApiBaseUrl() ||
    process.env.NEXT_PUBLIC_CRM_API_URL?.trim() ||
    "https://finconnex.payperless.app"
  ).replace(/\/$/, "");
}

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
      id: pickStr(row.id) || `line-${index}`,
      productId: pickStr(row.productId, row.itemId) || undefined,
      name: pickStr(row.name, row.title, row.description, "Item"),
      description: pickStr(row.description, row.notes) || undefined,
      quantity: toNum(row.quantity ?? row.qty) || 1,
      unitPrice: toNum(row.unitPrice ?? row.price ?? row.rate),
      taxRate: toNum(row.taxRate ?? row.taxPercent ?? row.tax),
    };
  });
}

export function normalizePublicSalesDocument(
  kind: PublicSalesKind,
  raw: Record<string, unknown>,
): PublicSalesDocument {
  const lineItems = mapLines(raw.lineItems ?? raw.items ?? raw.lines);
  const computed = totalsFromLines(lineItems);
  const total = toNum(raw.total ?? raw.grandTotal) || computed.total;
  const amountPaid = toNum(raw.amountPaid ?? raw.paid);
  const amountDue =
    toNum(raw.amountDue ?? raw.balance) || Math.max(0, total - amountPaid);

  return {
    kind,
    id: pickStr(raw.id, raw.uuid),
    number: pickStr(
      raw.number,
      raw.code,
      raw.quoteNumber,
      raw.quotationId,
      raw.estimateId,
      raw.invoiceId,
      raw.reference,
    ),
    title: pickStr(raw.title, raw.name, raw.subject, "Sales document"),
    status: pickStr(raw.status, raw.state, "Sent"),
    clientName: pickStr(
      raw.clientName,
      raw.customerName,
      raw.companyName,
      "Client",
    ),
    contactName: pickStr(raw.contactName, raw.recipientName) || undefined,
    notes: pickStr(raw.notes, raw.message, raw.terms) || undefined,
    validUntil: formatDate(raw.validUntil ?? raw.expiryDate) || undefined,
    issueDate: formatDate(raw.issueDate ?? raw.issuedAt) || undefined,
    dueDate: formatDate(raw.dueDate) || undefined,
    lineItems,
    subtotal: toNum(raw.subtotal) || computed.subtotal,
    tax: toNum(raw.tax ?? raw.taxTotal) || computed.tax,
    total,
    amountDue: kind === "invoices" ? amountDue : undefined,
    amountPaid: kind === "invoices" ? amountPaid : undefined,
  };
}

async function publicSalesRequest(
  kind: PublicSalesKind,
  id: string,
  hash: string,
  suffix = "",
  init?: RequestInit,
): Promise<unknown> {
  const res = await fetch(
    `${crmBase()}${publicSalesPath(kind, id, hash, suffix)}`,
    {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    },
  );
  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  if (!res.ok) {
    throw new Error(crmErrorMessage(json, `Request failed (${res.status})`));
  }
  return unwrapCrmData(json);
}

function asDocument(
  kind: PublicSalesKind,
  data: unknown,
): PublicSalesDocument | null {
  if (!data) return null;
  if (typeof data === "object" && !Array.isArray(data)) {
    return normalizePublicSalesDocument(kind, data as Record<string, unknown>);
  }
  return null;
}

export async function getPublicQuote(id: string, hash: string) {
  return asDocument("quotes", await publicSalesRequest("quotes", id, hash));
}

export async function getPublicEstimate(id: string, hash: string) {
  return asDocument(
    "estimates",
    await publicSalesRequest("estimates", id, hash),
  );
}

export async function getPublicInvoice(id: string, hash: string) {
  return asDocument(
    "invoices",
    await publicSalesRequest("invoices", id, hash),
  );
}

export async function acceptPublicQuote(id: string, hash: string) {
  return asDocument(
    "quotes",
    await publicSalesRequest("quotes", id, hash, "/accept", {
      method: "POST",
      body: "{}",
    }),
  );
}

export async function declinePublicQuote(id: string, hash: string) {
  return asDocument(
    "quotes",
    await publicSalesRequest("quotes", id, hash, "/decline", {
      method: "POST",
      body: "{}",
    }),
  );
}

export async function createPublicInvoicePayIntent(
  id: string,
  hash: string,
): Promise<PublicSalesPayIntent> {
  const data = await publicSalesRequest("invoices", id, hash, "/pay-intent", {
    method: "POST",
    body: "{}",
  });
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    return {
      clientSecret: pickStr(rec.clientSecret, rec.client_secret) || undefined,
      paymentIntentId: pickStr(rec.paymentIntentId, rec.id) || undefined,
      url: pickStr(rec.url, rec.checkoutUrl, rec.hostedUrl) || undefined,
      status: pickStr(rec.status) || undefined,
    };
  }
  return {};
}

export { formatAUD };
