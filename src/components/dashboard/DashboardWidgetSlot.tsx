"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardReorderProps = {
  widgetOrder?: string[];
  hiddenWidgets?: string[];
  reordering?: boolean;
  dragging?: string | null;
  over?: string | null;
  selected?: string | null;
  onDragStart?: (id: string) => void;
  onDragOver?: (id: string) => void;
  onDrop?: (id: string) => void;
  onDragEnd?: () => void;
  onSelect?: (id: string) => void;
  onArchive?: (id: string) => void;
};

const HANDLE_POS = [
  "-top-1 -left-1",
  "-top-1 -right-1",
  "-bottom-1 -left-1",
  "-bottom-1 -right-1",
  "-top-1 left-1/2 -translate-x-1/2",
  "-bottom-1 left-1/2 -translate-x-1/2",
  "top-1/2 -left-1 -translate-y-1/2",
  "top-1/2 -right-1 -translate-y-1/2",
];

export function dashboardReorderCanvas(editing: boolean) {
  return cn(
    editing &&
      "rounded-2xl bg-slate-100 p-3 [background-image:linear-gradient(to_right,rgb(148_163_184/0.28)_1px,transparent_1px),linear-gradient(to_bottom,rgb(148_163_184/0.28)_1px,transparent_1px)] [background-size:20px_20px]",
  );
}

export function DashboardWidgetSlot({
  id,
  span,
  editing,
  dragging,
  over,
  selected,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onSelect,
  onArchive,
  size = "card",
  children,
}: {
  id: string;
  span: string;
  editing: boolean;
  dragging: string | null;
  over: string | null;
  selected?: string | null;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: (id: string) => void;
  onDragEnd: () => void;
  onSelect?: (id: string) => void;
  onArchive?: (id: string) => void;
  size?: "auto" | "card";
  children: ReactNode;
}) {
  const active = editing && selected === id;
  const dropTarget = editing && over === id && dragging && dragging !== id;

  return (
    <div
      draggable={editing}
      className={cn(
        "relative min-w-0",
        span,
        size === "card" && "h-[22.5rem] overflow-hidden",
        editing && "cursor-grab rounded-xl active:cursor-grabbing",
        editing && dragging === id && "opacity-50",
        active && "z-10 ring-2 ring-sky-500",
        dropTarget && "ring-2 ring-violet-400 ring-offset-2 ring-offset-slate-100",
      )}
      onClick={() => {
        if (editing) onSelect?.(id);
      }}
      onDragStart={(e) => {
        if (!editing) return;
        if ((e.target as HTMLElement).closest("[data-archive]")) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", id);
        onSelect?.(id);
        onDragStart(id);
      }}
      onDragOver={(e) => {
        if (!editing) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver(id);
      }}
      onDrop={(e) => {
        if (!editing) return;
        e.preventDefault();
        onDrop(id);
      }}
      onDragEnd={onDragEnd}
    >
      {active
        ? HANDLE_POS.map((pos) => (
            <span
              key={pos}
              className={cn("pointer-events-none absolute z-20 h-2.5 w-2.5 bg-sky-500", pos)}
            />
          ))
        : null}
      {editing && onArchive ? (
        <button
          type="button"
          data-archive
          aria-label="Archive chart"
          title="Archive chart"
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onClick={(e) => {
            e.stopPropagation();
            onArchive(id);
          }}
          className="absolute top-2 right-2 z-30 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
      <div
        className={cn(
          "h-full min-h-0",
          size === "card" && "overflow-hidden",
          editing && "pointer-events-none select-none",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function DashboardViewGrid({
  items,
  widgetOrder,
  hiddenWidgets = [],
  reordering = false,
  dragging = null,
  over = null,
  selected = null,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onSelect,
  onArchive,
}: {
  items: Record<string, { node: ReactNode; span?: "full" | "third" }>;
} & DashboardReorderProps) {
  const ids = (widgetOrder ?? Object.keys(items)).filter(
    (id) => items[id] && !hiddenWidgets.includes(id),
  );

  return (
    <div className={cn("grid grid-cols-1 gap-3 xl:grid-cols-3", dashboardReorderCanvas(reordering))}>
      {ids.map((id) => {
        const item = items[id];
        if (!item) return null;
        return (
          <DashboardWidgetSlot
            key={id}
            id={id}
            span={item.span === "full" ? "xl:col-span-3" : ""}
            editing={reordering}
            dragging={dragging}
            over={over}
            selected={selected}
            onDragStart={onDragStart ?? (() => undefined)}
            onDragOver={onDragOver ?? (() => undefined)}
            onDrop={onDrop ?? (() => undefined)}
            onDragEnd={onDragEnd ?? (() => undefined)}
            onSelect={onSelect}
            onArchive={onArchive}
            size={item.span === "full" ? "auto" : "card"}
          >
            {item.node}
          </DashboardWidgetSlot>
        );
      })}
    </div>
  );
}
