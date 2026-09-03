"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterEnter } from "@/lib/motion";
import {
  createClause,
  operatorNeedsValue,
  operatorsFor,
  type DeepFilterValue,
  type FieldClause,
  type FilterFieldDef,
  type FilterOperator,
  type FilterSystemGroup,
} from "@/lib/filters/types";
import { SYSTEM_DEFINED_OPTIONS } from "@/lib/filters/catalogs";

const SCROLLBAR =
  "[scrollbar-color:#d4d4d8_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300";

const inputClass =
  "h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-[12px] text-slate-700 outline-none focus:border-[#5A32A3] focus:ring-1 focus:ring-[#5A32A3]/30";

type SectionId = "system" | "website" | "fields" | `group:${string}`;

interface DeepFilterPanelProps {
  title: string;
  applied: DeepFilterValue;
  fields: FilterFieldDef[];
  systemGroups?: FilterSystemGroup[];
  websiteFields?: FilterFieldDef[];
  onApply: (next: DeepFilterValue) => void;
  onClose?: () => void;
}

function cloneValue(value: DeepFilterValue): DeepFilterValue {
  return {
    groups: Object.fromEntries(
      Object.entries(value.groups ?? {}).map(([key, items]) => [key, [...items]]),
    ),
    clauses: (value.clauses ?? []).map((clause) => ({ ...clause })),
  };
}

