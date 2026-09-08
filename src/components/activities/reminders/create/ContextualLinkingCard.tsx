"use client";

import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  REMINDER_PARENT_TYPES,
  fetchReminderParentRecords,
  type ReminderParentRecord,
  type ReminderParentType,
} from "@/lib/reminders/related";

interface ContextualLinkingCardProps {
  selectedEntity: ReminderParentType | "";
  onSelectEntity: (entity: ReminderParentType | "") => void;
  searchRecord: string;
  onSearchRecordChange: (val: string) => void;
  relatedId: string;
  onRelatedIdChange: (id: string) => void;
}

export const ContextualLinkingCard: React.FC<ContextualLinkingCardProps> = ({
  selectedEntity,
  onSelectEntity,
  searchRecord,
  onSearchRecordChange,
  relatedId,
  onRelatedIdChange,
}) => {
  const [options, setOptions] = useState<ReminderParentRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedEntity) {
      setOptions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchReminderParentRecords(selectedEntity).then((rows) => {
      if (cancelled) return;
      setOptions(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedEntity]);

  return (
    <div className="bg-white text-card-foreground rounded-xl border border-border p-6 shadow-sm space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
        Contextual Linking
      </h2>
      <p className="text-xs text-muted-foreground">
        CRM reminders attach to a Task, Call, or Meeting. Leave this blank to
        create a standalone reminder.
      </p>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-muted-foreground">
          Related Entity Type
        </label>
        <div className="flex flex-wrap gap-2">
          {REMINDER_PARENT_TYPES.map((k) => {
            const isSelected = selectedEntity === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  onSelectEntity(isSelected ? "" : k);
                  onSearchRecordChange("");
                  onRelatedIdChange("");
                }}
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

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-muted-foreground">
          Search Record
        </label>
        <div className="flex items-center bg-input/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
          <Search className="h-4 w-4 text-muted-foreground mr-2.5 shrink-0" />
          <select
            value={relatedId || searchRecord}
            onChange={(e) => {
              const value = e.target.value;
              const match = options.find((row) => row.id === value);
              onRelatedIdChange(match?.id ?? "");
              onSearchRecordChange(match?.name ?? "");
            }}
            disabled={!selectedEntity}
            className="bg-transparent focus:outline-none w-full text-xs text-foreground cursor-pointer disabled:opacity-50"
          >
            <option value="" className="bg-popover text-popover-foreground">
              {loading
                ? "Loading CRM records…"
                : selectedEntity
                  ? `Select a ${selectedEntity.toLowerCase()}…`
                  : "Optional — select Task, Call, or Meeting"}
            </option>
            {options.map((r) => (
              <option
                key={r.id}
                value={r.id}
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
