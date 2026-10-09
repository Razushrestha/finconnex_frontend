"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { MoreHorizontal, Pencil } from "lucide-react";
import { DocumentThumbnail } from "@/components/documents/signature/create/DocumentThumbnail";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function useObjectUrl(file: File) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

function FilePreview({ file }: { file: File }) {
  const url = useObjectUrl(file);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
  const isPdf = ext === "pdf" || file.type === "application/pdf";

  if (!url) {
    return <div className="h-full w-full bg-slate-50" />;
  }
  if (isImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="h-full w-full object-contain" />
    );
  }
  if (isPdf) {
    return (
      <Document
        file={url}
        loading={<div className="h-full w-full bg-slate-50" />}
        error={<DocumentThumbnail extension={ext} />}
        className="flex h-full w-full items-center justify-center"
      >
        <Page
          pageNumber={1}
          width={196}
          renderAnnotationLayer={false}
          renderTextLayer={false}
        />
      </Document>
    );
  }
  return <DocumentThumbnail extension={ext} />;
}

export function SignatureFileCard({
  file,
  label,
  selected,
  onSelect,
  onRename,
  onRemove,
}: {
  file: File;
  label: string;
  selected: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipCommit = useRef(false);
  const showSelect = hovered || selected;

  useEffect(() => {
    if (!editing) setDraft(label);
  }, [editing, label]);

  useEffect(() => {
    if (!editing) return;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editing]);

  function startEdit() {
    skipCommit.current = false;
    setDraft(label);
    setEditing(true);
    setMenuOpen(false);
  }

  function commit() {
    if (skipCommit.current) {
      skipCommit.current = false;
      return;
    }
    const next = draft.trim();
    if (next && next !== label) onRename(next);
    skipCommit.current = true;
    setEditing(false);
  }

  function cancelEdit() {
    skipCommit.current = true;
    setDraft(label);
    setEditing(false);
  }

  return (
    <div
      className="flex w-[220px] shrink-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative h-[280px] bg-white">
        {showSelect ? (
          <label className="absolute top-2 left-2 z-10 flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white">
            <input
              type="checkbox"
              checked
              onChange={() => onSelect()}
              className="h-3.5 w-3.5 accent-slate-700"
              aria-label={`Selected ${label}`}
            />
          </label>
        ) : null}
        <button
          type="button"
          onClick={onSelect}
          className="flex h-full w-full items-center justify-center overflow-hidden"
        >
          <FilePreview file={file} />
        </button>
        <div className="absolute top-2 right-2 z-10">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded p-1 text-slate-500 hover:bg-white"
            aria-label={`Actions for ${label}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen ? (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-1 w-32 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                  onClick={startEdit}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-[12px] text-rose-600 hover:bg-rose-50"
                  onClick={() => {
                    setMenuOpen(false);
                    onRemove();
                  }}
                >
                  Remove
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
      <div className="border-t border-slate-100 bg-slate-50 px-2 py-2">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                cancelEdit();
              }
            }}
            aria-label={`Rename ${label}`}
            className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-[13px] text-slate-800 outline-none focus:border-[var(--brand-primary)]"
          />
        ) : (
          <div className="flex items-center gap-1">
            <p className="min-w-0 flex-1 truncate text-center text-[13px] font-semibold text-slate-900">
              {label}
            </p>
            <button
              type="button"
              onClick={startEdit}
              aria-label={`Rename ${label}`}
              className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-white hover:text-[var(--brand-primary)]"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
