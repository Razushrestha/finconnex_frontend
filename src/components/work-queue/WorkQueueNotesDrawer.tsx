"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  Bold,
  CheckSquare,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Paperclip,
  Pencil,
  Phone,
  Strikethrough,
  Trash2,
  Underline,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { avatarColor, initials } from "@/lib/activities/shared";
import { getRulesActor } from "@/lib/rules/actor";
import {
  createNote,
  deleteNote,
  listNotesForQueueRow,
  updateNote,
} from "@/lib/notes/store";
import type { Note, NoteAttachment } from "@/lib/notes/types";
import { MentionPickerMenu } from "@/components/shared/MentionPickerMenu";

/** Minimal target shared by Work Queue, Tasks, and Calls notes drawers. */
export type NotesDrawerTarget = {
  id: string;
  subject: string;
  related?: string;
  contactName?: string;
  href: string;
  /** Stable key for notes saved before the record exists. Hidden from the header. */
  noteKey?: string;
};
import { useContentEditableMentions } from "@/components/shared/useContentEditableMentions";
import { AdvancedColorPicker } from "@/components/common/AdvancedColorPicker";

const PREVIEW_COUNT = 3;
const BODY_MIN_PX = 96;
const BODY_MAX_PX = 280;

const TEXT_COLORS = [
  { label: "Red", value: "#DC2626" },
  { label: "Orange", value: "#EA580C" },
  { label: "Dark Yellow", value: "#CA8A04" },
  { label: "Green", value: "#16A34A" },
  { label: "Blue", value: "#2563EB" },
  { label: "Teal", value: "#0D9488" },
  { label: "Purple", value: "#7C3AED" },
  { label: "Pink", value: "#DB2777" },
  { label: "Cyan", value: "#0891B2" },
  { label: "Indigo", value: "#4F46E5" },
  { label: "Rose", value: "#E11D48" },
  { label: "Lime", value: "#65A30D" },
  { label: "Dark", value: "#1E293B" },
  { label: "Light Gray", value: "#9CA3AF" },
  { label: "Gray", value: "#6B7280" },
  { label: "Dark Gray", value: "#374151" },
  { label: "Charcoal", value: "#1F2937" },
  { label: "Black", value: "#000000" },
] as const;

/** Docs-style highlight palette: vivid → pastel → none/grays */
const HIGHLIGHT_COLORS = [
  { label: "Cyan", value: "#22D3EE" },
  { label: "Lime", value: "#A3E635" },
  { label: "Yellow", value: "#FACC15" },
  { label: "Orange", value: "#FB923C" },
  { label: "Red", value: "#F87171" },
  { label: "Magenta", value: "#E879F9" },
  { label: "Light Cyan", value: "#A5F3FC" },
  { label: "Light Green", value: "#BBF7D0" },
  { label: "Light Yellow", value: "#FEF08A" },
  { label: "Light Orange", value: "#FED7AA" },
  { label: "Light Red", value: "#FECACA" },
  { label: "Light Purple", value: "#E9D5FF" },
  { label: "None", value: "transparent" },
  { label: "Light Gray", value: "#E5E7EB" },
  { label: "Gray", value: "#9CA3AF" },
  { label: "Dark Gray", value: "#6B7280" },
  { label: "Charcoal", value: "#374151" },
  { label: "Black", value: "#111827" },
] as const;

const BULLET_OPTIONS = [
  { id: "disc", label: "• Filled circle", css: "disc", dataStyle: "disc" },
  { id: "circle", label: "○ Hollow circle", css: "circle", dataStyle: "circle" },
  { id: "square", label: "■ Square", css: "square", dataStyle: "square" },
] as const;

const NUMBER_OPTIONS = [
  { id: "decimal", label: "1. 2. 3.", css: "decimal", dataStyle: "decimal-dot" },
  {
    id: "lower-alpha",
    label: "a. b. c.",
    css: "lower-alpha",
    dataStyle: "lower-alpha-dot",
  },
  {
    id: "upper-alpha",
    label: "A. B. C.",
    css: "upper-alpha",
    dataStyle: "upper-alpha-dot",
  },
  {
    id: "lower-roman",
    label: "i. ii. iii.",
    css: "lower-roman",
    dataStyle: "lower-roman-dot",
  },
] as const;

const DEFAULT_TEXT_COLOR = "#1E293B";
const DEFAULT_HIGHLIGHT_COLOR = "#FEF08A";

type SortOrder = "recent-first" | "recent-last";
type ToolbarMenu = "text" | "highlight" | "bullet" | "number" | null;

type ActiveFormats = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  unorderedList: boolean;
  orderedList: boolean;
  link: boolean;
};

const EMPTY_FORMATS: ActiveFormats = {
  bold: false,
  italic: false,
  underline: false,
  strikeThrough: false,
  unorderedList: false,
  orderedList: false,
  link: false,
};

function paintNoteList(list: HTMLElement, dataStyle: string, css: string) {
  list.setAttribute("data-list-style", dataStyle);
  list.style.listStyleType = css;
  list.style.paddingLeft = "1.75rem";
  list.style.margin = "0.25rem 0";
  list.style.listStylePosition = "outside";
  list.querySelectorAll(":scope > li").forEach((item) => {
    (item as HTMLElement).style.display = "list-item";
  });
}

const PENDING_LINK_ATTR = "data-note-pending-link";

