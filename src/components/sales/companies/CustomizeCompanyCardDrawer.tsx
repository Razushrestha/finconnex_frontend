"use client";

import { useEffect, useState } from "react";
import {
  X,
  LayoutGrid,
  List,
  Globe,
  Building2,
  Phone,
  DollarSign,
  PhoneCall,
  Mail,
  MessageSquare,
  StickyNote,
  CheckSquare,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { entityCardShell } from "@/lib/motion";
import { CardOwnerRow } from "@/components/shared/CardInitialsAvatar";

export interface CompanyCardCustomizationSettings {
  showWebsite: boolean;
  showIndustry: boolean;
  showPhone: boolean;
  showOwner: boolean;
  showAnnualRevenue: boolean;
  showCity: boolean;
  layout: "standard" | "compact";
  showBottomIcons: boolean;
}

export const DEFAULT_COMPANY_CARD_SETTINGS: CompanyCardCustomizationSettings = {
  showWebsite: true,
  showIndustry: true,
  showPhone: true,
  showOwner: true,
  showAnnualRevenue: true,
  showCity: false,
  layout: "standard",
  showBottomIcons: true,
};

interface CustomizeCompanyCardDrawerProps {
  open: boolean;
  value: CompanyCardCustomizationSettings;
  onClose: () => void;
  onSave: (settings: CompanyCardCustomizationSettings) => void;
}

export function CustomizeCompanyCardDrawer({
  open,
  value,
  onClose,
  onSave,
}: CustomizeCompanyCardDrawerProps) {
  const [draft, setDraft] = useState<CompanyCardCustomizationSettings>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  if (!open) return null;

  function set<K extends keyof CompanyCardCustomizationSettings>(
    key: K,
    val: CompanyCardCustomizationSettings[K],
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
            Customize Company Card
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
              <CompanyCardPreview settings={draft} />
            </div>
          </section>

          <section className="space-y-3">
            <SectionLabel>Information Architecture</SectionLabel>
            <ToggleRow
              label="Show Website"
              checked={draft.showWebsite}
              onChange={(v) => set("showWebsite", v)}
            />
            <ToggleRow
              label="Show Industry"
              checked={draft.showIndustry}
              onChange={(v) => set("showIndustry", v)}
            />
            <ToggleRow
              label="Show Phone"
              checked={draft.showPhone}
              onChange={(v) => set("showPhone", v)}
            />
            <ToggleRow
              label="Show Owner"
              checked={draft.showOwner}
              onChange={(v) => set("showOwner", v)}
            />
            <ToggleRow
              label="Show Annual Revenue"
              checked={draft.showAnnualRevenue}
              onChange={(v) => set("showAnnualRevenue", v)}
            />
            <ToggleRow
              label="Show City"
              checked={draft.showCity}
              onChange={(v) => set("showCity", v)}
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
            onClick={() => setDraft(DEFAULT_COMPANY_CARD_SETTINGS)}
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

function CompanyCardPreview({
  settings,
  company,
}: {
  settings: CompanyCardCustomizationSettings;
  company?: {
    name?: string;
    initials?: string;
    avatarBgClass?: string;
    website?: string;
    industry?: string;
    phone?: string;
    owner?: string;
    annualRevenue?: string;
    city?: string;
  };
}) {
  const isCompact = settings.layout === "compact";

  const companyName = company?.name || "Northwind Traders";
  const companyWebsite = company?.website || "northwind.com";
  const companyIndustry = company?.industry || "Wholesale";
  const companyPhone = company?.phone || "+61 2 9000 1001";
  const companyOwner = company?.owner || "John Smith";
  const companyAnnualRevenue = company?.annualRevenue || "$4.2M";
  const companyCity = company?.city || "Sydney";

  const showFields =
    (settings.showWebsite && companyWebsite) ||
    (settings.showIndustry && companyIndustry) ||
    (settings.showPhone && companyPhone) ||
    (settings.showOwner && companyOwner) ||
    (settings.showAnnualRevenue && companyAnnualRevenue) ||
    (settings.showCity && companyCity);

  return (
    <div
      className={cn(entityCardShell, isCompact ? "p-2.5" : null)}
    >
      <div className={cn(isCompact ? "mb-2" : "mb-3")}>
        <h4
          className={cn(
            "truncate font-semibold text-slate-800",
            isCompact ? "text-[12px]" : "text-[13px]",
          )}
        >
          {companyName}
        </h4>
      </div>

      {showFields && (
        <div
          className={cn(
            "space-y-1.5 text-slate-500",
            isCompact ? "text-[10px]" : "text-[11px]",
          )}
        >
          {settings.showWebsite && companyWebsite && (
            <div className="flex items-center gap-2">
              <Globe className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">{companyWebsite}</span>
            </div>
          )}
          {settings.showIndustry && companyIndustry && (
            <div className="flex items-center gap-2">
              <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate font-medium text-slate-700">
                {companyIndustry}
              </span>
            </div>
          )}
          {settings.showPhone && companyPhone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3 shrink-0 text-slate-400" />
              <span>{companyPhone}</span>
            </div>
          )}
          {settings.showOwner && companyOwner && (
            <CardOwnerRow name={companyOwner} />
          )}
          {settings.showAnnualRevenue && companyAnnualRevenue && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-3 w-3 shrink-0 text-slate-400" />
              <span>{companyAnnualRevenue}</span>
            </div>
          )}
          {settings.showCity && companyCity && (
            <div className="flex items-center gap-2">
              <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
              <span>{companyCity}</span>
            </div>
          )}
        </div>
      )}

      {(settings.showIndustry || settings.showBottomIcons) && (
        <>
          <div
            className={cn(
              "border-t border-slate-100",
              isCompact ? "my-2" : "my-3",
            )}
          />
          <div className="flex items-center justify-between gap-1">
            {settings.showIndustry && companyIndustry ? (
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                {companyIndustry}
              </span>
            ) : (
              <span />
            )}
            {settings.showBottomIcons && (
              <div className="flex items-center gap-0.5">
                {[
                  PhoneCall,
                  Mail,
                  MessageSquare,
                  StickyNote,
                  CheckSquare,
                  CalendarDays,
                ].map((Icon, i) => (
                  <span
                    key={i}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400"
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
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
