"use client";

import React from "react";
import { ArrowTag } from "@/components/common/ArrowTag";
import { TAG_TONES, writeTagColor, type TagToneId } from "@/lib/tags";

interface SuggestedTagsCardProps {
  onSelectTag: (tag: string) => void;
}

const TAGS: { label: string; tone: TagToneId }[] = [
  { label: "Urgent", tone: "red" },
  { label: "Planning", tone: "violet" },
  { label: "FollowUp", tone: "sky" },
  { label: "Q3", tone: "amber" },
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
        {TAGS.map((tag) => {
          const tone = TAG_TONES.find((item) => item.id === tag.tone);
          return (
            <ArrowTag
              key={tag.label}
              compact
              color={tone?.color}
              onClick={() => {
                writeTagColor(tag.label, tag.tone);
                onSelectTag(tag.label);
              }}
            >
              {tag.label}
            </ArrowTag>
          );
        })}
      </div>
    </div>
  );
};
