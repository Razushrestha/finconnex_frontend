"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, Loader2, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AUTOMATION_FIELD_REGISTRY,
  TRIGGER_CATALOG,
  type AutomationConditionGroup,
  type AutomationEntityType,
  type AutomationTriggerType,
} from "@/lib/automations/types";
import {
  describeAutomationRecord,
  searchAutomationRecords,
  supportsRecordPicker,
  type AutomationRecordOption,
} from "@/lib/automations/record-search";
import {
  changedFieldMeta,
  EMPTY_CONDITION_GROUP,
  entityNoun,
  readTriggerFilter,
  transitionMeta,
  TRANSITION_UNSET,
  writeTriggerFilter,
  type TransitionOption,
  type TriggerScope,
  type TriggerTransition,
} from "@/lib/automations/trigger-scope";
import { loadAssignableOwners } from "@/lib/users/assignable";
import { cn } from "@/lib/utils";

import { ConditionBuilder } from "./ConditionBuilder";
import { SlideOverPanel } from "./SlideOverPanel";

const MAX_DURATION_MS = 365 * 24 * 60 * 60 * 1_000;

/**
 * The only triggers whose `triggerConfig` the backend accepts — every other
 * trigger is rejected with `automation.error.triggerConfigNotAllowed`
 * (validateTriggerConfig in automation-definition.service.ts).
 */
const TEMPORAL_TRIGGERS = new Set<AutomationTriggerType>([
  "DATE_REACHED",
  "TIME_ELAPSED",
  "SCHEDULED",
  "RECORD_INACTIVE_FOR",
  "MESSAGE_UNREAD_FOR",
]);

const DURATION_UNITS: [string, number][] = [
  ["Minutes", 60_000],
  ["Hours", 3_600_000],
  ["Days", 86_400_000],
];

