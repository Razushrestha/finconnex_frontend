"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, RotateCcw, Send, Tag, Trash2 } from "lucide-react";
import type { Email } from "@/lib/emails/types";
import {
  cancelCrmEmail,
  deleteCrmEmail,
  downloadCrmEmailAttachment,
  getCrmEmail,
  persistRemoteEmail,
  retryCrmEmail,
  sendCrmEmail,
  tryCrmEmail,
} from "@/lib/emails/api";
import { deleteEmail, findEmailById } from "@/lib/emails/store";
import { EmailAttachment } from "@/components/activities/emails/detail/EmailAttachment";
import { CrmProfileCard } from "@/components/activities/emails/detail/CrmProfileCard";
import { ActivityTimeline } from "@/components/activities/emails/detail/ActivityTimeline";
import { onRulesChange } from "@/lib/rules";

export function EmailDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [email, setEmail] = useState<Email | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    function load() {
      setEmail(findEmailById(id)?.email ?? null);
      setReady(true);
    }
    load();
    void tryCrmEmail(async () => {
      const remote = await getCrmEmail(id);
      if (remote) {
        persistRemoteEmail(remote);
        setEmail(findEmailById(id)?.email ?? remote);
      }
    });
    return onRulesChange(load);
  }, [id]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  async function runAction(
    action: () => Promise<Email | null>,
    okMsg: string,
  ) {
    if (busy) return;
    setBusy(true);
    const remote = await tryCrmEmail(action);
    if (remote) {
      persistRemoteEmail(remote);
      setEmail(findEmailById(id)?.email ?? remote);
      flash(okMsg);
    } else {
      flash("CRM action failed");
    }
    setBusy(false);
  }

  if (!ready) {
    return (
      <div className="flex min-h-[320px] items-center justify-center bg-background text-sm text-muted-foreground">
        Loading email…
      </div>
    );
  }

  if (!email) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center p-12 text-center">
        <h2 className="mb-2 text-lg font-bold text-slate-900">Email not found</h2>
        <button
          type="button"
          onClick={() => router.push("/activities/emails")}
          className="rounded-xl bg-[#5A32A3] px-4 py-2 text-xs font-medium text-white"
        >
          Back to Emails
        </button>
      </div>
    );
  }

  const initials = (email.relatedTo || email.to[0] || "EM")
    .replace(/^(Lead|Contact|Deal|Company):\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const timelineEvents = [
    ...(email.openedDate
      ? [{ id: "opened", title: "Email Opened", timestamp: email.openedDate }]
      : []),
    ...(email.sentDate
      ? [{ id: "sent", title: "Email Sent", timestamp: email.sentDate }]
      : []),
  ];

  return (
    <div className="relative flex h-screen bg-background text-foreground">
      {toast ? (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col border-r border-border">
        <div className="flex items-center justify-between border-b border-border bg-white px-6 py-4 backdrop-blur-md">
          <button
            type="button"
            onClick={() => router.push("/activities/emails")}
            className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Emails
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {email.status === "Draft" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void runAction(() => sendCrmEmail(email.id), "Sent")}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> Send
              </button>
            ) : null}
            {email.status === "Failed" || email.status === "Bounced" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void runAction(() => retryCrmEmail(email.id), "Retry queued")}
                className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" /> Retry
              </button>
            ) : null}
            {email.status === "Scheduled" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void runAction(() => cancelCrmEmail(email.id), "Cancelled")}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                <Ban className="h-4 w-4" /> Cancel
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!window.confirm(`Delete ${email.subject || "this email"}?`)) return;
                void (async () => {
                  setBusy(true);
                  await tryCrmEmail(() => deleteCrmEmail(email.id));
                  deleteEmail(email.id);
                  router.push("/activities/emails");
                })();
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-rose-600 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>

        <div className="space-y-4 border-b border-border bg-white p-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-card-foreground">
              {email.subject || "(no subject)"}
            </h1>
            {email.templateUsed ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Tag className="h-3 w-3" /> {email.templateUsed}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <span className="text-muted-foreground/70">From:</span>{" "}
              <span className="text-card-foreground">{email.from || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground/70">Sent Date:</span>{" "}
              <span className="text-card-foreground">{email.sentDate || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground/70">To:</span>{" "}
              <span className="text-card-foreground">
                {email.to.join(", ") || "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground/70">Status:</span>{" "}
              <span className="font-medium text-emerald-500">{email.status}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="max-w-3xl space-y-4 text-sm leading-relaxed text-card-foreground/90">
            <p className="whitespace-pre-wrap">{email.body}</p>
          </div>

          {email.attachments?.length ? (
            <div className="border-t border-border/80 pt-4">
              <h3 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Attachments ({email.attachments.length})
              </h3>
              <div className="space-y-2">
                {email.attachments.map((att) => (
                  <EmailAttachment
                    key={att.id}
                    name={att.name}
                    size={att.sizeLabel ?? "Download"}
                    onClick={() => {
                      void (async () => {
                        try {
                          const blob = await downloadCrmEmailAttachment(
                            email.id,
                            att.id,
                          );
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = att.name;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch (err) {
                          flash(
                            err instanceof Error
                              ? err.message
                              : "Download failed",
                          );
                        }
                      })();
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex w-80 flex-col gap-6 overflow-y-auto border-l border-border bg-white p-6">
        <div>
          <h3 className="mb-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Related CRM Profile
          </h3>
          <CrmProfileCard
            name={
              (email.relatedTo || email.to[0] || "Recipient").replace(
                /^(Lead|Contact|Deal|Company):\s*/i,
                "",
              )
            }
            initials={initials || "EM"}
            role={email.relatedType || "Client / Lead"}
            company="FinConnex"
            activeDeal={email.relatedTo || "—"}
          />
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Activity Timeline
          </h3>
          <ActivityTimeline events={timelineEvents} />
        </div>
      </div>
    </div>
  );
}
