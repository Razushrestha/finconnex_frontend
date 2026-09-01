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
  Ellipsis,
  Eraser,
  Highlighter,
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTree,
  Minus,
  Pilcrow,
  Quote,
  Smile,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  Underline,
} from "lucide-react";
import { MentionPickerMenu } from "@/components/shared/MentionPickerMenu";
import { useContentEditableMentions } from "@/components/shared/useContentEditableMentions";
import { cn } from "@/lib/utils";
import { RichEditorTableResize } from "./RichEditorTableResize";

const FONT_FAMILIES = [
  "Aptos",
  "Arial",
  "Calibri",
  "Cambria",
  "Comic Sans MS",
  "Consolas",
  "Courier New",
  "Garamond",
  "Georgia",
  "Helvetica",
  "Impact",
  "Lucida Sans",
  "Palatino Linotype",
  "Segoe UI",
  "Tahoma",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
] as const;

const FONT_STACKS: Record<(typeof FONT_FAMILIES)[number], string> = {
  Aptos: 'Aptos, Inter, "Segoe UI", sans-serif',
  Arial: "Arial, Helvetica, sans-serif",
  Calibri: 'Calibri, "Source Sans 3", "Segoe UI", sans-serif',
  Cambria: 'Cambria, "Libre Baskerville", Georgia, serif',
  "Comic Sans MS": '"Comic Sans MS", "Comic Neue", cursive',
  Consolas: 'Consolas, "Roboto Mono", "Courier New", monospace',
  "Courier New": '"Courier New", Courier, monospace',
  Garamond: 'Garamond, "EB Garamond", Georgia, serif',
  Georgia: "Georgia, serif",
  Helvetica: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
  Impact: "Impact, Haettenschweiler, sans-serif",
  "Lucida Sans": '"Lucida Sans", "Lucida Grande", sans-serif',
  "Palatino Linotype": '"Palatino Linotype", Palatino, "Libre Baskerville", serif',
  "Segoe UI": '"Segoe UI", Inter, Tahoma, sans-serif',
  Tahoma: "Tahoma, Geneva, sans-serif",
  "Times New Roman": '"Times New Roman", Times, serif',
  "Trebuchet MS": '"Trebuchet MS", Trebuchet, sans-serif',
  Verdana: "Verdana, Geneva, sans-serif",
};

const EDITOR_FONT_STYLESHEET =
  "https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;600&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Roboto+Mono:wght@400;500&family=Source+Sans+3:wght@400;600&display=swap";

function ensureEditorFonts() {
  if (typeof document === "undefined") return;
  if (document.getElementById("finconnex-editor-fonts")) return;
  const link = document.createElement("link");
  link.id = "finconnex-editor-fonts";
  link.rel = "stylesheet";
  link.href = EDITOR_FONT_STYLESHEET;
  document.head.appendChild(link);
}

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36] as const;

const TEXT_COLORS = [
  { label: "Automatic", value: "#0f172a" },
  { label: "Black", value: "#000000" },
  { label: "Dark gray", value: "#374151" },
  { label: "Gray", value: "#64748b" },
  { label: "Red", value: "#dc2626" },
  { label: "Dark red", value: "#991b1b" },
  { label: "Orange", value: "#ea580c" },
  { label: "Gold", value: "#ca8a04" },
  { label: "Yellow", value: "#eab308" },
  { label: "Green", value: "#16a34a" },
  { label: "Dark green", value: "#166534" },
  { label: "Teal", value: "#0d9488" },
  { label: "Blue", value: "#2563eb" },
  { label: "Dark blue", value: "#1e3a8a" },
  { label: "Purple", value: "#7c3aed" },
  { label: "Brand", value: "#5A32A3" },
  { label: "Pink", value: "#db2777" },
  { label: "Brown", value: "#92400e" },
] as const;

const HIGHLIGHT_COLORS = [
  { label: "None", value: "transparent" },
  { label: "Yellow", value: "#fef08a" },
  { label: "Gold", value: "#fde68a" },
  { label: "Orange", value: "#fdba74" },
  { label: "Green", value: "#bbf7d0" },
  { label: "Lime", value: "#d9f99d" },
  { label: "Teal", value: "#99f6e4" },
  { label: "Blue", value: "#bfdbfe" },
  { label: "Sky", value: "#bae6fd" },
  { label: "Purple", value: "#ddd6fe" },
  { label: "Lavender", value: "#F3ECFB" },
  { label: "Pink", value: "#fbcfe8" },
  { label: "Rose", value: "#fecdd3" },
  { label: "Gray", value: "#e2e8f0" },
] as const;

const BULLET_STYLES = [
  { id: "disc", label: "Filled circle" },
  { id: "circle", label: "Hollow circle" },
  { id: "square", label: "Filled square" },
  { id: "dash", label: "Dash" },
  { id: "arrow-hollow", label: "Hollow arrow" },
  { id: "arrow-solid", label: "Filled arrow" },
] as const;

const NUMBER_STYLES = [
  { id: "decimal-dot", preview: "1." },
  { id: "decimal-paren", preview: "1)" },
  { id: "decimal-bracket", preview: "(1)" },
  { id: "lower-alpha-dot", preview: "a." },
  { id: "lower-alpha-paren", preview: "a)" },
  { id: "lower-alpha-bracket", preview: "(a)" },
  { id: "upper-alpha-dot", preview: "A." },
  { id: "upper-alpha-paren", preview: "A)" },
  { id: "upper-alpha-bracket", preview: "(A)" },
  { id: "lower-roman-dot", preview: "i." },
  { id: "lower-roman-paren", preview: "i)" },
  { id: "lower-roman-bracket", preview: "(i)" },
  { id: "upper-roman-dot", preview: "I." },
  { id: "upper-roman-paren", preview: "I)" },
  { id: "upper-roman-bracket", preview: "(I)" },
] as const;

type BulletStyleId = (typeof BULLET_STYLES)[number]["id"];
type NumberStyleId = (typeof NUMBER_STYLES)[number]["id"];
type ListStyleId = BulletStyleId | NumberStyleId;

