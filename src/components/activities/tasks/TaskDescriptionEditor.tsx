"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Eraser,
  Highlighter,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTree,
  Minus,
  Pilcrow,
  Plus,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
} from "lucide-react";
import { MentionPickerMenu } from "@/components/shared/MentionPickerMenu";
import { useContentEditableMentions } from "@/components/shared/useContentEditableMentions";
import { cn } from "@/lib/utils";

const FONT_FAMILIES = [
  "Aptos",
  "Arial",
  "Calibri",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
] as const;

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24] as const;

const TEXT_COLORS = [
  { label: "Automatic", value: "#0f172a" },
  { label: "Red", value: "#dc2626" },
  { label: "Blue", value: "#2563eb" },
  { label: "Green", value: "#16a34a" },
  { label: "Orange", value: "#ea580c" },
  { label: "Purple", value: "#7c3aed" },
  { label: "Gray", value: "#64748b" },
] as const;

const HIGHLIGHT_COLORS = [
  { label: "Yellow", value: "#fef08a" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Blue", value: "#bfdbfe" },
  { label: "Pink", value: "#fbcfe8" },
  { label: "None", value: "transparent" },
] as const;

interface TaskDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onMentionSelect?: (person: import("@/lib/mentions/people").MentionPerson) => void;
}

function preventFocusLoss(event: React.MouseEvent) {
  event.preventDefault();
}

function cssFontFamily(family: string) {
  return family.includes(" ") ? `"${family}", sans-serif` : `${family}, sans-serif`;
}

function cacheEditorSelection(editor: HTMLDivElement | null, savedRangeRef: React.MutableRefObject<Range | null>) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !editor) {
    return;
  }
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) {
    return;
  }
  savedRangeRef.current = range.cloneRange();
}

function restoreEditorSelection(savedRangeRef: React.MutableRefObject<Range | null>) {
  const selection = window.getSelection();
  const saved = savedRangeRef.current;
  if (!selection || !saved) return false;
  selection.removeAllRanges();
  selection.addRange(saved);
  return true;
}

function applyInlineStyleToSelection(
  editor: HTMLDivElement | null,
  savedRangeRef: React.MutableRefObject<Range | null>,
  styles: Record<string, string>,
) {
  if (!editor) return;

  editor.focus();
  restoreEditorSelection(savedRangeRef);

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;

  if (range.collapsed) {
    Object.entries(styles).forEach(([key, value]) => {
      editor.style.setProperty(key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`), value);
    });
    cacheEditorSelection(editor, savedRangeRef);
    return;
  }

  const span = document.createElement("span");
  Object.entries(styles).forEach(([key, value]) => {
    span.style.setProperty(key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`), value);
  });

  const extracted = range.extractContents();
  span.appendChild(extracted);
  range.insertNode(span);

  const nextRange = document.createRange();
  nextRange.selectNodeContents(span);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  savedRangeRef.current = nextRange.cloneRange();
}

function normalizeHtml(html: string) {
  const trimmed = html.trim();
  if (!trimmed || trimmed === "<br>" || trimmed === "<div><br></div>") return "";
  return html;
}

function ToolButton({
  title,
  onClick,
  children,
  active = false,
  className,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={preventFocusLoss}
      onClick={onClick}
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded border px-0.5 text-slate-600 transition-colors hover:border-slate-200 hover:bg-white",
        active ? "border-violet-300 bg-violet-50 text-violet-700" : "border-transparent",
        className,
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-slate-200" aria-hidden />;
}

function useFloatingPosition(open: boolean, anchorRef: React.RefObject<HTMLElement | null>) {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    function updatePosition() {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef]);

  return position;
}

function FloatingMenu({
  open,
  anchorRef,
  menuRef,
  children,
  minWidth = 148,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  menuRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
  minWidth?: number;
}) {
  const position = useFloatingPosition(open, anchorRef);
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        minWidth: Math.max(minWidth, position.width),
        zIndex: 9999,
      }}
      className="rounded-md border border-slate-200 bg-white py-1 shadow-xl"
    >
      {children}
    </div>,
    document.body,
  );
}

