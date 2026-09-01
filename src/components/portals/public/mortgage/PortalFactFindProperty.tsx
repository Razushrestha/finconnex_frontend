"use client";

import { useState } from "react";
import { Home, Plus, X } from "lucide-react";
import { CurrencyInput } from "@/components/portals/public/mortgage/CurrencyInput";
import { GeoAddressField } from "@/components/portals/public/mortgage/GeoAddressField";
import {
  PROPERTY_USAGE_OPTIONS,
  isAuPostcode,
  normalizePropertyUsage,
  parsePropertyPostcodes,
} from "@/lib/portals/mortgage";
import { cn } from "@/lib/utils";

const inputClass =
  "h-12 w-full rounded-lg bg-white px-3.5 text-[14px] text-slate-900 shadow-[0_2px_10px_rgba(15,23,42,0.07)] outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-[#5A32A3] disabled:bg-slate-50";

export function PortalFactFindProperty({
  valueOf,
  disabled,
  showErrors,
  onChange,
}: {
  valueOf: (id: string) => string;
  disabled: boolean;
  showErrors?: boolean;
  onChange: (id: string, value: string) => void;
}) {
  const usage = normalizePropertyUsage(valueOf("purpose"));
  const inMind = valueOf("hasPropertyInMind");
  const postcodes = parsePropertyPostcodes(valueOf("propertyPostcodes"));
  const [draftCode, setDraftCode] = useState("");
  const usageMissing = Boolean(showErrors && !usage);
  const mindMissing = Boolean(showErrors && !inMind);
  const addressMissing = Boolean(
    showErrors && inMind === "Yes" && (!valueOf("propertySearchAddress").trim() || valueOf("propertySearchGeo") !== "1"),
  );
  const valueMissing = Boolean(showErrors && !valueOf("purchasePrice").trim());

  function addPostcode(raw = draftCode) {
    const next = raw.trim();
    if (!isAuPostcode(next) || postcodes.includes(next)) return;
    onChange("propertyPostcodes", JSON.stringify([...postcodes, next]));
    setDraftCode("");
  }

  return (
    <div className="mt-7 space-y-6">
      <div data-invalid={usageMissing || undefined}>
        <span className={cn("mb-2.5 block text-[15px] font-bold", usageMissing ? "text-rose-700" : "text-slate-900")}>
          How do you plan on using the property?
        </span>
        <div className="grid gap-3 sm:grid-cols-2">
          {PROPERTY_USAGE_OPTIONS.map((opt) => {
            const active = usage === opt;
            return (
              <button
                key={opt}
                type="button"
                disabled={disabled}
                onClick={() => onChange("purpose", opt)}
                className={cn(
                  "flex h-[88px] flex-col items-center justify-center gap-2 rounded-2xl text-[14px] font-semibold transition-colors",
                  active
                    ? "bg-[#EDE4F7] text-[#5A32A3] ring-1 ring-[#5A32A3]/30"
                    : "bg-white text-slate-700 shadow-[0_2px_10px_rgba(15,23,42,0.07)] ring-1 ring-black/5 hover:bg-violet-50",
                  usageMissing && "ring-2 ring-rose-400",
                )}
              >
                {opt === "To live-in" ? <Home className="h-5 w-5" /> : <MoneyBagIcon />}
                {opt}
              </button>
            );
          })}
        </div>
        {usageMissing ? <p className="mt-1.5 text-[12px] font-medium text-rose-600">Required</p> : null}
      </div>

      <div data-invalid={mindMissing || undefined}>
        <span className={cn("mb-2.5 block text-[15px] font-bold", mindMissing ? "text-rose-700" : "text-slate-900")}>
          Do you have a property in mind?
        </span>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { value: "Yes", label: "Yes" },
            { value: "No", label: "No, I'm still looking" },
          ].map((opt) => {
            const active = inMind === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange("hasPropertyInMind", opt.value)}
                className={cn(
                  "flex h-[72px] items-center justify-center rounded-2xl px-4 text-[14px] font-semibold transition-colors",
                  active
                    ? "bg-[#EDE4F7] text-[#5A32A3] ring-1 ring-[#5A32A3]/30"
                    : "bg-white text-slate-700 shadow-[0_2px_10px_rgba(15,23,42,0.07)] ring-1 ring-black/5 hover:bg-violet-50",
                  mindMissing && "ring-2 ring-rose-400",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {mindMissing ? <p className="mt-1.5 text-[12px] font-medium text-rose-600">Required</p> : null}
      </div>

      {inMind === "Yes" ? (
        <GeoAddressField
          label="Search your property address"
          value={valueOf("propertySearchAddress")}
          disabled={disabled}
          required
          invalid={addressMissing}
          placeholder="Enter an address"
          onChange={(next) => {
            onChange("propertySearchAddress", next);
            onChange("propertySearchGeo", "");
          }}
          onPick={(hit) => {
            onChange("propertySearchAddress", hit.label);
            onChange("propertySearchGeo", "1");
            if (hit.suburb) onChange("suburb", hit.suburb);
          }}
        />
      ) : null}

      {inMind === "No" ? (
        <div>
          <span className="mb-1.5 block text-[13px] font-semibold text-slate-900">
            Any particular postcodes?
          </span>
          <p className="mb-2.5 text-[12px] text-slate-400">
            Optional. Add one or more Australian postcodes you are looking in.
          </p>
          <div className="flex gap-2">
            <input
              value={draftCode}
              disabled={disabled}
              inputMode="numeric"
              maxLength={4}
              placeholder="e.g. 2000"
              onChange={(e) => setDraftCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addPostcode();
                }
              }}
              className={cn(inputClass, "flex-1")}
            />
            <button
              type="button"
              disabled={disabled || !isAuPostcode(draftCode)}
              onClick={() => addPostcode()}
              className="inline-flex h-12 items-center gap-1.5 rounded-lg bg-[#EDE4F7] px-4 text-[13px] font-semibold text-[#5A32A3] disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
          {postcodes.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {postcodes.map((code) => (
                <span
                  key={code}
                  className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-[13px] font-semibold text-[#5A32A3]"
                >
                  {code}
                  {!disabled ? (
                    <button
                      type="button"
                      onClick={() =>
                        onChange(
                          "propertyPostcodes",
                          JSON.stringify(postcodes.filter((item) => item !== code)),
                        )
                      }
                      className="text-[#5A32A3]/60 hover:text-rose-600"
                      aria-label={`Remove ${code}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <label className="block" data-invalid={valueMissing || undefined}>
        <span className={cn("mb-2 block text-[13px] font-semibold", valueMissing ? "text-rose-700" : "text-slate-900")}>
          What is the property value you are looking to buy?
          <span className="text-rose-500"> *</span>
        </span>
        <CurrencyInput
          value={valueOf("purchasePrice")}
          disabled={disabled}
          invalid={valueMissing}
          onChange={(next) => onChange("purchasePrice", next)}
          className="h-12"
        />
        {valueMissing ? <p className="mt-1.5 text-[12px] font-medium text-rose-600">Required</p> : null}
      </label>
    </div>
  );
}

function MoneyBagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 8.5c0-2.4 1.8-4 4-4s4 1.6 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7 10.5h10l1.2 8.2A2 2 0 0 1 16.2 21H7.8a2 2 0 0 1-2-2.3L7 10.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M10 14.5h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
