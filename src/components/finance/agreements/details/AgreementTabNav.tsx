"use client";

import React from "react";

interface AgreementTabNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AgreementTabNav({
  activeTab,
  onTabChange,
}: AgreementTabNavProps) {
  const tabs = [
    "Overview & Scope",
    "Billing & Invoices (4)",
    "SLA Performance & Incidents",
    "Deliverables & Milestones",
    "Contract Documents & E-Sign",
    "Audit Trail",
  ];

  return (
    <div className="flex items-center gap-2 border-b border-border overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
              isActive
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
