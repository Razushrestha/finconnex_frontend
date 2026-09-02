"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  FIELD_LIBRARY,
  FIELD_CATEGORIES,
  FIELD_CATEGORY_ORDER,
} from "@/lib/form-builder/field-library";
import type { FieldDefinition } from "@/lib/form-builder/types";

interface FieldPaletteProps {
  onAddField: (defn: FieldDefinition) => void;
}

function setFieldDragPreview(e: React.DragEvent, label: string) {
  const el = document.createElement("div");
  el.textContent = label;
  Object.assign(el.style, {
    position: "absolute",
    top: "-9999px",
    left: "-9999px",
    padding: "6px 12px",
    background: "white",
    border: "1px dashed rgb(52 211 153)",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    color: "rgb(17 24 39)",
    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
    whiteSpace: "nowrap",
  } as CSSStyleDeclaration);
  document.body.appendChild(el);
  e.dataTransfer.setDragImage(el, -12, 14);
  requestAnimationFrame(() => document.body.removeChild(el));
}

export function FieldPalette({ onAddField }: FieldPaletteProps) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? FIELD_LIBRARY.filter((f) => f.label.toLowerCase().includes(q))
      : FIELD_LIBRARY;

    return FIELD_CATEGORY_ORDER.map((category) => ({
      category,
      title: FIELD_CATEGORIES[category],
      items: filtered.filter((f) => f.category === category),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  return (
    <div className="flex h-full w-[280px] shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {groups.map(({ category, title, items }) => (
          <div key={category} className="mb-5">
            <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
              {title}
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {items.map((defn) => (
                <button
                  key={defn.type}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      "application/x-field-type",
                      defn.type,
                    );
                    e.dataTransfer.effectAllowed = "copy";
                    setFieldDragPreview(e, defn.label);
                  }}
                  onClick={() => onAddField(defn)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border border-border bg-background p-2.5 text-center",
                    "transition-colors hover:border-primary/50 hover:bg-accent/30",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  <defn.icon className="h-5 w-5 text-primary" />
                  <span className="text-[11px] leading-tight text-foreground">
                    {defn.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <p className="pt-8 text-center text-sm text-muted-foreground">
            No fields match &ldquo;{query}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}
