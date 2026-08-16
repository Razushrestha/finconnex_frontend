"use client";

import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";

export interface DropdownMenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  /** Renders the item in red, for destructive actions like Delete. */
  destructive?: boolean;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: "left" | "right";
}

const MENU_WIDTH = 224; // w-56

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  items,
  align = "right",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Rendered through a portal at a fixed screen position, computed from the
  // trigger's actual location — this is what lets the menu escape any
  // ancestor with overflow-x-auto (which, per the CSS spec, would otherwise
  // force overflow-y to clip it too).
  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        top: rect.bottom + 4,
        left:
          align === "right" ? Math.max(8, rect.right - MENU_WIDTH) : rect.left,
      });
    }
    setIsOpen(true);
  };

  const closeMenu = () => setIsOpen(false);

  return (
    <div className="relative inline-block" ref={triggerRef}>
      <div onClick={() => (isOpen ? closeMenu() : openMenu())}>{trigger}</div>

      {isOpen &&
        position &&
        createPortal(
          <>
            {/* click-away layer */}
            <div className="fixed inset-0 z-40" onClick={closeMenu} />
            <div
              className="fixed bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1.5"
              style={{
                top: position.top,
                left: position.left,
                width: MENU_WIDTH,
              }}
            >
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    closeMenu();
                    item.onClick?.();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors ${
                    item.destructive
                      ? "text-rose-600 hover:bg-rose-50"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
};
