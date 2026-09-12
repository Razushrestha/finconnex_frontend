import {
  createCrmCalculation,
  deleteCrmCalculation,
  isCrmCalculationId,
  listCrmCalculations,
  persistRemoteCalculation,
  toCreateCalculationBody,
  tryCrmCalculation,
} from "@/lib/calculator/api";
import {
  formatCalcAt,
  nextCalcIds,
  upsertCalculation,
  type CalcCurrency,
  type CalcRunResult,
  type CalculatorType,
  type SavedCalculation,
} from "@/lib/calculator/types";

export type CalculationRecord = {
  id: string;
  type: string;
  date: string;
  inputs: Record<string, string | number>;
  summary: string;
  badge: string;
  source?: "api" | "local";
};

const LOCAL_KEY = "calc_history";

function readLocal(): CalculationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const existing = localStorage.getItem(LOCAL_KEY);
    const rows: CalculationRecord[] = existing ? JSON.parse(existing) : [];
    return rows.map((row) => ({ ...row, id: String(row.id), source: "local" }));
  } catch {
    return [];
  }
}

function writeLocal(rows: CalculationRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
}

export const saveCalculation = (
  record: Omit<CalculationRecord, "id" | "date">,
) => {
  if (typeof window === "undefined") return;
  const newRecord: CalculationRecord = {
    ...record,
    id: Math.random().toString(36).substring(2, 9),
    date: new Date().toLocaleString(),
    source: "local",
  };
  writeLocal([newRecord, ...readLocal()]);
};

export function savedToHistoryRecord(row: SavedCalculation): CalculationRecord {
  return {
    id: row.id,
    type: row.inputs._tool || row.type,
    date: row.savedAt || formatCalcAt(),
    inputs: Object.fromEntries(
      Object.entries(row.inputs).filter(([key]) => !key.startsWith("_")),
    ),
    summary: `${row.result.primaryLabel}: ${row.result.primaryValue.toLocaleString("en-AU")}`,
    badge: row.title,
    source: isCrmCalculationId(row.id) ? "api" : "local",
  };
}

export async function persistCalculatorResult(input: {
  title: string;
  type: CalculatorType;
  currency: CalcCurrency;
  inputs: Record<string, string>;
  result: CalcRunResult;
  formula: string;
  summary: string;
  badge: string;
  displayType: string;
  sharedWith?: string;
  savedBy?: string;
}): Promise<{ record: CalculationRecord; source: "api" | "local" }> {
  const remote = await tryCrmCalculation(() =>
    createCrmCalculation(toCreateCalculationBody(input)),
  );
  if (remote) {
    persistRemoteCalculation(remote);
    return { record: savedToHistoryRecord(remote), source: "api" };
  }

  const ids = nextCalcIds();
  const saved = upsertCalculation({
    id: ids.id,
    calcId: ids.calcId,
    title: input.title,
    type: input.type,
    currency: input.currency,
    inputs: input.inputs,
    result: input.result,
    formula: input.formula,
    savedBy: input.savedBy?.trim() || "—",
    savedAt: formatCalcAt(),
    sharedWith: input.sharedWith,
  });
  const record: CalculationRecord = {
    id: saved.id,
    type: input.displayType,
    date: saved.savedAt,
    inputs: Object.fromEntries(
      Object.entries(input.inputs).filter(([key]) => !key.startsWith("_")),
    ),
    summary: input.summary,
    badge: input.badge,
    source: "local",
  };
  writeLocal([record, ...readLocal().filter((row) => row.id !== record.id)]);
  return { record, source: "local" };
}

export async function loadCalculatorHistory(): Promise<{
  records: CalculationRecord[];
  source: "api" | "local";
}> {
  const remote = await tryCrmCalculation(() => listCrmCalculations({ limit: 100 }));
  if (remote) {
    return { records: remote.map(savedToHistoryRecord), source: "api" };
  }
  return { records: readLocal(), source: "local" };
}

export async function removeCalculatorRecord(id: string): Promise<void> {
  writeLocal(readLocal().filter((row) => row.id !== id));
  if (isCrmCalculationId(id)) {
    await tryCrmCalculation(() => deleteCrmCalculation(id));
  }
}

export async function clearCalculatorHistory(
  ids: string[],
): Promise<void> {
  writeLocal([]);
  await Promise.all(
    ids.filter(isCrmCalculationId).map((id) =>
      tryCrmCalculation(() => deleteCrmCalculation(id)),
    ),
  );
}
