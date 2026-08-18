"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { initials, avatarColor } from "@/lib/activities/shared";

interface CallTranscriptProps {
  notes?: string;
  agenda?: string;
  purpose?: string;
  assignedTo: string;
  contactName?: string;
  onSaveNotes: (notes: string) => boolean;
}

export function CallTranscriptSection({
  notes,
  agenda,
  purpose,
  assignedTo,
  contactName,
  onSaveNotes,
}: CallTranscriptProps) {
  const [activeTab, setActiveTab] = useState<"transcript" | "notes">(
    "transcript",
  );
  const [draft, setDraft] = useState(notes ?? "");
  const [saved, setSaved] = useState(notes ?? "");
  const [feedback, setFeedback] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    const next = notes ?? "";
    setDraft((current) => (current === saved ? next : current));
    setSaved(next);
  }, [notes]);

  const other = contactName || "Contact";
  const hasChanges = draft !== saved;

  function handleSave() {
    const next = draft.trim();
    const ok = onSaveNotes(next);
    if (ok) {
      setDraft(next);
      setSaved(next);
      setFeedback("saved");
      window.setTimeout(() => setFeedback("idle"), 2500);
      return;
    }
    setFeedback("error");
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="mb-6 flex gap-6 border-b border-slate-100">
        {(
          [
            ["transcript", "Transcript"],
            ["notes", "Notes & log"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              "relative pb-3 text-sm font-semibold transition-colors",
              activeTab === key
                ? "text-[#5A32A3]"
                : "text-slate-400 hover:text-slate-700",
            )}
          >
            {label}
            {activeTab === key ? (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#5A32A3]" />
            ) : null}
          </button>
        ))}
      </div>

      {activeTab === "transcript" ? (
        <div className="space-y-5">
          <Bubble
            name={assignedTo}
            time="00:00"
            text={`Hi ${other.split(" ")[0]}, following up regarding the scheduled call details and requirements discussed previously.`}
            self
          />
          {saved ? <Bubble name={other} time="00:18" text={saved} /> : null}
          {agenda ? (
            <Bubble
              name={assignedTo}
              time="00:42"
              text={`Agenda for today: ${agenda}`}
              self
            />
          ) : null}
          <div className="pt-2 text-center">
            <span className="inline-block rounded-full bg-[#F3ECFB] px-4 py-1 text-[11px] font-semibold text-[#5A32A3]">
              Call logged
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {purpose || agenda ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {purpose ? <Brief label="Purpose" body={purpose} /> : null}
              {agenda ? <Brief label="Agenda" body={agenda} /> : null}
            </div>
          ) : null}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Notes
            </label>
            <textarea
              rows={6}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setFeedback("idle");
              }}
              placeholder="Log what was discussed, decisions, and follow-ups…"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#5A32A3]/40 focus:bg-white focus:ring-2 focus:ring-[#5A32A3]/15"
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            {feedback === "saved" ? (
              <p className="text-xs font-medium text-emerald-600">Notes saved</p>
            ) : null}
            {feedback === "error" ? (
              <p className="text-xs font-medium text-rose-600">
                Could not save notes. Try again.
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              className="h-9 rounded-lg bg-[#5A32A3] px-4 text-xs font-semibold text-white hover:opacity-90"
            >
              {hasChanges ? "Save notes" : "Saved"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Bubble({
  name,
  time,
  text,
  self,
}: {
  name: string;
  time: string;
  text: string;
  self?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
          self ? "bg-[#F3ECFB] text-[#5A32A3]" : avatarColor(name),
        )}
      >
        {initials(name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-800">{name}</span>
          <span className="font-mono text-[11px] text-slate-400">{time}</span>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 text-xs leading-relaxed text-slate-700">
          {text}
        </div>
      </div>
    </div>
  );
}

function Brief({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-xl border border-[#5A32A3]/12 bg-[#F3ECFB]/40 p-3.5">
      <p className="text-[10px] font-bold tracking-wider text-[#5A32A3] uppercase">
        {label}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-700">{body}</p>
    </div>
  );
}
