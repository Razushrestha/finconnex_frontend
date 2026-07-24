"use client";

import { useMemo, useState } from "react";
import { Home, Paperclip, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import {
  ATTACHMENT_KINDS,
  type Attachment,
  type AttachmentKind,
} from "@/lib/attachments/types";
import {
  createAttachment,
  listAttachments,
} from "@/lib/attachments/store";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import { cn } from "@/lib/utils";

function readQueryBootstrap() {
  if (typeof window === "undefined") {
    return { relatedTo: "", composeOpen: false };
  }
  const params = new URLSearchParams(window.location.search);
  const relatedName = params.get("relatedName");
  const relatedKind = params.get("relatedKind") || "Lead";
  return {
    relatedTo: relatedName ? `${relatedKind}: ${relatedName}` : "",
    composeOpen: params.get("compose") === "1",
  };
}

export default function AttachmentsPage() {
  const bootstrap = useMemo(() => readQueryBootstrap(), []);
  const [items, setItems] = useState<Attachment[]>(() =>
    typeof window === "undefined" ? [] : listAttachments(),
  );
  const [search, setSearch] = useState("");
  const [composeOpen, setComposeOpen] = useState(bootstrap.composeOpen);
  const [fileName, setFileName] = useState("");
  const [kind, setKind] = useState<AttachmentKind>("Document");
  const [relatedTo, setRelatedTo] = useState(bootstrap.relatedTo);
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function refresh() {
    setItems(listAttachments());
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (a) =>
        a.fileName.toLowerCase().includes(q) ||
        (a.relatedTo ?? "").toLowerCase().includes(q) ||
        a.uploadedBy.toLowerCase().includes(q),
    );
  }, [items, search]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2000);
  }

  function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!fileName.trim()) return;
    createAttachment({
      fileName,
      kind,
      relatedTo: relatedTo || undefined,
      uploadedBy: ACTIVITY_OWNERS[0],
      notes: notes || undefined,
    });
    setFileName("");
    setNotes("");
    setComposeOpen(false);
    refresh();
    flash("Attachment uploaded");
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <FocusHighlight />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Home className="h-3 w-3" />
            <span>Activities</span>
            <span>/</span>
            <span className="text-slate-600">Attachments</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Attachments
          </h1>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Documents and files linked to leads — also appear as Last Activity
            on the Lead Card.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[12px] font-semibold text-white shadow-sm hover:bg-violet-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Upload
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search files, leads, uploaders…"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-[13px] outline-none focus:ring-2 focus:ring-violet-300"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-[12px]">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            <tr>
              <th className="px-3 py-2.5">File</th>
              <th className="px-3 py-2.5">Kind</th>
              <th className="px-3 py-2.5">Related to</th>
              <th className="px-3 py-2.5">Uploaded by</th>
              <th className="px-3 py-2.5">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-700">
            {filtered.map((a) => (
              <tr
                key={a.id}
                data-focus-id={a.id}
                data-attachment-id={a.id}
                className="hover:bg-slate-50/80"
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                      <Paperclip className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {a.fileName}
                      </p>
                      {a.sizeLabel && (
                        <p className="text-[10px] text-slate-400">
                          {a.sizeLabel}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-slate-600">{a.kind}</td>
                <td className="px-3 py-2.5 text-slate-600">
                  {a.relatedTo || "—"}
                </td>
                <td className="px-3 py-2.5 text-slate-600">{a.uploadedBy}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-slate-500">
                  {a.uploadedAt}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-10 text-center text-slate-400"
                >
                  No attachments yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
          Showing {filtered.length} of {items.length}
          {" · "}
          <Link
            href="/sales/leads"
            className="font-medium text-violet-600 hover:underline"
          >
            Open Leads
          </Link>
        </div>
      </div>

      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form
            onSubmit={onUpload}
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Upload attachment
              </h2>
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="mb-3 block text-xs font-medium text-slate-600">
              File name
              <input
                autoFocus
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-violet-300"
                placeholder="checklist.pdf"
              />
            </label>
            <label className="mb-3 block text-xs font-medium text-slate-600">
              Kind
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as AttachmentKind)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-violet-300"
              >
                {ATTACHMENT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-3 block text-xs font-medium text-slate-600">
              Related to
              <input
                value={relatedTo}
                onChange={(e) => setRelatedTo(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-violet-300"
                placeholder="Lead: William Anderson"
              />
            </label>
            <label className="mb-4 block text-xs font-medium text-slate-600">
              Notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={cn(
                  "mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-300",
                )}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className="h-9 rounded-lg border border-slate-200 px-3 text-[12px] font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 rounded-lg bg-violet-600 px-3 text-[12px] font-semibold text-white"
              >
                Upload
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div
          className="fixed right-4 bottom-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
