"use client";

import type { ComponentType } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ActivityIconId,
  WorkQueueNavId,
} from "@/lib/work-queue/config";
import type {
  ActivityNavItem,
  WorkQueueTimeFilter,
  WorkqueueSidebarCategory,
} from "@/lib/work-queue/live";

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
  activeItem: WorkQueueNavId;
  onActiveItemChange: (id: WorkQueueNavId) => void;
  activityItems: ActivityNavItem[];
  sidebarCategories: WorkqueueSidebarCategory[];
  timeFilter: WorkQueueTimeFilter;
  onTimeFilterChange: (v: WorkQueueTimeFilter) => void;
  onOpenManage: () => void;
}

function CountBadge({
  count,
  active,
  danger,
}: {
  count: number;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <span
      className={cn(
        "min-w-[22px] rounded-md px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums transition-colors",
        danger
          ? "bg-[var(--wq-danger-soft)] text-[var(--wq-danger)]"
          : active
            ? "bg-[var(--wq-accent-badge)] text-[var(--wq-accent)]"
            : "bg-gray-100 text-gray-500",
      )}
    >
      {count}
    </span>
  );
}

export function WorkQueueSidebar({
  activeItem,
  onActiveItemChange,
  activityItems,
  sidebarCategories,
  timeFilter,
  onTimeFilterChange,
  onOpenManage,
}: WorkQueueSidebarProps) {
  return (
    <aside className="w-full shrink-0 overflow-y-auto border-b border-[var(--wq-line)] bg-[var(--wq-surface)] px-3.5 py-4 sm:px-4 lg:w-[300px] lg:border-r lg:border-b-0">
      {/* My Open Activity */}
      <section className="mb-4 border-b border-[var(--wq-line)] pb-4">
        <h2 className="mb-2.5 px-1.5 text-[13.5px] font-semibold tracking-tight text-gray-900">
          My Open Activity
        </h2>

        <div className="relative mb-2.5">
          <select
            value={timeFilter}
            onChange={(e) =>
              onTimeFilterChange(e.target.value as WorkQueueTimeFilter)
            }
            className="h-9 w-full appearance-none rounded-lg border border-[var(--wq-line)] bg-white px-3 pr-8 text-[12.5px] font-medium text-gray-700 shadow-[0_1px_0_rgba(15,23,42,0.02)] outline-none transition-shadow focus:border-[var(--wq-accent)] focus:ring-2 focus:ring-blue-500/15"
            aria-label="Activity time filter"
          >
            <option value="today-overdue">Today &amp; Overdue</option>
            <option value="today">Today</option>
            <option value="this-week">This Week</option>
            <option value="all">All Open</option>
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        </div>

        <div className="flex flex-col gap-0.5">
          {activityItems.map((item) => {
            const active = activeItem === item.id;
            const Icon = iconMap[item.icon];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onActiveItemChange(item.id)}
                className={cn(
                  "group flex h-9 items-center gap-2 rounded-lg pr-2 pl-1 text-left transition-all duration-150",
                  active
                    ? "bg-[var(--wq-accent-soft)]"
                    : "hover:bg-white/80",
                )}
              >
                <span
                  className={cn(
                    "h-4 w-[3px] rounded-full transition-colors",
                    active ? "bg-[var(--wq-accent)]" : "bg-transparent",
                  )}
                />
                <Icon
                  strokeWidth={1.75}
                  className={cn(
                    "h-[15px] w-[15px] shrink-0 transition-colors",
                    active
                      ? "text-[var(--wq-accent)]"
                      : "text-gray-400 group-hover:text-gray-600",
                  )}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[13.5px] leading-none transition-colors",
                    active
                      ? "font-semibold text-[var(--wq-accent)]"
                      : "font-medium text-gray-800",
                  )}
                >
                  {item.label}
                </span>
                <CountBadge count={item.count} active={active} />
              </button>
            );
          })}
        </div>
      </section>

      {/* My Workqueue */}
      <section>
        <div className="mb-2.5 flex items-center justify-between px-1.5">
          <h2 className="text-[13.5px] font-semibold tracking-tight text-gray-900">
            My Workqueue
          </h2>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label="Manage Queue"
              onClick={onOpenManage}
              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-white hover:text-gray-700"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Add workqueue view"
              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-white hover:text-gray-700"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {sidebarCategories.map((cat) => (
            <div key={cat.id} className="flex flex-col gap-0.5">
              <div className="px-1.5 pb-1 text-[11px] font-semibold tracking-[0.06em] text-gray-400 uppercase">
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
                      "flex h-8 items-center gap-2 rounded-lg px-2 text-left transition-all duration-150",
                      active
                        ? "bg-[var(--wq-accent-soft)]"
                        : "hover:bg-white/80",
                    )}
                  >
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-[13px] leading-none transition-colors",
                        active
                          ? "font-semibold text-[var(--wq-accent)]"
                          : "font-medium text-gray-800",
                      )}
                    >
                      {item.label}
                    </span>
                    <CountBadge
                      count={item.count}
                      active={active}
                      danger={item.danger}
                    />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
