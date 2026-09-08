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
