"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Plus, Trash2, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  ACTION_CATALOG,
  FLOW_CONTROL_CATALOG,
  TRIGGER_CATALOG,
  type AutomationStep,
} from "@/lib/automations/types";

import { StepIcon } from "./icons";
import type { BuilderNode } from "@/lib/automations/layout";

function describeWait(step: Extract<AutomationStep, { type: "WAIT_FOR_DURATION" | "WAIT_UNTIL_DATE" }>): string {
  if (step.type === "WAIT_UNTIL_DATE") {
    const d = new Date(step.until);
    return Number.isNaN(d.getTime()) ? "Wait until a date" : `Wait until ${d.toLocaleString()}`;
  }
  const ms = step.durationMs;
  const days = ms / 86_400_000;
  const hours = ms / 3_600_000;
  const minutes = ms / 60_000;
  if (days >= 1 && Number.isInteger(days)) return `Wait ${days} day${days === 1 ? "" : "s"}`;
  if (hours >= 1 && Number.isInteger(hours)) return `Wait ${hours} hour${hours === 1 ? "" : "s"}`;
  return `Wait ${Math.max(1, Math.round(minutes))} minute${minutes === 1 ? "" : "s"}`;
}

function describeCondition(step: Extract<AutomationStep, { type: "IF_ELSE" }>): string {
  const first = step.condition?.items?.[0];
  if (!first) return "No condition set";
  if ("field" in first) {
    if (first.field === "_activity.EMAIL" || first.field === "_activity.MESSAGE") {
      const channel = first.field === "_activity.EMAIL" ? "email" : "message";
      return first.operator === "DOES_NOT_EXIST"
        ? `If no reply by ${channel}`
        : `If replied by ${channel}`;
    }
    return `If ${first.field} ${first.operator.toLowerCase().replace(/_/g, " ")}${
      first.value !== undefined ? ` ${JSON.stringify(first.value)}` : ""
    }`;
  }
  return "Condition group";
}

interface ShellProps {
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  subtitle?: string;
  selected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  handles?: { top?: boolean; bottom?: boolean };
}

function NodeShell({ icon, iconClassName, title, subtitle, selected, onClick, onDelete, handles = { top: true, bottom: true } }: ShellProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex w-[280px] cursor-pointer items-center gap-3 rounded-xl border bg-white p-3 shadow-sm transition hover:shadow-md",
        selected ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"
      )}
    >
      {handles?.top && <Handle type="target" position={Position.Top} className="!bg-slate-300" />}
      {handles?.bottom && <Handle type="source" position={Position.Bottom} className="!bg-slate-300" />}
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", iconClassName)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-800">{title}</div>
        {subtitle && <div className="truncate text-xs text-slate-500">{subtitle}</div>}
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-white text-slate-400 shadow ring-1 ring-slate-200 hover:text-rose-600 group-hover:flex"
          aria-label="Remove step"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export type NodeInteractions = {
  onSelectStep: (path: string) => void;
  onDeleteStep: (path: string) => void;
  onAddAt: (path: string) => void;
  onSelectTrigger: () => void;
  selectedPath: string | null;
};

export function TriggerNode({ data }: NodeProps<BuilderNode>) {
  if (data.kind !== "trigger") return null;
  const meta = data.triggerType ? TRIGGER_CATALOG[data.triggerType as keyof typeof TRIGGER_CATALOG] : null;
  const interactions = (data as unknown as { interactions?: NodeInteractions }).interactions;
  return (
    <NodeShell
      icon={meta ? <StepIcon icon={meta.icon} className="h-4.5 w-4.5 text-white" /> : <Zap className="h-4.5 w-4.5 text-white" />}
      iconClassName="bg-blue-600"
      title={meta ? meta.label : "Choose a Trigger"}
      subtitle={meta ? (data.scopeSummary ?? "Trigger") : "Click to select what starts this workflow"}
      selected={interactions?.selectedPath === "trigger"}
      onClick={() => interactions?.onSelectTrigger()}
      handles={{ top: false, bottom: true }}
    />
  );
}

