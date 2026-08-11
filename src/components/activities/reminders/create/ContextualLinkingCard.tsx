"use client";

import React from "react";
import { Search } from "lucide-react";
import {
  RELATED_ENTITY_KINDS,
  RELATED_RECORD_OPTIONS,
  type RelatedEntityKind,
} from "@/lib/activities/shared";

interface ContextualLinkingCardProps {
  selectedEntity: RelatedEntityKind | "";
  onSelectEntity: (entity: RelatedEntityKind) => void;
  searchRecord: string;
  onSearchRecordChange: (val: string) => void;
}

export const ContextualLinkingCard: React.FC<ContextualLinkingCardProps> = ({
  selectedEntity,
  onSelectEntity,
  searchRecord,
  onSearchRecordChange,
}) => {
  // Filter available records based on the selected entity kind
  const relatedOptions = selectedEntity
    ? RELATED_RECORD_OPTIONS.filter((r) => r.kind === selectedEntity)
    : RELATED_RECORD_OPTIONS;

  return (
    <div className="bg-card text-card-foreground rounded-xl border border-border p-6 shadow-sm space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
        Contextual Linking
      </h2>

      {/* Related Entity Type Pill Buttons */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-muted-foreground">
          Related Entity Type
        </label>
        <div className="flex flex-wrap gap-2">
          {RELATED_ENTITY_KINDS.map((k) => {
            const isSelected = selectedEntity === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => onSelectEntity(k)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all border ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
                }`}
              >
                {k}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Record Dropdown */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-muted-foreground">
          Search Record
        </label>
        <div className="flex items-center bg-input/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
          <Search className="h-4 w-4 text-muted-foreground mr-2.5 shrink-0" />
          <select
            value={searchRecord}
            onChange={(e) => onSearchRecordChange(e.target.value)}
            disabled={!selectedEntity}
            className="bg-transparent focus:outline-none w-full text-xs text-foreground cursor-pointer disabled:opacity-50"
          >
            <option value="" className="bg-popover text-popover-foreground">
              {selectedEntity
                ? `Type to search ${selectedEntity.toLowerCase()}s...`
                : "Select entity type first"}
            </option>
            {relatedOptions.map((r) => (
              <option
                key={`${r.kind}-${r.name}`}
                value={r.name}
                className="bg-popover text-popover-foreground"
              >
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
