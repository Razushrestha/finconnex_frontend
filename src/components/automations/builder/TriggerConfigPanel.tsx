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
  describeRelatedTarget,
  searchRelatedTargets,
  supportsMultiRecordPicker,
  supportsRecordPicker,
  type AutomationRecordOption,
  type RelatedTarget,
} from "@/lib/automations/record-search";
import {
  changedFieldMeta,
  EMPTY_CONDITION_GROUP,
  entityNoun,
  relatedTargetNoun,
  MAX_PINNED_RECORDS,
  relatedRecordMeta,
  scopeRecordIds,
  showsConditionBuilder,
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
  selectedIds,
  selected,
  extra,
  onSelect,
}: {
  entityType: RelatedTarget;
  /** Single-select: the one chosen id. */
  selectedId?: string;
  /** Multi-select: every chosen id. */
  selectedIds?: string[];
  selected?: AutomationRecordOption | null;
  /** Chosen rows to keep visible even when a search excludes them. */
  extra?: AutomationRecordOption[];
  onSelect: (option: AutomationRecordOption) => void;
}) {
  const chosen = selectedIds ?? (selectedId ? [selectedId] : []);
  const noun = relatedTargetNoun(entityType);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<AutomationRecordOption[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setState("loading");
      searchRelatedTargets(entityType, query)
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
    const pinned = [...(extra ?? []), ...(selected ? [selected] : [])];
    const missing = pinned.filter(
      (row, index) =>
        !options.some((option) => option.id === row.id) &&
        pinned.findIndex((item) => item.id === row.id) === index,
    );
    return missing.length ? [...missing, ...options] : options;
  }, [options, selected, extra]);

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
                chosen.includes(option.id) && "bg-blue-50 hover:bg-blue-50",
              )}
            >
              <span className="flex-1 truncate">
                <span className="block truncate text-slate-700">{option.label}</span>
                {option.sublabel && (
                  <span className="block truncate text-xs text-slate-400">{option.sublabel}</span>
                )}
              </span>
              {chosen.includes(option.id) && (
                <Check className="h-4 w-4 shrink-0 text-blue-600" />
              )}
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

/**
 * Multi-select over real workspace records, as chips plus a search list.
 *
 * Used for both sets a trigger can pin: the records it is *about* ("a call
 * scheduled for these contacts") and, on its own sidebar page, the records it
 * fires for ("these meetings"). Clearing it back to empty removes the
 * condition rather than writing an empty one.
 */
/** A teammate target has no entity noun of its own; everything else does. */

