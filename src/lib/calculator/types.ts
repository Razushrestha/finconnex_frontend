/** SRS §17 Calculator: in-call number tools for reps */

export type CalculatorType =
  | "Commission"
  | "ROI"
  | "Discount"
  | "Tax"
  | "Currency"
  | "Loan"
  | "Custom";

export type CalcCurrency = "AUD" | "USD" | "GBP" | "EUR" | "NZD";

export interface CalcFieldDef {
  key: string;
  label: string;
  placeholder?: string;
  suffix?: string;
  /** hint under the field */
  hint?: string;
  kind?: "number" | "text" | "select";
  options?: readonly string[];
}

export interface CalcResultLine {
  label: string;
  value: number;
  format: "money" | "percent" | "number";
}

export interface CalcRunResult {
  primaryLabel: string;
  primaryValue: number;
  primaryFormat: "money" | "percent" | "number";
  lines: CalcResultLine[];
  formula: string;
}

export interface SavedCalculation {
  id: string;
  calcId: string;
  title: string;
  type: CalculatorType;
  currency: CalcCurrency;
  inputs: Record<string, string>;
  result: CalcRunResult;
  formula: string;
  savedBy: string;
  savedAt: string;
  sharedWith?: string;
}

export const CALCULATOR_TYPES: CalculatorType[] = [
  "Commission",
  "ROI",
  "Discount",
  "Tax",
  "Currency",
  "Loan",
  "Custom",
];

export const CALC_CURRENCIES: CalcCurrency[] = [
  "AUD",
  "USD",
  "GBP",
  "EUR",
  "NZD",
];

export const CALC_OWNERS = [
  "John Smith",
  "Tejas Gokhe",
  "Roshna Abraham",
  "Shiva Kadhka",
] as const;

export const CALC_SHARE_TARGETS = [
  "Client (email)",
  "Sales team",
  "Managers",
  "Copy link",
] as const;

export const CALCULATOR_TYPE_STYLE: Record<CalculatorType, string> = {
  Commission: "bg-violet-50 text-violet-700",
  ROI: "bg-emerald-50 text-emerald-700",
  Discount: "bg-amber-50 text-amber-800",
  Tax: "bg-sky-50 text-sky-700",
  Currency: "bg-indigo-50 text-indigo-700",
  Loan: "bg-rose-50 text-rose-700",
  Custom: "bg-slate-100 text-slate-600",
};

export const CALCULATOR_FIELDS: Record<CalculatorType, CalcFieldDef[]> = {
  Commission: [
    {
      key: "dealAmount",
      label: "Deal amount",
      placeholder: "500000",
      hint: "Loan or package value",
    },
    {
      key: "rate",
      label: "Commission rate",
      placeholder: "0.65",
      suffix: "%",
    },
  ],
  ROI: [
    { key: "cost", label: "Cost / investment", placeholder: "10000" },
    { key: "gain", label: "Final value / return", placeholder: "12500" },
  ],
  Discount: [
    { key: "listPrice", label: "List price", placeholder: "1200" },
    {
      key: "discountPct",
      label: "Discount",
      placeholder: "10",
      suffix: "%",
    },
  ],
  Tax: [
    { key: "amount", label: "Taxable amount", placeholder: "1000" },
    {
      key: "taxRate",
      label: "Tax rate",
      placeholder: "10",
      suffix: "%",
      hint: "e.g. GST 10%",
    },
  ],
  Currency: [
    { key: "amount", label: "Amount", placeholder: "1000" },
    {
      key: "toCurrency",
      label: "Convert to",
      kind: "select",
      options: ["AUD", "USD", "GBP", "EUR", "NZD"],
      placeholder: "USD",
    },
    {
      key: "fxRate",
      label: "Exchange rate",
      placeholder: "0.66",
      hint: "Auto-filled from the pair; override if the client quoted a different rate",
    },
  ],
  Loan: [
    { key: "principal", label: "Loan amount", placeholder: "500000" },
    {
      key: "annualRate",
      label: "Annual interest rate",
      placeholder: "6.2",
      suffix: "%",
    },
    {
      key: "termYears",
      label: "Term",
      placeholder: "30",
      suffix: "years",
    },
  ],
  Custom: [
    { key: "a", label: "Value A", placeholder: "100" },
    { key: "b", label: "Value B", placeholder: "20" },
    { key: "c", label: "Value C (optional)", placeholder: "1" },
    {
      key: "expression",
      label: "Formula",
      kind: "text",
      placeholder: "(a + b) * c",
      hint: "Use a, b, c with + − * / and parentheses. Example: a * b / 100",
    },
  ],
};