function unwrapPendingLinkMarks(
  editor: HTMLElement,
  options?: { select?: boolean },
): Range | null {
  const marks = Array.from(
    editor.querySelectorAll(`[${PENDING_LINK_ATTR}]`),
  ) as HTMLElement[];
  let selectedRange: Range | null = null;

  for (const mark of marks) {
    const parent = mark.parentNode;
    if (!parent) continue;
    const first = mark.firstChild;
    const last = mark.lastChild;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    if (options?.select && first && last && !selectedRange) {
      selectedRange = document.createRange();
      selectedRange.setStartBefore(first);
      selectedRange.setEndAfter(last);
    }
  }

  if (selectedRange) {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(selectedRange);
    return selectedRange;
  }
  return null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageAttachment(type: string, name: string) {
  if (type.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);
}

function isPdfAttachment(type: string, name: string) {
  return type === "application/pdf" || /\.pdf$/i.test(name);
}

function isSpreadsheetAttachment(type: string, name: string) {
  return (
    /spreadsheet|excel|csv/i.test(type) ||
    /\.(xlsx?|csv)$/i.test(name)
  );
}

function AttachmentGlyph({
  type,
  name,
  className,
}: {
  type: string;
  name: string;
  className?: string;
}) {
  if (isSpreadsheetAttachment(type, name)) {
    return <FileSpreadsheet className={className} />;
  }
  if (isPdfAttachment(type, name)) {
    return <FileText className={cn(className, "text-rose-500")} />;
  }
  return <FileText className={className} />;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

function stripLegacyAttachmentFooter(body: string) {
  return body
    .replace(/(?:\r?\n|<br\s*\/?>)*Attachments:\s*[^\n<]*(?:\r?\n)?/gi, "")
    .trim();
}

function parseLegacyAttachmentNames(body: string): string[] {
  const match = body.match(/Attachments:\s*([^\n<]+)/i);
  if (!match?.[1]) return [];
  return match[1]
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

function noteDisplayBody(note: Note) {
  return stripLegacyAttachmentFooter(note.body);
}

function noteAttachments(note: Note): NoteAttachment[] {
  if (note.attachments?.length) return note.attachments;
  return parseLegacyAttachmentNames(note.body).map((name, index) => ({
    id: `${note.id}-legacy-${index}`,
    name,
    type: guessMimeFromName(name),
    size: 0,
    url: "",
  }));
}

function guessMimeFromName(name: string) {
  if (/\.pdf$/i.test(name)) return "application/pdf";
  if (/\.docx?$/i.test(name)) return "application/msword";
  if (/\.xlsx?$/i.test(name)) return "application/vnd.ms-excel";
  if (/\.csv$/i.test(name)) return "text/csv";
  if (/\.png$/i.test(name)) return "image/png";
  if (/\.jpe?g$/i.test(name)) return "image/jpeg";
  if (/\.gif$/i.test(name)) return "image/gif";
  if (/\.webp$/i.test(name)) return "image/webp";
  return "application/octet-stream";
}

function plainTextFromHtml(html: string) {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent || "").replace(/\u00a0/g, " ").trim();
}

function normalizeEditorHtml(html: string) {
  const trimmed = html.trim();
  if (
    !trimmed ||
    trimmed === "<br>" ||
    trimmed === "<br/>" ||
    trimmed === "<br />" ||
    trimmed === "<div><br></div>" ||
    trimmed === "<div><br/></div>" ||
    trimmed === "<div></div>" ||
    trimmed === "<p><br></p>" ||
    trimmed === "<p></p>"
  ) {
    return "";
  }
  return html;
}

function isEditorVisuallyEmpty(el: HTMLElement) {
  const text = (el.textContent || "").replace(/\u00a0/g, " ").trim();
  if (text.length > 0) return false;
  if (el.querySelector("img, video, table, hr, .mention-tag")) return false;
  return true;
}

function clearEditorIfEmpty(el: HTMLElement) {
  if (!isEditorVisuallyEmpty(el)) {
    el.removeAttribute("data-empty");
    return false;
  }
  // Browsers leave <br>/<div><br></div> after backspace; :empty won't match those.
  if (el.innerHTML !== "") el.innerHTML = "";
  el.setAttribute("data-empty", "true");
  return true;
}

function NoteToolbarPopover({
  open,
  anchorRef,
  children,
  minWidth = 168,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  minWidth?: number;
}) {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });

  const updatePosition = React.useCallback(() => {
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const width = Math.max(minWidth, menu?.offsetWidth || 148);
    const height = menu?.offsetHeight || 180;
    const gap = 6;
    const pad = 8;
    const spaceAbove = rect.top - pad;
    const spaceBelow = window.innerHeight - rect.bottom - pad;

    // Prefer above when it fits; otherwise open below so the panel stays on-screen.
    const placeAbove =
      height + gap <= spaceAbove || spaceAbove >= spaceBelow;

    let top = placeAbove ? rect.top - gap - height : rect.bottom + gap;
    if (top < pad) top = pad;
    if (top + height > window.innerHeight - pad) {
      top = Math.max(pad, window.innerHeight - pad - height);
    }

    const left = Math.min(
      Math.max(pad, rect.left),
      window.innerWidth - width - pad,
    );
    setPos({ top, left });
  }, [anchorRef, minWidth]);

  React.useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    // Remeasure after paint (More Colours expands height).
    const raf = window.requestAnimationFrame(updatePosition);
    const menu = menuRef.current;
    const observer =
      typeof ResizeObserver !== "undefined" && menu
        ? new ResizeObserver(() => updatePosition())
        : null;
    if (menu && observer) observer.observe(menu);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition, children, minWidth]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      data-note-toolbar-menu=""
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        minWidth,
        maxHeight: "calc(100vh - 16px)",
        overflowY: "auto",
        zIndex: 10050,
      }}
      className="rounded-lg border border-slate-200 bg-white shadow-xl"
      onMouseDown={(event) => {
        const target = event.target as HTMLElement | null;
        // Allow color picker interactions (drag/slide) to work.
        if (target?.closest("input[type='color'], [data-more-colours]")) return;
        event.preventDefault();
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

/** Swatch grid + More Colours → advanced picker with hue scroll + Back/Done. */
function MoreColoursSection({
  initialColor,
  onPick,
  hideSwatches,
}: {
  initialColor: string;
  onPick: (color: string) => void;
  hideSwatches?: (hidden: boolean) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    hideSwatches?.(expanded);
    return () => hideSwatches?.(false);
  }, [expanded, hideSwatches]);

  if (!expanded) {
    return (
      <button
        type="button"
        data-more-colours=""
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setExpanded(true)}
        className="mx-2 mb-2 flex h-6 w-[calc(100%-1rem)] cursor-pointer items-center justify-center rounded-md bg-slate-100 text-[10px] font-medium text-slate-600 hover:bg-slate-200"
      >
        More Colours
      </button>
    );
  }

  return (
    <AdvancedColorPicker
      initialColor={initialColor}
      onBack={() => setExpanded(false)}
      onDone={(color) => {
        onPick(color);
        setExpanded(false);
      }}
    />
  );
}

function parseNoteDate(raw: string): number {
  const s = raw.trim();
  const m = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i,
  );
  if (m) {
    let hours = m[4] ? Number(m[4]) : 12;
    const mins = m[5] ? Number(m[5]) : 0;
    const ap = m[6]?.toUpperCase();
    if (ap === "PM" && hours < 12) hours += 12;
    if (ap === "AM" && hours === 12) hours = 0;
    if (!ap && !m[4]) hours = 12;
    return new Date(
      Number(m[3]),
      Number(m[2]) - 1,
      Number(m[1]),
      hours,
      mins,
    ).getTime();
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
}

