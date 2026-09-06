"use client";

import { DeepFilterPanel } from "@/components/common/DeepFilterPanel";
import { EMAIL_FILTER_FIELDS, EMAIL_SYSTEM_GROUPS } from "@/lib/filters/catalogs";
import {
  EMPTY_MAIL_FILTERS,
  type MailListFilters,
} from "@/lib/filters/module-filters";
import type { DeepFilterValue } from "@/lib/filters/types";

export { EMPTY_MAIL_FILTERS, type MailListFilters };

function toDeep(filters: MailListFilters): DeepFilterValue {
  const flags: string[] = [];
  if (filters.unreadOnly) flags.push("Unread only");
  if (filters.hasAttachment) flags.push("Has attachment");
  return {
    groups: {
      status: filters.statuses,
      flags,
      system: filters.systemDefined,
    },
    clauses: filters.clauses,
  };
}

function fromDeep(value: DeepFilterValue): MailListFilters {
  const flags = value.groups.flags ?? [];
  return {
    unreadOnly: flags.includes("Unread only"),
    hasAttachment: flags.includes("Has attachment"),
    statuses: (value.groups.status ?? []) as MailListFilters["statuses"],
    systemDefined: value.groups.system ?? [],
    clauses: value.clauses,
  };
}

interface EmailsFilterPanelProps {
  value: MailListFilters;
  onChange: (next: MailListFilters) => void;
  onClose?: () => void;
}

export function EmailsFilterPanel({
  value,
  onChange,
  onClose,
}: EmailsFilterPanelProps) {
  return (
    <DeepFilterPanel
      title="Filter Emails"
      applied={toDeep(value)}
      fields={EMAIL_FILTER_FIELDS}
      systemGroups={EMAIL_SYSTEM_GROUPS}
      onApply={(next) => onChange(fromDeep(next))}
      onClose={onClose}
    />
  );
}
