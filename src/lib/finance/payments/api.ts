import {
  ensureCrmAccess,
  ensureCrmSession,
  isUuid,
} from "@/lib/activity-timeline/auth";
import { crmErrorMessage, crmFetch, unwrapCrmData } from "@/lib/crm/request";
import { formatFinanceAt, formatFinanceDate } from "@/lib/finance/shared";
import {
  type Payment,
  type PaymentMethod,
  type PaymentStatus,
  upsertPayment,
} from "@/lib/finance/payments/types";

export type CrmPaymentQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  invoiceId?: string;
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

export function paymentsPath(suffix = ""): string {
  return `/v1/payments${suffix}`;
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
    for (const key of ["items", "payments", "records", "rows", "result"]) {
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

export function mapPaymentMethod(raw: string): PaymentMethod {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("bank") || value.includes("transfer") || value.includes("eft")) {
    return "Bank transfer";
  }
  if (value.includes("card") || value.includes("credit") || value.includes("debit")) {
    return "Card";
  }
  if (value.includes("paypal")) return "PayPal";
  if (value.includes("stripe")) return "Stripe";
  if (value.includes("cash")) return "Cash";
  return "Other";
}

export function apiPaymentMethod(method: PaymentMethod): string {
  switch (method) {
    case "Bank transfer":
      return "BANK_TRANSFER";
    case "Card":
      return "CARD";
    case "PayPal":
      return "PAYPAL";
    case "Stripe":
      return "STRIPE";
    case "Cash":
      return "CASH";
    default:
      return "OTHER";
  }
}

export function mapPaymentStatus(raw: string): PaymentStatus {
  const value = raw.toLowerCase().replace(/[_-]/g, " ");
  if (value.includes("refund")) return "Refunded";
  if (value.includes("fail") || value.includes("decline") || value.includes("reject")) {
    return "Failed";
  }
  if (value.includes("complete") || value.includes("success") || value.includes("paid")) {
    return "Completed";
  }
  return "Pending";
}

export function apiPaymentStatus(status: PaymentStatus): string {
  switch (status) {
    case "Completed":
      return "COMPLETED";
    case "Failed":
      return "FAILED";
    case "Refunded":
      return "REFUNDED";
    default:
      return "PENDING";
  }
}

function formatDate(raw: unknown): string {
  const value = pickStr(raw);
  if (!value) return formatFinanceDate();
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value.trim())) return value.trim();
    return value;
  }
  const d = new Date(parsed);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function normalizePayment(
  raw: Record<string, unknown>,
  index: number,
): Payment {
  const id = pickStr(raw.id, raw.paymentId, raw.uuid) || `crm-pay-${index}`;
  const inv =
    raw.invoice && typeof raw.invoice === "object"
      ? (raw.invoice as Record<string, unknown>)
      : null;
  const client =
    raw.customer && typeof raw.customer === "object"
      ? (raw.customer as Record<string, unknown>)
      : raw.client && typeof raw.client === "object"
        ? (raw.client as Record<string, unknown>)
        : null;

  const invoiceId = pickStr(
    raw.invoiceId,
    inv && pickStr(inv.id, inv.invoiceId),
  );
  const invoiceRef = pickStr(
    raw.invoiceRef,
    raw.invoiceNumber,
    inv && pickStr(inv.invoiceNumber, inv.code, inv.number),
    invoiceId,
  );
  const clientName = pickStr(
    raw.clientName,
    raw.customerName,
    client && pickStr(client.name, client.companyName, client.displayName),
    inv && pickStr(inv.clientName, inv.customerName),
    "Client",
  );

  const amount = toNum(raw.amount ?? raw.total ?? raw.value);
  const method = mapPaymentMethod(
    pickStr(raw.paymentMethod, raw.method, raw.type, "Bank transfer"),
  );
  const status = mapPaymentStatus(
    pickStr(raw.status, raw.state, "Completed"),
  );
  const reference = pickStr(
    raw.reference,
    raw.ref,
    raw.transactionId,
    raw.receiptNumber,
  ) || undefined;
  const notes = pickStr(raw.notes, raw.note, raw.description, raw.memo) || undefined;
  const receivedAt = formatDate(
    raw.paymentDate ?? raw.receivedAt ?? raw.paidAt ?? raw.createdAt,
  );
  const recordedBy = pickStr(
    raw.recordedBy,
    raw.createdByName,
    raw.userName,
    raw.actor,
    "John Smith",
  );
  const createdAt = formatDate(raw.createdAt ?? raw.paymentDate);

  const rawAudit = Array.isArray(raw.audit)
    ? raw.audit
    : Array.isArray(raw.history)
      ? raw.history
      : [];
  const audit = rawAudit.map((a: unknown, i: number) => {
    const rec = a && typeof a === "object" ? (a as Record<string, unknown>) : {};
    return {
      id: pickStr(rec.id) || `a-${i}`,
      at: formatDate(rec.at ?? rec.timestamp ?? rec.createdAt),
      action: pickStr(rec.action, rec.event, "Updated"),
      actor: pickStr(rec.actor, rec.userName, rec.user, recordedBy),
    };
  });

  if (audit.length === 0) {
    audit.push({
      id: `a-${Date.now()}`,
      at: formatFinanceAt(),
      action: "Recorded",
      actor: recordedBy,
    });
  }

  return {
    id,
    paymentId: pickStr(
      raw.paymentNumber,
      raw.code,
      raw.paymentId,
      raw.number,
      id,
    ),
    invoiceId,
    invoiceRef,
    clientName,
    amount,
    method,
    status,
    reference,
    notes,
    receivedAt,
    recordedBy,
    createdAt,
    audit,
  };
}

