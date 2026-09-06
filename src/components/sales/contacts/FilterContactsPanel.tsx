"use client";

import { useEffect, useMemo, useState } from "react";
import { DeepFilterPanel } from "@/components/common/DeepFilterPanel";
import {
  CONTACT_SYSTEM_GROUPS,
  WEBSITE_ACTIVITY_FIELDS,
  contactFilterFields,
} from "@/lib/filters/catalogs";
import {
  EMPTY_CONTACT_FILTERS,
  type ContactFilters,
} from "@/lib/filters/module-filters";
import type { DeepFilterValue } from "@/lib/filters/types";
import {
  listActiveCustomFieldsForEntity,
  onCustomFieldsChange,
} from "@/lib/custom-fields/store";

export { EMPTY_CONTACT_FILTERS, type ContactFilters };

function toDeep(filters: ContactFilters): DeepFilterValue {
  return {
    groups: {
      source: filters.sources,
      status: filters.statuses,
      system: filters.systemDefined,
    },
    clauses: filters.clauses,
  };
}

function fromDeep(value: DeepFilterValue): ContactFilters {
  return {
    sources: value.groups.source ?? [],
    statuses: value.groups.status ?? [],
    systemDefined: value.groups.system ?? [],
    clauses: value.clauses,
  };
}

interface FilterContactsPanelProps {
  filters: ContactFilters;
  onChange: (next: ContactFilters) => void;
  onClose?: () => void;
}

export function FilterContactsPanel({
  filters,
  onChange,
  onClose,
}: FilterContactsPanelProps) {
  const [customTick, setCustomTick] = useState(0);
  useEffect(() => onCustomFieldsChange(() => setCustomTick((n) => n + 1)), []);
  const fields = useMemo(
    () => contactFilterFields(listActiveCustomFieldsForEntity("Contact")),
    [customTick],
  );
  return (
    <DeepFilterPanel
      title="Filter Contacts by"
      applied={toDeep(filters)}
      fields={fields}
      systemGroups={CONTACT_SYSTEM_GROUPS}
      websiteFields={WEBSITE_ACTIVITY_FIELDS}
      onApply={(next) => onChange(fromDeep(next))}
      onClose={onClose}
    />
  );
}