function DurationField({
  valueMs,
  onChange,
}: {
  valueMs: number;
  onChange: (ms: number) => void;
}) {
  const best = DURATION_UNITS.reduce(
    (acc, unit) => (valueMs % unit[1] === 0 ? unit : acc),
    DURATION_UNITS[0],
  );
  const [amount, setAmount] = useState(Math.max(1, Math.round(valueMs / best[1])));
  const [unitMs, setUnitMs] = useState(best[1]);

  useEffect(() => {
    onChange(Math.min(MAX_DURATION_MS, Math.max(60_000, amount * unitMs)));
  }, [amount, unitMs]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={1}
        value={amount}
        onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
        className="w-24"
      />
      <Select
        items={DURATION_UNITS.map(([label, ms]) => ({ label, value: String(ms) }))}
        value={String(unitMs)}
        onValueChange={(v) => setUnitMs(Number(v))}
      >
        <SelectTrigger className="h-9 flex-1 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DURATION_UNITS.map(([label, ms]) => (
            <SelectItem key={ms} value={String(ms)}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Search-as-you-type picker over the workspace's real records.
 *
 * Debounced so a fast typist doesn't queue one request per keystroke, and the
 * currently pinned record is shown even when it falls outside the result page
 * so a saved selection never appears to vanish while searching.
 */
function RecordPicker({
  entityType,
  selectedId,
  selected,
  onSelect,
}: {
  entityType: AutomationEntityType;
  selectedId: string;
  selected: AutomationRecordOption | null;
  onSelect: (option: AutomationRecordOption) => void;
}) {
  const noun = entityNoun(entityType);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<AutomationRecordOption[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setState("loading");
      searchAutomationRecords(entityType, query)
        .then((rows) => {
          if (cancelled) return;
          setOptions(rows);
          setState("ready");
        })
        .catch(() => {
          if (!cancelled) setState("error");
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [entityType, query]);

  const rows = useMemo(() => {
    if (!selected || options.some((option) => option.id === selected.id)) return options;
    return [selected, ...options];
  }, [options, selected]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${noun.many}...`}
          className="pl-8"
        />
      </div>

      {state === "loading" && (
        <div className="flex items-center gap-2 p-3 text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading {noun.many}...
        </div>
      )}

      {state === "error" && (
        <p className="rounded-md border border-dashed border-rose-200 p-3 text-xs text-rose-600">
          Couldn&apos;t load {noun.many}. Check your connection and try again.
        </p>
      )}

      {state === "ready" && rows.length === 0 && (
        <p className="rounded-md border border-dashed border-slate-200 p-3 text-xs text-slate-400">
          No {noun.many} match &quot;{query}&quot;.
        </p>
      )}

      {state === "ready" && rows.length > 0 && (
        <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-1">
          {rows.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-slate-50",
                option.id === selectedId && "bg-blue-50 hover:bg-blue-50",
              )}
            >
              <span className="flex-1 truncate">
                <span className="block truncate text-slate-700">{option.label}</span>
                {option.sublabel && (
                  <span className="block truncate text-xs text-slate-400">{option.sublabel}</span>
                )}
              </span>
              {option.id === selectedId && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ScopeOption({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        active ? "border-blue-300 bg-blue-50/40" : "border-slate-200",
      )}
    >
      <button type="button" onClick={onClick} className="flex w-full items-start gap-2.5 text-left">
        <span
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
            active ? "border-blue-600" : "border-slate-300",
          )}
          aria-hidden
        >
          {active && <span className="h-2 w-2 rounded-full bg-blue-600" />}
        </span>
        <span className="flex-1 text-sm font-medium text-slate-700">{title}</span>
      </button>
      {active && children && <div className="mt-3 pl-6.5">{children}</div>}
    </div>
  );
}

const ANY_VALUE = "__any__";

/**
 * One side of a transition. "Any" is a real option rather than a cleared
 * field, so leaving a side unset is a visible choice — and it writes no
 * condition at all for that side. `unsetLabel`, when the field is nullable,
 * adds the "had no value" option, which writes DOES_NOT_EXIST.
 */
function TransitionSelect({
  value,
  options,
  anyLabel,
  unsetLabel,
  loading,
  onChange,
}: {
  value: string | undefined;
  options: TransitionOption[];
  anyLabel: string;
  unsetLabel?: string;
  loading?: boolean;
  onChange: (next: string | undefined) => void;
}) {
  // Base UI's `Select.Value` renders the raw value unless the root is given
  // `items` to look the label up in — without this an owner select shows the
  // user's uuid, and the unset sentinel shows as "__unset__".
  const items = [
    { label: anyLabel, value: ANY_VALUE },
    ...(unsetLabel ? [{ label: unsetLabel, value: TRANSITION_UNSET }] : []),
    ...options,
  ];
  return (
    <Select
      items={items}
      value={value ?? ANY_VALUE}
      onValueChange={(next) => onChange(!next || next === ANY_VALUE ? undefined : next)}
    >
      <SelectTrigger className="h-9 w-full text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY_VALUE}>{anyLabel}</SelectItem>
        {unsetLabel && <SelectItem value={TRANSITION_UNSET}>{unsetLabel}</SelectItem>}
        {loading && options.length === 0 && (
          <SelectItem value="__loading__" disabled>
            Loading...
          </SelectItem>
        )}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Which columns a "field changed" trigger watches. Multi-select, because an
 * update writes a set of columns at once and the useful question is "did any
 * of these change".
 */
function ChangedFieldPicker({
  groups,
  selected,
  onToggle,
  onClear,
}: {
  groups: { label: string; fields: TransitionOption[] }[];
  selected: string[];
  onToggle: (field: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {selected.length === 0
            ? "Any field change runs this workflow"
            : `${selected.length} selected`}
        </span>
        {selected.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClear}>
            Clear
          </Button>
        )}
      </div>
      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {group.label}
          </h3>
          <div className="space-y-0.5">
            {group.fields.map((field) => (
              <label
                key={field.value}
                className="flex cursor-pointer items-center gap-2.5 rounded-md p-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(field.value)}
                  onChange={() => onToggle(field.value)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {field.label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface Props {
  triggerType: AutomationTriggerType;
  entityType: AutomationEntityType;
  conditions: AutomationConditionGroup | undefined;
  triggerConfig: Record<string, unknown>;
  onBack: () => void;
  onClose: () => void;
  onSave: (next: {
    conditions: AutomationConditionGroup | undefined;
    triggerConfig: Record<string, unknown>;
  }) => void;
}

/**
 * Second stage of the trigger sidebar: picking "Lead Updated" from the list
 * lands here rather than closing the panel, so the very next question —
 * *which* lead — is answered in the same place.
 *
 * Record scope is written as the definition's top-level `conditions`; the
 * temporal `triggerConfig` block only renders for the five triggers whose
 * config the backend accepts.
 */
export function TriggerConfigPanel({
  triggerType,
  entityType,
  conditions,
  triggerConfig,
  onBack,
  onClose,
  onSave,
}: Props) {
  const meta = TRIGGER_CATALOG[triggerType];
  const noun = entityNoun(entityType);
  const pickable = supportsRecordPicker(entityType);
  const temporal = TEMPORAL_TRIGGERS.has(triggerType);

  const transition = transitionMeta(triggerType);
  const changedFields = changedFieldMeta(triggerType);
  /** Both second stages are mutually exclusive per trigger. */
  const hasSecondStage = Boolean(transition || changedFields);
  const [stage, setStage] = useState<"scope" | "transition">("scope");
  const [filter, setFilter] = useState(() =>
    readTriggerFilter(conditions, transition?.fields ?? null),
  );
  const scope = filter.scope;
  const setScope = (next: TriggerScope) => setFilter((prev) => ({ ...prev, scope: next }));
  const setTransition = (next: TriggerTransition) =>
    setFilter((prev) => ({ ...prev, transition: next }));
  const toggleChangedField = (field: string) =>
    setFilter((prev) => ({
      ...prev,
      changedFields: prev.changedFields.includes(field)
        ? prev.changedFields.filter((item) => item !== field)
        : [...prev.changedFields, field],
    }));

  /**
   * Owner-backed transitions list the workspace's assignable owners, which
   * is the same list the lead's own Owner field offers. `loadAssignableOwners`
   * prefers rows with real uuids — a condition value has to be a real user id.
   */
  const [owners, setOwners] = useState<TransitionOption[]>([]);
  const ownerBacked = transition?.source === "owners";
  // Starts true for an owner-backed field so the select reads "Loading..."
  // on first paint rather than briefly offering an empty list.
  const [ownersLoading, setOwnersLoading] = useState(ownerBacked);
  useEffect(() => {
    if (!ownerBacked) return;
    let cancelled = false;
    loadAssignableOwners()
      .then((rows) => {
        if (cancelled) return;
        setOwners(rows.map((row) => ({ label: row.name || row.email, value: row.id })));
      })
      .finally(() => !cancelled && setOwnersLoading(false));
    return () => {
      cancelled = true;
    };
  }, [ownerBacked]);

  const transitionOptions = transition?.options ?? owners;
  const [config, setConfig] = useState<Record<string, unknown>>(() =>
    temporal ? { ...triggerConfig } : {},
  );
  const [selectedRecord, setSelectedRecord] = useState<AutomationRecordOption | null>(null);

  const pinnedId = scope.mode === "RECORD" ? scope.recordId : "";

  /** Turn a saved id back into a name so reopening never shows a bare uuid. */
  useEffect(() => {
    if (!pinnedId || selectedRecord?.id === pinnedId) return;
    let cancelled = false;
    describeAutomationRecord(entityType, pinnedId).then((option) => {
      if (!cancelled && option) setSelectedRecord(option);
    });
    return () => {
      cancelled = true;
    };
  }, [entityType, pinnedId, selectedRecord?.id]);

  const dateFields = useMemo(
    () =>
      Object.entries(AUTOMATION_FIELD_REGISTRY[entityType] ?? {})
        .filter(([, type]) => type === "date")
        .map(([field]) => field),
    [entityType],
  );

  const durationMs = typeof config.durationMs === "number" ? config.durationMs : 86_400_000;
  const intervalMinutes =
    typeof config.intervalMinutes === "number" ? config.intervalMinutes : 60;
  const dateField = typeof config.field === "string" ? config.field : "";

  const problems: string[] = [];
  if (scope.mode === "RECORD" && !scope.recordId) {
    problems.push(`Choose which ${noun.one} this workflow watches.`);
  }
  if (scope.mode === "FILTER" && scope.group.items.length === 0) {
    problems.push("Add at least one condition, or switch back to any record.");
  }
  if (temporal && triggerType === "SCHEDULED" && (intervalMinutes < 1 || intervalMinutes > 10_080)) {
    problems.push("Interval must be between 1 minute and 7 days.");
  }
  if (temporal && triggerType === "DATE_REACHED" && !dateField) {
    problems.push("Choose which date field to watch.");
  }

  function commit() {
    onSave({
      conditions: writeTriggerFilter(filter, transition?.fields ?? null),
      triggerConfig: temporal ? buildTemporalConfig() : {},
    });
  }

  function buildTemporalConfig(): Record<string, unknown> {
    if (triggerType === "SCHEDULED") return { intervalMinutes };
    if (triggerType === "DATE_REACHED") return { durationMs, field: dateField };
    return { durationMs };
  }

  return (
    <SlideOverPanel
      title={meta.label}
      subtitle={
        stage === "transition" && changedFields
          ? "Which fields should run this workflow?"
          : "Configure what this trigger watches"
      }
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            onClick={stage === "transition" ? () => setStage("scope") : onBack}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            {stage === "transition" ? "Back" : "Change trigger"}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {hasSecondStage && stage === "scope" ? (
              <Button disabled={problems.length > 0} onClick={() => setStage("transition")}>
                Next
              </Button>
            ) : (
              <Button disabled={problems.length > 0} onClick={commit}>
                Save
              </Button>
            )}
          </div>
        </div>
      }
    >
      {stage === "scope" && (
        <>
      {temporal && (
        <div className="mb-5 space-y-3 rounded-lg border border-slate-200 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timing</h3>
          {triggerType === "SCHEDULED" ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Run every (minutes)
              </label>
              <Input
                type="number"
                min={1}
                max={10_080}
                value={intervalMinutes}
                onChange={(e) =>
                  setConfig({ ...config, intervalMinutes: Number(e.target.value) || 0 })
                }
              />
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  {triggerType === "DATE_REACHED" ? "Fire this long before/after" : "After"}
                </label>
                <DurationField
                  valueMs={durationMs}
                  onChange={(ms) => setConfig((prev) => ({ ...prev, durationMs: ms }))}
                />
              </div>
              {triggerType === "DATE_REACHED" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Date field
                  </label>
                  <Select
                    items={dateFields.map((field) => ({ label: field, value: field }))}
                    value={dateField || null}
                    onValueChange={(field) => field && setConfig({ ...config, field })}
                  >
                    <SelectTrigger className="h-9 w-full text-sm">
                      <SelectValue placeholder="Select a date field..." />
                    </SelectTrigger>
                    <SelectContent>
                      {dateFields.map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Which {noun.many}?
      </h3>
      <div className="space-y-2">
        <ScopeOption
          active={scope.mode === "ANY"}
          title={`Any ${noun.one}`}
          onClick={() => setScope({ mode: "ANY" })}
        />

        {pickable && (
          <ScopeOption
            active={scope.mode === "RECORD"}
            title={`A specific ${noun.one}`}
            onClick={() => setScope({ mode: "RECORD", recordId: pinnedId })}
          >
            <RecordPicker
              entityType={entityType}
              selectedId={pinnedId}
              selected={selectedRecord}
              onSelect={(option) => {
                setSelectedRecord(option);
                setScope({ mode: "RECORD", recordId: option.id });
              }}
            />
          </ScopeOption>
        )}

        <ScopeOption
          active={scope.mode === "FILTER"}
          title={`${noun.many[0].toUpperCase()}${noun.many.slice(1)} matching conditions`}
          onClick={() =>
            setScope({
              mode: "FILTER",
              group: scope.mode === "FILTER" ? scope.group : EMPTY_CONDITION_GROUP,
            })
          }
        >
          {scope.mode === "FILTER" && (
            <ConditionBuilder
              entityType={entityType}
              group={scope.group}
              onChange={(group) => setScope({ mode: "FILTER", group })}
            />
          )}
        </ScopeOption>
      </div>

        </>
      )}

      {stage === "transition" && changedFields && (
        <ChangedFieldPicker
          groups={changedFields.groups}
          selected={filter.changedFields}
          onToggle={toggleChangedField}
          onClear={() => setFilter((prev) => ({ ...prev, changedFields: [] }))}
        />
      )}

      {stage === "transition" && transition && (
        <div className="space-y-4">
          {transition.fields.from && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                {transition.fromLabel ?? `${transition.label} changed from`}
              </label>
              <TransitionSelect
                value={filter.transition.from}
                options={transitionOptions}
                anyLabel={`Any ${transition.label.toLowerCase()}`}
                unsetLabel={transition.unsetLabel}
                loading={ownersLoading}
                onChange={(from) => setTransition({ ...filter.transition, from })}
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              {transition.toLabel ?? `${transition.label} changed to`}
            </label>
            <TransitionSelect
              value={filter.transition.to}
              options={transitionOptions}
              anyLabel={`Any ${transition.label.toLowerCase()}`}
              unsetLabel={transition.unsetLabel}
              loading={ownersLoading}
              onChange={(to) => setTransition({ ...filter.transition, to })}
            />
          </div>
        </div>
      )}

      {problems.length > 0 && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-600">
          <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {problems[0]}
        </p>
      )}
    </SlideOverPanel>
  );
}
