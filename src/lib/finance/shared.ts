/** Shared finance helpers: §13 / §20 */

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
