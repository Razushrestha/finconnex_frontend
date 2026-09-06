"use client";

import { DeepFilterPanel } from "@/components/common/DeepFilterPanel";
import {
  COMPANY_FILTER_FIELDS,
  COMPANY_SYSTEM_GROUPS,
} from "@/lib/filters/catalogs";
import {
  EMPTY_COMPANY_FILTERS,
  type CompanyFilters,
} from "@/lib/filters/module-filters";
import type { DeepFilterValue } from "@/lib/filters/types";

export { EMPTY_COMPANY_FILTERS, type CompanyFilters };

function toDeep(filters: CompanyFilters): DeepFilterValue {
  return {
    groups: {
      status: filters.statuses,
      source: filters.sources,
      system: filters.systemDefined,
    },
    clauses: filters.clauses,
  };
}

function fromDeep(value: DeepFilterValue): CompanyFilters {
  return {
    statuses: value.groups.status ?? [],
    sources: value.groups.source ?? [],
    systemDefined: value.groups.system ?? [],
    clauses: value.clauses,
  };
}

interface FilterCompaniesPanelProps {
  filters: CompanyFilters;
  onChange: (next: CompanyFilters) => void;
  onClose?: () => void;
}

export function FilterCompaniesPanel({
  filters,
  onChange,
  onClose,
}: FilterCompaniesPanelProps) {
  return (
    <DeepFilterPanel
      title="Filter Companies"
      applied={toDeep(filters)}
      fields={COMPANY_FILTER_FIELDS}
      systemGroups={COMPANY_SYSTEM_GROUPS}
      onApply={(next) => onChange(fromDeep(next))}
      onClose={onClose}
    />
  );
}
