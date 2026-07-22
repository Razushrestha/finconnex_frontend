"use client";

import {
  CalendarDays,
  ClipboardList,
  FolderTree,
  Phone,
  Plus,
  Settings2,
  Tags,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MY_WORKQUEUE_ITEMS,
  OPEN_ACTIVITY_ITEMS,
  type WorkQueueNavItem,
} from "@/lib/work-queue/data";

const iconMap = {
  clipboard: ClipboardList,
  calendar: CalendarDays,
  phone: Phone,
  leads: FolderTree,
  tag: Tags,
} as const;

interface WorkQueueSidebarProps {
  activeItem: string;
  onActiveItemChange: (id: string) => void;
  onClose?: () => void;
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
      {count}
    </span>
  );
}

function NavRow({
  item,
  active,
  onClick,
}: {
  item: WorkQueueNavItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = iconMap[item.icon];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors",
        active
          ? "bg-violet-50 font-medium text-violet-700"
          : "text-slate-700 hover:bg-slate-50",
      )}
    >
      <Icon
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          active ? "text-violet-600" : "text-slate-500",
        )}
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      <CountBadge count={item.count} />
    </button>
  );
}

export function WorkQueueSidebar({
  activeItem,
  onActiveItemChange,
  onClose,
}: WorkQueueSidebarProps) {
  return (
    <aside className="flex w-full shrink-0 flex-col rounded-xl border border-slate-100 bg-white lg:w-[250px]">
      <div className="border-b border-slate-100 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-[12px] font-semibold text-slate-900">
            My Open Activity
          </h2>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close activity panel"
              className="rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span className="rounded-md p-0.5 text-slate-300">
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </div>

        <div className="relative">
          <select
            defaultValue="today-overdue"
            className="h-8 w-full appearance-none rounded-md border border-slate-200 bg-white px-2.5 pr-8 text-[10px] font-semibold tracking-wide text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
            aria-label="Activity time filter"
          >
            <option value="today-overdue">TODAY &amp; OVERDUE</option>
            <option value="today">TODAY</option>
            <option value="this-week">THIS WEEK</option>
            <option value="all">ALL OPEN</option>
          </select>
          <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[10px] text-slate-400">
            ▾
          </span>
        </div>

        <div className="mt-1.5 space-y-0.5">
          {OPEN_ACTIVITY_ITEMS.map((item) => (
            <NavRow
              key={item.id}
              item={item}
              active={activeItem === item.id}
              onClick={() => onActiveItemChange(item.id)}
            />
          ))}
        </div>
      </div>

      <div className="p-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h2 className="text-[12px] font-semibold text-slate-900">My Workqueue</h2>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label="Workqueue settings"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <Settings2 className="h-3 w-3" />
            </button>
            <button
              type="button"
              aria-label="Add workqueue view"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="space-y-0.5">
          {MY_WORKQUEUE_ITEMS.map((item) => (
            <NavRow
              key={item.id}
              item={item}
              active={activeItem === item.id}
              onClick={() => onActiveItemChange(item.id)}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