function isOrderedListStyle(id: string): id is NumberStyleId {
  return NUMBER_STYLES.some((item) => item.id === id);
}

interface TaskDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onMentionSelect?: (person: import("@/lib/mentions/people").MentionPerson) => void;
  editorClassName?: string;
  toolbarLeading?: React.ReactNode;
  toolbarAfterLink?: React.ReactNode;
  toolbarTrailing?: React.ReactNode;
  belowEditor?: React.ReactNode;
  className?: string;
  fillHeight?: boolean;
}

function preventFocusLoss(event: React.MouseEvent) {
  event.preventDefault();
}

function cssFontFamily(family: string) {
  return FONT_STACKS[family as (typeof FONT_FAMILIES)[number]] ?? family;
}

function camelToKebab(key: string) {
  return key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function clearNestedFontFamily(root: ParentNode) {
  root.querySelectorAll("*").forEach((node) => {
    const el = node as HTMLElement;
    el.style.removeProperty("font-family");
    el.removeAttribute("face");
  });
}

function applyStylesToElement(el: HTMLElement, styles: Record<string, string>) {
  Object.entries(styles).forEach(([key, value]) => {
    el.style.setProperty(camelToKebab(key), value);
  });
}

function wrapTextNode(text: Text, styles: Record<string, string>) {
  if (!text.data) return text;
  const parent = text.parentElement;
  if (
    parent &&
    parent.tagName === "SPAN" &&
    parent.childNodes.length === 1 &&
    parent.textContent === text.data
  ) {
    applyStylesToElement(parent, styles);
    if (styles.fontFamily) {
      parent.querySelectorAll("*").forEach((node) => {
        (node as HTMLElement).style.removeProperty("font-family");
      });
    }
    return text;
  }
  const span = document.createElement("span");
  applyStylesToElement(span, styles);
  text.parentNode?.insertBefore(span, text);
  span.appendChild(text);
  return text;
}

function wrapRangeWithInlineStyles(
  editor: HTMLElement,
  range: Range,
  styles: Record<string, string>,
) {
  const working = range.cloneRange();

  if (
    working.startContainer === working.endContainer &&
    working.startContainer.nodeType === Node.TEXT_NODE
  ) {
    const text = working.startContainer as Text;
    const startOffset = working.startOffset;
    const endOffset = working.endOffset;
    if (endOffset < text.length) text.splitText(endOffset);
    const styled = startOffset > 0 ? text.splitText(startOffset) : text;
    wrapTextNode(styled, styles);
    const next = document.createRange();
    next.selectNodeContents(styled.parentElement ?? styled);
    return next;
  }

  if (working.startContainer.nodeType === Node.TEXT_NODE && working.startOffset > 0) {
    const right = (working.startContainer as Text).splitText(working.startOffset);
    working.setStart(right, 0);
  }
  if (
    working.endContainer.nodeType === Node.TEXT_NODE &&
    working.endOffset < (working.endContainer as Text).length
  ) {
    (working.endContainer as Text).splitText(working.endOffset);
    working.setEnd(working.endContainer, (working.endContainer as Text).length);
  }

  const nodes: Text[] = [];
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node as Text;
    if (text.data) {
      const probe = document.createRange();
      probe.selectNodeContents(text);
      const startsInside = working.compareBoundaryPoints(Range.START_TO_START, probe) <= 0;
      const endsInside = working.compareBoundaryPoints(Range.END_TO_END, probe) >= 0;
      if (startsInside && endsInside) nodes.push(text);
    }
    node = walker.nextNode();
  }
  nodes.forEach((text) => wrapTextNode(text, styles));

  const next = document.createRange();
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (first && last) {
    next.setStartBefore(first.parentElement ?? first);
    next.setEndAfter(last.parentElement ?? last);
  }
  return next;
}

function insertTypingSpan(range: Range, styles: Record<string, string>) {
  const span = document.createElement("span");
  applyStylesToElement(span, styles);
  span.appendChild(document.createTextNode("\u200b"));
  range.insertNode(span);
  const caret = document.createRange();
  const text = span.firstChild as Text;
  caret.setStart(text, 1);
  caret.collapse(true);
  return { span, caret };
}

function elementAtCaret(selection: Selection | null) {
  const node = selection?.anchorNode;
  if (!node) return null;
  return node.nodeType === Node.ELEMENT_NODE
    ? (node as HTMLElement)
    : node.parentElement;
}

