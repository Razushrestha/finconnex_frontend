"use client";

import type { ReactNode } from "react";
import {
  Briefcase,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  Clock,
  FileCheck,
  Send,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";
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
] as const;

export type ConsultationSetupStepId =
  (typeof CONSULTATION_SETUP_STEPS)[number]["id"];

export const AVAILABILITY_PANELS = [
  {
    id: "dates",
    title: "Available Dates and Times",
    icon: Clock,
  },
  {
    id: "limits",
    title: "Appointment Limits",
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
  children,
}: {
  current: ConsultationSetupStepId;
  furthest: number;
  onSelect: (id: ConsultationSetupStepId) => void;
  availabilityPanel?: AvailabilityPanelId;
  onAvailabilityPanel?: (id: AvailabilityPanelId) => void;
  children: ReactNode;
}) {
  const availabilityOpen = current === "availability";

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
                    step.id === "availability" ? (
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                          availabilityOpen && "rotate-180 text-[#5A32A3]",
                        )}
                      />
                    ) : undefined
                  }
                  onClick={() => {
                    if (!reached) return;
                    onSelect(step.id);
                    if (step.id === "availability") onAvailabilityPanel?.("dates");
                  }}
                />
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
        "grid w-full items-center gap-x-3 rounded-lg px-2.5 text-left transition",
        nested
          ? "h-10 grid-cols-[2rem_2rem_minmax(0,1fr)_2rem]"
          : "h-11 grid-cols-[2rem_minmax(0,1fr)_2rem]",
        active
          ? "bg-[#F3ECFB]"
          : reached
            ? "hover:bg-slate-50"
            : "cursor-default opacity-55",
      )}
    >
      {nested ? <span className="h-8 w-8" aria-hidden /> : null}
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center justify-self-center rounded-md",
          active ? "bg-white text-[#5A32A3]" : "bg-slate-100 text-slate-500",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
      </span>
      <span
        className={cn(
          "min-w-0 truncate text-[13px] font-semibold",
          active ? "text-[#5A32A3]" : nested ? "text-slate-600" : "text-slate-800",
        )}
      >
        {title}
      </span>
      <span className="flex h-8 w-8 items-center justify-center justify-self-center">
        {trailing ?? null}
      </span>
    </button>
  );
}
