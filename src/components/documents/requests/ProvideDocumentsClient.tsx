"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, FileText, Loader2 } from "lucide-react";
import type { PublicProvideSession } from "@/lib/documents/requests/public-provide";

const SEND_BUTTON_STYLE = {
  backgroundColor: "var(--primary, #5A32A3)",
  color: "#ffffff",
} as const;

export function ProvideDocumentsClient({
  token,
  session,
}: {
  token: string;
  session: PublicProvideSession;
}) {
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [sent, setSent] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missing = useMemo(
    () => session.items.filter((item) => !files[item.id]).length,
    [session.items, files],
  );

  async function onSend() {
    if (missing > 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      for (const item of session.items) {
        const file = files[item.id];
        if (!file) continue;
        body.append("itemId", item.id);
        body.append("file", file);
      }
      const res = await fetch(
        `/api/provide/${encodeURIComponent(token)}/submit`,
        { method: "POST", body },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        files?: Array<{ fileName?: string }>;
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not send the documents. Try again.");
      }
      setSent(
        (data.files ?? [])
          .map((file) => file.fileName || "")
          .filter(Boolean),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the documents.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="mx-auto min-h-screen max-w-lg bg-white px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Documents sent
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
            {session.title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Thanks — {session.brokerName} can now review these files.
          </p>
          <ul className="mt-4 space-y-1 text-sm text-slate-700">
            {sent.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-white px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--brand-primary)] uppercase">
          Document request
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
          {session.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Hi {session.clientName.split(/\s+/)[0] || "there"},{" "}
          <strong>{session.brokerName}</strong> asked you to upload the
          documents below
          {session.dueDate ? (
            <>
              {" "}
              by <strong>{session.dueDate}</strong>
            </>
          ) : null}
          . Choose a file for each one, then press Send.
        </p>
        {session.notes ? (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {session.notes}
          </p>
        ) : null}

        <ul className="mt-6 space-y-3">
          {session.items.map((item, index) => {
            const file = files[item.id];
            return (
              <li
                key={item.id}
                className="rounded-xl border border-slate-200 px-3 py-3"
              >
                <div className="flex items-start gap-3">
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
                    <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600 hover:border-[var(--brand-primary)]">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="min-w-0 truncate">
                        {file ? file.name : "Choose file"}
                      </span>
                      <input
                        type="file"
                        className="sr-only"
                        accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx,image/*,application/pdf"
                        onChange={(event) => {
                          const next = event.target.files?.[0];
                          setFiles((prev) => ({ ...prev, [item.id]: next }));
                          setError(null);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={busy || missing > 0}
          onClick={() => void onSend()}
          style={SEND_BUTTON_STYLE}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? "Sending…" : "Send"}
        </button>
        <p className="mt-3 text-xs text-slate-500">
          {missing === 0
            ? "All documents are ready to send."
            : `${missing} document${missing === 1 ? "" : "s"} still needed.`}
        </p>
      </div>
    </div>
  );
}
