"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink, CheckSquare, Square, Mail, Plus } from "lucide-react";
import { hrefForRelatedTo } from "@/lib/activities/related-href";

interface MeetingSidebarCardProps {
  relatedTo?: string;
}

export function MeetingSidebarCard({ relatedTo }: MeetingSidebarCardProps) {
  const relatedHref = hrefForRelatedTo(relatedTo);

  return (
    <div className="space-y-6">
      {/* Related record */}
      <div>
        <h3 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Related record
        </h3>
        <div className="space-y-3 rounded-xl border border-border bg-white p-4 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {relatedHref ? (
                <Link
                  href={relatedHref}
                  className="truncate text-sm font-semibold text-card-foreground hover:text-primary hover:underline"
                >
                  {relatedTo}
                </Link>
              ) : (
                <h4 className="truncate text-sm font-semibold text-card-foreground">
                  {relatedTo || "No related record"}
                </h4>
              )}
            </div>
            {relatedHref ? (
              <Link
                href={relatedHref}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-card-foreground"
                aria-label="Open related record"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* Prep Checklist Widget */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Prep Checklist
        </h3>
        <div className="p-4 rounded-xl border border-border bg-white space-y-2.5 text-xs text-card-foreground">
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
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-white hover:border-primary/50 transition-all cursor-pointer">
            <div className="flex items-center gap-2 text-xs font-medium text-card-foreground">
              <Mail className="w-3.5 h-3.5 text-primary" />
              <span>Send meeting summary email</span>
            </div>
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-white hover:border-primary/50 transition-all cursor-pointer">
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