function ColorDropdown({
  title,
  options,
  currentColor,
  onPick,
  variant,
}: {
  title: string;
  options: ReadonlyArray<{ label: string; value: string }>;
  currentColor: string;
  onPick: (value: string) => void;
  variant: "font" | "highlight";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const swatchColor =
    currentColor === "transparent"
      ? variant === "highlight"
        ? "#fef08a"
        : "#0f172a"
      : currentColor;

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        title={title}
        onMouseDown={preventFocusLoss}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-6 items-center gap-0.5 rounded border bg-white px-1.5 text-slate-700 transition-colors hover:bg-slate-50",
          open ? "border-violet-300 bg-violet-50" : "border-slate-200",
        )}
      >
        {variant === "font" ? (
          <span className="flex flex-col items-center justify-center px-0.5 leading-none">
            <span className="text-[13px] font-bold" style={{ color: swatchColor }}>
              A
            </span>
            <span
              className="mt-0.5 h-[3px] w-4 rounded-full"
              style={{ backgroundColor: swatchColor }}
            />
          </span>
        ) : (
          <span className="flex flex-col items-center justify-center px-0.5 leading-none">
            <Highlighter className="h-3 w-3 text-amber-500" strokeWidth={2.25} />
            <span
              className="mt-0.5 h-[3px] w-4 rounded-full"
              style={{ backgroundColor: swatchColor }}
            />
          </span>
        )}
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>

      <FloatingMenu open={open} anchorRef={buttonRef} menuRef={menuRef}>
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => {
              onPick(option.value);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
          >
            <span
              className={cn(
                "h-4 w-4 shrink-0 rounded-sm border border-slate-200",
                option.value === "transparent" && "bg-[linear-gradient(135deg,#fff_46%,#ef4444_46%,#ef4444_54%,#fff_54%)]",
              )}
              style={{
                backgroundColor:
                  option.value === "transparent" ? undefined : option.value,
              }}
            />
            <span className="font-medium">{option.label}</span>
          </button>
        ))}
      </FloatingMenu>
    </div>
  );
}

function FontFamilyDropdown({
  value,
  onBeforeOpen,
  onPick,
}: {
  value: string;
  onBeforeOpen: () => void;
  onPick: (family: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        title="Font family"
        onMouseDown={preventFocusLoss}
        onClick={() => {
          onBeforeOpen();
          setOpen((current) => !current);
        }}
        className={cn(
          "inline-flex h-6 min-w-[92px] max-w-[110px] items-center justify-between gap-1 rounded border bg-white px-1.5 text-[11px] text-slate-700 transition-colors hover:bg-slate-50",
          open ? "border-violet-300 bg-violet-50" : "border-slate-200",
        )}
        style={{ fontFamily: cssFontFamily(value) }}
      >
        <span className="truncate">{value}</span>
        <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
      </button>
      <FloatingMenu open={open} anchorRef={buttonRef} menuRef={menuRef} minWidth={168}>
        {FONT_FAMILIES.map((family) => (
          <button
            key={family}
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => {
              onPick(family);
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50",
              family === value && "bg-violet-50 font-medium text-violet-700",
            )}
            style={{ fontFamily: cssFontFamily(family) }}
          >
            {family}
          </button>
        ))}
      </FloatingMenu>
    </div>
  );
}

function FontSizeDropdown({
  value,
  onBeforeOpen,
  onPick,
}: {
  value: number;
  onBeforeOpen: () => void;
  onPick: (size: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        title="Font size"
        onMouseDown={preventFocusLoss}
        onClick={() => {
          onBeforeOpen();
          setOpen((current) => !current);
        }}
        className={cn(
          "inline-flex h-6 w-12 items-center justify-between rounded border bg-white px-1.5 text-[11px] text-slate-700 transition-colors hover:bg-slate-50",
          open ? "border-violet-300 bg-violet-50" : "border-slate-200",
        )}
      >
        <span>{value}</span>
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>
      <FloatingMenu open={open} anchorRef={buttonRef} menuRef={menuRef} minWidth={72}>
        {FONT_SIZES.map((size) => (
          <button
            key={size}
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => {
              onPick(size);
              setOpen(false);
            }}
            className={cn(
              "block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50",
              size === value && "bg-violet-50 font-medium text-violet-700",
            )}
          >
            {size}
          </button>
        ))}
      </FloatingMenu>
    </div>
  );
}

function CaseDropdown({ onPick }: { onPick: (mode: "upper" | "lower" | "title" | "sentence") => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        title="Change case"
        onMouseDown={preventFocusLoss}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-6 min-w-6 items-center justify-center rounded border bg-white px-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-50",
          open ? "border-violet-300 bg-violet-50" : "border-slate-200",
        )}
      >
        Aa
      </button>
      <FloatingMenu open={open} anchorRef={buttonRef} menuRef={menuRef}>
        {[
          { label: "Sentence case", mode: "sentence" as const },
          { label: "lowercase", mode: "lower" as const },
          { label: "UPPERCASE", mode: "upper" as const },
          { label: "Title Case", mode: "title" as const },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => {
              onPick(item.mode);
              setOpen(false);
            }}
            className="block w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {item.label}
          </button>
        ))}
      </FloatingMenu>
    </div>
  );
}