function formatNoteWhen(raw: string): string {
  const t = parseNoteDate(raw);
  if (!t) return raw;
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function recordKind(href: string): string {
  if (href.includes("/tasks")) return "Task";
  if (href.includes("/calls")) return "Call";
  if (href.includes("/meetings")) return "Meeting";
  if (href.includes("/emails")) return "Email";
  if (href.includes("/messages")) return "Message";
  if (href.includes("/leads")) return "Lead";
  if (href.includes("/contacts")) return "Contact";
  if (href.includes("/deals")) return "Deal";
  return "Record";
}

function RecordIcon({ href, className }: { href: string; className?: string }) {
  if (href.includes("/calls")) {
    return <Phone className={className} strokeWidth={1.75} />;
  }
  return <CheckSquare className={className} strokeWidth={1.75} />;
}

export function WorkQueueNotesDrawer({
  row,
  onClose,
  onChanged,
  layerClassName = "z-[80]",
  embedded = false,
  composerStartsOpen = false,
  inlineComposer = false,
}: {
  row: NotesDrawerTarget;
  onClose: () => void;
  onChanged?: (message: string) => void;
  /** Raise above lead side drawer (z-[80]) when nested. */
  layerClassName?: string;
  /** Render inline (lead Notes tab) without portal / overlay chrome. */
  embedded?: boolean;
  /** Open the title/body composer immediately. */
  composerStartsOpen?: boolean;
  /** Expand the composer in place. No side drawer and no extra Add a note click. */
  inlineComposer?: boolean;
}) {
  const [mounted, setMounted] = React.useState(false);
  const openComposerOnShow = composerStartsOpen || inlineComposer;
  const [sort, setSort] = React.useState<SortOrder>("recent-first");
  const [sortOpen, setSortOpen] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [confirmDeleteNote, setConfirmDeleteNote] = React.useState<Note | null>(
    null,
  );
  const [tick, setTick] = React.useState(0);
  const [composing, setComposing] = React.useState(openComposerOnShow);
  const [attachments, setAttachments] = React.useState<NoteAttachment[]>([]);
  const [previewItem, setPreviewItem] = React.useState<NoteAttachment | null>(
    null,
  );
  const [menuOpen, setMenuOpen] = React.useState<ToolbarMenu>(null);
  const [textMoreOpen, setTextMoreOpen] = React.useState(false);
  const [highlightMoreOpen, setHighlightMoreOpen] = React.useState(false);
  const [textColor, setTextColor] = React.useState(DEFAULT_TEXT_COLOR);
  const [highlightColor, setHighlightColor] = React.useState(
    DEFAULT_HIGHLIGHT_COLOR,
  );
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("https://");
  const [activeFormats, setActiveFormats] =
    React.useState<ActiveFormats>(EMPTY_FORMATS);
  const sortRef = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLInputElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const toolbarRef = React.useRef<HTMLDivElement>(null);
  const linkInputRef = React.useRef<HTMLInputElement>(null);
  const savedRangeRef = React.useRef<Range | null>(null);
  const textColorBtnRef = React.useRef<HTMLButtonElement>(null);
  const highlightBtnRef = React.useRef<HTMLButtonElement>(null);
  const bulletBtnRef = React.useRef<HTMLButtonElement>(null);
  const numberBtnRef = React.useRef<HTMLButtonElement>(null);
  const attachmentsRef = React.useRef<NoteAttachment[]>([]);
  attachmentsRef.current = attachments;

  function autosizeBody() {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(
      BODY_MAX_PX,
      Math.max(BODY_MIN_PX, el.scrollHeight),
    );
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > BODY_MAX_PX ? "auto" : "hidden";
  }

  function syncBodyFromEditor() {
    const el = bodyRef.current;
    if (!el) return;
    if (clearEditorIfEmpty(el)) {
      setBody("");
      autosizeBody();
      return;
    }
    const html = normalizeEditorHtml(el.innerHTML);
    setBody(html);
    autosizeBody();
  }

  const mentions = useContentEditableMentions({
    editorRef: bodyRef,
    onContentChange: syncBodyFromEditor,
  });

  function setEditorHtml(html: string) {
    const el = bodyRef.current;
    if (!el) return;
    el.innerHTML = html || "";
    clearEditorIfEmpty(el);
    autosizeBody();
  }

  function runEditorCommand(command: string, value?: string) {
    const editor = bodyRef.current;
    if (!editor) return;
    editor.focus();
    ensureEditorCaret();
    document.execCommand(command, false, value);
    syncBodyFromEditor();
    readActiveFormats();
  }

  function readActiveFormats() {
    const editor = bodyRef.current;
    if (!editor) {
      setActiveFormats(EMPTY_FORMATS);
      return;
    }
    const selection = window.getSelection();
    const node = selection?.anchorNode;
    const inEditor =
      Boolean(node) &&
      (editor === node || editor.contains(node as Node));
    if (!inEditor) {
      setActiveFormats(EMPTY_FORMATS);
      return;
    }
    const element =
      node instanceof Element ? node : node?.parentElement ?? null;
    const list = element?.closest("ul, ol");
    const anchor = element?.closest("a");
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      unorderedList: list?.tagName === "UL",
      orderedList: list?.tagName === "OL",
      link: Boolean(anchor && editor.contains(anchor)),
    });
  }

  function ensureEditorCaret() {
    const editor = bodyRef.current;
    const selection = window.getSelection();
    if (!editor || !selection) return;
    if (
      selection.rangeCount > 0 &&
      selection.anchorNode &&
      editor.contains(selection.anchorNode)
    ) {
      return;
    }
    if (savedRangeRef.current && editor.contains(savedRangeRef.current.commonAncestorContainer)) {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    savedRangeRef.current = range.cloneRange();
  }

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    setTitle("");
    setBody("");
    setEditingId(null);
    setComposing(openComposerOnShow);
    setMenuOpen(null);
    setLinkOpen(false);
    setLinkUrl("https://");
    savedRangeRef.current = null;
    setActiveFormats(EMPTY_FORMATS);
    setTextColor(DEFAULT_TEXT_COLOR);
    setHighlightColor(DEFAULT_HIGHLIGHT_COLOR);
    setAttachments((prev) => {
      prev.forEach((item) => {
        if (item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
      });
      return [];
    });
    setPreviewItem(null);
    setShowAll(false);
    setSort("recent-first");
    setExpanded(new Set());
    setConfirmDeleteNote(null);
  }, [row.id, openComposerOnShow]);

  React.useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((item) => {
        if (item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
      });
    };
  }, []);

  React.useLayoutEffect(() => {
    if (!(composing || editingId)) return;
    setEditorHtml(body);
  }, [composing, editingId]);

  React.useLayoutEffect(() => {
    if (!(composing || editingId)) return;
    autosizeBody();
  }, [body, composing, editingId]);

  React.useEffect(() => {
    if (!(composing || editingId)) return;
    window.setTimeout(() => titleRef.current?.focus({ preventScroll: true }), 0);
  }, [composing, editingId]);

  React.useEffect(() => {
    if (!(composing || editingId)) return;
    function onSelectionChange() {
      const editor = bodyRef.current;
      const selection = window.getSelection();
      if (!editor || !selection?.anchorNode) return;
      if (editor === selection.anchorNode || editor.contains(selection.anchorNode)) {
        readActiveFormats();
      }
    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [composing, editingId]);

  React.useEffect(() => {
    if (menuOpen !== "text") setTextMoreOpen(false);
    if (menuOpen !== "highlight") setHighlightMoreOpen(false);
  }, [menuOpen]);

  React.useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (toolbarRef.current?.contains(target)) return;
      if (target.closest("[data-note-toolbar-menu]")) return;
      setMenuOpen(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (confirmDeleteNote) {
        e.stopPropagation();
        setConfirmDeleteNote(null);
        return;
      }
      if (previewItem) {
        e.stopPropagation();
        setPreviewItem(null);
        return;
      }
      if (mentions.open) {
        e.stopPropagation();
        return;
      }
      if (linkOpen) {
        e.stopPropagation();
        cancelLinkBar();
        return;
      }
      if (menuOpen) {
        e.stopPropagation();
        setMenuOpen(null);
        return;
      }
      if (composing || editingId) {
        e.stopPropagation();
        resetForm();
        return;
      }
      if (!embedded) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, composing, editingId, previewItem, menuOpen, linkOpen, mentions.open, confirmDeleteNote, embedded]);

  React.useEffect(() => {
    if (!sortOpen) return;
    function onDoc(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [sortOpen]);

  const notes = React.useMemo(() => {
    const matched = listNotesForQueueRow(row);
    const ordered = [...matched].sort((a, b) => {
      const diff = parseNoteDate(a.createdAt) - parseNoteDate(b.createdAt);
      return sort === "recent-first" ? diff * -1 : diff;
    });
    return ordered;
    // tick forces refresh after create/update/delete
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id, row.noteKey, row.related, row.subject, row.contactName, sort, tick]);

  const visible = showAll ? notes : notes.slice(0, PREVIEW_COUNT);
  const hasMore = notes.length > PREVIEW_COUNT;
  const plainBody = plainTextFromHtml(body);
  const hasTitle = title.trim().length > 0;
  const hasDescription = plainBody.length > 0;
  // Title alone or description alone is enough; attachments require one of them.
  const canSave = hasTitle || hasDescription;
  const composerOpen = composing || Boolean(editingId);

  function bump(message: string) {
    setTick((n) => n + 1);
    onChanged?.(message);
  }

  function clearAttachments() {
    setAttachments((prev) => {
      prev.forEach((item) => {
        if (item.url.startsWith("blob:")) URL.revokeObjectURL(item.url);
      });
      return [];
    });
    setPreviewItem(null);
  }

  function resetComposerColors() {
    setTextColor(DEFAULT_TEXT_COLOR);
    setHighlightColor(DEFAULT_HIGHLIGHT_COLOR);
    const editor = bodyRef.current;
    if (!editor) return;
    // Don't run format commands on an empty editor — they leave spacer nodes
    // that push the caret/text into the middle of the box.
    editor.innerHTML = "";
    editor.setAttribute("data-empty", "true");
    editor.style.height = `${BODY_MIN_PX}px`;
  }

  function resetForm() {
    setTitle("");
    setBody("");
    setEditingId(null);
    setComposing(inlineComposer);
    setMenuOpen(null);
    setLinkOpen(false);
    setLinkUrl("https://");
    savedRangeRef.current = null;
    setActiveFormats(EMPTY_FORMATS);
    setTextColor(DEFAULT_TEXT_COLOR);
    setHighlightColor(DEFAULT_HIGHLIGHT_COLOR);
    clearAttachments();
    if (bodyRef.current) {
      unwrapPendingLinkMarks(bodyRef.current);
      bodyRef.current.innerHTML = "";
      bodyRef.current.setAttribute("data-empty", "true");
    }
  }

  function openComposer() {
    setComposing(true);
    setMenuOpen(null);
    setLinkOpen(false);
    setTextColor(DEFAULT_TEXT_COLOR);
    setHighlightColor(DEFAULT_HIGHLIGHT_COLOR);
    window.setTimeout(() => resetComposerColors(), 0);
  }

  function save() {
    const editor = bodyRef.current;
    if (editor) unwrapPendingLinkMarks(editor);
    const latestBody = normalizeEditorHtml(bodyRef.current?.innerHTML ?? body);
    const plain = plainTextFromHtml(latestBody);
    const trimmedTitle = title.trim();
    if (!trimmedTitle && !plain) return;
    const actor = getRulesActor().name || "Me";
    const firstLine = plain
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);
    const noteTitle = (
      trimmedTitle ||
      (firstLine
        ? firstLine.length > 100
          ? `${firstLine.slice(0, 97).trimEnd()}…`
          : firstLine
        : "Untitled note")
    ).slice(0, 100);
    const noteBody = stripLegacyAttachmentFooter(latestBody);
    const savedAttachments = attachments.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type || guessMimeFromName(item.name),
      size: item.size,
      url: item.url,
    }));
    if (editingId) {
      updateNote(editingId, {
        title: noteTitle,
        body: noteBody,
        attachments: savedAttachments,
      });
      resetForm();
      bump("Note updated");
      return;
    }
    createNote({
      title: noteTitle,
      body: noteBody,
      relatedTo: row.noteKey || row.related || row.subject,
      createdBy: actor,
      attachments: savedAttachments,
    });
    resetForm();
    bump("Note added");
  }

  function applyListStyle(
    kind: "bullet" | "number",
    css: string,
    dataStyle: string,
  ) {
    const editor = bodyRef.current;
    if (!editor) return;
    editor.focus();
    ensureEditorCaret();

    const selection = window.getSelection();
    const node = selection?.anchorNode;
    const el = node instanceof Element ? node : node?.parentElement ?? null;
    const existing = el?.closest("ul, ol") as HTMLElement | null;
    const wanted = kind === "bullet" ? "UL" : "OL";

    if (existing && editor.contains(existing)) {
      if (existing.tagName === wanted) {
        paintNoteList(existing, dataStyle, css);
        setMenuOpen(null);
        syncBodyFromEditor();
        readActiveFormats();
        return;
      }
      const next = document.createElement(wanted.toLowerCase());
      while (existing.firstChild) next.appendChild(existing.firstChild);
      existing.replaceWith(next);
      paintNoteList(next, dataStyle, css);
      setMenuOpen(null);
      syncBodyFromEditor();
      readActiveFormats();
      return;
    }

    document.execCommand(
      kind === "bullet" ? "insertUnorderedList" : "insertOrderedList",
      false,
    );

    let list =
      (window.getSelection()?.anchorNode instanceof Element
        ? (window.getSelection()?.anchorNode as Element)
        : window.getSelection()?.anchorNode?.parentElement
      )?.closest("ul, ol") as HTMLElement | null;

    if (!list || !editor.contains(list)) {
      list = document.createElement(wanted.toLowerCase()) as HTMLElement;
      const li = document.createElement("li");
      const selected = selection?.toString() ?? "";
      if (selected && selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        li.appendChild(range.extractContents());
        range.insertNode(list);
        list.appendChild(li);
      } else {
        li.appendChild(document.createElement("br"));
        list.appendChild(li);
        if (!editor.innerHTML || editor.innerHTML === "<br>") {
          editor.innerHTML = "";
          editor.appendChild(list);
        } else {
          editor.appendChild(list);
        }
      }
      const nextRange = document.createRange();
      nextRange.selectNodeContents(li);
      nextRange.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(nextRange);
      savedRangeRef.current = nextRange.cloneRange();
    }

    paintNoteList(list, dataStyle, css);
    setMenuOpen(null);
    syncBodyFromEditor();
    readActiveFormats();
  }

  function toggleList(kind: "bullet" | "number") {
    const editor = bodyRef.current;
    if (!editor) return;
    editor.focus();
    ensureEditorCaret();
    const selection = window.getSelection();
    const node = selection?.anchorNode;
    const el = node instanceof Element ? node : node?.parentElement ?? null;
    const existing = el?.closest("ul, ol") as HTMLElement | null;
    const wanted = kind === "bullet" ? "UL" : "OL";

    if (existing && editor.contains(existing) && existing.tagName === wanted) {
      const frag = document.createDocumentFragment();
      Array.from(existing.children).forEach((li) => {
        const div = document.createElement("div");
        while (li.firstChild) div.appendChild(li.firstChild);
        if (!div.childNodes.length) div.appendChild(document.createElement("br"));
        frag.appendChild(div);
      });
      existing.replaceWith(frag);
      syncBodyFromEditor();
      readActiveFormats();
      return;
    }

    const defaults =
      kind === "bullet"
        ? BULLET_OPTIONS[0]
        : NUMBER_OPTIONS[0];
    applyListStyle(kind, defaults.css, defaults.dataStyle);
  }

  function rememberSelection() {
    const selection = window.getSelection();
    const editor = bodyRef.current;
    if (!selection || selection.rangeCount === 0 || !editor) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    savedRangeRef.current = range.cloneRange();
  }

  function restoreSelection() {
    const selection = window.getSelection();
    const saved = savedRangeRef.current;
    if (!selection || !saved) return false;
    bodyRef.current?.focus();
    selection.removeAllRanges();
    selection.addRange(saved);
    return true;
  }

  function markPendingLinkSelection() {
    const editor = bodyRef.current;
    if (!editor) return;
    unwrapPendingLinkMarks(editor);

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    let range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      if (
        savedRangeRef.current &&
        editor.contains(savedRangeRef.current.commonAncestorContainer)
      ) {
        selection.removeAllRanges();
        selection.addRange(savedRangeRef.current);
        range = selection.getRangeAt(0);
      } else {
        return;
      }
    }

    const startEl =
      range.startContainer instanceof Element
        ? range.startContainer
        : range.startContainer.parentElement;
    const existingLink = startEl?.closest("a");

    if (existingLink && editor.contains(existingLink)) {
      const linkRange = document.createRange();
      linkRange.selectNodeContents(existingLink);
      const fullyInside =
        range.collapsed ||
        (existingLink.contains(range.startContainer) &&
          existingLink.contains(range.endContainer));
      if (fullyInside) {
        existingLink.setAttribute(PENDING_LINK_ATTR, "");
        savedRangeRef.current = linkRange.cloneRange();
        return;
      }
    }

    if (range.collapsed) return;

    const mark = document.createElement("span");
    mark.setAttribute(PENDING_LINK_ATTR, "");
    try {
      range.surroundContents(mark);
    } catch {
      mark.appendChild(range.extractContents());
      range.insertNode(mark);
    }

    const next = document.createRange();
    next.selectNodeContents(mark);
    savedRangeRef.current = next.cloneRange();
    selection.removeAllRanges();
    selection.addRange(next);
  }

  function openLinkBar() {
    rememberSelection();
    markPendingLinkSelection();
    setMenuOpen(null);
    setLinkOpen(true);

    const editor = bodyRef.current;
    const markedLink = editor?.querySelector(
      `a[${PENDING_LINK_ATTR}]`,
    ) as HTMLAnchorElement | null;
    setLinkUrl(markedLink?.getAttribute("href") || "https://");

    window.setTimeout(() => {
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
    }, 0);
  }

  function unlinkSelection() {
    const editor = bodyRef.current;
    if (!editor) return;
    editor.focus();

    const pending = editor.querySelector(
      `[${PENDING_LINK_ATTR}]`,
    ) as HTMLElement | null;

    function unwrapAnchor(anchor: HTMLElement) {
      const parent = anchor.parentNode;
      if (!parent) return;
      while (anchor.firstChild) parent.insertBefore(anchor.firstChild, anchor);
      parent.removeChild(anchor);
      parent.normalize?.();
    }

    if (pending?.tagName === "A") {
      pending.removeAttribute(PENDING_LINK_ATTR);
      unwrapAnchor(pending);
    } else if (pending) {
      pending.querySelectorAll("a").forEach((anchor) => {
        unwrapAnchor(anchor as HTMLElement);
      });
      unwrapPendingLinkMarks(editor, { select: true });
    } else {
      restoreSelection();
      const selection = window.getSelection();
      const node = selection?.anchorNode;
      const el = node instanceof Element ? node : node?.parentElement ?? null;
      const existing = el?.closest("a");
      if (existing && editor.contains(existing)) {
        unwrapAnchor(existing);
      } else {
        document.execCommand("unlink", false);
      }
    }

    unwrapPendingLinkMarks(editor);
    setLinkOpen(false);
    setLinkUrl("https://");
    savedRangeRef.current = null;
    syncBodyFromEditor();
    readActiveFormats();
  }

  function onLinkButtonClick() {
    if (linkOpen) {
      cancelLinkBar();
      return;
    }
    // Linked selection: one click removes the link (same idea as toggling bold off).
    if (activeFormats.link) {
      unlinkSelection();
      return;
    }
    openLinkBar();
  }

  function cancelLinkBar() {
    const editor = bodyRef.current;
    if (editor) {
      const restored = unwrapPendingLinkMarks(editor, { select: true });
      if (restored) savedRangeRef.current = restored.cloneRange();
    }
    setLinkOpen(false);
    setLinkUrl("https://");
    restoreSelection();
    syncBodyFromEditor();
    readActiveFormats();
  }

  function applyLink() {
    let url = linkUrl.trim();
    if (!url || url === "https://" || url === "http://") return;
    if (!/^(https?:\/\/|mailto:)/i.test(url)) {
      url = `https://${url}`;
    }
    const editor = bodyRef.current;
    if (!editor) return;
    editor.focus();

    const pendingMark = editor.querySelector(
      `[${PENDING_LINK_ATTR}]`,
    ) as HTMLElement | null;

    if (pendingMark) {
      if (pendingMark.tagName === "A") {
        pendingMark.setAttribute("href", url);
        pendingMark.setAttribute("target", "_blank");
        pendingMark.setAttribute("rel", "noopener noreferrer");
        pendingMark.removeAttribute(PENDING_LINK_ATTR);
      } else {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        while (pendingMark.firstChild) {
          anchor.appendChild(pendingMark.firstChild);
        }
        pendingMark.replaceWith(anchor);
      }
    } else {
      restoreSelection();
      const selection = window.getSelection();
      const selectedText = selection?.toString() ?? "";
      const node = selection?.anchorNode;
      const el = node instanceof Element ? node : node?.parentElement ?? null;
      const existing = el?.closest("a");

      if (
        existing &&
        editor.contains(existing) &&
        (!selectedText || existing.contains(selection?.focusNode ?? null))
      ) {
        existing.setAttribute("href", url);
        existing.setAttribute("target", "_blank");
        existing.setAttribute("rel", "noopener noreferrer");
      } else if (
        !selection ||
        selection.rangeCount === 0 ||
        selection.isCollapsed
      ) {
        const safe = url
          .replace(/&/g, "&amp;")
          .replace(/"/g, "&quot;")
          .replace(/</g, "&lt;");
        document.execCommand(
          "insertHTML",
          false,
          `<a href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a>`,
        );
      } else {
        document.execCommand("createLink", false, url);
        const anchor = selection.anchorNode?.parentElement?.closest("a");
        if (anchor && editor.contains(anchor)) {
          anchor.setAttribute("target", "_blank");
          anchor.setAttribute("rel", "noopener noreferrer");
          if (!anchor.textContent?.trim() && selectedText) {
            anchor.textContent = selectedText;
          }
        }
      }
    }

    unwrapPendingLinkMarks(editor);
    syncBodyFromEditor();
    setLinkOpen(false);
    setLinkUrl("https://");
    savedRangeRef.current = null;
    readActiveFormats();
  }

  async function addFiles(files: File[]) {
    if (!files.length) return;
    const next = await Promise.all(
      files.map(async (file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        type: file.type || guessMimeFromName(file.name),
        size: file.size,
        url: await fileToDataUrl(file),
      })),
    );
    setAttachments((prev) => [...prev, ...next]);
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.url.startsWith("blob:")) URL.revokeObjectURL(target.url);
      return prev.filter((item) => item.id !== id);
    });
    setPreviewItem((current) => (current?.id === id ? null : current));
  }

  function startEdit(note: Note) {
    setEditingId(note.id);
    setComposing(true);
    setTitle(note.title);
    setBody(noteDisplayBody(note));
    setAttachments(
      noteAttachments(note).map((item) => ({
        ...item,
        type: item.type || guessMimeFromName(item.name),
      })),
    );
    setMenuOpen(null);
    setLinkOpen(false);
    setConfirmDeleteNote(null);
    setTextColor(DEFAULT_TEXT_COLOR);
    setHighlightColor(DEFAULT_HIGHLIGHT_COLOR);
  }

  function requestDelete(note: Note) {
    setConfirmDeleteNote(note);
  }

  function confirmDelete() {
    const note = confirmDeleteNote;
    if (!note) return;
    deleteNote(note.id);
    if (editingId === note.id) resetForm();
    setConfirmDeleteNote(null);
    bump("Note deleted");
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!mounted) return null;

  const kind = recordKind(row.href);

  function AttachmentTile({
    item,
    removable = false,
  }: {
    item: NoteAttachment;
    removable?: boolean;
  }) {
    const image = isImageAttachment(item.type, item.name);
    const canOpen = Boolean(item.url);
    return (
      <div className="group relative">
        <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {image && item.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.url}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <AttachmentGlyph
              type={item.type}
              name={item.name}
              className="h-5 w-5 text-slate-400"
            />
          )}
          {canOpen ? (
            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-slate-900/55 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                title="Preview"
                aria-label={`Preview ${item.name}`}
                onClick={() => setPreviewItem(item)}
                className="flex h-6 w-6 items-center justify-center rounded-md bg-white/95 text-slate-700 hover:text-sky-700"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <a
                href={item.url}
                download={item.name}
                title="Download"
                aria-label={`Download ${item.name}`}
                className="flex h-6 w-6 items-center justify-center rounded-md bg-white/95 text-slate-700 hover:text-sky-700"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : null}
        </div>
        {removable ? (
          <button
            type="button"
            aria-label={`Remove ${item.name}`}
            onClick={() => removeAttachment(item.id)}
            className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:text-rose-600"
          >
            <X className="h-3 w-3" />
          </button>
        ) : null}
        <p className="mt-1 max-w-14 truncate text-[10px] text-slate-500" title={item.name}>
          {item.name}
        </p>
      </div>
    );
  }

  const panel = (
      <>
        {!embedded ? (
          <button
            type="button"
            aria-label="Close notes"
            onClick={onClose}
            className="absolute top-4 -left-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md hover:text-slate-800"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.25} />
          </button>
        ) : null}

        {!inlineComposer ? (
        <header className="flex shrink-0 items-start gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2
                id="wq-notes-title"
                className="text-[16px] font-semibold text-slate-900"
              >
                Notes
              </h2>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-600">
                {notes.length}
              </span>
            </div>
            <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[12.5px] text-slate-500">
              <RecordIcon
                href={row.href}
                className="h-3.5 w-3.5 shrink-0 text-slate-400"
              />
              <span className="truncate">
                {row.subject}
                {row.related ? ` · ${row.related}` : ""}
              </span>
            </div>
          </div>
          <div className="relative shrink-0" ref={sortRef}>
            <button
              type="button"
              onClick={() => setSortOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={sortOpen}
              className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              {sort === "recent-first" ? "Recent First" : "Recent Last"}
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
            {sortOpen ? (
              <div
                role="menu"
                className="absolute top-full right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              >
                {(
                  [
                    ["recent-first", "Recent First"],
                    ["recent-last", "Recent Last"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setSort(id);
                      setSortOpen(false);
                    }}
                    className={cn(
                      "flex w-full px-3 py-1.5 text-left text-[13px]",
                      sort === id
                        ? "bg-violet-50 font-medium text-violet-700"
                        : "text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </header>
        ) : null}

        <div className="shrink-0 border-b border-slate-100 px-5 py-3">
          {!composerOpen ? (
            <button
              type="button"
              onClick={openComposer}
              className="flex h-11 w-full items-center rounded-full border border-slate-200 bg-white px-4 text-left text-[14px] text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              Add a note
            </button>
          ) : (
            <div className="rounded-xl border border-[#7EB6FF] bg-white shadow-[0_0_0_1px_rgba(126,182,255,0.25)]">
              <div className="px-3.5 pt-3">
                <input
                  ref={titleRef}
                  value={title}
                  maxLength={100}
                  onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                  placeholder="Title"
                  className="w-full border-0 bg-transparent pb-2 text-[15px] font-semibold text-slate-900 outline-none placeholder:font-semibold placeholder:text-slate-400"
                />
                <div className="border-t border-slate-200" aria-hidden />
                <div className="relative pt-2">
                  {plainBody.length === 0 ? (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 top-2 text-[13.5px] leading-5 text-slate-400"
                    >
                      What&apos;s this note about? Type @ to mention someone.
                    </div>
                  ) : null}
                  <div
                    ref={bodyRef}
                    contentEditable
                    suppressContentEditableWarning
                    role="textbox"
                    aria-multiline
                    aria-label="Note description"
                    onInput={() => {
                      syncBodyFromEditor();
                      readActiveFormats();
                      mentions.syncMention();
                    }}
                    onBlur={syncBodyFromEditor}
                    onMouseUp={() => {
                      readActiveFormats();
                      mentions.syncMention();
                    }}
                    onKeyUp={() => {
                      readActiveFormats();
                      mentions.syncMention();
                    }}
                    onKeyDown={(event) => {
                      if (mentions.handleKeyDown(event)) {
                        event.stopPropagation();
                      }
                    }}
                    className={cn(
                      "fc-rich-editor relative min-h-[96px] w-full resize-y overflow-y-auto border-0 bg-transparent text-[13.5px] leading-5 text-slate-700 outline-none",
                      "[&_.mention-tag]:rounded [&_.mention-tag]:bg-violet-100 [&_.mention-tag]:px-1 [&_.mention-tag]:py-0.5 [&_.mention-tag]:font-medium [&_.mention-tag]:text-violet-800",
                    )}
                  />
                </div>
                {attachments.length > 0 ? (
                  <div className="flex flex-wrap gap-2.5 pb-2">
                    {attachments.map((item) => (
                      <AttachmentTile key={item.id} item={item} removable />
                    ))}
                  </div>
                ) : null}
                <MentionPickerMenu
                  open={mentions.open}
                  people={mentions.filtered}
                  highlightIndex={mentions.highlightIndex}
                  menuRef={mentions.menuRef}
                  position={mentions.menuPos}
                  onPick={mentions.insertMention}
                  onHighlight={mentions.setHighlightIndex}
                />
              </div>

              <div
                ref={toolbarRef}
                className="relative z-20 flex w-full items-center justify-between gap-0.5 overflow-visible border-t border-slate-100 bg-slate-50/80 px-2 py-1.5"
              >
                <button
                  type="button"
                  title="Bold"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => runEditorCommand("bold")}
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-700 hover:bg-white",
                    activeFormats.bold && "bg-sky-100 text-sky-700",
                  )}
                >
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Underline"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => runEditorCommand("underline")}
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-700 hover:bg-white",
                    activeFormats.underline && "bg-sky-100 text-sky-700",
                  )}
                >
                  <Underline className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Italic"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => runEditorCommand("italic")}
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-700 hover:bg-white",
                    activeFormats.italic && "bg-sky-100 text-sky-700",
                  )}
                >
                  <Italic className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Strikethrough"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => runEditorCommand("strikeThrough")}
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-700 hover:bg-white",
                    activeFormats.strikeThrough && "bg-sky-100 text-sky-700",
                  )}
                >
                  <Strikethrough className="h-3.5 w-3.5" />
                </button>

                <div className="relative shrink-0">
                  <div
                    className={cn(
                      "inline-flex h-7 items-center rounded-md border bg-white text-slate-700 transition-colors",
                      menuOpen === "text"
                        ? "border-violet-300 bg-violet-50"
                        : "border-slate-200",
                    )}
                  >
                    <button
                      type="button"
                      title="Apply font color"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        rememberSelection();
                      }}
                      onClick={() => {
                        setMenuOpen(null);
                        runEditorCommand("foreColor", textColor);
                      }}
                      className="inline-flex h-7 items-center rounded-l-md px-1.5 hover:bg-slate-50"
                    >
                      <span className="flex flex-col items-center justify-center leading-none">
                        <span
                          className="text-[11px] font-bold"
                          style={{ color: textColor }}
                        >
                          A
                        </span>
                        <span
                          className="mt-px h-[2px] w-3 rounded-full"
                          style={{ backgroundColor: textColor }}
                        />
                      </span>
                    </button>
                    <span
                      className="h-3.5 w-px shrink-0 bg-slate-300"
                      aria-hidden
                    />
                    <button
                      ref={textColorBtnRef}
                      type="button"
                      title="Font color options"
                      aria-label="Font color options"
                      aria-haspopup="menu"
                      aria-expanded={menuOpen === "text"}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        rememberSelection();
                      }}
                      onClick={() =>
                        setMenuOpen((v) => (v === "text" ? null : "text"))
                      }
                      className="inline-flex h-7 w-5 items-center justify-center rounded-r-md hover:bg-slate-50"
                    >
                      <ChevronDown className="h-2.5 w-2.5 text-slate-500" />
                    </button>
                  </div>
                  <NoteToolbarPopover
                    open={menuOpen === "text"}
                    anchorRef={textColorBtnRef}
                    minWidth={textMoreOpen ? 260 : 200}
                  >
                    {!textMoreOpen ? (
                      <div className="grid grid-cols-6 gap-1.5 px-2 pt-2 pb-1.5">
                        {TEXT_COLORS.map((option) => {
                          const selected = option.value === textColor;
                          return (
                            <button
                              key={option.label}
                              type="button"
                              title={option.label}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setTextColor(option.value);
                                runEditorCommand("foreColor", option.value);
                                setMenuOpen(null);
                              }}
                              className={cn(
                                "relative h-5 w-5 rounded-full transition-transform hover:scale-110 ring-1 ring-black/10",
                                selected &&
                                  "ring-2 ring-slate-700 ring-offset-1",
                              )}
                              style={{ backgroundColor: option.value }}
                            />
                          );
                        })}
                      </div>
                    ) : null}
                    <MoreColoursSection
                      initialColor={textColor}
                      hideSwatches={setTextMoreOpen}
                      onPick={(color) => {
                        setTextColor(color);
                        runEditorCommand("foreColor", color);
                        setMenuOpen(null);
                      }}
                    />
                  </NoteToolbarPopover>
                </div>

                <div className="relative shrink-0">
                  <div
                    className={cn(
                      "inline-flex h-7 items-center rounded-md border bg-white text-slate-700 transition-colors",
                      menuOpen === "highlight"
                        ? "border-violet-300 bg-violet-50"
                        : "border-slate-200",
                    )}
                  >
                    <button
                      type="button"
                      title="Apply highlight color"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        rememberSelection();
                      }}
                      onClick={() => {
                        setMenuOpen(null);
                        runEditorCommand(
                          "hiliteColor",
                          highlightColor === "transparent"
                            ? "transparent"
                            : highlightColor,
                        );
                      }}
                      className="inline-flex h-7 items-center rounded-l-md px-1.5 hover:bg-slate-50"
                    >
                      <span className="relative inline-flex h-3.5 w-3.5 items-center justify-center">
                        <Highlighter
                          className="relative z-10 h-3.5 w-3.5 text-slate-800"
                          strokeWidth={2.4}
                        />
                        <span
                          aria-hidden
                          className="absolute right-0 bottom-0 left-[1px] h-[4px] rounded-[1px]"
                          style={{
                            backgroundColor:
                              highlightColor === "transparent"
                                ? "#FEF08A"
                                : highlightColor,
                          }}
                        />
                      </span>
                    </button>
                    <span
                      className="h-3.5 w-px shrink-0 bg-slate-300"
                      aria-hidden
                    />
                    <button
                      ref={highlightBtnRef}
                      type="button"
                      title="Highlight color options"
                      aria-label="Highlight color options"
                      aria-haspopup="menu"
                      aria-expanded={menuOpen === "highlight"}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        rememberSelection();
                      }}
                      onClick={() =>
                        setMenuOpen((v) =>
                          v === "highlight" ? null : "highlight",
                        )
                      }
                      className="inline-flex h-7 w-5 items-center justify-center rounded-r-md hover:bg-slate-50"
                    >
                      <ChevronDown className="h-2.5 w-2.5 text-slate-500" />
                    </button>
                  </div>
                  <NoteToolbarPopover
                    open={menuOpen === "highlight"}
                    anchorRef={highlightBtnRef}
                    minWidth={highlightMoreOpen ? 260 : 200}
                  >
                    {!highlightMoreOpen ? (
                      <div className="grid grid-cols-6 gap-1.5 px-2 pt-2 pb-1.5">
                        {HIGHLIGHT_COLORS.map((option) => {
                          const isNone = option.value === "transparent";
                          const selected = option.value === highlightColor;
                          return (
                            <button
                              key={option.label}
                              type="button"
                              title={option.label}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setHighlightColor(option.value);
                                runEditorCommand(
                                  "hiliteColor",
                                  isNone ? "transparent" : option.value,
                                );
                                setMenuOpen(null);
                              }}
                              className={cn(
                                "relative h-5 w-5 rounded-full transition-transform hover:scale-110",
                                !isNone && "ring-1 ring-black/10",
                                selected &&
                                  "ring-2 ring-slate-700 ring-offset-1",
                              )}
                              style={{
                                backgroundColor: isNone
                                  ? "#ffffff"
                                  : option.value,
                              }}
                            >
                              {isNone ? (
                                <span
                                  aria-hidden
                                  className="absolute inset-0 rounded-full border border-slate-300"
                                >
                                  <span className="absolute top-1/2 left-1/2 h-px w-[120%] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-slate-400" />
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                    <MoreColoursSection
                      initialColor={
                        highlightColor === "transparent"
                          ? "#FEF08A"
                          : highlightColor
                      }
                      hideSwatches={setHighlightMoreOpen}
                      onPick={(color) => {
                        setHighlightColor(color);
                        runEditorCommand("hiliteColor", color);
                        setMenuOpen(null);
                      }}
                    />
                  </NoteToolbarPopover>
                </div>

                <div className="relative shrink-0">
                  <div
                    className={cn(
                      "inline-flex h-7 items-center rounded-md text-slate-700 hover:bg-white",
                      (menuOpen === "bullet" || activeFormats.unorderedList) &&
                        "bg-sky-100 text-sky-700",
                    )}
                  >
                    <button
                      ref={bulletBtnRef}
                      type="button"
                      title="Bulleted list"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        rememberSelection();
                      }}
                      onClick={() => toggleList("bullet")}
                      className="flex h-7 w-7 items-center justify-center rounded-md"
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Bullet styles"
                      aria-label="Bullet styles"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        rememberSelection();
                      }}
                      onClick={() =>
                        setMenuOpen((v) => (v === "bullet" ? null : "bullet"))
                      }
                      className="flex h-7 w-4 items-center justify-center rounded-md"
                    >
                      <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                    </button>
                  </div>
                  <NoteToolbarPopover
                    open={menuOpen === "bullet"}
                    anchorRef={bulletBtnRef}
                    minWidth={168}
                  >
                    <div className="py-1">
                      {BULLET_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() =>
                            applyListStyle(
                              "bullet",
                              option.css,
                              option.dataStyle,
                            )
                          }
                          className="flex w-full px-3 py-1.5 text-left text-[12.5px] text-slate-700 hover:bg-slate-50"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </NoteToolbarPopover>
                </div>

                <div className="relative shrink-0">
                  <div
                    className={cn(
                      "inline-flex h-7 items-center rounded-md text-slate-700 hover:bg-white",
                      (menuOpen === "number" || activeFormats.orderedList) &&
                        "bg-sky-100 text-sky-700",
                    )}
                  >
                    <button
                      ref={numberBtnRef}
                      type="button"
                      title="Numbered list"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        rememberSelection();
                      }}
                      onClick={() => toggleList("number")}
                      className="flex h-7 w-7 items-center justify-center rounded-md"
                    >
                      <ListOrdered className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Number styles"
                      aria-label="Number styles"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        rememberSelection();
                      }}
                      onClick={() =>
                        setMenuOpen((v) => (v === "number" ? null : "number"))
                      }
                      className="flex h-7 w-4 items-center justify-center rounded-md"
                    >
                      <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
                    </button>
                  </div>
                  <NoteToolbarPopover
                    open={menuOpen === "number"}
                    anchorRef={numberBtnRef}
                    minWidth={168}
                  >
                    <div className="py-1">
                      {NUMBER_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() =>
                            applyListStyle(
                              "number",
                              option.css,
                              option.dataStyle,
                            )
                          }
                          className="flex w-full px-3 py-1.5 text-left text-[12.5px] text-slate-700 hover:bg-slate-50"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </NoteToolbarPopover>
                </div>

                <button
                  type="button"
                  title={
                    activeFormats.link
                      ? "Remove link"
                      : linkOpen
                        ? "Cancel link"
                        : "Insert link"
                  }
                  onMouseDown={(e) => {
                    e.preventDefault();
                    rememberSelection();
                  }}
                  onClick={onLinkButtonClick}
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-700 hover:bg-white",
                    (linkOpen || activeFormats.link) &&
                      "bg-sky-100 text-sky-700",
                  )}
                >
                  <Link2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {linkOpen ? (
                <div className="flex items-center gap-2 border-t border-sky-100 bg-sky-50/70 px-2.5 py-2">
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-sky-600" />
                  <input
                    ref={linkInputRef}
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyLink();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        e.stopPropagation();
                        cancelLinkBar();
                      }
                    }}
                    placeholder="Paste or type a link…"
                    className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-400"
                  />
                  <button
                    type="button"
                    onClick={cancelLinkBar}
                    className="h-8 shrink-0 rounded-md border border-slate-200 bg-white px-2.5 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={applyLink}
                    disabled={
                      !linkUrl.trim() ||
                      linkUrl.trim() === "https://" ||
                      linkUrl.trim() === "http://"
                    }
                    className="h-8 shrink-0 rounded-md bg-[#5B9BD5] px-2.5 text-[12.5px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-2.5 py-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] font-medium text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  Attach
                  {attachments.length > 0 ? (
                    <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-100 px-1 text-[10px] font-bold text-sky-700 tabular-nums">
                      {attachments.length}
                    </span>
                  ) : null}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                  className="hidden"
                  onChange={(event) => {
                    void addFiles(Array.from(event.target.files ?? []));
                    event.target.value = "";
                  }}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (inlineComposer) {
                        onClose();
                        return;
                      }
                      resetForm();
                    }}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!canSave}
                    onClick={save}
                    className="h-8 rounded-lg bg-[#5B9BD5] px-3.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={inlineComposer ? "" : "min-h-0 flex-1 overflow-y-auto"}>
          {visible.length === 0 ? (
            inlineComposer ? null : (
            <p className="px-5 py-10 text-center text-[13px] text-slate-400">
              No notes yet for this {kind.toLowerCase()}. Click “Add a note”
              above to get started.
            </p>
            )
          ) : (
            visible.map((note) => {
              const displayBody = noteDisplayBody(note);
              const plain = plainTextFromHtml(displayBody);
              const isHtml = /<\/?[a-z][\s\S]*>/i.test(displayBody);
              const long = plain.length > 180;
              const open = expanded.has(note.id);
              const clippedPlain =
                long && !open ? `${plain.slice(0, 180).trimEnd()}…` : plain;
              const files = noteAttachments(note);
              return (
                <article
                  key={note.id}
                  className="group border-b border-slate-100 px-5 py-3.5"
                >
                  <div className="flex gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                        avatarColor(note.createdBy),
                      )}
                    >
                      {initials(note.createdBy)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <h3 className="min-w-0 flex-1 text-[13px] font-semibold text-slate-900">
                          {note.title}
                        </h3>
                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            aria-label={`Edit ${note.title}`}
                            title="Edit"
                            onClick={() => startEdit(note)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${note.title}`}
                            title="Delete"
                            onClick={() => requestDelete(note)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {isHtml && (!long || open) ? (
                        <div
                          className="note-html mt-1 text-[13px] leading-5 text-slate-600 [&_a]:text-[#4F46E5] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_.mention-tag]:rounded [&_.mention-tag]:bg-violet-100 [&_.mention-tag]:px-1 [&_.mention-tag]:py-0.5 [&_.mention-tag]:font-medium [&_.mention-tag]:text-violet-800"
                          dangerouslySetInnerHTML={{ __html: displayBody }}
                        />
                      ) : (
                        <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-slate-600">
                          {clippedPlain}
                        </p>
                      )}
                      {files.length > 0 ? (
                        <div className="mt-2.5 flex flex-wrap gap-2.5">
                          {files.map((item) => (
                            <AttachmentTile key={item.id} item={item} />
                          ))}
                        </div>
                      ) : null}
                      {long ? (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(note.id)}
                          className="mt-1 text-[12.5px] font-medium text-[#4F46E5] hover:underline"
                        >
                          {open ? "Show less" : "Show more"}
                        </button>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-slate-400">
                        <span>
                          {kind}
                          {row.related ? ` · ${row.related}` : ""}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatNoteWhen(note.createdAt)} by {note.createdBy}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {notes.length > 0 ? (
          <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-2.5">
            {hasMore ? (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="text-[13px] font-medium text-[#4F46E5] hover:underline"
              >
                {showAll ? "Show fewer notes" : "View all notes"}
              </button>
            ) : (
              <span className="text-[12.5px] text-slate-400">All notes</span>
            )}
            <span className="text-[12.5px] tabular-nums text-slate-500">
              {visible.length} of {notes.length}
            </span>
          </footer>
        ) : null}
      </>
  );

  const overlays = (
    <>
      {confirmDeleteNote ? (
        <div className="absolute inset-0 z-[95] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Dismiss delete confirmation"
            className="absolute inset-0 bg-slate-900/45"
            onClick={() => setConfirmDeleteNote(null)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="wq-note-delete-desc"
            className="relative z-10 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-2xl"
          >
            <p
              id="wq-note-delete-desc"
              className="text-[14px] leading-5 text-slate-700"
            >
              Are you sure you want to delete the note?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteNote(null)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="h-9 rounded-lg bg-rose-600 px-3.5 text-[13px] font-semibold text-white hover:bg-rose-700"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {previewItem ? (
        <div className="absolute inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Dismiss preview"
            className="absolute inset-0 bg-slate-900/55"
            onClick={() => setPreviewItem(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={previewItem.name}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-slate-900">
                  {previewItem.name}
                </p>
                <p className="text-[11px] text-slate-400">
                  {previewItem.size > 0
                    ? formatBytes(previewItem.size)
                    : previewItem.type || "Attachment"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {previewItem.url ? (
                  <a
                    href={previewItem.url}
                    download={previewItem.name}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                ) : null}
                <button
                  type="button"
                  aria-label="Close preview"
                  onClick={() => setPreviewItem(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex max-h-[70vh] min-h-[220px] items-center justify-center bg-slate-50 p-4">
              {isImageAttachment(previewItem.type, previewItem.name) &&
              previewItem.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewItem.url}
                  alt={previewItem.name}
                  className="max-h-[65vh] max-w-full rounded-lg object-contain"
                />
              ) : isPdfAttachment(previewItem.type, previewItem.name) &&
                previewItem.url ? (
                <iframe
                  title={previewItem.name}
                  src={previewItem.url}
                  className="h-[65vh] w-full rounded-lg border border-slate-200 bg-white"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 bg-white">
                    <AttachmentGlyph
                      type={previewItem.type}
                      name={previewItem.name}
                      className="h-7 w-7 text-slate-400"
                    />
                  </span>
                  <p className="text-[13px] text-slate-600">
                    {previewItem.url
                      ? "Preview isn’t available for this file type."
                      : "File preview isn’t available for this attachment."}
                  </p>
                  {previewItem.url ? (
                    <a
                      href={previewItem.url}
                      download={previewItem.name}
                      className="rounded-lg bg-[#5B9BD5] px-3.5 py-1.5 text-[13px] font-semibold text-white hover:opacity-90"
                    >
                      Download
                    </a>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );

  if (embedded || inlineComposer) {
    return (
      <div className={inlineComposer ? "relative bg-white" : "relative flex h-full min-h-0 flex-col bg-white"}>
        {panel}
        {overlays}
      </div>
    );
  }

  return createPortal(
    <div className={cn("fixed inset-0", layerClassName)}>
      <div
        className="absolute inset-0 bg-slate-900/30"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="wq-notes-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-white shadow-[-12px_0_40px_-12px_rgba(15,23,42,0.28)]"
      >
        {panel}
      </aside>
      {overlays}
    </div>,
    document.body,
  );
}
