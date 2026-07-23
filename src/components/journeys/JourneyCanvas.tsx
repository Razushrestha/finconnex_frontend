"use client";

import { useState, type ElementType } from "react";
import {
  GripVertical,
  Plus,
  Trash2,
  GitBranch,
  Mail,
  MessageSquare,
  Phone,
  Clock,
  CheckSquare,
  PenLine,
} from "lucide-react";
import {
  JOURNEY_STEP_STYLE,
  JOURNEY_STEP_TYPES,
  createStep,
  reorderSteps,
  stepConversionRate,
  type JourneyStep,
  type JourneyStepType,
} from "@/lib/journeys/types";
import { cn } from "@/lib/utils";

const STEP_ICONS: Record<JourneyStepType, ElementType> = {
  Wait: Clock,
  "Send Email": Mail,
  "Send SMS": MessageSquare,
  "Send WhatsApp": Phone,
  "Create Task": CheckSquare,
  "Update Field": PenLine,
  "Branch Condition": GitBranch,
};

interface Props {
  steps: JourneyStep[];
  onChange: (steps: JourneyStep[]) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  showMetrics?: boolean;
  readOnly?: boolean;
}

export function JourneyCanvas({
  steps,
  onChange,
  selectedId,
  onSelect,
  showMetrics = true,
  readOnly = false,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function addStep(type: JourneyStepType) {
    if (readOnly) return;
    const step = createStep(type);
    onChange([...steps, step]);
    onSelect(step.id);
  }

  function removeStep(id: string) {
    if (readOnly) return;
    onChange(steps.filter((s) => s.id !== id));
    if (selectedId === id) onSelect(null);
  }

  function onDragStart(index: number) {
    if (readOnly) return;
    setDragIndex(index);
  }

  function onDragOver(e: React.DragEvent, index: number) {
    if (readOnly || dragIndex === null) return;
    e.preventDefault();
    setOverIndex(index);
  }

  function onDrop(index: number) {
    if (readOnly || dragIndex === null) return;
    onChange(reorderSteps(steps, dragIndex, index));
    setDragIndex(null);
    setOverIndex(null);
  }

  function onDragEnd() {
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[200px_1fr]">
      {!readOnly ? (
        <aside className="rounded-2xl border border-slate-100/80 bg-white p-3 shadow-sm">
          <div className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
            Step palette
          </div>
          <p className="mb-2 text-[10px] text-slate-400">
            Click to add · drag cards to reorder
          </p>
          <div className="flex flex-col gap-1">
            {JOURNEY_STEP_TYPES.map((t) => {
              const Icon = STEP_ICONS[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => addStep(t)}
                  className="flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 hover:border-violet-200 hover:bg-violet-50"
                >
                  <Plus className="h-3 w-3 text-violet-600" />
                  <Icon className="h-3.5 w-3.5 text-slate-400" />
                  {t}
                </button>
              );
            })}
          </div>
        </aside>
      ) : null}

      <div
        className={cn(
          "rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm sm:p-5",
          readOnly && "lg:col-span-1",
        )}
      >
        <div className="mb-3 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
          Journey canvas
        </div>

        {steps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-[12px] text-slate-400">
            Add steps from the palette to map the lifecycle
          </div>
        ) : (
          <ol className="relative mx-auto max-w-xl space-y-0">
            {steps.map((step, index) => {
              const Icon = STEP_ICONS[step.type];
              const rate = stepConversionRate(step);
              const isBranch = step.type === "Branch Condition";
              return (
                <li key={step.id} className="relative">
                  {index > 0 ? (
                    <div
                      aria-hidden
                      className="mx-auto h-6 w-px bg-violet-200"
                    />
                  ) : null}
                  <div
                    draggable={!readOnly}
                    onDragStart={() => onDragStart(index)}
                    onDragOver={(e) => onDragOver(e, index)}
                    onDrop={() => onDrop(index)}
                    onDragEnd={onDragEnd}
                    onClick={() => onSelect(step.id)}
                    className={cn(
                      "relative cursor-pointer rounded-xl border bg-white p-3 transition-shadow",
                      selectedId === step.id
                        ? "border-violet-400 shadow-md shadow-violet-600/10"
                        : "border-slate-200 hover:border-violet-200",
                      overIndex === index &&
                        dragIndex !== index &&
                        "ring-2 ring-violet-300",
                      isBranch && "border-rose-200 bg-rose-50/30",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!readOnly ? (
                        <span className="mt-0.5 cursor-grab text-slate-300 active:cursor-grabbing">
                          <GripVertical className="h-4 w-4" />
                        </span>
                      ) : null}
                      <div
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                          JOURNEY_STEP_STYLE[step.type],
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-slate-400">
                            Step {index + 1}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                              JOURNEY_STEP_STYLE[step.type],
                            )}
                          >
                            {step.type}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[13px] font-semibold text-slate-900">
                          {step.label}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {step.detail}
                        </p>
                        {showMetrics ? (
                          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-slate-500">
                            <span>
                              Enrolled{" "}
                              <strong className="text-slate-800">
                                {step.enrolledCount}
                              </strong>
                            </span>
                            <span>
                              Conversion{" "}
                              <strong className="text-slate-800">{rate}%</strong>
                            </span>
                          </div>
                        ) : null}
                        {isBranch ? (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-2 py-1.5 text-[10px] font-semibold text-emerald-700">
                              Yes → continue
                            </div>
                            <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-[10px] font-semibold text-slate-500">
                              No → exit / alternate
                            </div>
                          </div>
                        ) : null}
                      </div>
                      {!readOnly ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeStep(step.id);
                          }}
                          className="rounded-md p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
            <li>
              <div aria-hidden className="mx-auto h-6 w-px bg-violet-200" />
              <div className="rounded-xl border border-dashed border-slate-200 py-2 text-center text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Exit / complete
              </div>
            </li>
          </ol>
        )}
      </div>
    </div>
  );
}

interface InspectorProps {
  step: JourneyStep | null;
  onChange: (step: JourneyStep) => void;
  readOnly?: boolean;
}

export function JourneyStepInspector({
  step,
  onChange,
  readOnly,
}: InspectorProps) {
  if (!step) {
    return (
      <div className="rounded-2xl border border-slate-100/80 bg-white p-4 text-center shadow-sm">
        <p className="text-[12px] text-slate-400">
          Select a step on the canvas to edit
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100/80 bg-white p-4 shadow-sm">
      <div className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        Step settings
      </div>
      <div className="space-y-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-slate-600">Label</span>
          <input
            value={step.label}
            disabled={readOnly}
            onChange={(e) => onChange({ ...step, label: e.target.value })}
            className="h-9 rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none focus:border-violet-400 disabled:bg-slate-50"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-slate-600">Type</span>
          <select
            value={step.type}
            disabled={readOnly}
            onChange={(e) =>
              onChange({
                ...step,
                type: e.target.value as JourneyStepType,
              })
            }
            className="h-9 rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none disabled:bg-slate-50"
          >
            {JOURNEY_STEP_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-slate-600">
            Configuration
          </span>
          <textarea
            value={step.detail}
            disabled={readOnly}
            onChange={(e) => onChange({ ...step, detail: e.target.value })}
            rows={3}
            className="rounded-lg border border-slate-200 px-2.5 py-2 text-[12px] outline-none focus:border-violet-400 disabled:bg-slate-50"
          />
        </label>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2 text-[11px]">
          <div>
            <div className="text-[10px] text-slate-400">Enrolled</div>
            <div className="font-semibold text-slate-800">
              {step.enrolledCount}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Conversion</div>
            <div className="font-semibold text-slate-800">
              {stepConversionRate(step)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
