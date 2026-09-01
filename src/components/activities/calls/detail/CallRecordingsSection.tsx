"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import type { Call } from "@/lib/calls/types";
import {
  callHasPlayableRecording,
  callPlacedBy,
  callPlacedByCaption,
  listRelatedCallRecordings,
  parseCallDurationSeconds,
} from "@/lib/calls/store";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";
import { CallAudioPlayerSection } from "./CallAudioPlayerSection";

function formatClock(total: number) {
  const safe = Math.max(0, Math.floor(total));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CallRecordingsSection({ call }: { call: Call }) {
  const previous = useMemo(() => listRelatedCallRecordings(call), [call]);
  const currentPlayable = callHasPlayableRecording(call);
  const catalog = useMemo(() => {
    const items: { source: Call; isCurrent: boolean }[] = [];
    if (currentPlayable) items.push({ source: call, isCurrent: true });
    for (const item of previous) items.push({ source: item, isCurrent: false });
    return items;
  }, [call, currentPlayable, previous]);

  const [selectedId, setSelectedId] = useState<string | null>(
    catalog[0]?.source.id ?? null,
  );
  const catalogKey = catalog.map((item) => item.source.id).join(",");

  useEffect(() => {
    setSelectedId(catalog[0]?.source.id ?? null);
  }, [call.id, catalogKey]);

  const selected =
    catalog.find((item) => item.source.id === selectedId) ?? catalog[0];

  if (catalog.length === 0) return null;

  const selectedSeconds = selected
    ? parseCallDurationSeconds(selected.source)
    : 0;

  return (
    <section className="border-b border-slate-100 py-7">
      <h2 className="mb-3 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
        Recording
      </h2>
      {selected ? (
        <CallAudioPlayerSection
          recordingId={selected.source.id}
          durationSeconds={selectedSeconds}
          hasRecording={selectedSeconds > 0}
          label={
            selected.isCurrent
              ? "This call"
              : selected.source.subject
          }
          calledBy={callPlacedByCaption(selected.source)}
        />
      ) : null}

      {previous.length > 0 ? (
        <div className="mt-5 space-y-2">
          <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            Previous recordings
          </p>
          {previous.map((item) => {
            const seconds = parseCallDurationSeconds(item);
            const active = selected?.source.id === item.id;
            return (
              <div key={item.id} className="flex items-center gap-3 py-1">
                <button
                  type="button"
                  title={`Play ${item.subject}`}
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    active
                      ? "bg-[#5A32A3] text-white"
                      : "bg-slate-100 text-slate-500 hover:text-[#5A32A3]",
                  )}
                >
                  <Play className="ml-0.5 h-3 w-3 fill-current" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-medium text-slate-800">
                    {item.subject}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-400">
                    <span>
                      {item.date} · {formatClock(seconds)}
                    </span>
                    <span aria-hidden>·</span>
                    <span
                      className={cn(
                        "inline-flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold",
                        avatarColor(callPlacedBy(item)),
                      )}
                    >
                      {initials(callPlacedBy(item))}
                    </span>
                    <span>{callPlacedByCaption(item)}</span>
                  </p>
                </button>
                <Link
                  href={`/activities/calls/detail/${encodeURIComponent(item.id)}`}
                  className="shrink-0 text-xs font-medium text-[#5A32A3] hover:underline"
                >
                  Open
                </Link>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
