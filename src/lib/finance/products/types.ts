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

const STORE_KEY = "finance:products:v1";

export const financeProducts: FinanceProduct[] = [
  {
    id: "fp1",
    sku: "SVC-HOME",
    name: "Home loan packaging",
    type: "Service",
    status: "Active",
    description: "Full application packaging and lender submission",
    unitPrice: 2200,
    taxRate: 10,
    unit: "package",
    createdBy: "John Smith",
    createdAt: "01/06/2026",
  },
  {
    id: "fp2",
    sku: "SVC-REFIN",
    name: "Refinance review",
    type: "Service",
    status: "Active",
    description: "Rate comparison and refinance recommendation",
    unitPrice: 850,
    taxRate: 10,
    unit: "review",
    createdBy: "Tejas Gokhe",
    createdAt: "05/06/2026",
  },
  {
    id: "fp3",
    sku: "FEE-BROKER",
    name: "Brokerage fee",
    type: "Service",
    status: "Active",
    unitPrice: 1500,
    taxRate: 10,
    unit: "fee",
    createdBy: "Roshna Abraham",
    createdAt: "10/06/2026",
  },
  {
    id: "fp4",
    sku: "SVC-VAL",
    name: "Property valuation coordination",
    type: "Service",
    status: "Active",
    unitPrice: 450,
    taxRate: 10,
    unit: "job",
    createdBy: "Shiva Kadhka",
    createdAt: "12/06/2026",
  },
  {
    id: "fp5",
    sku: "PROD-KIT",
    name: "Client welcome kit",
    type: "Product",
    status: "Inactive",
    unitPrice: 75,
    taxRate: 10,
    unit: "kit",
    createdBy: "John Smith",
    createdAt: "15/06/2026",
  },
];

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
