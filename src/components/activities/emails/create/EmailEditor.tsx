"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Sparkles,
  Underline,
} from "lucide-react";

const FONT_OPTIONS = ["Sans Serif", "Serif", "Monospace"] as const;
type BodyFont = (typeof FONT_OPTIONS)[number];
type BodyAlign = "left" | "center" | "right";

const FONT_FAMILY: Record<BodyFont, string> = {
  "Sans Serif": "inherit",
  Serif: "Georgia, 'Times New Roman', serif",
  Monospace: "'JetBrains Mono', ui-monospace, monospace",
};

const ALIGN_COMMAND: Record<BodyAlign, string> = {
  left: "justifyLeft",
  center: "justifyCenter",
  right: "justifyRight",
};

interface EmailEditorProps {
  /** HTML string (contentEditable output), not plain text. */
  body: string;
  onChange: (value: string) => void;
  bodyFont: BodyFont;
  onFontChange: (font: BodyFont) => void;
  bodyAlign: BodyAlign;
  onAlignChange: (align: BodyAlign) => void;
  onAttachImage: () => void;
  error?: string;
  submitted?: boolean;
}

const toolbarButtonClass =
  "rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground";
const toolbarButtonActiveClass = "bg-accent text-accent-foreground";

export function EmailEditor({
  body,
  onChange,
  bodyFont,
  onFontChange,
  bodyAlign,
  onAlignChange,
  onAttachImage,
  error,
  submitted,
}: EmailEditorProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(!body);

  // Sync external `body` changes (e.g. form reset) into the DOM without
  // clobbering the caret on every keystroke — we only touch innerHTML when
  // it actually differs from what's already there.
  useEffect(() => {
    const el = bodyRef.current;
    if (el && el.innerHTML !== body) {
      el.innerHTML = body;
      setIsEmpty(el.textContent?.trim().length === 0);
    }
  }, [body]);

  function handleInput() {
    const el = bodyRef.current;
    if (!el) return;
    onChange(el.innerHTML);
    setIsEmpty(el.textContent?.trim().length === 0);
  }

  // document.execCommand is deprecated but still the simplest way to get
  // real bold/italic/underline/list/link formatting without pulling in a
  // rich-text library (TipTap/Slate/etc.) — worth swapping to one of those
  // if this editor needs to grow much further.
  function exec(command: string, value?: string) {
    const el = bodyRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(command, false, value);
    handleInput();
  }

  function handleAlign(align: BodyAlign) {
    onAlignChange(align);
    exec(ALIGN_COMMAND[align]);
  }

  function handleLink() {
    const url = window.prompt("Link URL");
    if (!url) return;
    exec("createLink", url);
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-5 py-2">
        <select
          value={bodyFont}
          onChange={(e) => onFontChange(e.target.value as BodyFont)}
          className="mr-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <span className="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          title="Bold"
          onMouseDown={(e) => e.preventDefault()} // keep focus/selection in the editor
          onClick={() => exec("bold")}
          className={toolbarButtonClass}
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Italic"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("italic")}
          className={toolbarButtonClass}
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Underline"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("underline")}
          className={toolbarButtonClass}
        >
          <Underline className="h-3.5 w-3.5" />
        </button>
        <span className="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          title="Align left"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleAlign("left")}
          className={
            toolbarButtonClass +
            (bodyAlign === "left" ? ` ${toolbarButtonActiveClass}` : "")
          }
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Align center"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleAlign("center")}
          className={
            toolbarButtonClass +
            (bodyAlign === "center" ? ` ${toolbarButtonActiveClass}` : "")
          }
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Align right"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleAlign("right")}
          className={
            toolbarButtonClass +
            (bodyAlign === "right" ? ` ${toolbarButtonActiveClass}` : "")
          }
        >
          <AlignRight className="h-3.5 w-3.5" />
        </button>
        <span className="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          title="Bullet list"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("insertUnorderedList")}
          className={toolbarButtonClass}
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Numbered list"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("insertOrderedList")}
          className={toolbarButtonClass}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          title="Attach image"
          onClick={onAttachImage}
          className={toolbarButtonClass}
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="relative px-5 py-4">
        <div
          ref={bodyRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          style={{ fontFamily: FONT_FAMILY[bodyFont] }}
          className="min-h-[220px] whitespace-pre-wrap text-sm text-foreground focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-primary [&_a]:underline"
        />
        {isEmpty && (
          <p className="pointer-events-none absolute left-5 top-4 text-sm text-muted-foreground">
            Write your email…
          </p>
        )}
        {submitted && error && (
          <p className="mt-1 text-xs text-destructive">{error}</p>
        )}
        <button
          type="button"
          title="Optimize for brevity"
          className="absolute bottom-3 right-5 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-primary shadow-sm hover:bg-accent"
        >
          <Sparkles className="h-3 w-3" />
          Optimize for brevity
        </button>
      </div>
    </div>
  );
}
