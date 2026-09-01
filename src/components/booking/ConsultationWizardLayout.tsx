"use client";

import type { ReactNode } from "react";
import {
  Briefcase,
  ClipboardList,
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
    description: "Set the duration, payment type, and meeting mode.",
    icon: ClipboardList,
  },
  {
    id: "consultants",
    title: "Assigned Consultants",
    description: "Choose consultants who offer this consultation.",
    icon: Users,
  },
  {
    id: "rules",
    title: "Scheduling Rules",
    description: "Set buffers, notices, intervals, and booking limits.",
    icon: Briefcase,
  },
  {
    id: "form",
    title: "Booking Form",
    description: "Collect customer information during booking.",
    icon: FileCheck,
  },
  {
    id: "notify",
    title: "Notification Preferences",
    description: "Configure email, SMS, WhatsApp, and in-app alerts.",
    icon: Send,
  },
  {
    id: "settings",
    title: "Additional settings",
    description: "Reschedule, cancellation, and invite options.",
    icon: SlidersHorizontal,
  },
] as const;

export type ConsultationSetupStepId =
  (typeof CONSULTATION_SETUP_STEPS)[number]["id"];

export function consultationSetupIndex(id: ConsultationSetupStepId) {
  return CONSULTATION_SETUP_STEPS.findIndex((step) => step.id === id);
}

export function ConsultationWizardLayout({
  current,
  furthest,
  onSelect,
  children,
}: {
  current: ConsultationSetupStepId;
  furthest: number;
  onSelect: (id: ConsultationSetupStepId) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden lg:flex-row lg:items-stretch lg:gap-8">
      <aside className="w-full shrink-0 lg:max-h-full lg:w-[260px] lg:overflow-y-auto">
        <nav className="rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          {CONSULTATION_SETUP_STEPS.map((step, index) => (
            <SidebarItem
              key={step.id}
              icon={step.icon}
              title={step.title}
              description={step.description}
              active={step.id === current}
              reached={index <= furthest}
              onClick={() => {
                if (index <= furthest) onSelect(step.id);
              }}
            />
          ))}
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
  description,
  active,
  reached,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  active: boolean;
  reached: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!reached}
      className={cn(
        "flex w-full gap-3 rounded-lg px-3 py-3 text-left transition",
        active
          ? "bg-[#F3ECFB]"
          : reached
            ? "hover:bg-slate-50"
            : "cursor-default opacity-55",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          active ? "bg-white text-[#5A32A3]" : "bg-slate-50 text-slate-400",
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block text-[13px] font-semibold",
            active ? "text-[#5A32A3]" : "text-slate-800",
          )}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
          {description}
        </span>
      </span>
    </button>
  );
}
