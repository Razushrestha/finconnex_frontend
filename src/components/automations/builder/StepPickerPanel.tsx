"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  ACTION_CATALOG,
  FLOW_CONTROL_CATALOG,
  isActionAllowedForEntity,
  PLANNED_ACTIONS,
  PLANNED_TRIGGERS,
  TRIGGER_CATALOG,
  type AutomationActionType,
  type AutomationEntityType,
  type AutomationTriggerType,
} from "@/lib/automations/types";

import { StepIcon } from "./nodes/icons";
import { SlideOverPanel } from "./SlideOverPanel";

type FlowControlKey = keyof typeof FLOW_CONTROL_CATALOG;

interface Entry {
  key: string;
  label: string;
  category: string;
  icon: string;
  disabled?: boolean;
  note?: string;
}

function groupByCategory(entries: Entry[]): Map<string, Entry[]> {
  const map = new Map<string, Entry[]>();
  for (const entry of entries) {
    const list = map.get(entry.category) ?? [];
    list.push(entry);
    map.set(entry.category, list);
  }
  return map;
}

export function TriggerPickerPanel({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (trigger: AutomationTriggerType) => void;
}) {
  const [query, setQuery] = useState("");
  const entries = useMemo<Entry[]>(
    () =>
      [
        ...(Object.entries(TRIGGER_CATALOG) as [AutomationTriggerType, (typeof TRIGGER_CATALOG)[AutomationTriggerType]][])
          .map(([key, meta]) => ({ key, label: meta.label, category: meta.category, icon: meta.icon })),
        ...PLANNED_TRIGGERS.map((p, i) => ({
          key: `planned-${i}`,
          label: p.label,
          category: p.category,
          icon: "hand",
          disabled: true,
          note: p.note,
        })),
      ].filter((e) => e.label.toLowerCase().includes(query.toLowerCase())),
    [query]
  );
  const grouped = groupByCategory(entries);

  return (
    <SlideOverPanel title="Select a Trigger" subtitle="What starts this workflow?" onClose={onClose}>
      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search triggers..."
          className="pl-8"
          autoFocus
        />
      </div>
      <div className="space-y-5">
        {[...grouped.entries()].map(([category, items]) => (
          <div key={category}>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {category}
            </h3>
            <div className="space-y-1">
              {items.map((item) =>
                item.disabled ? (
                  <div
                    key={item.key}
                    title={item.note}
                    className="flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left text-sm text-slate-400"
                  >
                    <StepIcon icon={item.icon} className="h-4 w-4 text-slate-300" />
                    <span className="flex-1">{item.label}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      Coming soon
                    </span>
                  </div>
                ) : (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onSelect(item.key as AutomationTriggerType)}
                    className="flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left text-sm text-slate-700 hover:border-slate-200 hover:bg-slate-50"
                  >
                    <StepIcon icon={item.icon} className="h-4 w-4 text-blue-600" />
                    {item.label}
                  </button>
                )
              )}
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-sm text-slate-400">No triggers match &quot;{query}&quot;.</p>
        )}
      </div>
    </SlideOverPanel>
  );
}

export function ActionPickerPanel({
  entityType,
  onClose,
  onSelectAction,
  onSelectFlowControl,
}: {
  entityType: AutomationEntityType;
  onClose: () => void;
  onSelectAction: (action: AutomationActionType) => void;
  onSelectFlowControl: (kind: FlowControlKey) => void;
}) {
  const [query, setQuery] = useState("");

  const flowControlEntries = useMemo<Entry[]>(
    () =>
      (Object.entries(FLOW_CONTROL_CATALOG) as [FlowControlKey, (typeof FLOW_CONTROL_CATALOG)[FlowControlKey]][])
        .map(([key, meta]) => ({ key, label: meta.label, category: meta.category, icon: meta.icon }))
        .filter((e) => e.label.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  const actionEntries = useMemo<Entry[]>(
    () =>
      [
        ...(Object.entries(ACTION_CATALOG) as [AutomationActionType, (typeof ACTION_CATALOG)[AutomationActionType]][])
          .filter(([key]) => isActionAllowedForEntity(key, entityType))
          .map(([key, meta]) => ({ key, label: meta.label, category: meta.category, icon: meta.icon })),
        ...PLANNED_ACTIONS.map((p, i) => ({
          key: `planned-${i}`,
          label: p.label,
          category: p.category,
          icon: "workflow",
          disabled: true,
          note: p.note,
        })),
      ].filter((e) => e.label.toLowerCase().includes(query.toLowerCase())),
    [query, entityType]
  );

  const groupedActions = groupByCategory(actionEntries);

  return (
    <SlideOverPanel title="Add a Step" subtitle="Choose an action or flow-control step" onClose={onClose}>
      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search actions..."
          className="pl-8"
          autoFocus
        />
      </div>
      <div className="space-y-5">
        {flowControlEntries.length > 0 && (
          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Flow Control
            </h3>
            <div className="space-y-1">
              {flowControlEntries.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelectFlowControl(item.key as FlowControlKey)}
                  className="flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left text-sm text-slate-700 hover:border-slate-200 hover:bg-slate-50"
                >
                  <StepIcon icon={item.icon} className="h-4 w-4 text-teal-600" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {[...groupedActions.entries()].map(([category, items]) => (
          <div key={category}>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {category}
            </h3>
            <div className="space-y-1">
              {items.map((item) =>
                item.disabled ? (
                  <div
                    key={item.key}
                    title={item.note}
                    className="flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left text-sm text-slate-400"
                  >
                    <StepIcon icon={item.icon} className="h-4 w-4 text-slate-300" />
                    <span className="flex-1">{item.label}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      Coming soon
                    </span>
                  </div>
                ) : (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onSelectAction(item.key as AutomationActionType)}
                    className="flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left text-sm text-slate-700 hover:border-slate-200 hover:bg-slate-50"
                  >
                    <StepIcon icon={item.icon} className="h-4 w-4 text-violet-600" />
                    {item.label}
                  </button>
                )
              )}
            </div>
          </div>
        ))}
        {flowControlEntries.length === 0 && actionEntries.length === 0 && (
          <p className="text-sm text-slate-400">No steps match &quot;{query}&quot;.</p>
        )}
      </div>
    </SlideOverPanel>
  );
}