export function normalizePayments(data: unknown): Payment[] {
  return extractRecords(data).map((row, index) =>
    normalizePayment(row, index),
  );
}

export function toCreatePaymentBody(input: {
  invoiceId: string;
  amount: number;
  method?: PaymentMethod;
  status?: PaymentStatus;
  reference?: string;
  notes?: string;
  paymentDate?: string;
  recordedBy?: string;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    invoiceId: input.invoiceId,
    amount: input.amount,
  };
  if (input.method) body.paymentMethod = apiPaymentMethod(input.method);
  if (input.status) body.status = apiPaymentStatus(input.status);
  if (input.reference?.trim()) body.reference = input.reference.trim();
  if (input.notes?.trim()) body.notes = input.notes.trim();
  if (input.paymentDate?.trim()) {
    body.paymentDate = toIsoDate(input.paymentDate);
  }
  if (input.recordedBy?.trim()) body.recordedBy = input.recordedBy.trim();
  return body;
}

export function toUpdatePaymentBody(
  patch: Partial<Payment>,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (typeof patch.amount === "number") body.amount = patch.amount;
  if (patch.method) body.paymentMethod = apiPaymentMethod(patch.method);
  if (patch.status) body.status = apiPaymentStatus(patch.status);
  if (patch.reference !== undefined) body.reference = patch.reference?.trim() || "";
  if (patch.notes !== undefined) body.notes = patch.notes?.trim() || "";
  if (patch.receivedAt?.trim()) {
    body.paymentDate = toIsoDate(patch.receivedAt);
  }
  return body;
}

async function paymentsRequest(
  suffix: string,
  init?: RequestInit,
): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage payments");
  return crmFetch(auth, paymentsPath(suffix), init);
}

function asPayment(data: unknown): Payment | null {
  const items = normalizePayments(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizePayment(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function listCrmPayments(
  query: CrmPaymentQuery = {},
): Promise<Payment[]> {
  return normalizePayments(
    await paymentsRequest(
      toQuery({
        page: query.page,
        limit: query.limit ?? 100,
        search: query.search,
        status: query.status,
        invoiceId: query.invoiceId,
      }),
    ),
  );
}

export async function getCrmPayment(id: string): Promise<Payment | null> {
  return asPayment(await paymentsRequest(`/${id}`));
}

export async function createCrmPayment(
  body: Record<string, unknown>,
): Promise<Payment | null> {
  return asPayment(
    await paymentsRequest("", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

export async function updateCrmPayment(
  id: string,
  patch: Record<string, unknown>,
): Promise<Payment | null> {
  return asPayment(
    await paymentsRequest(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  );
}

export async function refundCrmPayment(id: string): Promise<void> {
  await paymentsRequest(`/${id}`, { method: "DELETE" });
}

export async function deleteCrmPayment(id: string): Promise<void> {
  await paymentsRequest(`/${id}`, { method: "DELETE" });
}

export async function tryCrmPayment<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemotePayment(row: Payment | null): Payment | null {
  if (row) upsertPayment(row);
  return row;
}

export function isCrmPaymentId(id: string): boolean {
  return isUuid(id);
}