function MultiRecordField({
  entityType,
  recordIds,
  emptyHint,
  onChange,
}: {
  entityType: RelatedTarget;
  recordIds: string[];
  /** Overrides the "Choose at least one …" line above the chips. */
  emptyHint?: string;
  onChange: (next: string[]) => void;
}) {
  // Teammates are pickable but are not an AutomationEntityType — no trigger
  // fires on a user — so they carry their own noun.
  const noun = relatedTargetNoun(entityType);
  /** Resolved labels for the chosen ids, so chips never show a raw uuid. */
  const [known, setKnown] = useState<Record<string, AutomationRecordOption>>({});

  const unresolved = recordIds.filter((id) => !known[id]).join(",");
  useEffect(() => {
    if (!unresolved) return;
    let cancelled = false;
    Promise.all(
      unresolved
        .split(",")
        .map((id) => describeRelatedTarget(entityType, id)),
    ).then((options) => {
      if (cancelled) return;
      const found = options.filter((o): o is AutomationRecordOption => Boolean(o));
      if (found.length === 0) return;
      setKnown((prev) => ({
        ...prev,
        ...Object.fromEntries(found.map((o) => [o.id, o])),
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [entityType, unresolved]);

  function toggle(option: AutomationRecordOption) {
    setKnown((prev) => ({ ...prev, [option.id]: option }));
    if (recordIds.includes(option.id)) {
      onChange(recordIds.filter((id) => id !== option.id));
      return;
    }
    // Past the IN_LIST cap the API would reject the save, so stop here rather
    // than let the list grow into a group that cannot be stored.
    if (recordIds.length >= MAX_PINNED_RECORDS) return;
    onChange([...recordIds, option.id]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {recordIds.length === 0
            ? (emptyHint ?? `Choose at least one ${noun.one}`)
            : `${recordIds.length} selected`}
        </span>
        {recordIds.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChange([])}
          >
            Clear
          </Button>
        )}
      </div>

      {recordIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recordIds.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-1 pl-2.5 pr-1 text-xs text-blue-800"
            >
              {known[id]?.label ?? `${noun.one}\u2026`}
              <button
                type="button"
                aria-label={`Remove ${known[id]?.label ?? id}`}
                onClick={() => onChange(recordIds.filter((item) => item !== id))}
                className="rounded-full p-0.5 text-blue-500 hover:bg-blue-100 hover:text-blue-700"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <RecordPicker
        entityType={entityType}
        selectedIds={recordIds}
        extra={recordIds.map((id) => known[id]).filter(Boolean)}
        onSelect={toggle}
      />
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
  const multiPickable = supportsMultiRecordPicker(entityType);
  const temporal = TEMPORAL_TRIGGERS.has(triggerType);

  const transition = transitionMeta(triggerType);
  const changedFields = changedFieldMeta(triggerType);
  const relatedRecords = relatedRecordMeta(triggerType);
  /** The second-stage kinds are mutually exclusive per trigger. */
  const hasSecondStage = Boolean(transition || changedFields);
  const [stage, setStage] = useState<"scope" | "transition" | "records">("scope");
  const [filter, setFilter] = useState(() => {
    const initial = readTriggerFilter(
      conditions,
      transition?.fields ?? null,
      (relatedRecords ?? []).map((entry) => entry.field),
    );
    // An entity picked as a set is always edited as one, even where a single
    // id was saved: its inline one-record picker is not offered at all, so a
    // RECORD scope would otherwise be invisible and silently dropped.
    if (!multiPickable || initial.scope.mode !== "RECORD") return initial;
    const scope: TriggerScope = { mode: "RECORDS", recordIds: [initial.scope.recordId] };
    return { ...initial, scope };
  });
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
  const pinnedIds = scope.mode === "RECORDS" ? scopeRecordIds(scope) : [];
  /**
   * "Selected calls" is expressed by the presence of a related key, so an
   * empty list still means "selected, nothing picked yet" — which is what
   * makes the Next button able to insist on at least one contact.
   */
  const hasRelatedPins = (relatedRecords ?? []).some(
    (entry) => filter.related[entry.field] !== undefined,
  );
  const relatedPinCount = (relatedRecords ?? []).reduce(
    (total, entry) => total + (filter.related[entry.field]?.length ?? 0),
    0,
  );

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
  // Only on the picking page: on the scope page this would disable the very
  // button that opens the page where records get chosen.
  if (scope.mode === "RECORDS" && pinnedIds.length === 0 && stage === "records") {
    problems.push(`Choose at least one ${noun.one}, or switch back to all ${noun.many}.`);
  }
  if (hasRelatedPins && relatedPinCount === 0 && stage === "transition") {
    const first = relatedRecords?.[0];
    problems.push(
      `Choose at least one ${first ? relatedTargetNoun(first.entityType).one : "record"}, or switch back to all ${noun.many}.`,
    );
  }
  if (temporal && triggerType === "SCHEDULED" && (intervalMinutes < 1 || intervalMinutes > 10_080)) {
    problems.push("Interval must be between 1 minute and 7 days.");
  }
  if (temporal && triggerType === "DATE_REACHED" && !dateField) {
    problems.push("Choose which date field to watch.");
  }

  /**
   * The page the Next button leads to, or null when this stage saves. A
   * pinned-set scope has its own page, so the scope stage hands off to it
   * rather than offering a Save that cannot yet be valid.
   */
  /**
   * "Uploaded by specific teammates" for one pin; a plain "Narrowed by ..."
   * where a trigger offers several (a signature request pins both the
   * document and who raised it).
   */
  const relatedScopeTitle = (() => {
    const entries = relatedRecords ?? [];
    if (entries.length === 1) {
      const entry = entries[0];
      return `${entry.label} specific ${relatedTargetNoun(entry.entityType).many}`;
    }
    return `Narrowed by ${entries.map((entry) => entry.label.toLowerCase()).join(" or ")}`;
  })();

  const nextStage: "transition" | "records" | null =
    stage !== "scope"
      ? null
      : scope.mode === "RECORDS"
        ? "records"
        : hasSecondStage || hasRelatedPins
          ? "transition"
          : null;

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
        stage === "records"
          ? `Which ${noun.many} should run this workflow?`
          : stage === "transition" && changedFields
            ? "Which fields should run this workflow?"
            : "Configure what this trigger watches"
      }
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            onClick={stage === "scope" ? onBack : () => setStage("scope")}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            {stage === "scope" ? "Change trigger" : "Back"}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {nextStage ? (
              <Button disabled={problems.length > 0} onClick={() => setStage(nextStage)}>
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

      {/*
        A trigger whose own record is not worth pinning asks the narrowing
        question through its related stage instead: "all calls" versus "the
        calls about these contacts". Pinning one individual call is not a
        thing anyone means, so the record and condition options are not
        offered.

        Where the record IS pickable — a document — both questions are real
        ("which document" and "whose"), so that case falls through to the
        standard list below, which appends the related option alongside.
      */}
      {relatedRecords && !multiPickable ? (
        <div className="space-y-2">
          <ScopeOption
            active={!hasRelatedPins}
            title={`All ${noun.many}`}
            onClick={() =>
              setFilter((prev) => ({ ...prev, scope: { mode: "ANY" }, related: {} }))
            }
          />
          <ScopeOption
            active={hasRelatedPins}
            title={`Selected ${noun.many}`}
            onClick={() =>
              setFilter((prev) => ({
                ...prev,
                scope: { mode: "ANY" },
                related: hasRelatedPins
                  ? prev.related
                  : Object.fromEntries(
                      relatedRecords.map((entry) => [entry.field, [] as string[]]),
                    ),
              }))
            }
          />
        </div>
      ) : (
      <div className="space-y-2">
        <ScopeOption
          active={scope.mode === "ANY" && !hasRelatedPins}
          title={`Any ${noun.one}`}
          onClick={() => setFilter((prev) => ({ ...prev, scope: { mode: "ANY" }, related: {} }))}
        />

        {/*
          A set of records is chosen on a page of its own rather than inline:
          the list is long, multi-select needs room, and the scope stage stays
          a three-line question.
        */}
        {multiPickable && (
          <ScopeOption
            active={scope.mode === "RECORDS"}
            title={`Specific ${noun.many}`}
            onClick={() => {
              setFilter((prev) => ({
                ...prev,
                scope: { mode: "RECORDS", recordIds: pinnedIds },
                related: {},
              }));
              setStage("records");
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">
                {pinnedIds.length === 0
                  ? `No ${noun.many} chosen yet`
                  : `${pinnedIds.length} ${pinnedIds.length === 1 ? noun.one : noun.many} selected`}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setStage("records")}
              >
                {pinnedIds.length === 0 ? "Choose" : "Edit"}
              </Button>
            </div>
          </ScopeOption>
        )}

        {/*
          Offered beside "specific documents", not instead of it: "which
          document" and "whose document" are different questions and a user
          may mean either.
        */}
        {relatedRecords && (
          <ScopeOption
            active={hasRelatedPins}
            title={relatedScopeTitle}
            onClick={() => {
              setFilter((prev) => ({
                ...prev,
                scope: { mode: "ANY" },
                related: hasRelatedPins
                  ? prev.related
                  : Object.fromEntries(
                      relatedRecords.map((entry) => [entry.field, [] as string[]]),
                    ),
              }));
              setStage("transition");
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">
                {relatedPinCount === 0
                  ? "Nobody chosen yet"
                  : `${relatedPinCount} selected`}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setStage("transition")}
              >
                {relatedPinCount === 0 ? "Choose" : "Edit"}
              </Button>
            </div>
          </ScopeOption>
        )}

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

        {showsConditionBuilder(entityType, scope) && (
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
        )}
      </div>
      )}

        </>
      )}

      {stage === "records" && (
        <MultiRecordField
          entityType={entityType}
          recordIds={pinnedIds}
          emptyHint={`Choose the ${noun.many} this workflow watches`}
          onChange={(recordIds) => setScope({ mode: "RECORDS", recordIds })}
        />
      )}

      {stage === "transition" && relatedRecords && (
        <div className="space-y-5">
          {relatedRecords.map((entry) => (
            <div key={entry.field}>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                {entry.label}
              </label>
              <MultiRecordField
                entityType={entry.entityType}
                recordIds={filter.related[entry.field] ?? []}
                onChange={(recordIds) =>
                  setFilter((prev) => ({
                    ...prev,
                    related: { ...prev.related, [entry.field]: recordIds },
                  }))
                }
              />
            </div>
          ))}
        </div>
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
