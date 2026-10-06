"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  getCrmDocumentDownload,
  listCrmDocuments,
} from "@/lib/documents/library/api";
import type { LibraryDocument } from "@/lib/documents/library/types";
import {
  getCrmSignatureTemplate,
  listCrmSignatureTemplates,
} from "@/lib/documents/signature/templates-api";
import {
  getRequestDocuments,
  type SignatureRequest,
} from "@/lib/documents/signature/types";
type Picker = "cloud" | "templates";

const MENU = [
  { id: "desktop", label: "Desktop" },
  { id: "cloud", label: "Cloud" },
  { id: "templates", label: "Template(s)" },
] as const;

async function fileFromUrl(url: string, fileName: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not download that file.");
  const blob = await response.blob();
  if (!blob.size) throw new Error("That file has no contents.");
  const name = fileName.trim() || "document";
  return new File([blob], name, {
    type: blob.type || "application/octet-stream",
  });
}

export function AddDocumentMenu({
  onDesktop,
  onFiles,
  showTemplates = true,
  buttonClassName,
}: {
  onDesktop: () => void;
  onFiles: (files: File[]) => void;
  showTemplates?: boolean;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [cloud, setCloud] = useState<LibraryDocument[]>([]);
  const [templates, setTemplates] = useState<SignatureRequest[]>([]);

  useEffect(() => {
    if (!picker) return;
    let alive = true;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        if (picker === "cloud") {
          const rows = await listCrmDocuments({ limit: 100 });
          if (alive) setCloud(rows.filter((row) => row.fileName.trim()));
        } else if (picker === "templates") {
          const rows = await listCrmSignatureTemplates();
          if (alive) setTemplates(rows);
        }
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : "Could not load that list.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [picker]);

  function closeAll() {
    setOpen(false);
    setPicker(null);
    setBusyId(null);
  }

  async function addCloud(doc: LibraryDocument) {
    setBusyId(doc.id);
    setError("");
    try {
      const remote = await getCrmDocumentDownload(doc.id);
      if (!remote.url) throw new Error(`${doc.fileName} has no file to attach.`);
      onFiles([await fileFromUrl(remote.url, doc.fileName)]);
      closeAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that file.");
    } finally {
      setBusyId(null);
    }
  }

  async function addTemplate(row: SignatureRequest) {
    setBusyId(row.id);
    setError("");
    try {
      const template = (await getCrmSignatureTemplate(row.id)) ?? row;
      const doc = getRequestDocuments(template)[0];
      const url = doc?.fileUrl || template.documentFileUrl;
      const name = doc?.fileName || template.documentFile || template.documentName;
      if (!url) throw new Error(`${template.documentName || "This template"} has no file to attach.`);
      onFiles([await fileFromUrl(url, name || "template.pdf")]);
      closeAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that template.");
    } finally {
      setBusyId(null);
    }
  }

  const items = MENU.filter((item) => showTemplates || item.id !== "templates");

  return (
    <div className="relative mt-2">
      <button
        type="button"
        onClick={() => {
          setPicker(null);
          setError("");
          setOpen((value) => !value);
        }}
        className={
          buttonClassName ??
          "inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[12px] font-semibold text-white shadow-sm hover:bg-primary/90"
        }
      >
        Add document
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && !picker ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 top-full z-20 mt-1 w-52 -translate-x-1/2 rounded-md border border-slate-200 bg-white py-1 text-left shadow-lg">
            <p className="px-3 py-1 text-[11px] text-slate-400">From</p>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="block w-full px-3 py-1.5 text-left text-[13px] text-slate-800 hover:bg-slate-50"
                onClick={() => {
                  setError("");
                  if (item.id === "desktop") {
                    setOpen(false);
                    onDesktop();
                    return;
                  }
                  setPicker(item.id);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {picker ? (
        <>
          <div className="fixed inset-0 z-10" onClick={closeAll} />
          <div className="absolute left-1/2 top-full z-20 mt-1 w-72 -translate-x-1/2 rounded-md border border-slate-200 bg-white p-2 text-left shadow-lg">
            <p className="px-2 py-1 text-[12px] font-semibold text-slate-700">
              {MENU.find((item) => item.id === picker)?.label}
            </p>
            {loading ? (
              <p className="px-2 py-3 text-[12px] text-slate-400">Loading…</p>
            ) : picker === "cloud" ? (
              <PickerList
                rows={cloud.map((doc) => ({
                  id: doc.id,
                  label: doc.fileName,
                  detail: doc.folder,
                }))}
                empty="No cloud files yet."
                busyId={busyId}
                onPick={(id) => {
                  const doc = cloud.find((row) => row.id === id);
                  if (doc) void addCloud(doc);
                }}
              />
            ) : picker === "templates" ? (
              <PickerList
                rows={templates.map((row) => ({
                  id: row.id,
                  label: row.documentName || row.documentFile || "Untitled template",
                }))}
                empty="No templates yet."
                busyId={busyId}
                onPick={(id) => {
                  const row = templates.find((item) => item.id === id);
                  if (row) void addTemplate(row);
                }}
              />
            ) : null}
            {error ? (
              <p className="px-2 py-1 text-[11px] text-rose-600">{error}</p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function PickerList({
  rows,
  empty,
  busyId,
  onPick,
}: {
  rows: { id: string; label: string; detail?: string }[];
  empty: string;
  busyId: string | null;
  onPick: (id: string) => void;
}) {
  if (!rows.length) {
    return <p className="px-2 py-3 text-[12px] text-slate-400">{empty}</p>;
  }
  return (
    <ul className="max-h-56 overflow-y-auto">
      {rows.map((row) => (
        <li key={row.id}>
          <button
            type="button"
            disabled={busyId === row.id}
            onClick={() => onPick(row.id)}
            className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-slate-50 disabled:opacity-50"
          >
            <span className="block truncate text-[13px] text-slate-800">
              {busyId === row.id ? "Adding…" : row.label}
            </span>
            {row.detail ? (
              <span className="block truncate text-[11px] text-slate-400">
                {row.detail}
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
