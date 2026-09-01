"use client";

import { useState } from "react";
import { GripVertical, Trash2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrokerHubLink } from "@/lib/broker-hub/types";
import { LINK_ICON_OPTIONS, LinkIcon } from "./LinkIcon";
import { HubToggle } from "./HubToggle";

interface LinkItemProps {
  link: BrokerHubLink;
  onChange: (link: BrokerHubLink) => void;
  onDelete: (id: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
}

export function LinkItem({
  link,
  onChange,
  onDelete,
  dragHandleProps,
  isDragging,
}: LinkItemProps) {
  const [expanded, setExpanded] = useState(false);

  const patch = (fields: Partial<BrokerHubLink>) =>
    onChange({ ...link, ...fields });

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card transition-shadow",
        isDragging && "shadow-md ring-1 ring-primary/30",
      )}
    >
      <div className="flex items-start gap-2 p-3">
        <button
          type="button"
          {...dragHandleProps}
          aria-label="Reorder link"
          className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <LinkIcon
            type={link.icon}
            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {link.title || "Untitled link"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {link.url || "No URL set"}
            </p>
            {(link.highlight || link.animation !== "none") && (
              <div className="mt-1.5 flex gap-1.5">
                {link.highlight && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    Highlight
                  </span>
                )}
                {link.animation !== "none" && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Animation: {link.animation}
                  </span>
                )}
              </div>
            )}
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <HubToggle
            checked={link.active}
            onChange={(active) => patch({ active })}
            label={`Toggle ${link.title || "link"}`}
          />
          <ChevronDown
            className={cn(
              "h-4 w-4 cursor-pointer text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
            onClick={() => setExpanded((v) => !v)}
          />
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-border p-3 pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Title
              </span>
              <input
                value={link.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="Book a Consultation"
                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Icon
              </span>
              <select
                value={link.icon}
                onChange={(e) =>
                  patch({ icon: e.target.value as BrokerHubLink["icon"] })
                }
                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
              >
                {LINK_ICON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              URL
            </span>
            <input
              value={link.url}
              onChange={(e) => patch({ url: e.target.value })}
              placeholder="https://cal.com/arivera/30min"
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <input
                type="checkbox"
                checked={link.highlight}
                onChange={(e) => patch({ highlight: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-border"
              />
              Highlight this link
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <input
                type="checkbox"
                checked={link.animation === "pulse"}
                onChange={(e) =>
                  patch({ animation: e.target.checked ? "pulse" : "none" })
                }
                className="h-3.5 w-3.5 rounded border-border"
              />
              Pulse animation
            </label>

            <button
              type="button"
              onClick={() => onDelete(link.id)}
              className="ml-auto flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
