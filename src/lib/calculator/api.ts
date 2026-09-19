import {
  ensureCrmAccess,
  ensureCrmSession,
  isBoundCrmSession,
  isUuid,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
import {
  CALCULATOR_TYPES,
  formatCalcAt,
  upsertCalculation,
  type CalcCurrency,
  type CalcRunResult,
  type CalculatorType,
  type SavedCalculation,
} from "@/lib/calculator/types";

export type CrmCalculationQuery = {
  page?: number;
  limit?: number;
  type?: CalculatorType;
};

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
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

export function calculationsPath(suffix = ""): string {
  return `/v1/calculations${suffix}`;
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
    for (const key of ["items", "calculations", "records", "rows", "result"]) {
      if (Array.isArray(rec[key])) return extractRecords(rec[key]);
    }
    if (rec.data != null && rec.data !== data) return extractRecords(rec.data);
  }
  return [];
}

const CALCULATOR_KIND: Record<CalculatorType, string> = {
  Commission: "COMMISSION",
  ROI: "ROI",
  Discount: "DISCOUNT",
  Tax: "TAX",
  Currency: "CURRENCY",
  Loan: "LOAN",
  Custom: "CUSTOM",
};

export function apiCalculatorKind(type: CalculatorType): string {
  return CALCULATOR_KIND[type] ?? "CUSTOM";
}

export function mapCalculatorType(raw: string): CalculatorType {
  const value = raw.toLowerCase().replace(/[_-]/g, " ").trim();
  const compact = value.replace(/\s+/g, "");
  if (compact.includes("loan") || compact.includes("repay")) return "Loan";
  if (compact.includes("borrow") || compact.includes("capacity")) {
    return "Custom";
  }
  if (compact.includes("stamp") || compact.includes("duty")) return "Tax";
  const match = CALCULATOR_TYPES.find((t) => t.toLowerCase() === value);
  return match ?? "Custom";
}

function asInputs(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([key, value]) => [
      key,
      value == null ? "" : String(value),
    ]),
  );
}

function asResult(raw: unknown): CalcRunResult {
  const rec =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const linesRaw = Array.isArray(rec.lines) ? rec.lines : [];
  const formatOf = (value: unknown): CalcRunResult["primaryFormat"] => {
    if (value === "money" || value === "percent" || value === "number") {
      return value;
    }
    return "number";
  };
  return {
    primaryLabel: pickStr(rec.primaryLabel, "Result") || "Result",
    primaryValue: Number(rec.primaryValue) || 0,
    primaryFormat: formatOf(rec.primaryFormat),
    formula: pickStr(rec.formula),
    lines: linesRaw
      .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
      .map((row) => ({
        label: pickStr(row.label, "Line"),
        value: Number(row.value) || 0,
        format: formatOf(row.format),
      })),
  };
}

export function normalizeCalculation(
  raw: Record<string, unknown>,
  index: number,
): SavedCalculation {
  const result = asResult(raw.result);
  const formula = pickStr(raw.formula, result.formula);
  return {
    id: pickStr(raw.id, raw.uuid) || `crm-calc-${index}`,
    calcId: pickStr(raw.calcId, raw.calc_id, `CALC-${index + 1}`),
    title: pickStr(raw.title, "Calculation"),
    type: mapCalculatorType(pickStr(raw.type, "CUSTOM")),
    currency: (pickStr(raw.currency, "AUD") as CalcCurrency) || "AUD",
    inputs: asInputs(raw.inputs),
    result: { ...result, formula: result.formula || formula },
    formula,
    savedBy: pickStr(raw.createdByName, raw.savedBy, raw.createdById, "—"),
    savedAt: pickStr(raw.savedAt)
      ? pickStr(raw.savedAt)
      : formatCalcAt(
          raw.createdAt ? new Date(String(raw.createdAt)) : new Date(),
        ),
    sharedWith: pickStr(raw.sharedWith) || undefined,
  };
}

export function normalizeCalculations(data: unknown): SavedCalculation[] {
  return extractRecords(data).map((row, index) =>
    normalizeCalculation(row, index),
  );
}

async function calculationsRequest(
  suffix: string,
  init?: RequestInit,
): Promise<unknown> {
  if (!isBoundCrmSession()) {
    return crmBffFetch(calculationsPath(suffix), init);
  }
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage calculations");
  return crmFetch(auth, calculationsPath(suffix), init);
}

function asCalculation(data: unknown): SavedCalculation | null {
  const items = normalizeCalculations(data);
  if (items[0]) return items[0];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return normalizeCalculation(data as Record<string, unknown>, 0);
  }
  return null;
}

export async function listCrmCalculations(
  query: CrmCalculationQuery = {},
): Promise<SavedCalculation[]> {
  const limit = Math.min(100, Math.max(1, query.limit ?? 100));
  const startPage = query.page != null ? Math.max(1, query.page) : 1;
  const maxPages = query.page != null ? 1 : 20;
  const type =
    query.type && CALCULATOR_KIND[query.type]
      ? apiCalculatorKind(query.type)
      : undefined;
  const all: SavedCalculation[] = [];
  for (let i = 0; i < maxPages; i += 1) {
    const batch = normalizeCalculations(
      await calculationsRequest(
        toQuery({
          page: startPage + i,
          limit,
          type,
        }),
      ),
    );
    all.push(...batch);
    if (batch.length < limit) break;
  }
  return all;
}

export async function getCrmCalculation(
  id: string,
): Promise<SavedCalculation | null> {
  if (!isUuid(id)) return null;
  return asCalculation(await calculationsRequest(`/${id}`));
}

export async function createCrmCalculation(
  body: Record<string, unknown>,
): Promise<SavedCalculation | null> {
  return asCalculation(
    await calculationsRequest("", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export async function deleteCrmCalculation(id: string): Promise<void> {
  if (!isUuid(id)) return;
  await calculationsRequest(`/${id}`, { method: "DELETE" });
}

export async function tryCrmCalculation<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

export function persistRemoteCalculation(row: SavedCalculation | null) {
  if (row) upsertCalculation(row);
  return row;
}

export function toCreateCalculationBody(input: {
  title: string;
  type: CalculatorType;
  currency: CalcCurrency;
  inputs: Record<string, string>;
  result: CalcRunResult;
  formula: string;
  sharedWith?: string;
}): Record<string, unknown> {
  const formula = (input.formula || input.result.formula || "Calculation").trim().slice(0, 2000);
  const title = input.title.trim().slice(0, 255) || `${input.type} calculation`;
  const inputs = Object.fromEntries(
    Object.entries(input.inputs ?? {}).map(([key, value]) => [
      key,
      value == null ? "" : String(value),
    ]),
  );
  const body: Record<string, unknown> = {
    title,
    type: apiCalculatorKind(input.type),
    currency: input.currency,
    inputs,
    result: {
      primaryLabel: input.result.primaryLabel,
      primaryValue: Number(input.result.primaryValue) || 0,
      primaryFormat: input.result.primaryFormat,
      formula: input.result.formula || formula,
      lines: (input.result.lines ?? []).map((line) => ({
        label: line.label,
        value: Number(line.value) || 0,
        format: line.format,
      })),
    },
    formula,
  };
  if (input.sharedWith?.trim()) body.sharedWith = input.sharedWith.trim().slice(0, 120);
  return body;
}

export function isCrmCalculationId(id: string): boolean {
  return isUuid(id);
}
