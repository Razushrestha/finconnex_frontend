"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicProvideSession } from "@/lib/documents/requests/public-provide";

export function ProvideDocumentsClient({
  token,
  session,
}: {
  token: string;
  session: PublicProvideSession;
}) {
  const [done, setDone] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uploadFor = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = useMemo(
    () => session.items.filter((item) => !done[item.id]).length,
    [session.items, done],
  );

  function openPicker(itemId: string) {
    uploadFor.current = itemId;
    setError(null);
    inputRef.current?.click();
  }

  async function onFile(file: File | undefined) {
    const itemId = uploadFor.current;
    uploadFor.current = null;
    if (!file || !itemId) return;
    setBusyId(itemId);
    setError(null);
    try {
      const body = new FormData();
      body.set("itemId", itemId);
      body.set("file", file);
      const res = await fetch(
        `/api/provide/${encodeURIComponent(token)}/upload`,
        { method: "POST", body },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        filename?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Upload failed. Try again.");
      }
      setDone((prev) => ({
        ...prev,
        [itemId]: data.filename || file.name,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-slate-50 px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-[#5A32A3] uppercase">
          Document request
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
          {session.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Hi {session.clientName.split(/\s+/)[0] || "there"},{" "}
          <strong>{session.brokerName}</strong> asked you to provide the
          documents below
          {session.dueDate ? (
            <>
              {" "}
              by <strong>{session.dueDate}</strong>
            </>
          ) : null}
          .
        </p>
        {session.notes ? (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {session.notes}
          </p>
        ) : null}

        <ul className="mt-6 space-y-3">
          {session.items.map((item, index) => {
            const uploaded = done[item.id];
            const busy = busyId === item.id;
            return (
              <li
                key={item.id}
                className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-3"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-50 text-xs font-semibold text-violet-700">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {item.title}
                  </p>
                  {item.description ? (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.description}
                    </p>
                  ) : null}
                  {uploaded ? (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Sent: {uploaded}
                    </p>
                  ) : (
                    <button
                      type="button"
                      disabled={busy || Boolean(busyId)}
                      onClick={() => openPicker(item.id)}
                      className={cn(
                        "mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#5A32A3] px-3 py-1.5 text-xs font-semibold text-white",
                        "disabled:opacity-50",
                      )}
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {busy ? "Uploading…" : "Upload file"}
                    </button>
                  )}
                </div>
                <FileText className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
              </li>
            );
          })}
        </ul>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {remaining === 0 ? (
          <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Thanks — all requested documents were sent to {session.brokerName}.
          </p>
        ) : (
          <p className="mt-6 text-xs text-slate-500">
            {remaining} document{remaining === 1 ? "" : "s"} still needed.
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx,image/*,application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void onFile(file);
        }}
      />
    </div>
  );
}
