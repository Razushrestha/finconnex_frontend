"use client";

import React from "react";
import { CheckCircle, Clock, Calendar, Download, FileText } from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  status: string;
  dateBadge: string;
  description: string;
  attachmentName?: string;
  progressPercent?: number;
}

interface KeyMilestonesProps {
  milestones?: Milestone[];
  onAddMilestone?: () => void;
}

export function KeyMilestonesList({
  milestones = [],
  onAddMilestone,
}: KeyMilestonesProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
          Key Milestones & Scheduled Reviews
        </h3>
      </div>

      {milestones.length > 0 ? (
        <div className="space-y-3">
          {milestones.map((m) => (
            <div
              key={m.id}
              className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-foreground">
                    {m.title}
                  </h4>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-muted text-muted-foreground self-start sm:self-auto">
                  {m.dateBadge}
                </span>
              </div>

              <p className="text-xs text-muted-foreground pl-9">
                {m.description}
              </p>

              {m.attachmentName && (
                <div className="pl-9 pt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-muted/50 border border-border text-foreground">
                    <FileText className="w-3 h-3 text-primary" />
                    {m.attachmentName}
                  </span>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Download
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground text-xs">
          No milestones defined yet. Data will populate upon schedule
          configuration.
        </div>
      )}
    </div>
  );
}
