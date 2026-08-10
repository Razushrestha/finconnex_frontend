"use client";

import { useState, type ComponentType } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import type { ActivityIconId, WorkQueueNavId } from "@/lib/work-queue/config";
import type {
  ActivityNavItem,
  WorkQueueTimeFilter,
  WorkqueueSidebarCategory,
} from "@/lib/work-queue/live";
import CreateQueueModal, { QueuePayload } from "./CreateQueueModal";

const iconMap: Record<
  ActivityIconId,
  ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  "check-circle": CheckCircle2,
  phone: Phone,
  calendar: CalendarDays,
  mail: Mail,
  message: MessageSquare,
  bell: Bell,
};

interface WorkQueueSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeItem: WorkQueueNavId;
  onActiveItemChange: (id: WorkQueueNavId) => void;
  activityItems: ActivityNavItem[];
  sidebarCategories: WorkqueueSidebarCategory[];
  timeFilter: WorkQueueTimeFilter;
  onTimeFilterChange: (v: WorkQueueTimeFilter) => void;
  onOpenManage: () => void;
}

function Count({ count, active }: { count: number; active?: boolean }) {
  if (count <= 0) {
    return <span className="text-[12px] tabular-nums text-slate-300">0</span>;
  }
  return (
    <span
      className={cn(
        "text-[12px] font-semibold tabular-nums transition-colors",
        active ? "text-[var(--wq-accent)]" : "text-slate-500",
      )}
    >
      {count}
    </span>
  );
}