function computedFontName(element: HTMLElement) {
  const family = window.getComputedStyle(element).fontFamily.replace(/['"]/g, "").split(",")[0]?.trim();
  if (!family) return null;
  const resolved = family.toLowerCase();
  const generics = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui"]);
  return (
    FONT_FAMILIES.find((item) => {
      if (item.toLowerCase() === resolved) return true;
      const tokens = FONT_STACKS[item]
        .split(",")
        .map((part) => part.replace(/['"]/g, "").trim().toLowerCase())
        .filter((part) => part && !generics.has(part));
      return tokens.includes(resolved);
    }) ?? null
  );
}

function caretHasStyles(
  selection: Selection | null,
  styles: { family?: string | null; size?: number | null },
) {
  const element = elementAtCaret(selection);
  if (!element) return false;
  const computed = window.getComputedStyle(element);
  if (styles.family) {
    const name = computedFontName(element);
    if (name !== styles.family) return false;
  }
  if (styles.size) {
    const size = Number.parseInt(computed.fontSize, 10);
    if (Number.isNaN(size) || Math.abs(size - styles.size) > 1) return false;
  }
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
    const { caret } = insertTypingSpan(range, styles);
    selection.removeAllRanges();
    selection.addRange(caret);
    savedRangeRef.current = caret.cloneRange();
    return;
  }

  const next = wrapRangeWithInlineStyles(editor, range, styles);
  if (styles.fontFamily) {
    const spanParents = new Set<HTMLElement>();
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node) {
      const el = node as HTMLElement;
      if (el.style.fontFamily === styles.fontFamily) spanParents.add(el);
      node = walker.nextNode();
    }
    spanParents.forEach((el) => {
      clearNestedFontFamily(el);
      el.style.fontFamily = styles.fontFamily;
    });
  }
  try {
    selection.removeAllRanges();
    selection.addRange(next);
    savedRangeRef.current = next.cloneRange();
  } catch {
    cacheEditorSelection(editor, savedRangeRef);
  }
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

function normalizeHtml(html: string) {
  const trimmed = html.trim();
  if (!trimmed || trimmed === "<br>" || trimmed === "<div><br></div>") return "";
  return html;
}

function isEditorBlock(el: HTMLElement) {
  return /^(P|DIV|LI|H1|H2|H3|H4|H5|H6|BLOCKQUOTE)$/.test(el.tagName);
}

function blockAncestor(node: Node | null, editor: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null =
    node instanceof HTMLElement ? node : node?.parentElement ?? null;
  while (el && el !== editor) {
    if (isEditorBlock(el) && el.parentElement) return el;
    el = el.parentElement;
  }
  return null;
}

function paintList(list: HTMLElement, styleId: string) {
  list.setAttribute("data-list-style", styleId);
  list.style.paddingLeft = "1.75rem";
  list.style.margin = "0.25rem 0";
  list.style.listStylePosition = "outside";
  list.style.removeProperty("list-style-type");
  list.querySelectorAll(":scope > li").forEach((item) => {
    (item as HTMLElement).style.display = "list-item";
  });
}

function styleEditorLists(editor: HTMLElement) {
  editor.querySelectorAll("ul, ol").forEach((node) => {
    const list = node as HTMLElement;
    const fallback = list.tagName === "OL" ? "decimal-dot" : "disc";
    paintList(list, list.getAttribute("data-list-style") || fallback);
  });
}

function unwrapList(list: HTMLElement) {
  const parent = list.parentNode;
  if (!parent) return;
  const frag = document.createDocumentFragment();
  Array.from(list.children).forEach((li) => {
    const p = document.createElement("p");
    while (li.firstChild) p.appendChild(li.firstChild);
    if (!p.childNodes.length) p.appendChild(document.createElement("br"));
    frag.appendChild(p);
  });
  parent.replaceChild(frag, list);
}

function collectSelectedBlocks(editor: HTMLElement, range: Range): HTMLElement[] {
  const blocks: HTMLElement[] = [];
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT);
  let current = walker.nextNode();
  while (current) {
    const el = current as HTMLElement;
    if (el !== editor && isEditorBlock(el) && !blocks.some((block) => block.contains(el))) {
      try {
        if (range.intersectsNode(el)) blocks.push(el);
      } catch {
        /* ignore */
      }
    }
    current = walker.nextNode();
  }
  return blocks.filter((block) => !blocks.some((other) => other !== block && other.contains(block)));
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
        "inline-flex h-8 w-8 items-center justify-center rounded-md border text-slate-600 transition-colors hover:border-slate-200 hover:bg-white",
        active ? "border-violet-300 bg-violet-50 text-violet-700" : "border-transparent",
        className,
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 h-6 w-px shrink-0 bg-slate-200" aria-hidden />;
}

function useFloatingPosition(open: boolean, anchorRef: React.RefObject<HTMLElement | null>) {
  const [position, setPosition] = useState({ top: 0, left: 0, right: 0, width: 0 });

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    function updatePosition() {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        right: window.innerWidth - rect.right,
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
  maxHeight,
  alignEnd = false,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  menuRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
  minWidth?: number;
  maxHeight?: number;
  alignEnd?: boolean;
}) {
  const position = useFloatingPosition(open, anchorRef);
  if (!open || typeof document === "undefined") return null;

  const available = typeof window === "undefined" ? 280 : window.innerHeight - position.top - 16;
  const height = maxHeight ? Math.min(maxHeight, Math.max(160, available)) : undefined;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: position.top,
        left: alignEnd ? undefined : position.left,
        right: alignEnd ? position.right : undefined,
        minWidth: Math.max(minWidth, position.width),
        maxHeight: height,
        overflowY: height ? "auto" : undefined,
        overflowX: "visible",
        overscrollBehavior: "contain",
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
  onBeforeOpen,
  variant,
}: {
  title: string;
  options: ReadonlyArray<{ label: string; value: string }>;
  currentColor: string;
  onPick: (value: string) => void;
  onBeforeOpen?: () => void;
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
        onClick={() => {
          onBeforeOpen?.();
          setOpen((current) => !current);
        }}
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-md border bg-white px-2 text-slate-700 transition-colors hover:bg-slate-50",
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
            <Highlighter className="h-4 w-4 text-amber-500" strokeWidth={2.25} />
            <span
              className="mt-0.5 h-[3px] w-4 rounded-full"
              style={{ backgroundColor: swatchColor }}
            />
          </span>
        )}
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>

      <FloatingMenu open={open} anchorRef={buttonRef} menuRef={menuRef} minWidth={196}>
        <div className="grid grid-cols-6 gap-1 px-2 py-2">
          {options.map((option) => (
            <button
              key={option.label}
              type="button"
              title={option.label}
              onMouseDown={preventFocusLoss}
              onClick={() => {
                onPick(option.value);
                setOpen(false);
              }}
              className={cn(
                "h-6 w-6 rounded-sm border border-slate-200 hover:scale-110",
                option.value === currentColor && "ring-2 ring-[#5A32A3] ring-offset-1",
                option.value === "transparent" &&
                  "bg-[linear-gradient(135deg,#fff_46%,#ef4444_46%,#ef4444_54%,#fff_54%)]",
              )}
              style={{
                backgroundColor:
                  option.value === "transparent" ? undefined : option.value,
              }}
            />
          ))}
        </div>
        <label className="mx-2 mb-2 flex h-7 cursor-pointer items-center justify-center rounded-md bg-slate-100 text-[10px] font-semibold text-slate-600 hover:bg-slate-200">
          More colours
          <input
            type="color"
            className="sr-only"
            onMouseDown={preventFocusLoss}
            onChange={(event) => {
              onPick(event.target.value);
              setOpen(false);
            }}
          />
        </label>
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
          "inline-flex h-8 min-w-[108px] max-w-[140px] items-center justify-between gap-1.5 rounded-md border bg-white px-2.5 text-[12px] text-slate-700 transition-colors hover:bg-slate-50",
          open ? "border-violet-300 bg-violet-50" : "border-slate-200",
        )}
        style={{ fontFamily: cssFontFamily(value) }}
      >
        <span className="truncate">{value}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>
      <FloatingMenu open={open} anchorRef={buttonRef} menuRef={menuRef} minWidth={200} maxHeight={280}>
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
              "flex w-full items-center px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50",
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
          "inline-flex h-8 w-[52px] items-center justify-between rounded-md border bg-white px-2 text-[12px] text-slate-700 transition-colors hover:bg-slate-50",
          open ? "border-violet-300 bg-violet-50" : "border-slate-200",
        )}
      >
        <span>{value}</span>
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>
      <FloatingMenu open={open} anchorRef={buttonRef} menuRef={menuRef} minWidth={72} maxHeight={240}>
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