export function DeepFilterPanel({
  title,
  applied,
  fields,
  systemGroups = [],
  websiteFields,
  onApply,
  onClose,
}: DeepFilterPanelProps) {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<DeepFilterValue>(() => cloneValue(applied));
  const appliedKey = JSON.stringify(applied);
  const [open, setOpen] = useState<Record<string, boolean>>({
    system: false,
    website: false,
    fields: true,
  });

  useEffect(() => {
    setDraft(cloneValue(applied));
    // Keep draft in sync when Apply/Clear commits, not on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedKey]);

  const query = search.trim().toLowerCase();

  function toggleSection(id: SectionId) {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function isOpen(id: SectionId) {
    if (query) return true;
    return Boolean(open[id]);
  }

  function toggleGroupValue(groupId: string, option: string) {
    setDraft((prev) => {
      const current = prev.groups[groupId] ?? [];
      const next = current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option];
      return { ...prev, groups: { ...prev.groups, [groupId]: next } };
    });
  }

  function fieldSelected(fieldId: string) {
    return (draft.clauses ?? []).some((clause) => clause.fieldId === fieldId);
  }

  function clausesFor(fieldId: string) {
    return (draft.clauses ?? []).filter((clause) => clause.fieldId === fieldId);
  }

  function toggleField(field: FilterFieldDef) {
    setDraft((prev) => {
      const selected = (prev.clauses ?? []).some((clause) => clause.fieldId === field.id);
      if (selected) {
        return {
          ...prev,
          clauses: (prev.clauses ?? []).filter((clause) => clause.fieldId !== field.id),
        };
      }
      return { ...prev, clauses: [...(prev.clauses ?? []), createClause(field)] };
    });
  }

  function updateClause(id: string, patch: Partial<FieldClause>) {
    setDraft((prev) => ({
      ...prev,
      clauses: (prev.clauses ?? []).map((clause) =>
        clause.id === id ? { ...clause, ...patch } : clause,
      ),
    }));
  }

  function addCondition(field: FilterFieldDef) {
    setDraft((prev) => ({ ...prev, clauses: [...(prev.clauses ?? []), createClause(field)] }));
  }

  const visibleFields = useMemo(() => {
    if (!query) return fields;
    return fields.filter((field) => field.label.toLowerCase().includes(query));
  }, [fields, query]);

  const visibleWebsite = useMemo(() => {
    if (!websiteFields?.length) return [];
    if (!query) return websiteFields;
    return websiteFields.filter((field) => field.label.toLowerCase().includes(query));
  }, [websiteFields, query]);

  const visibleSystemGroups = useMemo(() => {
    if (!query) return systemGroups;
    return systemGroups
      .map((group) => ({
        ...group,
        options: group.options.filter((option) =>
          option.toLowerCase().includes(query) || group.title.toLowerCase().includes(query),
        ),
      }))
      .filter((group) => group.options.length > 0);
  }, [systemGroups, query]);

  const visibleSystemDefined = useMemo(() => {
    if (!query) return SYSTEM_DEFINED_OPTIONS;
    return SYSTEM_DEFINED_OPTIONS.filter((option) =>
      option.toLowerCase().includes(query),
    );
  }, [query]);

  function matchesSearch(label: string) {
    return !query || label.toLowerCase().includes(query);
  }

  const empty =
    visibleSystemDefined.length === 0 &&
    visibleWebsite.length === 0 &&
    visibleSystemGroups.length === 0 &&
    visibleFields.length === 0;

  return (
    <div
      className={cn(
        "flex h-full w-[300px] shrink-0 flex-col rounded-md border border-slate-200 bg-white shadow-sm",
        filterEnter,
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filter panel"
            className="rounded p-0.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="border-b border-slate-100 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full rounded-lg border border-slate-200 py-1.5 pr-3 pl-8 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#5A32A3] focus:ring-1 focus:ring-[#5A32A3]/20"
          />
        </div>
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto", SCROLLBAR)}>
        {visibleSystemDefined.length > 0 && matchesSearch("System Defined Filters") ? (
          <Section
            title="System Defined Filters"
            open={isOpen("system")}
            onToggle={() => toggleSection("system")}
          >
            <OptionList
              options={visibleSystemDefined}
              selected={draft.groups.system ?? []}
              onToggle={(option) => toggleGroupValue("system", option)}
            />
          </Section>
        ) : null}

        {visibleWebsite.length > 0 ? (
          <Section
            title="Website Activity"
            open={isOpen("website")}
            onToggle={() => toggleSection("website")}
          >
            {visibleWebsite.map((field) => (
              <FieldRow
                key={field.id}
                field={field}
                selected={fieldSelected(field.id)}
                clauses={clausesFor(field.id)}
                onToggle={() => toggleField(field)}
                onChangeClause={updateClause}
                onAddCondition={() => addCondition(field)}
              />
            ))}
          </Section>
        ) : null}

        {visibleSystemGroups.map((group) => (
          <Section
            key={group.id}
            title={group.title}
            open={isOpen(`group:${group.id}`)}
            onToggle={() => toggleSection(`group:${group.id}`)}
          >
            <OptionList
              options={group.options}
              selected={draft.groups[group.id] ?? []}
              onToggle={(option) => toggleGroupValue(group.id, option)}
            />
          </Section>
        ))}

        {visibleFields.length > 0 ? (
          <Section
            title="Filter By Fields"
            open={isOpen("fields")}
            onToggle={() => toggleSection("fields")}
          >
            {visibleFields.map((field) => (
              <FieldRow
                key={field.id}
                field={field}
                selected={fieldSelected(field.id)}
                clauses={clausesFor(field.id)}
                onToggle={() => toggleField(field)}
                onChangeClause={updateClause}
                onAddCondition={() => addCondition(field)}
              />
            ))}
          </Section>
        ) : null}

        {empty ? (
          <p className="px-4 py-8 text-center text-xs text-slate-400">
            No fields match your search.
          </p>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={() => onApply(cloneValue(draft))}
          className="flex h-9 w-full items-center justify-center rounded-lg bg-[#5A32A3] text-[13px] font-semibold text-white hover:bg-[#4c2a8a]"
        >
          Apply Filter
        </button>
        <button
          type="button"
          onClick={() => {
            const emptyValue: DeepFilterValue = { groups: {}, clauses: [] };
            setDraft(emptyValue);
            onApply(emptyValue);
          }}
          className="flex h-9 w-full items-center justify-center rounded-lg border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-100">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 px-3 py-2.5 text-left text-[12px] font-semibold text-slate-800"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        )}
        {title}
      </button>
      {open ? <div className="px-3 pb-3">{children}</div> : null}
    </div>
  );
}

function OptionList({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      {options.map((option) => (
        <label
          key={option}
          className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700"
        >
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={() => onToggle(option)}
            className="h-3.5 w-3.5 rounded border-slate-300 accent-[#5A32A3]"
          />
          {option}
        </label>
      ))}
    </div>
  );
}

function FieldRow({
  field,
  selected,
  clauses,
  onToggle,
  onChangeClause,
  onAddCondition,
}: {
  field: FilterFieldDef;
  selected: boolean;
  clauses: FieldClause[];
  onToggle: () => void;
  onChangeClause: (id: string, patch: Partial<FieldClause>) => void;
  onAddCondition: () => void;
}) {
  return (
    <div className="mb-1.5">
      <label className="flex cursor-pointer items-center gap-2 py-0.5 text-[13px] text-slate-700">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="h-3.5 w-3.5 rounded border-slate-300 accent-[#5A32A3]"
        />
        {field.label}
      </label>
      {selected
        ? clauses.map((clause, index) => (
            <div key={clause.id} className={cn("mt-1.5 ml-6 space-y-1.5")}>
              {index > 0 ? (
                <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  and
                </p>
              ) : null}
              <ClauseControls
                field={field}
                clause={clause}
                onChange={(patch) => onChangeClause(clause.id, patch)}
              />
            </div>
          ))
        : null}
      {selected ? (
        <button
          type="button"
          onClick={onAddCondition}
          className="mt-1.5 ml-6 inline-flex items-center gap-1 text-[11px] font-semibold text-[#5A32A3] hover:underline"
        >
          <Plus className="h-3 w-3" />
          Add condition
        </button>
      ) : null}
    </div>
  );
}

function ClauseControls({
  field,
  clause,
  onChange,
}: {
  field: FilterFieldDef;
  clause: FieldClause;
  onChange: (patch: Partial<FieldClause>) => void;
}) {
  const ops = operatorsFor(field.type);
  const showValue = operatorNeedsValue(clause.operator);
  const stacked = field.type === "select" || field.type === "date" || field.type === "text";

  return (
    <div className={cn(stacked ? "space-y-1.5" : "flex items-center gap-1.5")}>
      <select
        value={clause.operator}
        onChange={(e) =>
          onChange({ operator: e.target.value as FilterOperator, value: clause.value })
        }
        className={cn(inputClass, stacked ? "w-full" : "w-[72px] shrink-0 px-1")}
      >
        {ops.map((op) => (
          <option key={op.id} value={op.id}>
            {op.label}
          </option>
        ))}
      </select>
      {showValue ? (
        <ValueControl
          field={field}
          value={clause.value}
          onChange={(value) => onChange({ value })}
        />
      ) : null}
    </div>
  );
}

function ValueControl({
  field,
  value,
  onChange,
}: {
  field: FilterFieldDef;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.type === "select") {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        <option value="None">None</option>
        {(field.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "date") {
    return (
      <input
        type="date"
        value={toDateInput(value)}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    );
  }
  if (field.type === "money") {
    return (
      <div className="relative min-w-0 flex-1">
        <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-[12px] text-slate-400">
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type here"
          className={cn(inputClass, "pl-5")}
        />
      </div>
    );
  }
  if (field.type === "number") {
    return (
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type here"
        className={inputClass}
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Type here"
      className={inputClass}
    />
  );
}

function toDateInput(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (!match) return value;
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}
