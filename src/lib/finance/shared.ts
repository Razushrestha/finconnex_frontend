/** Shared finance helpers: §13 / §20 */

import { partyName } from "@/lib/activities/party";

export interface FinanceLineItem {
  id: string;
  productId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // percent, e.g. 10
}

export interface FinanceAuditEvent {
  id: string;
  at: string;
  action: string;
  actor: string;
}

export const FINANCE_OWNERS: readonly string[] = [];

export const FINANCE_CLIENTS: { id: string; name: string; contact: string; email: string }[] = [];

export const FINANCE_DEALS: string[] = [];

export function lineAmount(item: FinanceLineItem) {
  const base = item.quantity * item.unitPrice;
  return base + (base * item.taxRate) / 100;
}

export function lineSubtotal(item: FinanceLineItem) {
  return item.quantity * item.unitPrice;
}

export function lineTax(item: FinanceLineItem) {
  return (item.quantity * item.unitPrice * item.taxRate) / 100;
}

export function totalsFromLines(items: FinanceLineItem[]) {
  const subtotal = items.reduce((s, i) => s + lineSubtotal(i), 0);
  const tax = items.reduce((s, i) => s + lineTax(i), 0);
  return { subtotal, tax, total: subtotal + tax };
}

export function formatAUD(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(n);
}

export function formatFinanceAt(d = new Date()) {
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFinanceDate(d = new Date()) {
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Value for `<input type="date">`. */
export function isoFinanceDate(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayFinanceIso() {
  return isoFinanceDate(new Date());
}

/** Calendar date `yyyy-mm-dd` that is today or later. */
export function isFinanceDateOnOrAfterToday(value: string) {
  const iso = value.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && iso >= todayFinanceIso();
}

const FINANCE_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function financeUuid(value?: string) {
  const trimmed = value?.trim() ?? "";
  return FINANCE_UUID.test(trimmed) ? trimmed : undefined;
}

export function financeDecimal(value: number) {
  const amount = Number.isFinite(value) ? value : 0;
  return amount.toFixed(2);
}

export function financeNotes(...parts: Array<string | undefined>) {
  const text = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join("\n\n");
  return text || undefined;
}

/** The create form stores the title as the first paragraph of `notes`. */
export function splitFinanceNotes(raw: string): { title: string; notes?: string } {
  const text = raw.trim();
  if (!text) return { title: "" };
  const [head, ...rest] = text.split(/\n\n+/);
  const title = head.trim();
  const notes = rest.join("\n\n").trim();
  return { title, notes: notes || undefined };
}

function textOf(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

/** Title and notes, including the title the create form folds into `notes`. */
export function financeDocumentCopy(
  raw: Record<string, unknown>,
  fallback: string,
): { title: string; notes?: string } {
  const explicit = textOf(raw.title) || textOf(raw.subject) || textOf(raw.reason);
  const stored = textOf(raw.notes) || textOf(raw.description);
  const split = splitFinanceNotes(stored);
  if (explicit) return { title: explicit, notes: stored || undefined };
  return { title: split.title || fallback, notes: split.notes };
}

export function financeClientName(raw: Record<string, unknown>): string {
  return (
    partyName(raw.company) ||
    partyName(raw.contact) ||
    partyName(raw.client) ||
    textOf(raw.clientName) ||
    textOf(raw.customerName)
  );
}

export function financeContactName(raw: Record<string, unknown>): string {
  return partyName(raw.contact) || partyName(raw.client) || textOf(raw.contactName);
}

export function financeDealName(raw: Record<string, unknown>): string {
  return partyName(raw.deal) || textOf(raw.dealName) || textOf(raw.relatedTo);
}

export function financeOwnerName(raw: Record<string, unknown>): string {
  return (
    textOf(raw.ownerName) ||
    textOf(raw.createdByName) ||
    (typeof raw.createdBy === "string" ? textOf(raw.createdBy) : partyName(raw.createdBy)) ||
    (typeof raw.owner === "string" ? textOf(raw.owner) : partyName(raw.owner))
  );
}

export function parseFinanceWhen(value?: string | null): Date | null {
  if (!value) return null;
  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime()) && /[a-z]/i.test(value) === false && value.includes("-")) {
    return iso;
  }
  const au = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (au) return new Date(Number(au[3]), Number(au[2]) - 1, Number(au[1]));
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** True when any of the document dates falls in the list window. `all` keeps every row. */
export function financeInWindow(
  filter: string,
  ...values: Array<string | undefined>
): boolean {
  const days =
    filter === "7d" ? 7 : filter === "30d" ? 30 : filter === "90d" ? 90 : null;
  if (!days) return true;
  const cutoff = Date.now() - days * 86_400_000;
  const stamps = values
    .map((value) => parseFinanceWhen(value))
    .filter((date): date is Date => date != null);
  if (!stamps.length) return true;
  return stamps.some((date) => date.getTime() >= cutoff);
}

export function financeMatchesQuery(
  query: string,
  parts: Array<string | number | undefined | null>,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return parts.some((part) => String(part ?? "").toLowerCase().includes(q));
}

export function mapFinanceLine(
  row: Record<string, unknown>,
  index: number,
  idPrefix: string,
): FinanceLineItem {
  const product =
    row.product && typeof row.product === "object"
      ? (row.product as Record<string, unknown>)
      : null;
  const text = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : "";
  const num = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return 0;
  };
  const name =
    text(row.name) ||
    text(product?.name) ||
    text(row.description) ||
    text(row.title) ||
    "Line";
  return {
    id: text(row.id) || `${idPrefix}-${index}`,
    productId: text(row.productId) || text(product?.id) || undefined,
    name,
    description: text(row.description) || undefined,
    quantity: num(row.quantity) || 1,
    unitPrice: num(row.unitPrice ?? row.amount ?? row.price),
    taxRate: num(row.taxRate ?? row.tax),
  };
}

/** Line items in the shape `Create*Dto` accepts (decimal strings, no extras). */
export function financeLineItems(lines: FinanceLineItem[]) {
  return lines.map((line, index) => {
    const productId = financeUuid(line.productId);
    return {
      description: line.description?.trim() || line.name.trim() || "Line",
      quantity: financeDecimal(line.quantity),
      unitPrice: financeDecimal(line.unitPrice),
      taxRate: financeDecimal(line.taxRate),
      ...(productId ? { productId } : {}),
      sortOrder: index,
    };
  });
}

export function newLineItem(
  partial?: Partial<FinanceLineItem>,
): FinanceLineItem {
  return {
    id: `li-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: "",
    quantity: 1,
    unitPrice: 0,
    taxRate: 10,
    ...partial,
  };
}
