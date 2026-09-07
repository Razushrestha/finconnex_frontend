/** SRS §13.6 / §20.5 Items & Services */

export type ProductType = "Product" | "Service";
export type ProductStatus = "Active" | "Inactive";

export interface FinanceProduct {
  id: string;
  sku: string;
  name: string;
  type: ProductType;
  status: ProductStatus;
  description?: string;
  unitPrice: number;
  taxRate: number;
  unit: string;
  createdBy: string;
  createdAt: string;
}

export const PRODUCT_TYPES: ProductType[] = ["Product", "Service"];
export const PRODUCT_STATUSES: ProductStatus[] = ["Active", "Inactive"];

const STORE_KEY = "finance:products:v2";

export const financeProducts: FinanceProduct[] = [];

function readStore(): FinanceProduct[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as FinanceProduct[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: FinanceProduct[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listProducts(): FinanceProduct[] {
  return readStore() ?? financeProducts.map((p) => ({ ...p }));
}

export function listActiveProducts(): FinanceProduct[] {
  return listProducts().filter((p) => p.status === "Active");
}

export function upsertProduct(p: FinanceProduct) {
  const list = listProducts();
  const i = list.findIndex((x) => x.id === p.id);
  if (i >= 0) list[i] = p;
  else list.unshift(p);
  writeStore(list);
  return p;
}

export function writeAllProducts(list: FinanceProduct[]) {
  writeStore(list);
}

/** Replace the session store with live CRM rows (empty list is a valid live result). */
export function replaceCrmProducts(remote: FinanceProduct[]) {
  writeStore(remote.map((p) => ({ ...p })));
}

export function deleteProduct(id: string) {
  writeStore(listProducts().filter((p) => p.id !== id));
}

export function getProductById(id: string) {
  return listProducts().find((p) => p.id === id);
}

export function nextProductIds() {
  const list = listProducts();
  const nums = list
    .map((p) => Number(p.sku.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n) && n > 0);
  const n = (nums.length ? Math.max(...nums) : 100) + 1;
  return { id: `fp-${Date.now()}`, sku: `SKU-${n}` };
}
