"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LinkIconType } from "@/lib/broker-hub/types";
import { LINK_TYPE_META } from "./LinkIcon";

interface AddLinkModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (fields: { title: string; url: string; icon: LinkIconType }) => void;
}

const LINK_TYPES = Object.keys(LINK_TYPE_META) as LinkIconType[];

export function AddLinkModal({ open, onClose, onAdd }: AddLinkModalProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [linkType, setLinkType] = useState<LinkIconType>("standard");

  // Reset the form each time the modal is opened fresh
  useEffect(() => {
    if (open) {
      setTitle("");
      setUrl("");
      setLinkType("standard");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = () => {
    onAdd({ title: title.trim(), url: url.trim(), icon: linkType });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-link-title"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2
            id="add-link-title"
            className="text-base font-semibold text-foreground"
          >
            Add New Link
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Link Title
            </span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Latest Research Report"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Destination URL
            </span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Link Type
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {LINK_TYPES.map((type) => {
                const meta = LINK_TYPE_META[type];
                const Icon = meta.icon;
                const selected = linkType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setLinkType(type)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "flex items-center gap-1.5 text-sm font-medium",
                        selected ? "text-primary" : "text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {meta.label}
                    </span>
                    <span className="text-[11px] leading-tight text-muted-foreground">
                      {meta.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!title || !url}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Add Link
          </button>
        </div>
      </div>
    </div>
  );
}
