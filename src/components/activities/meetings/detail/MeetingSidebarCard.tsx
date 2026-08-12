"use client";

import React from "react";
import { ExternalLink, CheckSquare, Square, Mail, Plus } from "lucide-react";

interface MeetingSidebarCardProps {
  relatedTo?: string;
}

export function MeetingSidebarCard({ relatedTo }: MeetingSidebarCardProps) {
  return (
    <div className="space-y-6">
      {/* Related Deal Widget */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Related Deal
        </h3>
        <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-semibold text-card-foreground">
                Acme Corp - Enterprise Expansion
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {relatedTo || "Deal ID: #10294"}
              </p>
            </div>
            <button className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-card-foreground transition-colors cursor-pointer">
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-baseline justify-between pt-2 border-t border-border">
            <span className="text-lg font-bold text-card-foreground">
              $120,000
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
              Proposal
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Expected Close: Nov 15
          </p>
        </div>
      </div>

      {/* Prep Checklist Widget */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Prep Checklist
        </h3>
        <div className="p-4 rounded-xl border border-border bg-card space-y-2.5 text-xs text-card-foreground">
          <div className="flex items-center gap-2 cursor-pointer">
            <CheckSquare className="w-4 h-4 text-primary shrink-0" />
            <span className="line-through text-muted-foreground">
              Send agenda to David
            </span>
          </div>
          <div className="flex items-center gap-2 cursor-pointer">
            <CheckSquare className="w-4 h-4 text-primary shrink-0" />
            <span className="line-through text-muted-foreground">
              Review Q2 usage metrics
            </span>
          </div>
          <div className="flex items-center gap-2 cursor-pointer">
            <Square className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>Finalize custom pricing slide</span>
          </div>
          <div className="flex items-center gap-2 cursor-pointer">
            <Square className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>Confirm Marcus is joining</span>
          </div>
        </div>
      </div>

      {/* Automated Tasks Widget */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Automated Tasks
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card/60 hover:border-primary/50 transition-all cursor-pointer">
            <div className="flex items-center gap-2 text-xs font-medium text-card-foreground">
              <Mail className="w-3.5 h-3.5 text-primary" />
              <span>Send meeting summary email</span>
            </div>
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card/60 hover:border-primary/50 transition-all cursor-pointer">
            <div className="flex items-center gap-2 text-xs font-medium text-card-foreground">
              <ExternalLink className="w-3.5 h-3.5 text-primary" />
              <span>Update deal probability</span>
            </div>
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}
