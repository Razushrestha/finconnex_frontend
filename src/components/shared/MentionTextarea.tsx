"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { listMentionPeople, type MentionPerson } from "@/lib/mentions/people";

interface MentionTextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  onMentionSelect?: (person: MentionPerson) => void;
  people?: MentionPerson[];
}

function findActiveMention(text: string, cursor: number) {
  const before = text.slice(0, cursor);
  const match = before.match(/(?:^|[\s\n])@([\w\s.'-]*)$/);
  if (!match) return null;
  const query = match[1];
  const start = cursor - query.length - 1;
  return { query, start };
}

export function MentionTextarea({
  value,
  onChange,
  onMentionSelect,
  people,
  className,
  onKeyDown,
  ...props
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(0);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });

  const allPeople = people ?? listMentionPeople();
  const filtered = allPeople.filter((person) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      person.name.toLowerCase().includes(q) ||
      person.email?.toLowerCase().includes(q) ||
      person.role?.toLowerCase().includes(q) ||
      person.team?.toLowerCase().includes(q)
    );
  });

  const updateMenuPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const rect = textarea.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 240),
    });
  }, []);

  const syncMention = useCallback(
    (text: string, cursor: number) => {
      const active = findActiveMention(text, cursor);
      if (!active) {
        setOpen(false);
        setQuery("");
        return;
      }
      setQuery(active.query);
      setMentionStart(active.start);
      setHighlightIndex(0);
      setOpen(true);
      updateMenuPosition();
    },
    [updateMenuPosition],
  );

  const insertMention = useCallback(
    (person: MentionPerson) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursor = textarea.selectionStart;
      const before = value.slice(0, mentionStart);
      const after = value.slice(cursor);
      const mention = `@${person.name} `;
      const next = before + mention + after;
      const nextCursor = before.length + mention.length;

      onChange(next);
      onMentionSelect?.(person);
      setOpen(false);
      setQuery("");

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(nextCursor, nextCursor);
      });
    },
    [mentionStart, onChange, onMentionSelect, value],
  );

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (textareaRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = event.target.value;
    onChange(next);
    syncMention(next, event.target.selectionStart);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (open && filtered.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightIndex((current) => (current + 1) % filtered.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightIndex(
          (current) => (current - 1 + filtered.length) % filtered.length,
        );
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        insertMention(filtered[highlightIndex]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
    }
    onKeyDown?.(event);
  }

  return (
    <>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(event) =>
          syncMention(event.currentTarget.value, event.currentTarget.selectionStart)
        }
        onKeyUp={(event) =>
          syncMention(event.currentTarget.value, event.currentTarget.selectionStart)
        }
        className={className}
        {...props}
      />
      {open && filtered.length > 0 && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
                zIndex: 9999,
              }}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
            >
              <div className="border-b border-violet-100 bg-violet-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-violet-800">
                Assign to
              </div>
              <ul className="max-h-56 overflow-y-auto py-1">
                {filtered.map((person, index) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => insertMention(person)}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-violet-50",
                        index === highlightIndex && "bg-violet-50",
                      )}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                        <UserRound className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-slate-800">
                          {person.name}
                        </span>
                        <span className="block truncate text-[11px] text-slate-600">
                          {[person.role, person.team, person.email]
                            .filter(Boolean)
                            .join(" · ") || "Team member"}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