export function TaskDescriptionEditor({
  value,
  onChange,
  placeholder = "Provide detailed context or instructions… Type @ to assign someone.",
  onMentionSelect,
}: TaskDescriptionEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef(value);
  const savedRangeRef = useRef<Range | null>(null);
  const [fontFamily, setFontFamily] = useState<string>("Aptos");
  const [fontSize, setFontSize] = useState<number>(12);
  const [textColor, setTextColor] = useState<string>("#0f172a");
  const [highlightColor, setHighlightColor] = useState<string>("#fef08a");
  const [showMarks, setShowMarks] = useState(false);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right" | "justify">("left");
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    subscript: false,
    superscript: false,
  });

  const rememberSelection = useCallback(() => {
    cacheEditorSelection(editorRef.current, savedRangeRef);
  }, []);

  const syncContent = useCallback(() => {
    const html = normalizeHtml(editorRef.current?.innerHTML ?? "");
    lastHtmlRef.current = html;
    onChange(html);
  }, [onChange]);

  const mentions = useContentEditableMentions({
    editorRef,
    onMentionSelect,
    onContentChange: syncContent,
  });

  const focusEditor = useCallback(() => {
    editorRef.current?.focus();
  }, []);

  const runCommand = useCallback(
    (command: string, commandValue?: string) => {
      focusEditor();
      document.execCommand(command, false, commandValue);
      syncContent();
    },
    [focusEditor, syncContent],
  );

  const readSelectionStyles = useCallback(() => {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      subscript: document.queryCommandState("subscript"),
      superscript: document.queryCommandState("superscript"),
    });

    const selection = window.getSelection();
    const node = selection?.anchorNode;
    const element =
      node?.nodeType === Node.ELEMENT_NODE
        ? (node as HTMLElement)
        : node?.parentElement;

    if (element) {
      const computed = window.getComputedStyle(element);
      const family = computed.fontFamily.replace(/['"]/g, "").split(",")[0]?.trim();
      const size = Number.parseInt(computed.fontSize, 10);
      if (family) {
        const match = FONT_FAMILIES.find(
          (item) => item.toLowerCase() === family.toLowerCase(),
        );
        if (match) setFontFamily(match);
      }
      if (!Number.isNaN(size)) {
        const nearest = FONT_SIZES.reduce((prev, curr) =>
          Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev,
        );
        setFontSize(nearest);
      }
      if (computed.color) setTextColor(computed.color);
      if (computed.backgroundColor && computed.backgroundColor !== "rgba(0, 0, 0, 0)") {
        setHighlightColor(computed.backgroundColor);
      }
    }

    if (document.queryCommandState("justifyCenter")) setTextAlign("center");
    else if (document.queryCommandState("justifyRight")) setTextAlign("right");
    else if (document.queryCommandState("justifyFull")) setTextAlign("justify");
    else setTextAlign("left");
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (!editor.style.fontFamily) {
      editor.style.fontFamily = cssFontFamily("Aptos");
    }
    if (!editor.style.fontSize) {
      editor.style.fontSize = "12px";
    }
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editor.innerHTML === value || lastHtmlRef.current === value) return;
    editor.innerHTML = value || "";
    lastHtmlRef.current = value;
  }, [value]);

  function applyFontFamily(nextFamily: string) {
    setFontFamily(nextFamily);
    applyInlineStyleToSelection(editorRef.current, savedRangeRef, {
      fontFamily: cssFontFamily(nextFamily),
    });
    syncContent();
    readSelectionStyles();
  }

  function applyFontSize(nextSize: number) {
    setFontSize(nextSize);
    applyInlineStyleToSelection(editorRef.current, savedRangeRef, {
      fontSize: `${nextSize}px`,
    });
    syncContent();
    readSelectionStyles();
  }

  function changeFontSize(delta: number) {
    rememberSelection();
    const currentIndex = FONT_SIZES.indexOf(fontSize as (typeof FONT_SIZES)[number]);
    const baseIndex = currentIndex === -1 ? 4 : currentIndex;
    const nextIndex = Math.min(FONT_SIZES.length - 1, Math.max(0, baseIndex + delta));
    applyFontSize(FONT_SIZES[nextIndex]);
  }

  function applyTextColor(color: string) {
    focusEditor();
    restoreEditorSelection(savedRangeRef);
    setTextColor(color);
    document.execCommand("foreColor", false, color);
    syncContent();
    readSelectionStyles();
  }

  function applyHighlight(color: string) {
    focusEditor();
    restoreEditorSelection(savedRangeRef);
    setHighlightColor(color);
    if (color === "transparent") {
      document.execCommand("hiliteColor", false, "transparent");
      if (!document.queryCommandSupported("hiliteColor")) {
        document.execCommand("backColor", false, "transparent");
      }
    } else {
      document.execCommand("hiliteColor", false, color);
      if (!document.queryCommandSupported("hiliteColor")) {
        document.execCommand("backColor", false, color);
      }
    }
    syncContent();
    readSelectionStyles();
  }

  function changeCase(mode: "upper" | "lower" | "title" | "sentence") {
    focusEditor();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const selected = range.toString();
    if (!selected) return;

    let transformed = selected;
    if (mode === "upper") transformed = selected.toUpperCase();
    if (mode === "lower") transformed = selected.toLowerCase();
    if (mode === "title") {
      transformed = selected.replace(/\b\w/g, (char) => char.toUpperCase());
    }
    if (mode === "sentence") {
      transformed = selected.charAt(0).toUpperCase() + selected.slice(1).toLowerCase();
    }

    range.deleteContents();
    range.insertNode(document.createTextNode(transformed));
    selection.removeAllRanges();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(range.startContainer);
    nextRange.collapse(false);
    selection.addRange(nextRange);
    syncContent();
    readSelectionStyles();
  }

  function insertLink() {
    focusEditor();
    const selection = window.getSelection();
    const selected = selection?.toString().trim() ?? "";
    const url = window.prompt("Enter URL", "https://");
    if (!url) return;
    if (!selected) {
      runCommand("insertHTML", `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    } else {
      runCommand("createLink", url);
    }
    readSelectionStyles();
  }

  function clearFormatting() {
    runCommand("removeFormat");
    readSelectionStyles();
  }

  function setAlignment(align: "left" | "center" | "right" | "justify") {
    setTextAlign(align);
    const command =
      align === "center"
        ? "justifyCenter"
        : align === "right"
          ? "justifyRight"
          : align === "justify"
            ? "justifyFull"
            : "justifyLeft";
    runCommand(command);
    readSelectionStyles();
  }

  function sortSelectedLines() {
    focusEditor();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const selected = range.toString();
    if (!selected.includes("\n")) return;

    const sorted = selected
      .split("\n")
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
      .join("\n");

    range.deleteContents();
    range.insertNode(document.createTextNode(sorted));
    syncContent();
    readSelectionStyles();
  }

  function insertMultilevelItem() {
    runCommand("indent");
    readSelectionStyles();
  }

  return (
    <div className="relative w-full rounded-md border border-border bg-background">
      <div className="w-full overflow-x-auto rounded-t-md border-b border-slate-200 bg-slate-50/90">
        <div className="flex h-8 w-full min-w-max items-center gap-px px-1">
          <FontFamilyDropdown
            value={fontFamily}
            onBeforeOpen={rememberSelection}
            onPick={applyFontFamily}
          />
          <FontSizeDropdown
            value={fontSize}
            onBeforeOpen={rememberSelection}
            onPick={applyFontSize}
          />
          <ToolbarDivider />
          <ToolButton
            title="Bold"
            active={activeFormats.bold}
            onClick={() => {
              runCommand("bold");
              readSelectionStyles();
            }}
          >
            <Bold className="h-3 w-3" />
          </ToolButton>
          <ToolButton
            title="Italic"
            active={activeFormats.italic}
            onClick={() => {
              runCommand("italic");
              readSelectionStyles();
            }}
          >
            <Italic className="h-3 w-3" />
          </ToolButton>
          <ToolButton
            title="Underline"
            active={activeFormats.underline}
            onClick={() => {
              runCommand("underline");
              readSelectionStyles();
            }}
          >
            <Underline className="h-3 w-3" />
          </ToolButton>
          <ToolButton
            title="Strikethrough"
            active={activeFormats.strikeThrough}
            onClick={() => {
              runCommand("strikeThrough");
              readSelectionStyles();
            }}
          >
            <Strikethrough className="h-3 w-3" />
          </ToolButton>
          <ToolButton
            title="Subscript"
            active={activeFormats.subscript}
            onClick={() => {
              runCommand("subscript");
              readSelectionStyles();
            }}
          >
            <Subscript className="h-3 w-3" />
          </ToolButton>
          <ToolButton
            title="Superscript"
            active={activeFormats.superscript}
            onClick={() => {
              runCommand("superscript");
              readSelectionStyles();
            }}
          >
            <Superscript className="h-3 w-3" />
          </ToolButton>
          <ToolButton title="Clear formatting" onClick={clearFormatting}>
            <Eraser className="h-3 w-3" />
          </ToolButton>
          <ToolbarDivider />
          <ColorDropdown
            title="Font color"
            variant="font"
            options={TEXT_COLORS}
            currentColor={textColor}
            onPick={applyTextColor}
          />
          <ColorDropdown
            title="Text highlight"
            variant="highlight"
            options={HIGHLIGHT_COLORS}
            currentColor={highlightColor}
            onPick={applyHighlight}
          />
          <CaseDropdown onPick={changeCase} />
          <ToolButton title="Increase font size" onClick={() => changeFontSize(1)}>
            <Plus className="h-3 w-3" />
          </ToolButton>
          <ToolButton title="Decrease font size" onClick={() => changeFontSize(-1)}>
            <Minus className="h-3 w-3" />
          </ToolButton>
          <ToolButton title="Insert link" onClick={insertLink}>
            <Link2 className="h-3 w-3" />
          </ToolButton>
          <ToolbarDivider />
          <ToolButton
            title="Bullets"
            onClick={() => {
              runCommand("insertUnorderedList");
              readSelectionStyles();
            }}
          >
            <List className="h-3 w-3" />
          </ToolButton>
          <ToolButton
            title="Numbering"
            onClick={() => {
              runCommand("insertOrderedList");
              readSelectionStyles();
            }}
          >
            <ListOrdered className="h-3 w-3" />
          </ToolButton>
          <ToolButton title="Multilevel list" onClick={insertMultilevelItem}>
            <ListTree className="h-3 w-3" />
          </ToolButton>
          <ToolButton
            title="Decrease indent"
            onClick={() => {
              runCommand("outdent");
              readSelectionStyles();
            }}
          >
            <IndentDecrease className="h-3 w-3" />
          </ToolButton>
          <ToolButton
            title="Increase indent"
            onClick={() => {
              runCommand("indent");
              readSelectionStyles();
            }}
          >
            <IndentIncrease className="h-3 w-3" />
          </ToolButton>
          <ToolbarDivider />
          <ToolButton
            title="Align left"
            active={textAlign === "left"}
            onClick={() => setAlignment("left")}
          >
            <AlignLeft className="h-3 w-3" />
          </ToolButton>
          <ToolButton
            title="Align center"
            active={textAlign === "center"}
            onClick={() => setAlignment("center")}
          >
            <AlignCenter className="h-3 w-3" />
          </ToolButton>
          <ToolButton
            title="Align right"
            active={textAlign === "right"}
            onClick={() => setAlignment("right")}
          >
            <AlignRight className="h-3 w-3" />
          </ToolButton>
          <ToolButton
            title="Justify"
            active={textAlign === "justify"}
            onClick={() => setAlignment("justify")}
          >
            <AlignJustify className="h-3 w-3" />
          </ToolButton>
          <ToolButton title="Sort A to Z" onClick={sortSelectedLines}>
            <span className="text-[10px] font-semibold">A↓</span>
          </ToolButton>
          <ToolButton
            title="Show formatting marks"
            active={showMarks}
            onClick={() => setShowMarks((current) => !current)}
          >
            <Pilcrow className="h-3 w-3" />
          </ToolButton>
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline
        aria-label="Task description"
        data-placeholder={placeholder}
        onInput={() => {
          syncContent();
          mentions.syncMention();
        }}
        onBlur={syncContent}
        onKeyDown={(event) => {
          if (mentions.handleKeyDown(event)) return;
        }}
        onMouseUp={() => {
          rememberSelection();
          readSelectionStyles();
          mentions.syncMention();
        }}
        onKeyUp={() => {
          rememberSelection();
          readSelectionStyles();
          mentions.syncMention();
        }}
        onFocus={() => {
          rememberSelection();
          readSelectionStyles();
        }}
        className={cn(
          "min-h-[96px] w-full resize-y overflow-auto bg-white px-3 py-2 text-sm leading-6 text-foreground/90 focus:outline-none",
          "empty:before:pointer-events-none empty:before:text-foreground/50 empty:before:content-[attr(data-placeholder)]",
          "[&_.mention-tag]:rounded [&_.mention-tag]:bg-violet-100 [&_.mention-tag]:px-1 [&_.mention-tag]:py-0.5 [&_.mention-tag]:font-medium [&_.mention-tag]:text-violet-800",
          showMarks && "[&_p]:relative [&_p]:border-b [&_p]:border-dashed [&_p]:border-slate-200 [&_p]:pb-1",
        )}
      />
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
  );
}

export function sanitizeTaskDescriptionHtml(html: string) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}