export function WorkQueueSidebar({
  collapsed,
  onToggleCollapse,
  activeItem,
  onActiveItemChange,
  activityItems,
  sidebarCategories,
  timeFilter,
  onTimeFilterChange,
  onOpenManage,
}: WorkQueueSidebarProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [specificDateValue, setSpecificDateValue] = useState<string | null>(
    null,
  );
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);

  function handleSaveQueue(payload: QueuePayload) {
    console.log("New queue:", payload);
    setIsQueueModalOpen(false);
  }

  const formattedSelectedDate = selectedDate
    ? selectedDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const currentSelectValue =
    timeFilter === "specific-date" && specificDateValue
      ? specificDateValue
      : timeFilter;

  if (collapsed) {
    return (
      <aside className="flex w-11 shrink-0 flex-col items-center border-b border-[var(--wq-line)] bg-white py-3 lg:border-r lg:border-b-0">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          className="flex h-8 w-8 items-center justify-center text-slate-400 transition-colors hover:text-slate-700"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="mt-4 flex flex-col items-center gap-1">
          {activityItems.map((item) => {
            const active = activeItem === item.id;
            const Icon = iconMap[item.icon];
            return (
              <button
                key={item.id}
                type="button"
                title={`${item.label} (${item.count})`}
                aria-label={item.label}
                onClick={() => onActiveItemChange(item.id)}
                className={cn(
                  "relative flex h-8 w-8 items-center justify-center transition-colors",
                  active
                    ? "text-[var(--wq-accent)]"
                    : "text-slate-400 hover:text-slate-700",
                )}
              >
                <Icon strokeWidth={1.75} className="h-4 w-4" />
                {item.count > 0 ? (
                  <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-[var(--wq-accent)]" />
                ) : null}
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  return (
    <div className="relative flex">
      <aside className="w-full shrink-0 overflow-y-auto border-b border-[var(--wq-line)] bg-white px-3 py-3 sm:px-4 lg:w-[248px] lg:border-r lg:border-b-0">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
            Open activity
          </h2>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Minimize sidebar"
            title="Minimize sidebar"
            className="flex h-7 w-7 items-center justify-center text-slate-400 transition-colors hover:text-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mb-3">
          <select
            value={currentSelectValue}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "specific-date") {
                setIsCalendarOpen(true);
              } else {
                setIsCalendarOpen(false);
                setSpecificDateValue(null);
                onTimeFilterChange(value as WorkQueueTimeFilter);
              }
            }}
            className="h-8 w-full appearance-none border-0 border-b border-[var(--wq-line)] bg-transparent pr-6 text-[12.5px] font-medium text-slate-700 outline-none focus:border-slate-400"
            aria-label="Activity time filter"
          >
            <option value="today-overdue">Today &amp; Overdue</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="overdue">Overdue</option>
            <option value="this-week">This Week</option>
            <option value="next-week">Next Week</option>
            <option value="this-month">This Month</option>
            <option value="next-month">Next Month</option>
            {specificDateValue ? (
              <option value={specificDateValue}>{formattedSelectedDate}</option>
            ) : null}
            <option value="specific-date">On a Specific Date…</option>
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-0 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>

        <nav className="mb-5 flex flex-col" aria-label="Open activity">
          {activityItems.map((item) => {
            const active = activeItem === item.id;
            const Icon = iconMap[item.icon];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onActiveItemChange(item.id)}
                className={cn(
                  "group flex h-8 items-center gap-2.5 border-l-2 pl-2.5 text-left transition-colors",
                  active
                    ? "border-[var(--wq-accent)] text-[var(--wq-accent)]"
                    : "border-transparent text-slate-600 hover:text-slate-900",
                )}
              >
                <Icon
                  strokeWidth={1.75}
                  className={cn(
                    "h-[15px] w-[15px] shrink-0",
                    active
                      ? "text-[var(--wq-accent)]"
                      : "text-slate-400 group-hover:text-slate-600",
                  )}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[13px] leading-none",
                    active ? "font-semibold" : "font-medium",
                  )}
                >
                  {item.label}
                </span>
                <Count count={item.count} active={active} />
              </button>
            );
          })}
        </nav>

        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
            My queues
          </h2>
          <div className="flex items-center">
            <button
              type="button"
              aria-label="Manage Queue"
              title="Manage queues"
              onClick={onOpenManage}
              className="flex h-7 w-7 items-center justify-center text-slate-400 transition-colors hover:text-slate-700"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Add workqueue view"
              title="Add queue"
              onClick={() => setIsQueueModalOpen(true)}
              className="flex h-7 w-7 items-center justify-center text-slate-400 transition-colors hover:text-slate-700"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {sidebarCategories.map((cat) => (
            <div key={cat.id} className="flex flex-col">
              <div className="mb-1 px-0.5 text-[11px] font-medium text-slate-400">
                {cat.label}
              </div>
              {cat.items.map((item) => {
                const active = activeItem === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onActiveItemChange(item.id)}
                    className={cn(
                      "flex h-8 items-center gap-2 border-l-2 pl-2.5 text-left transition-colors",
                      active
                        ? "border-[var(--wq-accent)] text-[var(--wq-accent)]"
                        : "border-transparent text-slate-600 hover:text-slate-900",
                    )}
                  >
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-[13px] leading-none",
                        active ? "font-semibold" : "font-medium",
                      )}
                    >
                      {item.label}
                    </span>
                    <Count count={item.count} active={active} />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      {isCalendarOpen ? (
        <div className="absolute top-2 left-full z-50 ml-2 w-auto border border-[var(--wq-line)] bg-white p-3 shadow-lg">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-none border-0"
          />
          <div className="my-2 h-px bg-[var(--wq-line)]" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCalendarOpen(false)}
              className="flex-1 py-1.5 text-center text-[12px] font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedDate) {
                  const customValue = `date-${selectedDate.toISOString()}`;
                  setSpecificDateValue(customValue);
                  onTimeFilterChange("specific-date" as WorkQueueTimeFilter);
                }
                setIsCalendarOpen(false);
              }}
              className="flex-1 bg-[var(--wq-accent)] py-1.5 text-center text-[12px] font-semibold text-white hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}

      <CreateQueueModal
        open={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
        onSave={handleSaveQueue}
      />
    </div>
  );
}
