export interface MetricCardConfig {
  title: string;
  value: string | number;
  subtext: string;
  subtextVariant?: "default" | "destructive" | "success";
  icon?: string;
}

export interface TableColumn<T> {
  header: string;
  accessorKey: keyof T | string;
  cell?: (item: T) => React.ReactNode;
}
