"use client";

import { FileText } from "lucide-react";

interface TaskDescriptionCardProps {
  description?: string;
}

export function TaskDescriptionCard({ description }: TaskDescriptionCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Description
      </h2>
      <p className="text-sm leading-relaxed text-foreground">
        {description ||
          "Review and analyze the financial performance metrics across all regional enterprise accounts. This includes aggregating revenue data, identifying churn risk patterns, and comparing actuals against projected forecasts outlined in the strategy deck."}
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-muted/40 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-foreground">
              Financial_Model_Q3.xlsx
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">2.4 MB</span>
        </div>
      </div>
    </div>
  );
}
