"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Underline,
  type LucideIcon,
} from "lucide-react";
import {
  buildLinkHtml,
  normalizeLinkUrl,
  sanitizeDescriptionHtml,
} from "@/lib/booking/description-html";
import { cn } from "@/lib/utils";

type Tool = { command: string; label: string; icon: LucideIcon; hint?: string };

/** Groups are separated by a thin divider. */
const TOOL_GROUPS: Tool[][] = [
  [
    { command: "bold", label: "Bold", icon: Bold, hint: "Ctrl+B" },
    { command: "italic", label: "Italic", icon: Italic, hint: "Ctrl+I" },
    { command: "underline", label: "Underline", icon: Underline, hint: "Ctrl+U" },
  ],
  [
    { command: "justifyLeft", label: "Align left", icon: AlignLeft },
    { command: "justifyCenter", label: "Align center", icon: AlignCenter },
    { command: "justifyRight", label: "Align right", icon: AlignRight },
  ],
  [
    { command: "insertUnorderedList", label: "Bulleted list", icon: List },
    { command: "insertOrderedList", label: "Numbered list", icon: ListOrdered },
  ],
  [{ command: "link", label: "Insert link", icon: Link2, hint: "Ctrl+K" }],
];

const LINK_ERROR =
  "Enter a web address like https://example.com, or an email address.";

type LinkDraft = {
  url: string;
  text: string;
  /** Ask for the words to show: there is no selected text to turn into the link. */
  showText: boolean;
  /** The caret is in a link that already exists. */
  editing: boolean;
  error: string;
};

function commandState(command: string) {
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
}

function anchorAround(node: Node | null, root: HTMLElement): HTMLAnchorElement | null {
  const element = node instanceof Element ? node : node?.parentElement;
  const anchor = element?.closest("a") ?? null;
  return anchor && root.contains(anchor) ? anchor : null;
}

function activeTools(root: HTMLElement) {
  const active: string[] = [];
  for (const group of TOOL_GROUPS) {
    for (const tool of group) {
      if (tool.command !== "link" && commandState(tool.command)) active.push(tool.command);
    }
  }
  const selection = window.getSelection();
  if (anchorAround(selection?.anchorNode ?? null, root)) active.push("link");
  return active.join(",");
}

function tagLinks(root: HTMLElement) {
  for (const anchor of root.querySelectorAll("a[href]")) {
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
  }
}

/**
 * The event type Description: bold, italic, underline, left / center / right
 * alignment, lists and links. The value is HTML; the page shows it through
 * `sanitizeDescriptionHtml`.
 */
