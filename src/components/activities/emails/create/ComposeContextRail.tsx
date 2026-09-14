"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Home,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  loadComposeContext,
  type ComposeContactProfile,
  type RecentCommItem,
  type RecentCommKind,
} from "@/lib/emails/compose-context";
import type { RelatedRecord } from "@/lib/emails/related-records";

interface ComposeContextRailProps {
  recipientName?: string;
  recipientEmail?: string;
}

function commIcon(kind: RecentCommKind) {
  if (kind === "sms") return MessageSquare;
  if (kind === "call") return Phone;
  if (kind === "document") return FileText;
  return Mail;
}

export function ComposeContextRail({
  recipientName,
  recipientEmail,
}: ComposeContextRailProps) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ComposeContactProfile | null>(null);
  const [related, setRelated] = useState<RelatedRecord[]>([]);
  const [comms, setComms] = useState<RecentCommItem[]>([]);

  useEffect(() => {
    let alive = true;
    const name = recipientName?.trim() ?? "";
    const email = recipientEmail?.trim() ?? "";
    if (!name && !email) {
      setLoading(false);
      setProfile(null);
      setRelated([]);
      setComms([]);
      return;
    }
    setLoading(true);
    void loadComposeContext(name, email)
      .then((snapshot) => {
        if (!alive) return;
        setProfile(snapshot.profile);
        setRelated(snapshot.related);
        setComms(snapshot.comms);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [recipientName, recipientEmail]);

  const initials = (profile?.name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const grouped = comms.reduce<Record<string, RecentCommItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <aside className="hidden h-full min-h-0 overflow-y-auto border-l border-slate-200 bg-[#F7F6FA] p-2 lg:flex lg:flex-col lg:gap-2">
      <section className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
        <h2 className="mb-2 text-[12px] font-semibold text-slate-800">Contact Overview</h2>
        {loading ? (
          <p className="text-[11px] text-slate-400">Loading contact…</p>
        ) : !profile ? (
          <p className="text-[11px] leading-4 text-slate-500">
            Add a recipient to load live CRM contact details.
          </p>
        ) : (
          <>
            <div className="mb-1.5 flex items-center gap-2">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                style={{ backgroundColor: "#5A32A3" }}
              >
                {initials || "?"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-slate-800">
                  {profile.name}
                </p>
                {profile.tags.length > 0 ? (
                  <p className="truncate text-[10px] text-slate-500">
                    {profile.tags.join(" · ")}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mb-2 space-y-1 text-[11px] text-slate-600">
              {profile.email ? (
                <p className="flex items-center gap-1.5">
                  <Mail className="h-3 w-3 text-slate-400" />
                  <span className="truncate">{profile.email}</span>
                </p>
              ) : null}
              {profile.phone ? (
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-slate-400" />
                  {profile.phone}
                </p>
              ) : null}
              {profile.location ? (
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  {profile.location}
                </p>
              ) : null}
            </div>
            {profile.engagement != null || comms[0] ? (
              <div className="mb-2 rounded-md bg-emerald-50 px-2 py-1.5">
                {profile.engagement != null ? (
                  <div className="flex items-baseline justify-between">
                    <p className="text-[9px] font-semibold tracking-wide text-emerald-800 uppercase">
                      Engagement
                    </p>
                    <p className="text-[12px] font-bold text-emerald-700">
                      {profile.engagement}
                    </p>
                  </div>
                ) : null}
                {comms[0] ? (
                  <p className="text-[10px] text-emerald-800/80">
                    Last contact: {comms[0].group}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="grid grid-cols-3 gap-1">
              <Link
                href="/activities/calls/create"
                className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Phone className="h-3 w-3" />
                Call
              </Link>
              <Link
                href="/activities/messages/create"
                className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                <MessageSquare className="h-3 w-3" />
                SMS
              </Link>
              <Link
                href={profile.href}
                className="inline-flex h-7 items-center justify-center rounded-md border border-slate-200 text-[10px] font-semibold text-[#5A32A3] hover:bg-violet-50"
              >
                View Contact
              </Link>
            </div>
          </>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
        <h2 className="mb-1.5 text-[12px] font-semibold text-slate-800">
          Related
          {related.length > 0 ? (
            <span className="ml-1 text-[11px] font-medium text-slate-400">{related.length}</span>
          ) : null}
        </h2>
        {loading ? (
          <p className="text-[11px] text-slate-400">Loading related records…</p>
        ) : related.length === 0 ? (
          <p className="text-[11px] leading-4 text-slate-500">
            No live deals or leads are linked to this contact.
          </p>
        ) : (
          <div className="space-y-1.5">
            {related.map((item) => (
              <div
                key={`${item.kind}-${item.id}`}
                className="rounded-md border border-slate-100 bg-slate-50/70 px-2 py-1.5"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#F3ECFB] text-[#5A32A3]">
                    {item.kind === "deal" ? <Home className="h-3 w-3" /> : <UserRound className="h-3 w-3" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex rounded px-1 py-px text-[8px] font-bold tracking-wide uppercase",
                          item.kind === "deal" ? "bg-violet-50 text-[#5A32A3]" : "bg-sky-50 text-sky-700",
                        )}
                      >
                        {item.kind === "deal" ? "Deal" : "Lead"}
                      </span>
                      <p className="min-w-0 truncate text-[12px] font-semibold text-slate-800">
                        {item.title}
                      </p>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="truncate text-[11px] text-slate-500">Stage: {item.stage}</p>
                      <Link
                        href={item.href}
                        className="shrink-0 text-[11px] font-semibold text-[#5A32A3] hover:underline"
                      >
                        {item.kind === "deal" ? "View Deal" : "View Lead"} →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h2 className="text-[12px] font-semibold text-slate-800">Recent Communication</h2>
          <Link href="/activities/emails" className="shrink-0 text-[10px] font-semibold text-[#5A32A3] hover:underline">
            View conversation →
          </Link>
        </div>
        {loading ? (
          <p className="text-[11px] text-slate-400">Loading activity…</p>
        ) : comms.length === 0 ? (
          <p className="text-[11px] leading-4 text-slate-500">
            No live emails, calls, or messages for this contact yet.
          </p>
        ) : (
          <div className="space-y-2">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <p className="mb-0.5 text-[9px] font-semibold tracking-wide text-slate-400 uppercase">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = commIcon(item.kind);
                    return (
                      <div key={item.id} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <Icon className="h-3 w-3 shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1 truncate">{item.title}</span>
                        {item.time ? (
                          <span className="shrink-0 text-[10px] text-slate-400">{item.time}</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}