export const CALCULATOR_FORMULAS: Record<CalculatorType, string> = {
  Commission: "Commission = Deal amount × (Rate ÷ 100)",
  ROI: "ROI % = ((Gain − Cost) ÷ Cost) × 100",
  Discount: "Net = List × (1 − Discount% ÷ 100); Savings = List − Net",
  Tax: "Tax = Amount × (Rate ÷ 100); Total = Amount + Tax",
  Currency: "Converted = Amount × Exchange rate (from workspace currency → target)",
  Loan: "Monthly = P × r(1+r)^n ÷ ((1+r)^n − 1); r = annual÷12; n = years×12",
  Custom: "Result = evaluate(formula) using values a, b, c",
};

/** Mid-market style defaults vs 1 AUD. Override on the form when quoting live. */
export const FX_PER_AUD: Record<CalcCurrency, number> = {
  AUD: 1,
  USD: 0.66,
  GBP: 0.52,
  EUR: 0.61,
  NZD: 1.09,
};

export function suggestedFxRate(from: CalcCurrency, to: CalcCurrency): string {
  const rate = FX_PER_AUD[to] / FX_PER_AUD[from];
  return rate.toFixed(4);
}

const STORE_KEY = "calculator:history:v1";

export function formatCalcAt(d = new Date()) {
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function num(inputs: Record<string, string>, key: string): number {
  const raw = (inputs[key] ?? "").replace(/,/g, "").trim();
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

export function emptyInputs(type: CalculatorType): Record<string, string> {
  return Object.fromEntries(
    CALCULATOR_FIELDS[type].map((f) => {
      if (type === "Custom" && f.key === "expression") {
        return [f.key, "(a + b) * c"];
      }
      if (type === "Currency" && f.key === "toCurrency") return [f.key, "USD"];
      if (type === "Currency" && f.key === "fxRate") {
        return [f.key, suggestedFxRate("AUD", "USD")];
      }
      return [f.key, ""];
    }),
  );
}

/** Safe arithmetic for Custom: digits, a/b/c, + - * / ( ) and spaces only. */
export function evaluateCustomExpression(
  expression: string,
  vars: { a: number; b: number; c: number },
): { ok: true; value: number } | { ok: false; error: string } {
  const raw = expression.trim().toLowerCase();
  if (!raw) return { ok: false, error: "Enter a formula using a, b, and c" };
  if (!/^[0-9abc+\-*/().\s]+$/.test(raw)) {
    return { ok: false, error: "Formula can only use a, b, c and + − * / ( )" };
  }
  let replaced = raw.replace(/\b([abc])\b/g, (_, key: "a" | "b" | "c") => {
    const n = vars[key];
    return Number.isFinite(n) ? `(${n})` : "NaN";
  });
  if (/[a-z]/.test(replaced)) {
    return { ok: false, error: "Unknown name in formula — use only a, b, c" };
  }
  if (/NaN/.test(replaced)) {
    return { ok: false, error: "Enter numeric values for a, b, and c" };
  }
  try {
    const value = Function(`"use strict"; return (${replaced});`)() as unknown;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return { ok: false, error: "Formula did not produce a number" };
    }
    return { ok: true, value };
  } catch {
    return { ok: false, error: "Could not calculate that formula" };
  }
}

export function runCalculator(
  type: CalculatorType,
  inputs: Record<string, string>,
): { ok: true; result: CalcRunResult } | { ok: false; error: string } {
  const formula = CALCULATOR_FORMULAS[type];

  if (type === "Commission") {
    const deal = num(inputs, "dealAmount");
    const rate = num(inputs, "rate");
    if (![deal, rate].every(Number.isFinite) || deal < 0 || rate < 0) {
      return { ok: false, error: "Enter a valid deal amount and rate" };
    }
    const commission = deal * (rate / 100);
    return {
      ok: true,
      result: {
        primaryLabel: "Commission",
        primaryValue: commission,
        primaryFormat: "money",
        formula,
        lines: [
          { label: "Deal amount", value: deal, format: "money" },
          { label: "Rate", value: rate, format: "percent" },
          { label: "Commission", value: commission, format: "money" },
        ],
      },
    };
  }

  if (type === "ROI") {
    const cost = num(inputs, "cost");
    const gain = num(inputs, "gain");
    if (![cost, gain].every(Number.isFinite) || cost === 0) {
      return { ok: false, error: "Enter cost and gain (cost must not be 0)" };
    }
    const roi = ((gain - cost) / cost) * 100;
    const profit = gain - cost;
    return {
      ok: true,
      result: {
        primaryLabel: "ROI",
        primaryValue: roi,
        primaryFormat: "percent",
        formula,
        lines: [
          { label: "Cost", value: cost, format: "money" },
          { label: "Gain", value: gain, format: "money" },
          { label: "Profit", value: profit, format: "money" },
          { label: "ROI", value: roi, format: "percent" },
        ],
      },
    };
  }

  if (type === "Discount") {
    const list = num(inputs, "listPrice");
    const pct = num(inputs, "discountPct");
    if (![list, pct].every(Number.isFinite) || list < 0 || pct < 0) {
      return { ok: false, error: "Enter a valid list price and discount %" };
    }
    const net = list * (1 - pct / 100);
    const savings = list - net;
    return {
      ok: true,
      result: {
        primaryLabel: "Net price",
        primaryValue: net,
        primaryFormat: "money",
        formula,
        lines: [
          { label: "List price", value: list, format: "money" },
          { label: "Discount", value: pct, format: "percent" },
          { label: "Savings", value: savings, format: "money" },
          { label: "Net price", value: net, format: "money" },
        ],
      },
    };
  }

  if (type === "Tax") {
    const amount = num(inputs, "amount");
    const taxRate = num(inputs, "taxRate");
    if (![amount, taxRate].every(Number.isFinite) || amount < 0 || taxRate < 0) {
      return { ok: false, error: "Enter a valid amount and tax rate" };
    }
    const tax = amount * (taxRate / 100);
    const total = amount + tax;
    return {
      ok: true,
      result: {
        primaryLabel: "Total (inc. tax)",
        primaryValue: total,
        primaryFormat: "money",
        formula,
        lines: [
          { label: "Amount", value: amount, format: "money" },
          { label: "Tax rate", value: taxRate, format: "percent" },
          { label: "Tax", value: tax, format: "money" },
          { label: "Total", value: total, format: "money" },
        ],
      },
    };
  }

  if (type === "Currency") {
    const amount = num(inputs, "amount");
    const fx = num(inputs, "fxRate");
    if (![amount, fx].every(Number.isFinite) || fx <= 0) {
      return { ok: false, error: "Enter amount and a positive exchange rate" };
    }
    const converted = amount * fx;
    return {
      ok: true,
      result: {
        primaryLabel: "Converted amount",
        primaryValue: converted,
        primaryFormat: "money",
        formula,
        lines: [
          { label: "Amount", value: amount, format: "money" },
          { label: "FX rate", value: fx, format: "number" },
          { label: "Converted", value: converted, format: "money" },
        ],
      },
    };
  }

  if (type === "Loan") {
    const principal = num(inputs, "principal");
    const annualRate = num(inputs, "annualRate");
    const termYears = num(inputs, "termYears");
    if (
      ![principal, annualRate, termYears].every(Number.isFinite) ||
      principal <= 0 ||
      termYears <= 0 ||
      annualRate < 0
    ) {
      return {
        ok: false,
        error: "Enter principal, rate (≥0), and term in years",
      };
    }
    const n = termYears * 12;
    let monthly: number;
    let totalInterest: number;
    if (annualRate === 0) {
      monthly = principal / n;
      totalInterest = 0;
    } else {
      const r = annualRate / 100 / 12;
      monthly =
        (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      totalInterest = monthly * n - principal;
    }
    return {
      ok: true,
      result: {
        primaryLabel: "Monthly repayment",
        primaryValue: monthly,
        primaryFormat: "money",
        formula,
        lines: [
          { label: "Principal", value: principal, format: "money" },
          { label: "Annual rate", value: annualRate, format: "percent" },
          { label: "Term (months)", value: n, format: "number" },
          { label: "Monthly repayment", value: monthly, format: "money" },
          { label: "Total interest", value: totalInterest, format: "money" },
          {
            label: "Total repayable",
            value: monthly * n,
            format: "money",
          },
        ],
      },
    };
  }

  // Custom
  const a = num(inputs, "a");
  const b = num(inputs, "b");
  const cRaw = (inputs.c ?? "").trim();
  const c = cRaw ? num(inputs, "c") : 1;
  if (![a, b, c].every(Number.isFinite)) {
    return { ok: false, error: "Enter numeric values for A, B, and C" };
  }
  const expression = (inputs.expression ?? "").trim() || "(a + b) * c";
  const evaluated = evaluateCustomExpression(expression, { a, b, c });
  if (!evaluated.ok) return evaluated;
  return {
    ok: true,
    result: {
      primaryLabel: "Result",
      primaryValue: evaluated.value,
      primaryFormat: "number",
      formula: `${expression}  →  ${evaluated.value}`,
      lines: [
        { label: "A", value: a, format: "number" },
        { label: "B", value: b, format: "number" },
        { label: "C", value: c, format: "number" },
        { label: "Formula", value: evaluated.value, format: "number" },
      ],
    },
  };
}

export function formatCalcValue(
  value: number,
  format: "money" | "percent" | "number",
  currency: CalcCurrency,
) {
  if (format === "percent") {
    return `${value.toLocaleString("en-AU", {
      maximumFractionDigits: 2,
    })}%`;
  }
  if (format === "money") {
    return value.toLocaleString("en-AU", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    });
  }
  return value.toLocaleString("en-AU", { maximumFractionDigits: 4 });
}

function readStore(): SavedCalculation[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(STORE_KEY) ??
      window.sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as SavedCalculation[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: SavedCalculation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export const seedCalculations: SavedCalculation[] = [
  {
    id: "calc-seed-1",
    calcId: "CALC-5001",
    title: "Harbour commission estimate",
    type: "Commission",
    currency: "AUD",
    inputs: { dealAmount: "650000", rate: "0.65" },
    result: {
      primaryLabel: "Commission",
      primaryValue: 4225,
      primaryFormat: "money",
      formula: CALCULATOR_FORMULAS.Commission,
      lines: [
        { label: "Deal amount", value: 650000, format: "money" },
        { label: "Rate", value: 0.65, format: "percent" },
        { label: "Commission", value: 4225, format: "money" },
      ],
    },
    formula: CALCULATOR_FORMULAS.Commission,
    savedBy: "John Smith",
    savedAt: "18/07/2026 10:15",
    sharedWith: "Sales team",
  },
  (() => {
    const loanInputs = {
      principal: "500000",
      annualRate: "6.2",
      termYears: "30",
    };
    const loanRun = runCalculator("Loan", loanInputs);
    const loanResult: CalcRunResult =
      loanRun.ok
        ? loanRun.result
        : {
            primaryLabel: "Monthly repayment",
            primaryValue: 3060.15,
            primaryFormat: "money",
            formula: CALCULATOR_FORMULAS.Loan,
            lines: [],
          };
    return {
      id: "calc-seed-2",
      calcId: "CALC-5002",
      title: "Sample loan repayment",
      type: "Loan" as const,
      currency: "AUD" as const,
      inputs: loanInputs,
      result: loanResult,
      formula: CALCULATOR_FORMULAS.Loan,
      savedBy: "Roshna Abraham",
      savedAt: "20/07/2026 14:40",
    };
  })(),
];

export function listCalculations(): SavedCalculation[] {
  return readStore() ?? seedCalculations.map((c) => ({ ...c, inputs: { ...c.inputs } }));
}

export function upsertCalculation(c: SavedCalculation) {
  const list = listCalculations();
  const i = list.findIndex((x) => x.id === c.id);
  if (i >= 0) list[i] = c;
  else list.unshift(c);
  writeStore(list);
  return c;
}

export function deleteCalculation(id: string) {
  writeStore(listCalculations().filter((c) => c.id !== id));
}

export function nextCalcIds() {
  const list = listCalculations();
  const nums = list
    .map((c) => Number(c.calcId.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 5000) + 1;
  return { id: `calc-${Date.now()}`, calcId: `CALC-${n}` };
}

export function exportCalculationText(
  c: Pick<
    SavedCalculation,
    "title" | "type" | "currency" | "inputs" | "result" | "formula" | "calcId"
  >,
) {
  const lines = [
    `FinConnex Calculator: ${c.calcId ?? "draft"}`,
    `Title: ${c.title}`,
    `Type: ${c.type}`,
    `Currency: ${c.currency}`,
    `Formula: ${c.formula}`,
    "",
    "Inputs:",
    ...Object.entries(c.inputs).map(([k, v]) => `  ${k}: ${v}`),
    "",
    "Results:",
    ...c.result.lines.map(
      (l) =>
        `  ${l.label}: ${formatCalcValue(l.value, l.format, c.currency)}`,
    ),
    "",
    `Primary: ${c.result.primaryLabel} = ${formatCalcValue(
      c.result.primaryValue,
      c.result.primaryFormat,
      c.currency,
    )}`,
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(c.calcId ?? "calc").toLowerCase()}-result.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCalculationCsv(
  c: Pick<
    SavedCalculation,
    "title" | "type" | "currency" | "inputs" | "result" | "formula" | "calcId"
  >,
) {
  const rows: string[][] = [
    ["Field", "Value"],
    ["Id", c.calcId ?? "draft"],
    ["Title", c.title],
    ["Type", c.type],
    ["Currency", c.currency],
    ["Formula", c.formula],
    ...Object.entries(c.inputs).map(([k, v]) => [`Input ${k}`, v]),
    ...c.result.lines.map((l) => [
      l.label,
      formatCalcValue(l.value, l.format, c.currency),
    ]),
    [
      c.result.primaryLabel,
      formatCalcValue(
        c.result.primaryValue,
        c.result.primaryFormat,
        c.currency,
      ),
    ],
  ];
  const csv = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(c.calcId ?? "calc").toLowerCase()}-result.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatCalculationShare(
  c: Pick<
    SavedCalculation,
    "title" | "type" | "currency" | "inputs" | "result" | "formula" | "calcId"
  >,
) {
  const primary = formatCalcValue(
    c.result.primaryValue,
    c.result.primaryFormat,
    c.currency,
  );
  const extras = c.result.lines
    .map((l) => `${l.label}: ${formatCalcValue(l.value, l.format, c.currency)}`)
    .join("\n");
  return [
    `${c.title} (${c.calcId ?? "draft"})`,
    `Type: ${c.type} · ${c.currency}`,
    `Result: ${c.result.primaryLabel} = ${primary}`,
    `Formula: ${c.formula}`,
    extras,
  ]
    .filter(Boolean)
    .join("\n");
}
