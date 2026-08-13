"use client";

import React from "react";
import { ExternalLink } from "lucide-react";

interface CrmProfileCardProps {
  name: string;
  initials: string;
  role: string;
  company: string;
  activeDeal: string;
  onViewProfile?: () => void;
}

export function CrmProfileCard({
  name,
  initials,
  role,
  company,
  activeDeal,
  onViewProfile,
}: CrmProfileCardProps) {
  return (
    <div className="p-4 rounded-xl border border-border bg-white space-y-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
          {initials}
        </div>
        <div>
          <h4 className="text-sm font-medium text-card-foreground">{name}</h4>
          <p className="text-xs text-muted-foreground">{role}</p>
        </div>
      </div>
      <hr className="border-border" />
      <div className="space-y-2 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Company:</span>
          <span className="text-card-foreground font-medium">{company}</span>
        </div>
        <div className="flex justify-between">
          <span>Active Deal:</span>
          <span className="text-primary font-medium">{activeDeal}</span>
        </div>
      </div>
      <button
        onClick={onViewProfile}
        className="w-full mt-2 py-1.5 text-xs font-medium bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
      >
        View Full Profile <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
}
