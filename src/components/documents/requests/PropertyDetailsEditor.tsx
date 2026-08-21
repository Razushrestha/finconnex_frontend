"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ChevronDown,
  House,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PROPERTY_TYPES = [
  "Apartment / Unit",
  "Vacant land",
  "Free standing house",
  "Villa",
  "Terrace",
  "Townhouse",
  "Duplex",
  "Studio",
] as const;

const PROPERTY_DESCRIPTIONS = [
  "Existing property",
  "Newly built / Off the plan",
] as const;

const PROPERTY_USAGES = ["To live-in", "As an investment"] as const;

export interface PropertyDetails {
  address: string;
  value: string;
  type: string;
  description: string;
  usage: string;
  ownership: string;
}

export const emptyPropertyDetails = (): PropertyDetails => ({
  address: "",
  value: "",
  type: "",
  description: "",
  usage: "",
  ownership: "",
});

type OpenMenu = "type" | "description" | "usage" | "assets" | null;

function FormSelect({
  value,
  options,
  onChange,
  open,
  onOpenChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <div className="relative" data-property-menu="">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border bg-slate-50 px-3 text-left text-[13px] outline-none",
          open
            ? "border-[#5A32A3] bg-[#F3ECFB]"
            : "border-slate-200 text-slate-800",
          !value && "text-slate-400",
        )}
      >
        <span className="truncate">{value || "Select an option"}</span>
        <span
          className={cn(
            "ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
            open ? "bg-[#EDE4FB] text-[#5A32A3]" : "text-slate-400",
          )}
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5", open && "rotate-180")}
          />
        </span>
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-[calc(100%+4px)] z-30 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                onOpenChange(false);
              }}
              className="block w-full px-3 py-2 text-left text-[13px] text-slate-800 hover:bg-[#F3ECFB]"
            >
              {opt}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FormRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 items-center gap-1.5 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)] sm:gap-6">
      <p className="text-[13px] font-medium text-slate-800">{label}</p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function PropertyDetailsEditor({
  title,
  value,
  onChange,
  onCancel,
  onUpdate,
}: {
  title: string;
  value: PropertyDetails;
  onChange: (next: PropertyDetails) => void;
  onCancel: () => void;
  onUpdate: () => void;
}) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);

  useEffect(() => {
    if (!openMenu) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-property-menu]")) return;
      setOpenMenu(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenu(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  function set<K extends keyof PropertyDetails>(key: K, v: PropertyDetails[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="rounded-xl bg-white px-1 py-1 sm:px-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F3ECFB] text-[#5A32A3]">
            <House className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-[16px] font-bold text-slate-900">{title}</h3>
            <p className="mt-0.5 text-[12px] text-slate-500">
              To save a property please add at least the address.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-1.5">
          <div className="relative" data-property-menu="">
            <button
              type="button"
              onClick={() =>
                setOpenMenu((v) => (v === "assets" ? null : "assets"))
              }
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#5A32A3] bg-white px-3 text-[12px] font-semibold text-slate-800"
            >
              Pre-fill from assets
              <ChevronDown className="h-3.5 w-3.5 text-[#5A32A3]" />
            </button>
            {openMenu === "assets" ? (
              <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    set("address", "12 Example Street, Melbourne VIC 3000");
                    setOpenMenu(null);
                  }}
                  className="block w-full px-3 py-2 text-left text-[12px] hover:bg-[#F3ECFB]"
                >
                  Use saved asset address
                </button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => set("address", "")}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[#F3ECFB] px-3 text-[12px] font-semibold text-slate-800"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#5A32A3] text-white">
              <Plus className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
            Add a new address
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-3.5">
        <FormRow label="Property address">
          <div className="relative">
            <input
              value={value.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Search address"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pr-10 pl-3 text-[13px] outline-none placeholder:text-slate-400 focus:border-[#5A32A3]/45 focus:bg-white focus:ring-2 focus:ring-[#5A32A3]/12"
            />
            <Search className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </FormRow>

        <div className="overflow-hidden rounded-xl border border-slate-100 sm:ml-[224px]">
          <div className="flex items-stretch">
            <div className="flex w-16 shrink-0 items-center justify-center bg-[#F3ECFB] text-[#5A32A3] sm:w-20">
              <House className="h-7 w-7" />
            </div>
            <p className="px-3 py-2.5 text-[12px] leading-snug text-slate-600">
              We&apos;ll pre-fill the property details below using property
              market data. Powered by:{" "}
              <span className="font-semibold text-slate-800">cotality</span>
            </p>
          </div>
        </div>

        <FormRow label="Estimated property value">
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-slate-400">
              $
            </span>
            <input
              inputMode="decimal"
              value={value.value}
              onChange={(e) =>
                set("value", e.target.value.replace(/[^\d.]/g, ""))
              }
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-7 text-[13px] outline-none focus:border-[#5A32A3]/45 focus:bg-white focus:ring-2 focus:ring-[#5A32A3]/12"
            />
          </div>
        </FormRow>

        <FormRow label="Property type">
          <FormSelect
            value={value.type}
            options={PROPERTY_TYPES}
            onChange={(v) => set("type", v)}
            open={openMenu === "type"}
            onOpenChange={(open) => setOpenMenu(open ? "type" : null)}
          />
        </FormRow>

        <FormRow label="Property description">
          <FormSelect
            value={value.description}
            options={PROPERTY_DESCRIPTIONS}
            onChange={(v) => set("description", v)}
            open={openMenu === "description"}
            onOpenChange={(open) => setOpenMenu(open ? "description" : null)}
          />
        </FormRow>

        <FormRow label="Intended property usage">
          <FormSelect
            value={value.usage}
            options={PROPERTY_USAGES}
            onChange={(v) => set("usage", v)}
            open={openMenu === "usage"}
            onOpenChange={(open) => setOpenMenu(open ? "usage" : null)}
          />
        </FormRow>

        <FormRow label="Share of ownership">
          <div className="relative">
            <input
              inputMode="decimal"
              value={value.ownership}
              onChange={(e) =>
                set("ownership", e.target.value.replace(/[^\d.]/g, ""))
              }
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pr-10 pl-3 text-[13px] outline-none focus:border-[#5A32A3]/45 focus:bg-white focus:ring-2 focus:ring-[#5A32A3]/12"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-slate-400">
              %
            </span>
          </div>
        </FormRow>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-800 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onUpdate}
          className="inline-flex h-9 items-center rounded-lg bg-slate-900 px-4 text-[13px] font-semibold text-white hover:bg-black"
        >
          Update
        </button>
      </div>
    </div>
  );
}
