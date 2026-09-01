import React, { useEffect, useRef, useState } from "react";
import { Check, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { DocumentThumbnail } from "./DocumentThumbnail";

interface DocumentCardProps {
  /** Base name shown in the caption (without extension). */
  name: string;
  extension?: string;
  onRemove: () => void;
  onRename?: (name: string) => void;
  isSelected: boolean;
  onSelect: () => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  name,
  extension,
  onRemove,
  onRename,
  isSelected,
  onSelect,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) setDraft(name);
  }, [name, isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [isEditing]);

  const startRename = () => {
    if (!onRename) return;
    setDraft(name);
    setIsEditing(true);
    setIsMenuOpen(false);
  };

  const cancelRename = () => {
    setDraft(name);
    setIsEditing(false);
  };

  const commitRename = () => {
    if (!onRename) return;
    const next = draft.trim();
    if (next) onRename(next);
    setIsEditing(false);
  };

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (isEditing) return;
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
      className={`relative bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col cursor-pointer transition-colors ${
        isSelected
          ? "border-indigo-500 ring-2 ring-indigo-500/30"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="relative flex-1 min-h-[150px] bg-slate-50/60 flex items-center justify-center p-4">
        <DocumentThumbnail extension={extension} />

        <div
          className="absolute top-2 right-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setIsMenuOpen((v) => !v)}
            className="p-1.5 rounded-full bg-white/90 border border-slate-200 text-slate-500 hover:bg-white shadow-xs"
            aria-label="Document actions"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 text-left">
                {onRename && (
                  <button
                    type="button"
                    onClick={startRename}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Rename</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onRemove();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div
        className="border-t border-slate-200 px-2 py-2"
        onClick={(e) => e.stopPropagation()}
      >
        {isEditing ? (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitRename();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelRename();
                }
              }}
              aria-label="Document name"
              className="min-w-0 flex-1 rounded-md border border-[#5A32A3]/40 bg-white px-1.5 py-1 text-xs font-medium text-slate-800 outline-none focus:border-[#5A32A3] focus:ring-2 focus:ring-[#5A32A3]/20"
            />
            <button
              type="button"
              onClick={commitRename}
              aria-label="Save name"
              className="shrink-0 rounded-md p-1 text-emerald-600 hover:bg-emerald-50"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={cancelRename}
              aria-label="Cancel rename"
              className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1">
            <p className="min-w-0 flex-1 truncate text-center text-xs font-medium text-slate-700">
              {name}
            </p>
            {onRename && (
              <button
                type="button"
                onClick={startRename}
                aria-label="Rename document"
                className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-[#F3ECFB] hover:text-[#5A32A3]"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
