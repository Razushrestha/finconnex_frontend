"use client";

import React from "react";

interface SuggestedTagsCardProps {
  onSelectTag: (tag: string) => void;
}

const TAGS = [
  {
    label: "#Urgent",
    color: "bg-destructive/10 text-destructive border-destructive/20",
  },
  { label: "#Planning", color: "bg-primary/10 text-primary border-primary/20" },
  {
    label: "#FollowUp",
    color: "bg-secondary text-secondary-foreground border-border",
  },
  { label: "#Q3", color: "bg-accent text-accent-foreground border-border" },
];

export const SuggestedTagsCard: React.FC<SuggestedTagsCardProps> = ({
  onSelectTag,
}) => {
  return (
    <div className="bg-white text-card-foreground rounded-xl p-5 border border-border shadow-sm space-y-3">
      <h3 className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
        Suggested Tags
      </h3>
      <div className="flex flex-wrap gap-2">
        {TAGS.map((tag) => (
          <button
            key={tag.label}
            type="button"
            onClick={() => onSelectTag(tag.label)}
            className={`text-xs font-medium px-2.5 py-1 rounded-md border transition-transform active:scale-95 ${tag.color}`}
          >
            {tag.label}
          </button>
        ))}
      </div>
    </div>
  );
};
