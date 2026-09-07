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

export const FORECAST_ROWS: ForecastRow[] = [];

export const TERRITORIES: TerritoryRule[] = [];

export function formatAud(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}
