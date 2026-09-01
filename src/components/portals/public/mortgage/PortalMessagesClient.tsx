"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { InitialsAvatar } from "@/components/portals/public/mortgage/PortalBrand";
import { useMortgagePortal } from "@/components/portals/public/mortgage/useMortgagePortal";
import { formatMessageAt } from "@/lib/portals/mortgage";
import { cn } from "@/lib/utils";

export function PortalMessagesClient({ slug }: { slug: string }) {
  const { mortgage, update, logActivity, canWrite, isReadOnly } = useMortgagePortal(slug);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mortgage) return;
    if (!mortgage.messages.some((m) => m.unread)) return;
    update((prev) => ({
      ...prev,
      messages: prev.messages.map((m) => ({ ...m, unread: false })),
      notifications: prev.notifications.map((n) =>
        n.href === "messages" ? { ...n, read: true } : n,
      ),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mortgage?.messages.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mortgage?.messages.length]);

  if (!mortgage) return null;

  const { client, broker } = mortgage;
  const clientInitials = `${client.firstName[0] ?? ""}${client.lastName[0] ?? ""}`;

  function send() {
    const body = draft.trim();
    if (!body || !canWrite || isReadOnly) return;
    update((prev) => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          id: `out-${Date.now()}`,
          from: "client",
          name: `${prev.client.firstName} ${prev.client.lastName}`.trim(),
          body,
          at: new Date().toISOString(),
          unread: false,
        },
      ],
    }));
    logActivity("Sent a portal message");
    setDraft("");
  }

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col">
      <div className="mb-4">
        <h1 className="text-[24px] font-bold tracking-tight text-slate-900">Messages</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Chat with {broker.name} about your home loan.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <InitialsAvatar initials={broker.initials} />
          <div>
            <div className="text-[13px] font-bold text-slate-900">{broker.name}</div>
            <div className="text-[11px] text-slate-500">{broker.title}</div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {mortgage.messages.map((m) => {
            const mine = m.from === "client";
            return (
              <div key={m.id} className={cn("flex gap-2", mine && "flex-row-reverse")}>
                <InitialsAvatar
                  initials={mine ? clientInitials : broker.initials}
                  size="sm"
                  tone={mine ? "slate" : "purple"}
                />
                <div className={cn("max-w-[78%]", mine && "text-right")}>
                  <div
                    className={cn(
                      "inline-block rounded-2xl px-3.5 py-2 text-left text-[13px] leading-relaxed",
                      mine
                        ? "bg-[#5A32A3] text-white"
                        : "bg-slate-100 text-slate-800",
                    )}
                  >
                    {m.body}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    {formatMessageAt(m.at)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <form
          className="flex gap-2 border-t border-slate-100 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={isReadOnly ? "Read-only access" : "Write a message…"}
            disabled={isReadOnly || !canWrite}
            className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-[#5A32A3]"
          />
          <button
            type="submit"
            disabled={!draft.trim() || isReadOnly || !canWrite}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#5A32A3] px-3 text-[12px] font-semibold text-white disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