export function ActionNode({ data }: NodeProps<BuilderNode>) {
  if (data.kind !== "step" || data.step.type !== "ACTION") return null;
  const meta = ACTION_CATALOG[data.step.action as keyof typeof ACTION_CATALOG];
  const interactions = (data as unknown as { interactions?: NodeInteractions }).interactions;
  return (
    <NodeShell
      icon={<StepIcon icon={meta?.icon ?? "workflow"} className="h-4.5 w-4.5 text-white" />}
      iconClassName="bg-violet-600"
      title={meta?.label ?? data.step.action}
      subtitle={meta?.category ?? "Action"}
      selected={interactions?.selectedPath === data.path}
      onClick={() => interactions?.onSelectStep(data.path)}
      onDelete={() => interactions?.onDeleteStep(data.path)}
    />
  );
}

export function WaitNode({ data }: NodeProps<BuilderNode>) {
  if (data.kind !== "step" || (data.step.type !== "WAIT_FOR_DURATION" && data.step.type !== "WAIT_UNTIL_DATE")) return null;
  const interactions = (data as unknown as { interactions?: NodeInteractions }).interactions;
  return (
    <NodeShell
      icon={<StepIcon icon={FLOW_CONTROL_CATALOG.WAIT_FOR_DURATION.icon} className="h-4.5 w-4.5 text-white" />}
      iconClassName="bg-amber-500"
      title={describeWait(data.step)}
      subtitle="Delay"
      selected={interactions?.selectedPath === data.path}
      onClick={() => interactions?.onSelectStep(data.path)}
      onDelete={() => interactions?.onDeleteStep(data.path)}
    />
  );
}

export function IfElseNode({ data }: NodeProps<BuilderNode>) {
  if (data.kind !== "step" || data.step.type !== "IF_ELSE") return null;
  const interactions = (data as unknown as { interactions?: NodeInteractions }).interactions;
  return (
    <NodeShell
      icon={<StepIcon icon={FLOW_CONTROL_CATALOG.IF_ELSE.icon} className="h-4.5 w-4.5 text-white" />}
      iconClassName="bg-teal-600"
      title={describeCondition(data.step)}
      subtitle="If / Else"
      selected={interactions?.selectedPath === data.path}
      onClick={() => interactions?.onSelectStep(data.path)}
      onDelete={() => interactions?.onDeleteStep(data.path)}
    />
  );
}

export function BranchLabelNode({ data }: NodeProps<BuilderNode>) {
  if (data.kind !== "add") return null;
  const interactions = (data as unknown as { interactions?: NodeInteractions }).interactions;
  const isThen = data.branch === "then";
  return (
    <div className="flex w-[280px] flex-col items-center gap-2">
      <span
        className={cn(
          "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide",
          isThen ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
        )}
      >
        {isThen ? "Yes / Then" : "No / Else"}
      </span>
      <button
        type="button"
        onClick={() => interactions?.onAddAt(data.path)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500"
        aria-label="Add step"
      >
        <Plus className="h-4 w-4" />
      </button>
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}

export function AddStepNode({ data }: NodeProps<BuilderNode>) {
  if (data.kind !== "add") return null;
  const interactions = (data as unknown as { interactions?: NodeInteractions }).interactions;
  return (
    <div className="flex w-[280px] justify-center">
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <button
        type="button"
        onClick={() => interactions?.onAddAt(data.path)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white text-slate-400 shadow-sm hover:border-blue-400 hover:text-blue-500"
        aria-label="Add step"
      >
        <Plus className="h-4 w-4" />
      </button>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}

export function EndNode() {
  return (
    <div className="flex w-[280px] justify-center">
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <div className="rounded-full bg-slate-200 px-5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        End
      </div>
    </div>
  );
}