function CaseDropdown({
  onPick,
  onBeforeOpen,
}: {
  onPick: (mode: "upper" | "lower" | "title" | "sentence") => void;
  onBeforeOpen?: () => void;
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
        title="Change case"
        onMouseDown={preventFocusLoss}
        onClick={() => {
          onBeforeOpen?.();
          setOpen((current) => !current);
        }}
        className={cn(
          "inline-flex h-8 min-w-8 items-center justify-center rounded-md border bg-white px-2 text-[12px] font-semibold text-slate-700 transition-colors hover:bg-slate-50",
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

function BulletGlyph({ id }: { id: string }) {
  if (id === "circle") {
    return <span className="h-2 w-2 rounded-full border-[1.5px] border-current" />;
  }
  if (id === "square") {
    return <span className="h-2 w-2 bg-current" />;
  }
  if (id === "dash") {
    return <span className="h-[2px] w-3.5 bg-current" />;
  }
  if (id === "arrow-hollow") {
    return (
      <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" aria-hidden>
        <path
          d="M3 2 L10 6 L3 10 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (id === "arrow-solid") {
    return (
      <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" aria-hidden>
        <path d="M3 2 L10 6 L3 10 Z" fill="currentColor" />
      </svg>
    );
  }
  return <span className="h-2 w-2 rounded-full bg-current" />;
}

function ListSplitButton({
  kind,
  active,
  currentStyle,
  onToggle,
  onPick,
  onBeforeOpen,
}: {
  kind: "bullet" | "number";
  active: boolean;
  currentStyle?: string | null;
  onToggle: () => void;
  onPick: (id: ListStyleId) => void;
  onBeforeOpen: () => void;
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

  const isBullet = kind === "bullet";

  return (
    <div ref={rootRef} className="relative inline-flex">
      <div
        className={cn(
          "inline-flex h-8 overflow-hidden rounded-md border",
          open || active
            ? "border-violet-300 bg-violet-50 text-violet-700"
            : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white",
        )}
      >
        <button
          type="button"
          title={isBullet ? "Bullets" : "Numbering"}
          onMouseDown={preventFocusLoss}
          onClick={onToggle}
          className="inline-flex h-8 w-8 items-center justify-center"
        >
          {isBullet ? <List className="h-4 w-4" /> : <ListOrdered className="h-4 w-4" />}
        </button>
        <button
          ref={buttonRef}
          type="button"
          title="More Options"
          onMouseDown={preventFocusLoss}
          onClick={() => {
            onBeforeOpen();
            setOpen((current) => !current);
          }}
          className={cn(
            "inline-flex h-8 w-5 items-center justify-center border-l",
            open ? "border-slate-200 bg-slate-100" : "border-transparent",
          )}
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
      <FloatingMenu
        open={open}
        anchorRef={buttonRef}
        menuRef={menuRef}
        minWidth={isBullet ? 132 : 168}
      >
        {isBullet ? (
          <div className="grid grid-cols-3 gap-1 p-2">
            {BULLET_STYLES.map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.label}
                onMouseDown={preventFocusLoss}
                onClick={() => {
                  onPick(item.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100",
                  currentStyle === item.id && "bg-slate-100 ring-1 ring-slate-300",
                )}
              >
                <BulletGlyph id={item.id} />
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 p-1.5">
            {NUMBER_STYLES.map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.preview}
                onMouseDown={preventFocusLoss}
                onClick={() => {
                  onPick(item.id);
                  setOpen(false);
                }}
                className={cn(
                  "h-8 min-w-[3.25rem] rounded-md px-2 text-center text-[13px] font-medium text-slate-700 hover:bg-slate-100",
                  currentStyle === item.id && "bg-slate-100 ring-1 ring-slate-300",
                )}
              >
                {item.preview}
              </button>
            ))}
          </div>
        )}
      </FloatingMenu>
    </div>
  );
}

const TABLE_GRID = 10;
const EMOJI_SET = [
  "😀", "😃", "😄", "😁", "😊", "😍", "😘", "😉",
  "😎", "🤔", "😅", "😆", "😇", "🙂", "😐", "😏",
  "😢", "😭", "😡", "👍", "👎", "👏", "🙏", "🔥",
  "⭐", "✅", "❌", "🎉", "💡", "📌", "📧", "🚀",
];

function TableInsertButton({
  onBeforeOpen,
  onInsertTable,
}: {
  onBeforeOpen: () => void;
  onInsertTable: (rows: number, cols: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hoverCell, setHoverCell] = useState({ rows: 1, cols: 1 });
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
        title="Insert table"
        onMouseDown={preventFocusLoss}
        onClick={() => {
          onBeforeOpen();
          setOpen((current) => !current);
          setHoverCell({ rows: 1, cols: 1 });
        }}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md border text-slate-600 transition-colors hover:border-slate-200 hover:bg-white",
          open ? "border-violet-300 bg-violet-50 text-violet-700" : "border-transparent",
        )}
      >
        <Table className="h-4 w-4" />
      </button>
      <FloatingMenu open={open} anchorRef={buttonRef} menuRef={menuRef} minWidth={168}>
        <div className="px-2 py-1.5">
          <p className="mb-1.5 text-[12px] font-semibold text-slate-700">Insert table</p>
          <div
            className="grid gap-[3px]"
            style={{ gridTemplateColumns: `repeat(${TABLE_GRID}, 14px)` }}
          >
            {Array.from({ length: TABLE_GRID * TABLE_GRID }, (_, index) => {
              const col = (index % TABLE_GRID) + 1;
              const row = Math.floor(index / TABLE_GRID) + 1;
              const active = row <= hoverCell.rows && col <= hoverCell.cols;
              return (
                <button
                  key={index}
                  type="button"
                  onMouseDown={preventFocusLoss}
                  onMouseEnter={() => setHoverCell({ rows: row, cols: col })}
                  onClick={() => {
                    onInsertTable(row, col);
                    setOpen(false);
                  }}
                  className={cn(
                    "h-[14px] w-[14px] rounded-[2px] border",
                    active
                      ? "border-[#5A32A3] bg-[#F3ECFB]"
                      : "border-slate-300 bg-white",
                  )}
                />
              );
            })}
          </div>
          <p className="mt-1.5 text-center text-[11px] text-slate-500">
            {hoverCell.rows} × {hoverCell.cols} table
          </p>
        </div>
      </FloatingMenu>
    </div>
  );
}

function MoreInsertMenu({
  onBeforeOpen,
  onInsertLink,
  onInsertTable,
  onInsertImage,
  onInsertEmoji,
  onInsertHr,
  onInsertQuote,
}: {
  onBeforeOpen: () => void;
  onInsertLink: () => void;
  onInsertTable: (rows: number, cols: number) => void;
  onInsertImage: (file: File) => void;
  onInsertEmoji: (emoji: string) => void;
  onInsertHr: () => void;
  onInsertQuote: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<null | "table" | "emoji">(null);
  const [hoverCell, setHoverCell] = useState({ rows: 1, cols: 1 });
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
      setPanel(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function closeAll() {
    setOpen(false);
    setPanel(null);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        title="Insert"
        onMouseDown={preventFocusLoss}
        onClick={() => {
          onBeforeOpen();
          setOpen((current) => {
            const next = !current;
            if (!next) setPanel(null);
            return next;
          });
        }}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md border text-slate-600 transition-colors hover:border-slate-200 hover:bg-white",
          open ? "border-violet-300 bg-violet-50 text-violet-700" : "border-transparent",
        )}
      >
        <Ellipsis className="h-4 w-4" />
      </button>
      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            onInsertImage(file);
            closeAll();
          }
        }}
      />
      <FloatingMenu open={open} anchorRef={buttonRef} menuRef={menuRef} minWidth={132} alignEnd>
        <div className="flex items-start">
          <div className="grid grid-cols-3 gap-0.5 p-1.5">
            <button
              type="button"
              title="Insert link"
              onMouseDown={preventFocusLoss}
              onMouseEnter={() => setPanel(null)}
              onClick={() => {
                onInsertLink();
                closeAll();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
            >
              <Link2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Insert image"
              onMouseDown={preventFocusLoss}
              onMouseEnter={() => setPanel(null)}
              onClick={() => imageRef.current?.click()}
              className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Emoji"
              onMouseDown={preventFocusLoss}
              onMouseEnter={() => setPanel("emoji")}
              onClick={() => setPanel("emoji")}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100",
                panel === "emoji" && "bg-slate-100",
              )}
            >
              <Smile className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Horizontal line"
              onMouseDown={preventFocusLoss}
              onMouseEnter={() => setPanel(null)}
              onClick={() => {
                onInsertHr();
                closeAll();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Quote"
              onMouseDown={preventFocusLoss}
              onMouseEnter={() => setPanel(null)}
              onClick={() => {
                onInsertQuote();
                closeAll();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
            >
              <Quote className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Add a table"
              onMouseDown={preventFocusLoss}
              onMouseEnter={() => {
                setPanel("table");
                setHoverCell({ rows: 1, cols: 1 });
              }}
              onClick={() => {
                setPanel("table");
                setHoverCell({ rows: 1, cols: 1 });
              }}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100",
                panel === "table" && "bg-slate-100",
              )}
            >
              <Table className="h-4 w-4" />
            </button>
          </div>
          {panel === "table" ? (
            <div
              className="border-l border-slate-100 p-2"
              onMouseEnter={() => setPanel("table")}
            >
              <p className="mb-1.5 text-[12px] font-semibold text-slate-700">Insert Table</p>
              <div
                className="grid gap-[3px]"
                style={{ gridTemplateColumns: `repeat(${TABLE_GRID}, 14px)` }}
              >
                {Array.from({ length: TABLE_GRID * TABLE_GRID }, (_, index) => {
                  const col = (index % TABLE_GRID) + 1;
                  const row = Math.floor(index / TABLE_GRID) + 1;
                  const active = row <= hoverCell.rows && col <= hoverCell.cols;
                  return (
                    <button
                      key={index}
                      type="button"
                      onMouseDown={preventFocusLoss}
                      onMouseEnter={() => setHoverCell({ rows: row, cols: col })}
                      onClick={() => {
                        onInsertTable(row, col);
                        closeAll();
                      }}
                      className={cn(
                        "h-[14px] w-[14px] rounded-[2px] border",
                        active
                          ? "border-[#5A32A3] bg-[#F3ECFB]"
                          : "border-slate-300 bg-white",
                      )}
                    />
                  );
                })}
              </div>
              <p className="mt-1.5 text-center text-[11px] text-slate-500">
                {hoverCell.rows} × {hoverCell.cols} table
              </p>
            </div>
          ) : null}
          {panel === "emoji" ? (
            <div className="grid w-[184px] grid-cols-8 gap-0.5 border-l border-slate-100 p-1.5">
              {EMOJI_SET.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onMouseDown={preventFocusLoss}
                  onClick={() => {
                    onInsertEmoji(emoji);
                    closeAll();
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded text-[15px] hover:bg-slate-100"
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </FloatingMenu>
    </div>
  );
}

export function TaskDescriptionEditor({
  value,
  onChange,
  placeholder = "Provide detailed context or instructions… Type @ to assign someone.",
  onMentionSelect,
  editorClassName,
  toolbarLeading,
  toolbarAfterLink,
  toolbarTrailing,
  belowEditor,
  className,
  fillHeight,
}: TaskDescriptionEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef(value);
  const savedRangeRef = useRef<Range | null>(null);
  const pendingFormatRef = useRef({ family: "Aptos", size: 12 });
  const lockToolbarFontRef = useRef(false);
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
    unorderedList: false,
    orderedList: false,
  });
  const [lastBulletStyle, setLastBulletStyle] = useState<BulletStyleId>("disc");
  const [lastNumberStyle, setLastNumberStyle] = useState<NumberStyleId>("decimal-dot");
  const [currentListStyle, setCurrentListStyle] = useState<string | null>(null);

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
      const editor = editorRef.current;
      editor?.focus();
      restoreEditorSelection(savedRangeRef);
      document.execCommand(command, false, commandValue);
      syncContent();
    },
    [syncContent],
  );

  function applyListStyle(styleId: ListStyleId) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreEditorSelection(savedRangeRef);

    const ordered = isOrderedListStyle(styleId);
    const selection = window.getSelection();
    if (!selection) return;
    if (
      selection.rangeCount === 0 ||
      !selection.anchorNode ||
      !editor.contains(selection.anchorNode)
    ) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      savedRangeRef.current = range.cloneRange();
    }

    const wanted = ordered ? "OL" : "UL";
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const currentBlock = blockAncestor(selection.anchorNode, editor);
    const existingList = currentBlock?.closest("ul, ol");

    if (existingList && editor.contains(existingList)) {
      if (existingList.tagName === wanted) {
        paintList(existingList as HTMLElement, styleId);
      } else {
        const next = document.createElement(wanted.toLowerCase());
        while (existingList.firstChild) next.appendChild(existingList.firstChild);
        existingList.replaceWith(next);
        paintList(next, styleId);
      }
      styleEditorLists(editor);
      syncContent();
      readSelectionStyles();
      return;
    }

    const list = document.createElement(wanted.toLowerCase());
    const targets =
      range && !range.collapsed
        ? collectSelectedBlocks(editor, range)
        : currentBlock && currentBlock !== editor
          ? [currentBlock]
          : [];

    if (!targets.length) {
      const li = document.createElement("li");
      li.appendChild(document.createElement("br"));
      list.appendChild(li);
      if (editor.firstChild) editor.insertBefore(list, editor.firstChild);
      else editor.appendChild(list);
    } else {
      const first = targets[0]!;
      targets.forEach((block) => {
        const li = document.createElement("li");
        while (block.firstChild) li.appendChild(block.firstChild);
        if (!li.childNodes.length) li.appendChild(document.createElement("br"));
        list.appendChild(li);
      });
      first.replaceWith(list);
      targets.slice(1).forEach((block) => block.remove());
    }

    paintList(list, styleId);

    const firstItem = list.querySelector("li");
    if (firstItem) {
      const nextRange = document.createRange();
      nextRange.selectNodeContents(firstItem);
      nextRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      savedRangeRef.current = nextRange.cloneRange();
    }

    styleEditorLists(editor);
    syncContent();
    readSelectionStyles();
  }

  function toggleListKind(ordered: boolean) {
    const editor = editorRef.current;
    if (!editor) return;
    restoreEditorSelection(savedRangeRef);
    const selection = window.getSelection();
    const block = blockAncestor(selection?.anchorNode ?? null, editor);
    const existingList = block?.closest("ul, ol");
    const wanted = ordered ? "OL" : "UL";
    if (existingList && editor.contains(existingList) && existingList.tagName === wanted) {
      unwrapList(existingList as HTMLElement);
      styleEditorLists(editor);
      syncContent();
      readSelectionStyles();
      return;
    }
    applyListStyle(ordered ? lastNumberStyle : lastBulletStyle);
  }

  function pickListStyle(styleId: ListStyleId) {
    if (isOrderedListStyle(styleId)) setLastNumberStyle(styleId);
    else setLastBulletStyle(styleId);
    applyListStyle(styleId);
  }

  const readSelectionStyles = useCallback(() => {
    const selection = window.getSelection();
    const node = selection?.anchorNode;
    const element =
      node?.nodeType === Node.ELEMENT_NODE
        ? (node as HTMLElement)
        : node?.parentElement;
    const list = element?.closest("ul, ol");
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      subscript: document.queryCommandState("subscript"),
      superscript: document.queryCommandState("superscript"),
      unorderedList: list?.tagName === "UL",
      orderedList: list?.tagName === "OL",
    });
    if (list) {
      const stored = list.getAttribute("data-list-style");
      setCurrentListStyle(
        stored || (list.tagName === "OL" ? "decimal-dot" : "disc"),
      );
    } else {
      setCurrentListStyle(null);
    }

    if (element && !lockToolbarFontRef.current) {
      const computed = window.getComputedStyle(element);
      const match = computedFontName(element);
      const size = Number.parseInt(computed.fontSize, 10);
      if (match) {
        setFontFamily(match);
        pendingFormatRef.current.family = match;
      }
      if (!Number.isNaN(size)) {
        const nearest = FONT_SIZES.reduce((prev, curr) =>
          Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev,
        );
        setFontSize(nearest);
        pendingFormatRef.current.size = nearest;
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
    ensureEditorFonts();
    document.execCommand("defaultParagraphSeparator", false, "p");
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

  function currentFormatStyles(family = pendingFormatRef.current.family, size = pendingFormatRef.current.size) {
    return {
      fontFamily: cssFontFamily(family),
      fontSize: `${size}px`,
    };
  }

  function applyFontFamily(nextFamily: string) {
    pendingFormatRef.current.family = nextFamily;
    lockToolbarFontRef.current = true;
    setFontFamily(nextFamily);
    applyInlineStyleToSelection(editorRef.current, savedRangeRef, currentFormatStyles(nextFamily));
    syncContent();
  }

  function applyFontSize(nextSize: number) {
    pendingFormatRef.current.size = nextSize;
    lockToolbarFontRef.current = true;
    setFontSize(nextSize);
    applyInlineStyleToSelection(editorRef.current, savedRangeRef, currentFormatStyles(undefined, nextSize));
    syncContent();
  }

  function insertPendingText(text: string) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreEditorSelection(savedRangeRef);
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    const anchor = selection.anchorNode;
    if (anchor?.nodeType === Node.TEXT_NODE && (anchor.textContent === "\u200b" || anchor.textContent === "")) {
      const node = anchor as Text;
      node.data = text;
      const caret = document.createRange();
      caret.setStart(node, text.length);
      caret.collapse(true);
      selection.removeAllRanges();
      selection.addRange(caret);
      savedRangeRef.current = caret.cloneRange();
      syncContent();
      return;
    }

    range.deleteContents();
    const span = document.createElement("span");
    applyStylesToElement(span, currentFormatStyles());
    span.textContent = text;
    range.insertNode(span);
    const caret = document.createRange();
    caret.setStart(span.firstChild ?? span, text.length);
    caret.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caret);
    savedRangeRef.current = caret.cloneRange();
    syncContent();
  }

  function ensurePendingAtCaret() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    if (caretHasStyles(selection, pendingFormatRef.current)) return;
    const range = selection.getRangeAt(0);
    if (!range.collapsed || !editor.contains(range.commonAncestorContainer)) return;
    const block = blockAncestor(selection.anchorNode, editor);
    if (block && !(block.textContent ?? "").replace(/\u200b/g, "").trim()) {
      applyStylesToElement(block, currentFormatStyles());
      return;
    }
    const { caret } = insertTypingSpan(range, currentFormatStyles());
    selection.removeAllRanges();
    selection.addRange(caret);
    savedRangeRef.current = caret.cloneRange();
  }

  function handleBeforeInput(event: React.FormEvent<HTMLDivElement>) {
    const native = event.nativeEvent as InputEvent;
    if (native.inputType === "insertParagraph" || native.inputType === "insertLineBreak") {
      window.requestAnimationFrame(() => ensurePendingAtCaret());
      return;
    }
    if (native.inputType !== "insertText" || !native.data) return;
    const selection = window.getSelection();
    if (selection?.isCollapsed && caretHasStyles(selection, pendingFormatRef.current)) return;
    native.preventDefault();
    insertPendingText(native.data);
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
    restoreEditorSelection(savedRangeRef);
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
    restoreEditorSelection(savedRangeRef);
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

  function insertHtmlAtCaret(html: string) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreEditorSelection(savedRangeRef);
    document.execCommand("insertHTML", false, html);
    syncContent();
    readSelectionStyles();
  }

  function insertTable(rows: number, cols: number) {
    const safeRows = Math.max(1, Math.min(TABLE_GRID, rows));
    const safeCols = Math.max(1, Math.min(TABLE_GRID, cols));
    const cell = `<td style="border:1px solid #cbd5e1;padding:6px 8px;min-width:48px;vertical-align:top;"><br></td>`;
    const body = Array.from({ length: safeRows }, () =>
      `<tr>${cell.repeat(safeCols)}</tr>`,
    ).join("");
    insertHtmlAtCaret(
      `<table class="fc-email-table" style="border-collapse:collapse;width:100%;max-width:100%;table-layout:fixed;margin:8px 0;"><tbody>${body}</tbody></table><p><br></p>`,
    );
  }

  function insertImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result ?? "");
      if (!src) return;
      insertHtmlAtCaret(
        `<img src="${src}" alt="" style="max-width:100%;height:auto;border-radius:4px;" />`,
      );
    };
    reader.readAsDataURL(file);
  }

  function insertEmoji(emoji: string) {
    insertHtmlAtCaret(emoji);
  }

  function insertHr() {
    insertHtmlAtCaret("<hr /><p><br></p>");
  }

  function insertQuote() {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreEditorSelection(savedRangeRef);
    document.execCommand("formatBlock", false, "blockquote");
    syncContent();
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
    <div className={cn("relative w-full rounded-md border border-border bg-background", fillHeight && "flex h-full min-h-0 flex-col", className)}>
      <div className="flex w-full items-stretch rounded-t-md border-b border-slate-200 bg-slate-50/90">
        <div className="min-w-0 flex-1 overflow-x-auto no-scrollbar">
          <div className="flex h-11 min-w-max items-center gap-0.5 px-1.5">
          {toolbarLeading ? (
            <>
              {toolbarLeading}
              <ToolbarDivider />
            </>
          ) : null}
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
            <Bold className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            title="Italic"
            active={activeFormats.italic}
            onClick={() => {
              runCommand("italic");
              readSelectionStyles();
            }}
          >
            <Italic className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            title="Underline"
            active={activeFormats.underline}
            onClick={() => {
              runCommand("underline");
              readSelectionStyles();
            }}
          >
            <Underline className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            title="Strikethrough"
            active={activeFormats.strikeThrough}
            onClick={() => {
              runCommand("strikeThrough");
              readSelectionStyles();
            }}
          >
            <Strikethrough className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            title="Subscript"
            active={activeFormats.subscript}
            onClick={() => {
              runCommand("subscript");
              readSelectionStyles();
            }}
          >
            <Subscript className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            title="Superscript"
            active={activeFormats.superscript}
            onClick={() => {
              runCommand("superscript");
              readSelectionStyles();
            }}
          >
            <Superscript className="h-4 w-4" />
          </ToolButton>
          <ToolButton title="Clear formatting" onClick={clearFormatting}>
            <Eraser className="h-4 w-4" />
          </ToolButton>
          <ToolbarDivider />
          <ColorDropdown
            title="Font color"
            variant="font"
            options={TEXT_COLORS}
            currentColor={textColor}
            onBeforeOpen={rememberSelection}
            onPick={applyTextColor}
          />
          <ColorDropdown
            title="Text highlight"
            variant="highlight"
            options={HIGHLIGHT_COLORS}
            currentColor={highlightColor}
            onBeforeOpen={rememberSelection}
            onPick={applyHighlight}
          />
          <CaseDropdown onBeforeOpen={rememberSelection} onPick={changeCase} />
          <TableInsertButton
            onBeforeOpen={rememberSelection}
            onInsertTable={insertTable}
          />
          <ToolButton title="Insert link" onClick={insertLink}>
            <Link2 className="h-4 w-4" />
          </ToolButton>
          {toolbarAfterLink ? toolbarAfterLink : null}
          <ToolbarDivider />
          <ListSplitButton
            kind="bullet"
            active={activeFormats.unorderedList}
            currentStyle={currentListStyle}
            onToggle={() => toggleListKind(false)}
            onPick={pickListStyle}
            onBeforeOpen={rememberSelection}
          />
          <ListSplitButton
            kind="number"
            active={activeFormats.orderedList}
            currentStyle={currentListStyle}
            onToggle={() => toggleListKind(true)}
            onPick={pickListStyle}
            onBeforeOpen={rememberSelection}
          />
          <ToolButton title="Multilevel list" onClick={insertMultilevelItem}>
            <ListTree className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            title="Decrease indent"
            onClick={() => {
              runCommand("outdent");
              readSelectionStyles();
            }}
          >
            <IndentDecrease className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            title="Increase indent"
            onClick={() => {
              runCommand("indent");
              readSelectionStyles();
            }}
          >
            <IndentIncrease className="h-4 w-4" />
          </ToolButton>
          <ToolbarDivider />
          <ToolButton
            title="Align left"
            active={textAlign === "left"}
            onClick={() => setAlignment("left")}
          >
            <AlignLeft className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            title="Align center"
            active={textAlign === "center"}
            onClick={() => setAlignment("center")}
          >
            <AlignCenter className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            title="Align right"
            active={textAlign === "right"}
            onClick={() => setAlignment("right")}
          >
            <AlignRight className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            title="Justify"
            active={textAlign === "justify"}
            onClick={() => setAlignment("justify")}
          >
            <AlignJustify className="h-4 w-4" />
          </ToolButton>
          <ToolButton title="Sort A to Z" onClick={sortSelectedLines}>
            <span className="text-[12px] font-semibold">A↓</span>
          </ToolButton>
          <ToolButton
            title="Show formatting marks"
            active={showMarks}
            onClick={() => setShowMarks((current) => !current)}
          >
            <Pilcrow className="h-4 w-4" />
          </ToolButton>
          <ToolbarDivider />
          <MoreInsertMenu
            onBeforeOpen={rememberSelection}
            onInsertLink={insertLink}
            onInsertTable={insertTable}
            onInsertImage={insertImageFile}
            onInsertEmoji={insertEmoji}
            onInsertHr={insertHr}
            onInsertQuote={insertQuote}
          />
          </div>
        </div>
        {toolbarTrailing ? (
          <div className="flex h-11 shrink-0 items-center border-l border-slate-200 px-2">
            {toolbarTrailing}
          </div>
        ) : null}
      </div>

      <div className={cn("relative", fillHeight && "flex min-h-0 flex-1 flex-col")}>
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
        onBeforeInput={handleBeforeInput}
        onBlur={syncContent}
        onKeyDown={(event) => {
          if (mentions.handleKeyDown(event)) return;
        }}
        onMouseUp={() => {
          lockToolbarFontRef.current = false;
          rememberSelection();
          readSelectionStyles();
          mentions.syncMention();
        }}
        onKeyUp={(event) => {
          rememberSelection();
          if (
            event.key.startsWith("Arrow") ||
            event.key === "Home" ||
            event.key === "End" ||
            event.key === "PageUp" ||
            event.key === "PageDown"
          ) {
            lockToolbarFontRef.current = false;
            readSelectionStyles();
          }
          mentions.syncMention();
        }}
        onFocus={() => {
          rememberSelection();
          if (!lockToolbarFontRef.current) readSelectionStyles();
        }}
        className={cn(
          "fc-rich-editor w-full bg-white px-3 py-2 text-sm leading-6 text-foreground/90 focus:outline-none",
          fillHeight
            ? "min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
            : "min-h-[96px] resize-y overflow-auto",
          "empty:before:pointer-events-none empty:before:text-foreground/50 empty:before:content-[attr(data-placeholder)]",
          "[&_ul]:my-1 [&_ul]:pl-7 [&_ol]:my-1 [&_ol]:pl-7 [&_li]:my-0.5 [&_li]:list-item",
          "[&_table]:max-w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-1.5",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:text-slate-600",
          "[&_.mention-tag]:rounded [&_.mention-tag]:bg-violet-100 [&_.mention-tag]:px-1 [&_.mention-tag]:py-0.5 [&_.mention-tag]:font-medium [&_.mention-tag]:text-violet-800",
          showMarks && "[&_p]:relative [&_p]:border-b [&_p]:border-dashed [&_p]:border-slate-200 [&_p]:pb-1",
          editorClassName,
        )}
      />
      <RichEditorTableResize editorRef={editorRef} onChange={syncContent} />
      </div>
      {belowEditor ? <div className="px-3 pb-2.5">{belowEditor}</div> : null}
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
