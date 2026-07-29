"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Columns3, Rows3, Ruler, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50];

const DEFAULT_WRAPPER_CLASSNAME = cn(
  "sticky right-0 z-20 -mr-5 flex justify-end bg-white pr-5 pl-3 sm:-mr-7 sm:pr-7",
  "shadow-[-12px_0_12px_-8px_rgba(15,23,42,0.06)]",
);

interface TableDisplayOptionsMenuProps {
  pageSize: number;
  onPageSizeChange?: (size: number) => void;
  onManageColumns?: () => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function TableDisplayOptionsMenu({
  pageSize,
  onPageSizeChange,
  onManageColumns,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
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
    <div className={className ?? DEFAULT_WRAPPER_CLASSNAME}>
      <button
        ref={optionsButtonRef}
        type="button"
        onClick={() => {
          if (!optionsMenuOpen && optionsButtonRef.current) {
            const rect = optionsButtonRef.current.getBoundingClientRect();
            setMenuPos({
              top: rect.bottom + 4,
              right: window.innerWidth - rect.right,
            });
          }
          setOptionsMenuOpen((v) => !v);
        }}
        aria-label="Table display options"
        className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <Settings2 className="h-3.5 w-3.5" />
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
              className="z-50 w-56 rounded-xl border border-[var(--wq-line)] bg-white py-1.5 text-[13px] shadow-lg"
            >
              {onManageColumns ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onManageColumns();
                      setOptionsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-gray-700 hover:bg-[var(--wq-surface)]"
                  >
                    <Columns3 className="h-4 w-4 text-gray-400" />
                    Manage Columns
                  </button>

                  <button
                    type="button"
                    disabled
                    className="flex w-full cursor-not-allowed items-center gap-2.5 px-3.5 py-2 text-left text-gray-300"
                  >
                    <Ruler className="h-4 w-4 text-gray-300" />
                    Reset Column Size
                  </button>

                  <div className="my-1 border-t border-[var(--wq-line)]" />
                </>
              ) : null}

              <div
                className="relative"
                onMouseEnter={() => setPageSizeFlyoutOpen(true)}
                onMouseLeave={() => setPageSizeFlyoutOpen(false)}
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2.5 px-3.5 py-2 text-left text-gray-700 hover:bg-[var(--wq-surface)]"
                >
                  <span className="flex items-center gap-2.5">
                    <Rows3 className="h-4 w-4 text-gray-400" />
                    Records per page
                  </span>
                  <span className="flex items-center gap-0.5 text-gray-400">
                    {pageSize}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </button>

                {pageSizeFlyoutOpen ? (
                  <div className="absolute right-full top-0 mr-1 w-28 rounded-xl border border-[var(--wq-line)] bg-white py-1.5 shadow-lg">
                    {pageSizeOptions.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          onPageSizeChange?.(size);
                          setOptionsMenuOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between px-3.5 py-1.5 text-left text-gray-700 hover:bg-[var(--wq-surface)]",
                          pageSize === size && "font-semibold text-gray-900",
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
