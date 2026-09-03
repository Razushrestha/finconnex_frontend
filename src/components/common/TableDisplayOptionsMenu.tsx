"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Columns3, Rows3, Ruler, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { resetColumnWidths } from "@/lib/list-columns/widths";

const DEFAULT_PAGE_SIZE_OPTIONS = [8, 10, 20, 50];

interface TableDisplayOptionsMenuProps {
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  onManageColumns?: () => void;
  pageSizeOptions?: number[];
  storageKey?: string;
  onResetColumnSize?: () => void;
  className?: string;
}

export function TableDisplayOptionsMenu({
  pageSize,
  onPageSizeChange,
  onManageColumns,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  storageKey,
  onResetColumnSize,
  className,
}: TableDisplayOptionsMenuProps) {
  const [optionsMenuOpen, setOptionsMenuOpen] = React.useState(false);
  const [pageSizeFlyoutOpen, setPageSizeFlyoutOpen] = React.useState(false);
  const optionsButtonRef = React.useRef<HTMLButtonElement>(null);
  const optionsPortalRef = React.useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = React.useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  });

  const canReset = Boolean(storageKey || onResetColumnSize);
  const canPageSize = Boolean(onPageSizeChange && pageSize != null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        optionsButtonRef.current?.contains(target) ||
        optionsPortalRef.current?.contains(target)
      ) {
        return;
      }
      setOptionsMenuOpen(false);
    }
    if (optionsMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [optionsMenuOpen]);

  return (
    <div className={cn("relative z-50", className)}>
      <button
        ref={optionsButtonRef}
        type="button"
        onClick={() => {
          if (!optionsMenuOpen && optionsButtonRef.current) {
            const rect = optionsButtonRef.current.getBoundingClientRect();
            setMenuPos({
              top: rect.bottom + 6,
              right: window.innerWidth - rect.right,
            });
          }
          setOptionsMenuOpen((v) => !v);
        }}
        aria-label="Manage columns"
        title="Manage columns"
        className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-slate-600 shadow-sm hover:bg-white hover:text-slate-900"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
      </button>

      {optionsMenuOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={optionsPortalRef}
              style={{
                position: "fixed",
                top: menuPos.top,
                right: menuPos.right,
              }}
              className="z-[80] w-56 rounded-xl border border-slate-900 bg-white py-1.5 text-[13px] shadow-lg"
            >
              <button
                type="button"
                disabled={!onManageColumns}
                onClick={() => {
                  onManageColumns?.();
                  setOptionsMenuOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                <Columns3 className="h-4 w-4 text-slate-400" />
                Manage Columns
              </button>

              <button
                type="button"
                disabled={!canReset}
                onClick={() => {
                  if (storageKey) resetColumnWidths(storageKey);
                  onResetColumnSize?.();
                  setOptionsMenuOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                <Ruler
                  className={cn(
                    "h-4 w-4",
                    canReset ? "text-slate-400" : "text-slate-300",
                  )}
                />
                Reset Column Size
              </button>

              {canPageSize ? (
                <>
                  <div className="my-1 border-t border-slate-200" />
                  <div
                    className="relative"
                    onMouseEnter={() => setPageSizeFlyoutOpen(true)}
                    onMouseLeave={() => setPageSizeFlyoutOpen(false)}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2.5 px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-2.5">
                        <Rows3 className="h-4 w-4 text-slate-400" />
                        Records per page
                      </span>
                      <span className="flex items-center gap-0.5 text-slate-400">
                        {pageSize}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </button>

                    {pageSizeFlyoutOpen ? (
                      <div className="absolute top-0 right-full mr-1 w-28 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
                        {pageSizeOptions.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              onPageSizeChange?.(size);
                              setOptionsMenuOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between px-3.5 py-1.5 text-left text-slate-700 hover:bg-slate-50",
                              pageSize === size && "font-semibold text-slate-900",
                            )}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
