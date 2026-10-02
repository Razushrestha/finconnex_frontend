"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import {
  NOTIFY_VARIABLE_GROUPS,
  type NotifyVariableGroup,
} from "@/lib/booking/notify-variables";
import { cn } from "@/lib/utils";

const MENU_WIDTH = 288;
const MENU_MAX_HEIGHT = 340;
const SCREEN_EDGE = 8;
const GAP = 6;
/** Below this much room under the button the menu opens upward instead. */
const MIN_ROOM_BELOW = 220;

type Placement = {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
};

/**
 * "Insert Variable" button and its grouped menu (Business, Staff, Customer, …).
 *
 * The menu is drawn on `document.body` with fixed positioning: the edit window
 * scrolls, and an ordinary dropdown inside it would be clipped or push the
 * window's scrollbar around.
 */
export function NotifyVariableMenu({
  onInsert,
  groups = NOTIFY_VARIABLE_GROUPS,
  label = "Insert Variable",
}: {
  onInsert: (token: string) => void;
  groups?: NotifyVariableGroup[];
  label?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [placement, setPlacement] = useState<Placement | null>(null);
  const open = placement !== null;

  const close = useCallback((refocus = false) => {
    setPlacement(null);
    if (refocus) triggerRef.current?.focus();
  }, []);

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(MENU_WIDTH, window.innerWidth - SCREEN_EDGE * 2);
    // Right edges line up; slide left if that would run off the screen.
    const left = Math.max(
      SCREEN_EDGE,
      Math.min(rect.right - width, window.innerWidth - width - SCREEN_EDGE),
    );
    const below = window.innerHeight - rect.bottom - SCREEN_EDGE;
    const above = rect.top - SCREEN_EDGE;
    if (below < MIN_ROOM_BELOW && above > below) {
      setPlacement({
        left,
        width,
        bottom: window.innerHeight - rect.top + GAP,
        maxHeight: Math.min(MENU_MAX_HEIGHT, above - GAP),
      });
    } else {
      setPlacement({
        left,
        width,
        top: rect.bottom + GAP,
        maxHeight: Math.min(MENU_MAX_HEIGHT, below - GAP),
      });
    }
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      close();
    }
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        // Escape closes only the menu, not the window behind it.
        event.stopPropagation();
        close(true);
      }
    }
    function onScroll(event: Event) {
      // Scrolling the list itself must not close it; scrolling the page behind does.
      if (menuRef.current?.contains(event.target as Node)) return;
      close();
    }
    function onResize() {
      close();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, close]);

  // Put the keyboard on the first variable as soon as the menu appears.
  useEffect(() => {
    if (!open) return;
    menuRef.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
      ?.focus({ preventScroll: true });
  }, [open]);

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = [
      ...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ??
        []),
    ];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const focusAt = (next: number) => {
      event.preventDefault();
      items[(next + items.length) % items.length]?.focus();
    };
    switch (event.key) {
      case "ArrowDown":
        focusAt(index + 1);
        break;
      case "ArrowUp":
        focusAt(index - 1);
        break;
      case "Home":
        focusAt(0);
        break;
      case "End":
        focusAt(items.length - 1);
        break;
      case "Tab":
        close();
        break;
      default:
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            openMenu();
          }
        }}
        className={cn(
          "inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2.5 text-[12px] font-semibold text-[#5A32A3] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#5A32A3]/30",
          open
            ? "border-[#5A32A3]/40 bg-[#F3ECFB]"
            : "border-[#E5E7EB] bg-white hover:border-[#5A32A3]/40 hover:bg-[#F3ECFB]",
        )}
      >
        {label}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {placement
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label="Variables"
              onKeyDown={onMenuKeyDown}
              style={{
                left: placement.left,
                width: placement.width,
                maxHeight: placement.maxHeight,
                top: placement.top,
                bottom: placement.bottom,
              }}
              className="fixed z-[70] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white pb-2 shadow-[0_8px_28px_rgba(15,23,42,0.16)] [scrollbar-color:#94A3B8_transparent] [scrollbar-width:thin]"
            >
              <p className="sticky top-0 z-10 bg-white px-3 pt-2.5 pb-1 text-[13px] font-bold text-[#5A32A3]">
                <span className="inline-block border-b-2 border-[#5A32A3] pb-0.5">
                  Variables
                </span>
              </p>
              {groups.map((group) => (
                <div key={group.title} role="group" aria-label={group.title}>
                  <p className="px-3 pt-2.5 pb-1 text-[13px] font-bold text-slate-800">
                    {group.title}
                  </p>
                  {group.items.map((item) => (
                    <button
                      key={item.token}
                      type="button"
                      role="menuitem"
                      title={item.token}
                      onClick={() => {
                        onInsert(item.token);
                        close();
                      }}
                      className="block w-full px-5 py-1.5 text-left text-[13px] text-slate-600 outline-none hover:bg-[#F3ECFB] hover:text-[#5A32A3] focus-visible:bg-[#F3ECFB] focus-visible:text-[#5A32A3]"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