export function DescriptionEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  // The selection to come back to once the link fields (which take focus) are done.
  const savedRange = useRef<Range | null>(null);
  const editingAnchor = useRef<HTMLAnchorElement | null>(null);
  const [active, setActive] = useState("");
  const [link, setLink] = useState<LinkDraft | null>(null);
  const linkOpen = link !== null;

  useEffect(() => {
    // Seed once; the editor owns its content while it is open.
    if (ref.current) ref.current.innerHTML = sanitizeDescriptionHtml(value || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Highlight the buttons that apply where the caret is.
  useEffect(() => {
    function sync() {
      const root = ref.current;
      const selection = window.getSelection();
      if (!root || !selection?.rangeCount || !root.contains(selection.anchorNode)) return;
      setActive(activeTools(root));
    }
    document.addEventListener("selectionchange", sync);
    return () => document.removeEventListener("selectionchange", sync);
  }, []);

  useEffect(() => {
    if (linkOpen) urlRef.current?.focus();
  }, [linkOpen]);

  function commit() {
    onChange(ref.current?.innerHTML ?? "");
    if (ref.current) setActive(activeTools(ref.current));
  }

  function restoreSelection() {
    const root = ref.current;
    const range = savedRange.current;
    if (!root) return;
    root.focus();
    if (range) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  function closeLink() {
    setLink(null);
    restoreSelection();
  }

  function run(command: string) {
    const root = ref.current;
    if (!root) return;
    root.focus();
    // Alignment is written as text-align, which is what the page reads back.
    const aligning = command.startsWith("justify");
    if (aligning) document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false);
    if (aligning) document.execCommand("styleWithCSS", false, "false");
    commit();
  }

  function openLink() {
    const root = ref.current;
    if (!root) return;
    const selection = window.getSelection();
    let range: Range;
    if (selection?.rangeCount && root.contains(selection.anchorNode)) {
      range = selection.getRangeAt(0).cloneRange();
    } else {
      root.focus();
      range = document.createRange();
      range.selectNodeContents(root);
      range.collapse(false);
    }
    savedRange.current = range;
    const anchor = anchorAround(range.startContainer, root);
    editingAnchor.current = anchor;
    setLink({
      url: anchor?.getAttribute("href") ?? "",
      text: anchor ? (anchor.textContent ?? "") : range.toString(),
      showText: Boolean(anchor) || range.collapsed,
      editing: Boolean(anchor),
      error: "",
    });
  }

  function applyLink() {
    const root = ref.current;
    if (!root || !link) return;
    const url = normalizeLinkUrl(link.url);
    if (!url) {
      setLink({ ...link, error: LINK_ERROR });
      return;
    }
    restoreSelection();
    const anchor = editingAnchor.current;
    const text = link.text.trim();
    if (anchor && root.contains(anchor)) {
      anchor.setAttribute("href", url);
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
      if (text && text !== anchor.textContent) anchor.textContent = text;
    } else if (savedRange.current?.collapsed) {
      // Nothing selected: add the link as new text, then carry on typing after it.
      document.execCommand("insertHTML", false, `${buildLinkHtml(url, text || url)}&nbsp;`);
    } else {
      document.execCommand("createLink", false, url);
      tagLinks(root);
    }
    setLink(null);
    commit();
  }

  function removeLink() {
    const anchor = editingAnchor.current;
    const parent = anchor?.parentNode;
    if (anchor && parent) {
      while (anchor.firstChild) parent.insertBefore(anchor.firstChild, anchor);
      parent.removeChild(anchor);
    }
    editingAnchor.current = null;
    setLink(null);
    restoreSelection();
    commit();
  }

  function onLinkKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      // Inside a form this would otherwise submit the whole event type.
      event.preventDefault();
      applyLink();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeLink();
    }
  }

  const activeSet = active ? active.split(",") : [];

  return (
    <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white focus-within:border-[var(--brand-primary)]/50">
      <div
        role="toolbar"
        aria-label="Description formatting"
        className="flex flex-wrap items-center gap-0.5 border-b border-[#E5E7EB] px-2 py-1.5 text-slate-500"
      >
        {TOOL_GROUPS.map((group, groupIndex) => (
          <div key={group[0].command} className="flex items-center gap-0.5">
            {groupIndex > 0 ? (
              <span className="mx-1 h-4 w-px bg-[#E5E7EB]" aria-hidden />
            ) : null}
            {group.map((tool) => {
              const on = tool.command === "link" ? linkOpen : activeSet.includes(tool.command);
              return (
                <button
                  key={tool.command}
                  type="button"
                  aria-label={tool.label}
                  aria-pressed={on}
                  title={tool.hint ? `${tool.label} (${tool.hint})` : tool.label}
                  // Keep the text selected: the click must not move focus out of the editor.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => (tool.command === "link" ? openLink() : run(tool.command))}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded transition-colors",
                    on
                      ? "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"
                      : "hover:bg-slate-100 hover:text-slate-700",
                  )}
                >
                  <tool.icon className="h-3.5 w-3.5" aria-hidden />
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {link ? (
        <div
          role="group"
          aria-label="Link"
          className="flex flex-wrap items-center gap-2 border-b border-[#E5E7EB] bg-[#FAF8FD] px-2.5 py-2"
        >
          <input
            ref={urlRef}
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            aria-label="Link URL"
            aria-invalid={Boolean(link.error)}
            placeholder="https://example.com"
            value={link.url}
            onChange={(event) => setLink({ ...link, url: event.target.value, error: "" })}
            onKeyDown={onLinkKeyDown}
            className={cn(
              "h-8 min-w-[180px] flex-1 rounded-md border bg-white px-2.5 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[var(--brand-primary)]",
              link.error ? "border-red-300" : "border-[#E5E7EB]",
            )}
          />
          {link.showText ? (
            <input
              type="text"
              autoComplete="off"
              aria-label="Text to display"
              placeholder="Text to display"
              value={link.text}
              onChange={(event) => setLink({ ...link, text: event.target.value })}
              onKeyDown={onLinkKeyDown}
              className="h-8 w-40 rounded-md border border-[#E5E7EB] bg-white px-2.5 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[var(--brand-primary)]"
            />
          ) : null}
          <button
            type="button"
            onClick={applyLink}
            className="h-8 rounded-md bg-[var(--brand-primary)] px-3 text-[12px] font-semibold text-white hover:bg-[#4b2889]"
          >
            {link.editing ? "Update" : "Apply"}
          </button>
          {link.editing ? (
            <button
              type="button"
              onClick={removeLink}
              className="h-8 rounded-md border border-[#E5E7EB] bg-white px-3 text-[12px] font-semibold text-red-600 hover:bg-red-50"
            >
              Remove link
            </button>
          ) : null}
          <button
            type="button"
            onClick={closeLink}
            className="h-8 rounded-md px-2 text-[12px] font-semibold text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </button>
          {link.error ? (
            <p role="alert" className="basis-full text-[12px] text-red-600">
              {link.error}
            </p>
          ) : null}
        </div>
      ) : null}

      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label="Description"
        contentEditable
        suppressContentEditableWarning
        className="fc-rich-editor min-h-[120px] px-3 py-2 text-[13px] leading-5 text-slate-800 outline-none [&_a]:text-[var(--brand-primary)] [&_a]:underline"
        onInput={commit}
        onFocus={() => {
          // Clicking back into the text means the link was abandoned.
          if (linkOpen) setLink(null);
        }}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
            event.preventDefault();
            openLink();
          }
        }}
        onClick={(event) => {
          // A link in an editor is for editing; Ctrl/Cmd+click follows it.
          const anchor = anchorAround(event.target as Node, event.currentTarget);
          const href = anchor?.getAttribute("href");
          if (anchor && href && (event.ctrlKey || event.metaKey)) {
            window.open(href, "_blank", "noopener,noreferrer");
          }
        }}
      />
    </div>
  );
}
