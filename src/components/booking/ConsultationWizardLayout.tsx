"use client";

import type { ReactNode } from "react";
import {
  Briefcase,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  Clock,
  FileCheck,
  LayoutTemplate,
  Send,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  NOTIFY_PANELS,
  type NotifyPanelId,
} from "@/components/booking/ConsultationNotifyPanel";
import { cn } from "@/lib/utils";

export const CONSULTATION_SETUP_STEPS = [
  {
    id: "details",
    title: "Consultation Details",
    icon: ClipboardList,
  },
  {
    id: "consultants",
    title: "Assigned Consultants",
    icon: Users,
  },
  {
    id: "availability",
    title: "Availability and Limits",
    icon: Clock,
  },
  {
    id: "rules",
    title: "Scheduling Rules",
    icon: Briefcase,
  },
  {
    id: "form",
    title: "Booking Form",
    icon: FileCheck,
  },
  {
    id: "notify",
    title: "Notification Preferences",
    icon: Send,
  },
  {
    id: "settings",
    title: "Additional settings",
    icon: SlidersHorizontal,
  },
  {
    id: "page",
    title: "Booking Page",
    icon: LayoutTemplate,
  },
] as const;

export type ConsultationSetupStepId =
  (typeof CONSULTATION_SETUP_STEPS)[number]["id"];

export const AVAILABILITY_PANELS = [
  {
    id: "dates",
    title: "Dates and times",
    icon: Clock,
  },
  {
    id: "limits",
    title: "Appointment limits",
    icon: CalendarClock,
  },
] as const;

export type AvailabilityPanelId = (typeof AVAILABILITY_PANELS)[number]["id"];

export function consultationSetupIndex(id: ConsultationSetupStepId) {
  return CONSULTATION_SETUP_STEPS.findIndex((step) => step.id === id);
}

export function ConsultationWizardLayout({
  current,
  furthest,
  onSelect,
  availabilityPanel = "dates",
  onAvailabilityPanel,
  notifyPanel = "email",
  onNotifyPanel,
  children,
}: {
  current: ConsultationSetupStepId;
  furthest: number;
  onSelect: (id: ConsultationSetupStepId) => void;
  availabilityPanel?: AvailabilityPanelId;
  onAvailabilityPanel?: (id: AvailabilityPanelId) => void;
  notifyPanel?: NotifyPanelId;
  onNotifyPanel?: (id: NotifyPanelId) => void;
  children: ReactNode;
}) {
  const availabilityOpen = current === "availability";
  const notifyOpen = current === "notify";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden lg:flex-row lg:items-stretch lg:gap-8">
      <aside className="w-full shrink-0 lg:max-h-full lg:w-[280px] lg:overflow-y-auto">
        <nav className="rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          {CONSULTATION_SETUP_STEPS.map((step, index) => {
            const reached = index <= furthest;
            return (
              <div key={step.id} className="flex flex-col">
                <SidebarItem
                  icon={step.icon}
                  title={step.title}
                  active={step.id === current}
                  reached={reached}
                  trailing={
                    step.id === "availability" || step.id === "notify" ? (
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                          (step.id === "availability" ? availabilityOpen : notifyOpen) &&
                            "rotate-180 text-[var(--brand-primary)]",
                        )}
                      />
                    ) : undefined
                  }
                  onClick={() => {
                    if (!reached) return;
                    onSelect(step.id);
                    if (step.id === "availability") onAvailabilityPanel?.("dates");
                    if (step.id === "notify") onNotifyPanel?.("email");
                  }}
                />
                {step.id === "notify" && notifyOpen ? (
                  <div className="flex flex-col gap-0.5 px-0 pb-1">
                    {NOTIFY_PANELS.map((panel) => (
                      <SidebarItem
                        key={panel.id}
                        icon={panel.icon}
                        title={panel.title}
                        nested
                        active={notifyPanel === panel.id}
                        reached
                        onClick={() => onNotifyPanel?.(panel.id)}
                      />
                    ))}
                  </div>
                ) : null}
                {step.id === "availability" && availabilityOpen ? (
                  <div className="flex flex-col gap-0.5 px-0 pb-1">
                    {AVAILABILITY_PANELS.map((panel) => (
                      <SidebarItem
                        key={panel.id}
                        icon={panel.icon}
                        title={panel.title}
                        nested
                        active={availabilityPanel === panel.id}
                        reached
                        onClick={() => onAvailabilityPanel?.(panel.id)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

function SidebarItem({
  icon: Icon,
  title,
  active,
  reached,
  nested = false,
  trailing,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  active: boolean;
  reached: boolean;
  nested?: boolean;
  trailing?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!reached}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg text-left transition",
        nested ? "py-2 pr-2.5 pl-12" : "h-11 px-2.5",
        active
          ? "bg-[var(--brand-primary-soft)]"
          : reached
            ? "hover:bg-slate-50"
            : "cursor-default opacity-55",
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md",
          nested ? "h-7 w-7" : "h-8 w-8",
          active ? "bg-white text-[var(--brand-primary)]" : "bg-slate-100 text-slate-500",
        )}
      >
        <Icon className={nested ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={2} />
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 font-semibold leading-snug",
          nested ? "text-[12px]" : "truncate text-[13px]",
          active ? "text-[var(--brand-primary)]" : nested ? "text-slate-600" : "text-slate-800",
        )}
      >
        {title}
      </span>
      {trailing ? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center">
          {trailing}
        </span>
      ) : null}
    </button>
  );
}
