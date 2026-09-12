"use client";

/**
 * Action items for a task-creating step.
 *
 * The CRM has no `actionItems` column: the task page stores them inside the
 * task's own description, between two HTML-comment markers, and decodes them
 * on read (`src/lib/tasks/action-items.ts`). Doing anything else here would
 * create tasks whose checklist the task page cannot see, so this edits the
 * same encoded block through the same helpers.
 *
 * The step's saved config therefore still carries only `description`, which
 * is a key the action registry allows — inventing an `actionItems` key would
 * be rejected server-side.
 */

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  encodeActionItemsInDescription,
  parseActionItemsBlock,
  stripActionItemsBlock,
} from "@/lib/tasks/action-items";

export function ActionItemsField({
  description,
  onChange,
}: {
  description: string;
  onChange: (description: string | undefined) => void;
}) {
  const items = useMemo(
    () => parseActionItemsBlock(description) ?? [],
    [description],
  );
  const [draft, setDraft] = useState("");

  function write(next: { id: string; text: string; done: boolean }[]) {
    onChange(
      encodeActionItemsInDescription(stripActionItemsBlock(description), next),
    );
  }

  function add() {
    const text = draft.trim();
    if (!text) return;
    write([...items, { id: `ai-${Date.now()}`, text, done: false }]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="rounded-md border border-dashed border-slate-200 p-3 text-xs text-slate-400">
          No action items yet. Every task this step creates starts with the
          checklist you add here.
        </p>
      )}

      {items.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2">
          <Input
            value={item.text}
            onChange={(e) =>
              write(
                items.map((row, i) =>
                  i === index ? { ...row, text: e.target.value } : row,
                ),
              )
            }
            className="h-8 text-sm"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 p-0"
            aria-label={`Remove action item ${index + 1}`}
            onClick={() => write(items.filter((_, i) => i !== index))}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add new action item..."
          className="h-8 text-sm"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1 text-xs"
          onClick={add}
          disabled={!draft.trim()}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  );
}
