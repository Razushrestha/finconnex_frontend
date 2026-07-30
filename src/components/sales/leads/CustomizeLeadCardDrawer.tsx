"use client";

import { useEffect, useState } from "react";
import {
  X,
  LayoutGrid,
  List,
  Phone,
  MessageSquare,
  Mail,
  CalendarDays,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface LeadCardCustomizationSettings {
  showEmail: boolean;
  showPhone: boolean;
  showCompany: boolean;
  showTags: boolean;
  layout: "standard" | "compact";
  showBottomIcons: boolean;
}

export const DEFAULT_LEAD_CARD_SETTINGS: LeadCardCustomizationSettings = {
  showEmail: true,
  showPhone: true,
  showCompany: true,
  showTags: false,
  layout: "standard",
  showBottomIcons: true,
};

interface CustomizeLeadCardDrawerProps {
  open: boolean;
  value: LeadCardCustomizationSettings;
  onClose: () => void;
  onSave: (settings: LeadCardCustomizationSettings) => void;
}

export function CustomizeLeadCardDrawer({
  open,
  value,
  onClose,
  onSave,
}: CustomizeLeadCardDrawerProps) {
  const [draft, setDraft] = useState<LeadCardCustomizationSettings>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  if (!open) return null;

  function set<K extends keyof LeadCardCustomizationSettings>(
    key: K,
    val: LeadCardCustomizationSettings[K],
  ) {
    setDraft((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/30"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative flex h-full w-80 flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Customize Lead Card
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 no-scrollbar">
          <section className="space-y-3">
            <SectionLabel>Preview</SectionLabel>
            <div className="rounded-lg bg-slate-50 p-4">
              <LeadCardPreview settings={draft} />
            </div>
          </section>

          <section className="space-y-3">
            <SectionLabel>Information Architecture</SectionLabel>
            <ToggleRow
              label="Show Email"
              checked={draft.showEmail}
              onChange={(v) => set("showEmail", v)}
            />
            <ToggleRow
              label="Show Phone"
              checked={draft.showPhone}
              onChange={(v) => set("showPhone", v)}
            />
            <ToggleRow
              label="Show Company"
              checked={draft.showCompany}
              onChange={(v) => set("showCompany", v)}
            />
            <ToggleRow
              label="Show Tags"
              checked={draft.showTags}
              onChange={(v) => set("showTags", v)}
            />
          </section>

          <section className="space-y-3">
            <SectionLabel>Layout</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <LayoutOption
                icon={LayoutGrid}
                label="Standard"
                active={draft.layout === "standard"}
                onClick={() => set("layout", "standard")}
              />
              <LayoutOption
                icon={List}
                label="Compact"
                active={draft.layout === "compact"}
                onClick={() => set("layout", "compact")}
              />
            </div>
          </section>

          <section className="space-y-3">
            <SectionLabel>Quick Actions</SectionLabel>
            <ToggleRow
              label="Show Bottom Icons"
              checked={draft.showBottomIcons}
              onChange={(v) => set("showBottomIcons", v)}
            />
          </section>
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={() => setDraft(DEFAULT_LEAD_CARD_SETTINGS)}
            className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Reset to Default
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Static mock card driven by the draft settings — intentionally not the
 * real LeadCard (which needs a full view-model, SLA data, drag handlers,
 * etc.). This just needs to look like one and react live to the toggles.
 */
function LeadCardPreview({
  settings,
}: {
  settings: LeadCardCustomizationSettings;
}) {
  const isCompact = settings.layout === "compact";
  const showFields =
    settings.showCompany || settings.showEmail || settings.showPhone;

  return (
    <div
      className={cn(
        "rounded-md border border-slate-200/80 bg-white shadow-2xs",
        isCompact ? "p-2" : "p-3",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4
            className={cn(
              "truncate font-semibold text-slate-900",
              isCompact ? "text-[12px]" : "text-[13px]",
            )}
          >
            Jordan Blake
          </h4>
          {!isCompact && (
            <p className="truncate text-[11px] text-slate-500">
              In Conversation
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600">
          Due Soon
        </span>
      </div>

      {showFields && (
        <dl
          className={cn(
            "space-y-0.5 text-slate-600",
            isCompact ? "mb-1.5 text-[10px]" : "mb-2 text-[11px]",
          )}
        >
          {settings.showCompany && (
            <div className="truncate">Blake Renovations</div>
          )}
          {settings.showEmail && (
            <div className="truncate">jordan.blake@example.com</div>
          )}
          {settings.showPhone && (
            <div className="truncate">+61 400 222 003</div>
          )}
        </dl>
      )}

      {settings.showTags && (
        <div className="mb-2 flex flex-wrap gap-1">
          <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[9px] font-medium text-indigo-600">
            Hot Lead
          </span>
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">
            Referral
          </span>
        </div>
      )}

      {settings.showBottomIcons && (
        <div className="flex items-center gap-1.5 border-t border-slate-100 pt-2">
          {[Phone, MessageSquare, Mail, CalendarDays, CheckSquare].map(
            (Icon, i) => (
              <span
                key={i}
                className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400"
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </p>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-medium text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors",
          checked ? "bg-indigo-600" : "bg-slate-200",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}

function LayoutOption({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border px-4 py-4 transition-colors",
        active
          ? "border-indigo-400 bg-indigo-50/60 text-indigo-700"
          : "border-slate-200 text-slate-600 hover:border-slate-300",
      )}
    >
      <Icon
        className={cn("h-5 w-5", active ? "text-indigo-500" : "text-slate-400")}
      />
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}
