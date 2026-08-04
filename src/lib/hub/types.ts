export type TimeRange = "today" | "week" | "6m" | "year" | "custom";
export type ChartType = "bar" | "line";

export interface FinancialDataPoint {
  label: string;
  revenue: number;
  expenses: number;
}

export const mockData: Record<TimeRange, FinancialDataPoint[]> = {
  today: [
    { label: "9 AM", revenue: 1200, expenses: 400 },
    { label: "12 PM", revenue: 3400, expenses: 1500 },
    { label: "3 PM", revenue: 2200, expenses: 1100 },
    { label: "6 PM", revenue: 4100, expenses: 2000 },
  ],
  week: [
    { label: "Mon", revenue: 4000, expenses: 2400 },
    { label: "Tue", revenue: 3000, expenses: 1398 },
    { label: "Wed", revenue: 2000, expenses: 9800 },
    { label: "Thu", revenue: 2780, expenses: 3908 },
    { label: "Fri", revenue: 1890, expenses: 4800 },
    { label: "Sat", revenue: 2390, expenses: 3800 },
    { label: "Sun", revenue: 3490, expenses: 4300 },
  ],
  "6m": [
    { label: "Jan", revenue: 65000, expenses: 40000 },
    { label: "Feb", revenue: 52000, expenses: 35000 },
    { label: "Mar", revenue: 78000, expenses: 45000 },
    { label: "Apr", revenue: 59000, expenses: 38000 },
    { label: "May", revenue: 85000, expenses: 50000 },
    { label: "Jun", revenue: 72000, expenses: 42000 },
  ],
  year: [
    { label: "Jan", revenue: 62000, expenses: 38000 },
    { label: "Feb", revenue: 58000, expenses: 36000 },
    { label: "Mar", revenue: 75000, expenses: 46000 },
    { label: "Apr", revenue: 68000, expenses: 41000 },
    { label: "May", revenue: 74000, expenses: 43000 },
    { label: "Jun", revenue: 74000, expenses: 46000 },
    { label: "Jul", revenue: 79000, expenses: 47000 },
    { label: "Aug", revenue: 81000, expenses: 48000 },
    { label: "Sep", revenue: 80000, expenses: 50000 },
    { label: "Oct", revenue: 88000, expenses: 52000 },
    { label: "Nov", revenue: 92000, expenses: 54000 },
    { label: "Dec", revenue: 100000, expenses: 58000 },
  ],
  custom: [{ label: "Selected Day", revenue: 5400, expenses: 2100 }],
};
