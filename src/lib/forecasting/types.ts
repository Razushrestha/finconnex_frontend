/** SRS §6.5 Sales Forecasting & Territory Management */

export const FORECAST_PERIODS = ["Month", "Quarter", "Year"] as const;
export type ForecastPeriod = (typeof FORECAST_PERIODS)[number];

export const FORECAST_CATEGORIES = [
  "Pipeline",
  "Best Case",
  "Committed",
  "Closed",
] as const;
export type ForecastCategory = (typeof FORECAST_CATEGORIES)[number];

export interface ForecastRow {
  id: string;
  owner: string;
  territory: string;
  pipeline: number;
  bestCase: number;
  committed: number;
  closed: number;
  quota: number;
}

export interface TerritoryRule {
  id: string;
  name: string;
  owner: string;
  rules: string;
  accountCount: number;
}

export const FORECAST_ROWS: ForecastRow[] = [
  {
    id: "f1",
    owner: "John Smith",
    territory: "NSW Metro",
    pipeline: 1240000,
    bestCase: 890000,
    committed: 520000,
    closed: 570000,
    quota: 800000,
  },
  {
    id: "f2",
    owner: "Shiva Kadhka",
    territory: "VIC East",
    pipeline: 980000,
    bestCase: 710000,
    committed: 410000,
    closed: 420000,
    quota: 650000,
  },
  {
    id: "f3",
    owner: "Tejas Gokhe",
    territory: "QLD Coast",
    pipeline: 860000,
    bestCase: 640000,
    committed: 380000,
    closed: 310000,
    quota: 600000,
  },
  {
    id: "f4",
    owner: "Roshna Abraham",
    territory: "WA / SA",
    pipeline: 540000,
    bestCase: 390000,
    committed: 220000,
    closed: 180000,
    quota: 450000,
  },
];

export const TERRITORIES: TerritoryRule[] = [
  {
    id: "t1",
    name: "NSW Metro",
    owner: "John Smith",
    rules: "Region: NSW · Postcode: 2000–2299 · Account Size: Any",
    accountCount: 48,
  },
  {
    id: "t2",
    name: "VIC East",
    owner: "Shiva Kadhka",
    rules: "Region: VIC · Industry: Finance, Tech · Account Size: Mid+",
    accountCount: 36,
  },
  {
    id: "t3",
    name: "QLD Coast",
    owner: "Tejas Gokhe",
    rules: "Region: QLD · Postcode: 4000–4550",
    accountCount: 29,
  },
  {
    id: "t4",
    name: "WA / SA",
    owner: "Roshna Abraham",
    rules: "Region: WA, SA · Industry: Any",
    accountCount: 22,
  },
];

export function formatAud(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}
