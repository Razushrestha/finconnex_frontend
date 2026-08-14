import React, { useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { DocumentThumbnail } from "./DocumentThumbnail";

interface DocumentCardProps {
  /** Base name shown in the caption (without extension). */
  name: string;
  extension?: string;
  onRemove: () => void;
  isSelected: boolean;
  onSelect: () => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  name,
  extension,
  onRemove,
  isSelected,
  onSelect,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
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

      <div className="border-t border-slate-200 px-3 py-2.5 text-center">
        <p className="text-xs font-medium text-slate-700 truncate">{name}</p>
      </div>
    </div>
  );
};
