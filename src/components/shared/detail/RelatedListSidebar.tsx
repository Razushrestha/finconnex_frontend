"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { RelatedLinkItem, RelatedListItem } from "./types";
import { ManageRelatedListsModal } from "./ManageRelatedListsModal";
import { cn } from "@/lib/utils";

interface RelatedListSidebarProps {
  allItems: RelatedListItem[];
  visibleIds: string[];
  onVisibleIdsChange: (ids: string[]) => void;
  activeId?: string;
  onSelect?: (id: string) => void;
  links?: RelatedLinkItem[];
  onAddLink?: () => void;
}

export function RelatedListSidebar({
  allItems,
  visibleIds,
  onVisibleIdsChange,
  activeId,
  onSelect,
  links = [],
  onAddLink,
}: RelatedListSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const visibleItems = visibleIds
    .map((id) => allItems.find((item) => item.id === id))
    .filter((item): item is RelatedListItem => !!item);

  if (collapsed) {
    return (
      <div className="flex w-8 shrink-0 flex-col items-center border-r border-slate-200/80 bg-white py-2">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Expand related list"
          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-52 shrink-0 flex-col overflow-y-auto border-r border-slate-200/80 bg-white pb-4 no-scrollbar">
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        className="flex items-center gap-1.5 px-3 py-3 text-xs font-semibold text-slate-800 hover:text-slate-950"
      >
        <ChevronLeft className="h-3.5 w-3.5 text-slate-400" />
        Related List
      </button>

      <nav className="flex flex-col">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect?.(item.id)}
            className={cn(
              "flex items-center justify-between px-4 py-1.5 text-left text-[13px] font-medium transition-colors",
              activeId === item.id
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-700 hover:bg-slate-50",
            )}
          >
            <span>{item.label}</span>
            {typeof item.count === "number" && (
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                  activeId === item.id
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-indigo-50 text-indigo-600",
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 text-left text-[13px] font-medium text-indigo-600 hover:underline"
        >
          Add Related List
        </button>
      </nav>

      <div className="mt-4 border-t border-slate-100 px-4 pt-3">
        <h4 className="text-[13px] font-semibold text-slate-800">Links</h4>
        <div className="mt-2 flex flex-col items-start gap-1.5">
          {links.length === 0 ? (
            <p className="text-[13px] text-slate-400">No Links Found</p>
          ) : (
            links.map((link) => (
              <a
                key={link.id}
                href={link.href}
                className="text-[13px] font-medium text-slate-700 hover:text-indigo-600"
              >
                {link.label}
              </a>
            ))
          )}
          <button
            type="button"
            onClick={onAddLink}
            className="text-[13px] font-medium text-indigo-600 hover:underline"
          >
            Add Link
          </button>
        </div>
      </div>

      <ManageRelatedListsModal
        open={modalOpen}
        allItems={allItems}
        visibleIds={visibleIds}
        onClose={() => setModalOpen(false)}
        onSave={(ids) => {
          onVisibleIdsChange(ids);
          setModalOpen(false);
        }}
      />
    </div>
  );
}
