"use client";

import { DeepFilterPanel } from "@/components/common/DeepFilterPanel";
import { NOTE_FILTER_FIELDS, NOTE_SYSTEM_GROUPS } from "@/lib/filters/catalogs";
import {
  EMPTY_NOTE_FILTERS,
  type NoteFilters,
} from "@/lib/filters/module-filters";
import type { DeepFilterValue } from "@/lib/filters/types";

export { EMPTY_NOTE_FILTERS, type NoteFilters };

function toDeep(filters: NoteFilters): DeepFilterValue {
  return {
    groups: {
      type: filters.types,
      flags: filters.flags,
      system: filters.systemDefined,
    },
    clauses: filters.clauses,
  };
}

function fromDeep(value: DeepFilterValue): NoteFilters {
  return {
    types: (value.groups.type ?? []) as NoteFilters["types"],
    flags: value.groups.flags ?? [],
    systemDefined: value.groups.system ?? [],
    clauses: value.clauses,
  };
}

interface NotesFilterPanelProps {
  filters: NoteFilters;
  onChange: (next: NoteFilters) => void;
  onClose?: () => void;
}

export function NotesFilterPanel({
  filters,
  onChange,
  onClose,
}: NotesFilterPanelProps) {
  return (
    <DeepFilterPanel
      title="Filter Notes by"
      applied={toDeep(filters)}
      fields={NOTE_FILTER_FIELDS}
      systemGroups={NOTE_SYSTEM_GROUPS}
      onApply={(next) => onChange(fromDeep(next))}
      onClose={onClose}
    />
  );
}
