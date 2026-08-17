"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { listMentionPeople, type MentionPerson } from "@/lib/mentions/people";
import {
  findActiveMention,
  getCaretRect,
  getTextBeforeCaret,
} from "@/lib/mentions/utils";

interface UseContentEditableMentionsOptions {
  editorRef: RefObject<HTMLElement | null>;
  onMentionSelect?: (person: MentionPerson) => void;
  people?: MentionPerson[];
  onContentChange?: () => void;
}

export function useContentEditableMentions({
  editorRef,
  onMentionSelect,
  people,
  onContentChange,
}: UseContentEditableMentionsOptions) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(0);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 280 });

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
    const editor = editorRef.current;
    if (!editor) return;
    const rect = getCaretRect(editor);
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(280, editor.getBoundingClientRect().width * 0.6),
    });
  }, [editorRef]);

  const syncMention = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const context = getTextBeforeCaret(editor);
    if (!context) {
      setOpen(false);
      return;
    }

    const active = findActiveMention(context.textBefore, context.textBefore.length);
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
  }, [editorRef, updateMenuPosition]);

  const insertMention = useCallback(
    (person: MentionPerson) => {
      const editor = editorRef.current;
      if (!editor) return;

      editor.focus();
      const context = getTextBeforeCaret(editor);
      if (!context) return;

      const selection = context.selection;
      const charsToDelete = context.textBefore.length - mentionStart;

      for (let i = 0; i < charsToDelete; i++) {
        selection.modify("extend", "backward", "character");
      }

      selection.deleteFromDocument();

      const mentionSpan = document.createElement("span");
      mentionSpan.className =
        "mention-tag rounded bg-violet-100 px-1 py-0.5 text-violet-800 font-medium";
      mentionSpan.contentEditable = "false";
      mentionSpan.dataset.mention = person.name;
      mentionSpan.textContent = `@${person.name}`;

      const space = document.createTextNode("\u00a0");
      const range = selection.getRangeAt(0);
      range.insertNode(space);
      range.insertNode(mentionSpan);

      const afterRange = document.createRange();
      afterRange.setStartAfter(space);
      afterRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(afterRange);

      onMentionSelect?.(person);
      setOpen(false);
      setQuery("");
      onContentChange?.();
    },
    [editorRef, mentionStart, onContentChange, onMentionSelect],
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
      if (editorRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [editorRef, open]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (!open || filtered.length === 0) return false;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightIndex((current) => (current + 1) % filtered.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightIndex(
          (current) => (current - 1 + filtered.length) % filtered.length,
        );
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        insertMention(filtered[highlightIndex]);
        return true;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return true;
      }
      return false;
    },
    [filtered, highlightIndex, insertMention, open],
  );

  return {
    menuRef,
    open,
    filtered,
    highlightIndex,
    menuPos,
    syncMention,
    insertMention,
    handleKeyDown,
    setHighlightIndex,
  };
}
