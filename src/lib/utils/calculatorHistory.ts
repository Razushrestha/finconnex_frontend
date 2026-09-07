export type CalculationRecord = {
  id: number | string;
  type: string;
  date: string;
  inputs: Record<string, string | number>;
  summary: string;
  badge: string;
};

export const saveCalculation = (
  record: Omit<CalculationRecord, "id" | "date">,
) => {
  if (typeof window === "undefined") return;
  const existing = localStorage.getItem("calc_history");
  const history: CalculationRecord[] = existing ? JSON.parse(existing) : [];

  const newRecord: CalculationRecord = {
    ...record,
    id: Math.random().toString(36).substring(2, 9),
    date: new Date().toLocaleString(),
  };

  localStorage.setItem("calc_history", JSON.stringify([newRecord, ...history]));
};
