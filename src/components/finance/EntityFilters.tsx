import React from "react";
import { SearchInput } from "../ui/search-input";

interface Option {
  label: string;
  value: string;
}

interface EntityFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  statusValue?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: Option[];

  dateValue?: string;
  onDateChange?: (value: string) => void;
  dateOptions?: Option[];
}

export const EntityFilters: React.FC<EntityFiltersProps> = ({
  searchValue,
  onSearchChange,
  statusValue = "All",
  onStatusChange,
  statusOptions = [
    { label: "All", value: "All" },
    { label: "Draft", value: "Draft" },
    { label: "Sent", value: "Sent" },
    { label: "Accepted", value: "Accepted" },
    { label: "Rejected", value: "Rejected" },
  ],
  dateValue = "Last 30 Days",
  onDateChange,
  dateOptions = [
    { label: "Last 30 Days", value: "30d" },
    { label: "Last 7 Days", value: "7d" },
    { label: "This Month", value: "month" },
    { label: "Custom Range", value: "custom" },
  ],
}) => {
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-5">
      {/* Search Bar */}
      <div className="w-full md:w-80">
        <SearchInput value={searchValue} onChange={onSearchChange} />
      </div>

      {/* Filter Dropdowns */}
      <div className="flex items-center gap-3">
        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusValue}
            onChange={(e) => onStatusChange?.(e.target.value)}
            className="appearance-none bg-card border border-border rounded-lg px-3.5 py-2 pr-8 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Status: {opt.label}
              </option>
            ))}
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-[10px]">
            ▼
          </span>
        </div>

        {/* Date Filter */}
        <div className="relative">
          <select
            value={dateValue}
            onChange={(e) => onDateChange?.(e.target.value)}
            className="appearance-none bg-card border border-border rounded-lg px-3.5 py-2 pr-8 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            {dateOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                📅 {opt.label}
              </option>
            ))}
          </select>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-[10px]">
            ▼
          </span>
        </div>
      </div>
    </div>
  );
};
