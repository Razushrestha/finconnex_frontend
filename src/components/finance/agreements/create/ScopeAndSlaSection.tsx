"use client";

import React from "react";

interface ScopeData {
  agreementTitle: string;
  categories: string[];
  selectedTier: string;
}

interface ScopeAndSlaSectionProps {
  scopeData: ScopeData;
  onChange: (updated: Partial<ScopeData>) => void;
}

export function ScopeAndSlaSection({
  scopeData,
  onChange,
}: ScopeAndSlaSectionProps) {
  const removeCategory = (catToRemove: string) => {
    onChange({
      categories: scopeData.categories.filter((c) => c !== catToRemove),
    });
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 font-bold text-xs">
            2
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Scope of Services & SLA Tier
          </h3>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Select standard packages or configure customized tiers
        </span>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
          Agreement Title / Primary Scope{" "}
          <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={scopeData.agreementTitle}
          onChange={(e) => onChange({ agreementTitle: e.target.value })}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none focus:border-violet-500"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">
          Service Categories Included
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {scopeData.categories.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-500/10 text-violet-600 rounded-md text-xs font-medium border border-violet-500/20"
            >
              {cat}
              <button
                type="button"
                onClick={() => removeCategory(cat)}
                className="hover:text-rose-500 cursor-pointer"
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => {
              const newCat = prompt("Enter new service category:");
              if (newCat)
                onChange({ categories: [...scopeData.categories, newCat] });
            }}
            className="px-3 py-1 border border-dashed border-border rounded-md text-xs font-semibold text-muted-foreground hover:border-violet-500 hover:text-violet-600 transition-colors cursor-pointer"
          >
            + Add Category
          </button>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-muted-foreground mb-2">
          Service Level Agreement (SLA) Tier
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              id: "tier-1",
              title: "Tier 1 (24/7 Priority)",
              desc: "2-hour guaranteed SLA response time, dedicated key account manager & emergency triage.",
            },
            {
              id: "tier-2",
              title: "Tier 2 (Business Hours)",
              desc: "8-hour SLA response during 9am-5pm AEST weekdays. Regular ticketing queue.",
            },
            {
              id: "tier-3",
              title: "Tier 3 (Custom Retainer)",
              desc: "Flexible ad-hoc hours pool, quarterly review meetings, and tailored scope clauses.",
            },
          ].map((tier) => (
            <div
              key={tier.id}
              onClick={() => onChange({ selectedTier: tier.id })}
              className={`cursor-pointer border rounded-xl p-3.5 transition-all ${
                scopeData.selectedTier === tier.id
                  ? "border-violet-600 bg-violet-500/5 ring-1 ring-violet-600"
                  : "border-border bg-background hover:border-muted-foreground/40"
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="font-bold text-xs text-foreground">
                  {tier.title}
                </span>
                <input
                  type="radio"
                  name="sla-tier"
                  checked={scopeData.selectedTier === tier.id}
                  onChange={() => onChange({ selectedTier: tier.id })}
                  className="accent-violet-600 cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {tier.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
