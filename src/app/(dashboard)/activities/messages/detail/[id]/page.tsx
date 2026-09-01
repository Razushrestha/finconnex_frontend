"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ActivityTimelineButton } from "@/components/activities/ActivityTimelineButton";
import type { Message } from "@/lib/messages/types";
import { findMessageById } from "@/lib/messages/store";
import { onRulesChange } from "@/lib/rules";
import { useModuleBack } from "@/hooks/useModuleBack";
import { PAGE_FRAME } from "@/lib/layout";

export default function MessageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const back = useModuleBack("/activities/messages", "Back to Messages");
  const [message, setMessage] = useState<Message | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function load() {
      setMessage(findMessageById(id)?.message ?? null);
      setReady(true);
    }
    load();
    return onRulesChange(load);
  }, [id]);

  if (!ready) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-4">
        <p className="text-sm text-slate-500">Loading message…</p>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">
            Message not found
          </p>
          <Link
            href={back.href}
            className="mt-3 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            {back.label}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${PAGE_FRAME} min-h-full bg-white`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href={back.href}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {back.label}
        </Link>
        <ActivityTimelineButton
          href={`/activities/messages/detail/${message.id}/timeline`}
        />
      </div>

      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
            {message.type}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
            {message.status}
          </span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          {message.subject}
        </h1>
        <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              From
            </dt>
            <dd className="mt-1 text-[13px] text-slate-800">{message.from}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              To
            </dt>
            <dd className="mt-1 text-[13px] text-slate-800">{message.to}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Sent
            </dt>
            <dd className="mt-1 text-[13px] text-slate-800">
              {message.sentDate || "—"}
            </dd>
          </div>
          {message.relatedTo ? (
            <div>
              <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Related to
              </dt>
              <dd className="mt-1 text-[13px] text-slate-800">
                {message.relatedTo}
              </dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            Message
          </p>
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-slate-700">
            {message.body}
          </p>
        </div>
      </div>
    </div>
  );
}
