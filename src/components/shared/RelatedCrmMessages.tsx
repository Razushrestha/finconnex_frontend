"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";
import { isUuid } from "@/lib/activity-timeline/auth";
import {
  createCrmMessage,
  CRM_SMS_TO_NUMBER,
  listRelatedCrmMessages,
  persistRemoteMessage,
} from "@/lib/messages/api";
import { listMessages } from "@/lib/messages/store";
import type { Message } from "@/lib/messages/types";
import { cn } from "@/lib/utils";

export function RelatedCrmMessages({
  relatedTo,
  relatedType,
  relatedId,
  to,
  compact,
  onNotify,
}: {
  relatedTo: string;
  relatedType: string;
  relatedId: string;
  to?: string;
  compact?: boolean;
  onNotify?: (message: string) => void;
}) {
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Message[]>([]);

  const liveParent = isUuid(relatedId);

  useEffect(() => {
    if (!liveParent) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void listRelatedCrmMessages(relatedType, relatedId)
      .then((items) => {
        if (cancelled) return;
        for (const row of items) {
          persistRemoteMessage({
            ...row,
            relatedTo: relatedTo || row.relatedTo,
            relatedType,
            relatedId,
          });
        }
        setRows(items);
        setRevision((n) => n + 1);
      })
      .catch((err) => {
        if (!cancelled) {
          onNotify?.(err instanceof Error ? err.message : "Could not load messages");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when the CRM parent changes
  }, [liveParent, relatedType, relatedId, relatedTo]);

  const messages = useMemo(() => {
    void revision;
    if (rows.length) return rows;
    return listMessages().filter(
      (row) =>
        row.relatedId === relatedId ||
        (row.relatedTo &&
          relatedTo &&
          row.relatedTo.toLowerCase() === relatedTo.toLowerCase()),
    );
  }, [relatedId, relatedTo, revision, rows]);

  async function send() {
    const body = draft.trim();
    if (!body) return;
    try {
      const twilioRes = await fetch("/api/auth/sms", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, channel: "sms" }),
      });
      const twilioJson = (await twilioRes.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!twilioRes.ok) {
        throw new Error(twilioJson.error || "Twilio did not send the SMS.");
      }
      if (liveParent) {
        const created = persistRemoteMessage(
          await createCrmMessage({
            type: "External",
            subject: body.slice(0, 72) || "Message",
            body,
            to: CRM_SMS_TO_NUMBER,
            relatedType,
            relatedId,
            channel: "SMS",
            send: false,
          }),
        );
        if (created) {
          setRows((prev) => [created, ...prev.filter((row) => row.id !== created.id)]);
        }
      }
      setDraft("");
      setRevision((n) => n + 1);
      onNotify?.(`SMS queued to ${CRM_SMS_TO_NUMBER}`);
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : "Could not send message");
    }
  }

  return (
    <div className={cn(!compact && "rounded-2xl border border-slate-200 bg-white p-4")}>
      {!compact ? (
        <p className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
          <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
          Messages
        </p>
      ) : null}
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={`SMS to ${CRM_SMS_TO_NUMBER} from +17372212163…`}
        rows={3}
        className="min-h-[72px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-[12px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-300"
      />
      <button
        type="button"
        disabled={!draft.trim()}
        onClick={() => void send()}
        className={cn(
          "mt-2 h-8 rounded-lg px-3 text-[11px] font-semibold disabled:opacity-40",
          compact
            ? "w-full bg-white text-[#5A32A3] ring-1 ring-slate-200 hover:bg-[#F3ECFB]"
            : "bg-[#5A32A3] text-white hover:bg-[#4a2888]",
        )}
      >
        Send message
      </button>
      <ul className="mt-3 space-y-2">
        {loading && liveParent ? (
          <li className="text-[12px] text-slate-400">Loading messages…</li>
        ) : messages.length === 0 ? (
          <li className="text-[12px] text-slate-400">No messages yet.</li>
        ) : (
          messages.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-slate-200 bg-white p-2.5"
            >
              <p className="text-[12px] font-semibold text-slate-800">
                {row.subject}
              </p>
              {row.body ? (
                <p className="mt-0.5 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-600">
                  {row.body}
                </p>
              ) : null}
              <p className="mt-1 text-[10px] text-slate-400">
                {row.status}
                {row.sentDate ? ` · ${row.sentDate}` : ""}
                {row.to ? ` · To ${row.to}` : ""}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
