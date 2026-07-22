"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  Plus,
  Search,
  CalendarClock,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Eye,
  CheckCircle2,
  FileEdit,
} from "lucide-react";
import {
  bookingPages as seedPages,
  bookings as seedBookings,
  publicBookUrl,
  formatBookingWhen,
  type BookingPage,
  type BookingPageStatus,
  type Booking,
} from "@/lib/booking/types";
import { cn } from "@/lib/utils";

type Tab = "Pages" | "Bookings" | "Analytics";

export default function BookingPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Pages");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingPageStatus | "All">(
    "All",
  );
  const [pages] = useState(seedPages);
  const [bookings] = useState(seedBookings);
  const [copied, setCopied] = useState<string | null>(null);

  const filteredPages = useMemo(() => {
    let data: BookingPage[] = pages;
    if (statusFilter !== "All") {
      data = data.filter((p) => p.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.owner.toLowerCase().includes(q) ||
          p.eventType.toLowerCase().includes(q),
      );
    }
    return data;
  }, [pages, search, statusFilter]);

  const filteredBookings = useMemo(() => {
    let data: Booking[] = bookings;
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (b) =>
          b.guestName.toLowerCase().includes(q) ||
          b.guestEmail.toLowerCase().includes(q) ||
          b.pageSlug.toLowerCase().includes(q),
      );
    }
    return data;
  }, [bookings, search]);

  const analytics = useMemo(() => {
    const views = pages.reduce((s, p) => s + p.views, 0);
    const totalBookings = pages.reduce((s, p) => s + p.bookingsCount, 0);
    const live = pages.filter((p) => p.status === "Live").length;
    const cancelled = bookings.filter((b) => b.status === "Cancelled").length;
    const cancelRate =
      bookings.length === 0
        ? 0
        : Math.round((cancelled / bookings.length) * 100);
    return { views, totalBookings, live, cancelRate };
  }, [pages, bookings]);

  function copyLink(slug: string) {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}${publicBookUrl(slug)}`;
    void navigator.clipboard?.writeText(url);
    setCopied(slug);
    window.setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />

      <div className="relative mx-auto flex max-w-[1400px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <nav className="flex items-center gap-1 text-[10px] text-slate-400">
              <Link
                href="/"
                className="flex items-center gap-0.5 transition-colors hover:text-slate-600"
              >
                <Home className="h-3 w-3" />
                Home
              </Link>
              <span>/</span>
            </nav>
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              Booking
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
              <CalendarClock className="h-2.5 w-2.5" />
              Self-serve
            </span>
            <span className="hidden text-[11px] text-slate-400 sm:inline">
              · Public links for calls &amp; appointments
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/booking/create?layoutid=standard&redirect=false",
              )
            }
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 transition-all hover:bg-violet-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Create page
          </button>
        </div>

        {/* ONE surface */}
        <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:px-4">
            <div className="flex items-center gap-0.5 rounded-lg bg-slate-50 p-0.5">
              {(["Pages", "Bookings", "Analytics"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all",
                    tab === t
                      ? "bg-white text-violet-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {tab === "Pages" ? (
                <div className="flex items-center gap-0.5 rounded-lg bg-slate-50 p-0.5">
                  {(["All", "Live", "Draft"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusFilter(s)}
                      className={cn(
                        "rounded-md px-2 py-1 text-[10px] font-semibold transition-all",
                        statusFilter === s
                          ? "bg-violet-600 text-white"
                          : "text-slate-500 hover:text-slate-700",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    tab === "Bookings" ? "Search guests…" : "Search pages…"
                  }
                  className="h-8 w-40 rounded-lg border border-slate-200/90 bg-white pr-2.5 pl-8 text-[11px] outline-none transition-all hover:border-violet-300 focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)] sm:w-52"
                />
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {tab === "Pages" ? (
              <PagesTable
                pages={filteredPages}
                copied={copied}
                onCopy={copyLink}
                onEdit={(id) => router.push(`/booking/${id}`)}
              />
            ) : null}
            {tab === "Bookings" ? (
              <BookingsTable bookings={filteredBookings} />
            ) : null}
            {tab === "Analytics" ? (
              <AnalyticsPanel analytics={analytics} pages={pages} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function PagesTable({
  pages,
  copied,
  onCopy,
  onEdit,
}: {
  pages: BookingPage[];
  copied: string | null;
  onCopy: (slug: string) => void;
  onEdit: (id: string) => void;
}) {
  return (
    <table className="w-full min-w-[900px] text-left text-[12px]">
      <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
        <tr>
          <th className="px-4 py-2.5">Page</th>
          <th className="px-4 py-2.5">Type</th>
          <th className="px-4 py-2.5">Duration</th>
          <th className="px-4 py-2.5">Owner</th>
          <th className="px-4 py-2.5">Status</th>
          <th className="px-4 py-2.5">Bookings</th>
          <th className="px-4 py-2.5 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {pages.map((p) => (
          <tr
            key={p.id}
            className="transition-colors hover:bg-violet-50/40"
          >
            <td className="px-4 py-3">
              <p className="font-semibold text-slate-900">{p.title}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                /book/{p.slug}
              </p>
            </td>
            <td className="px-4 py-3 text-slate-600">{p.eventType}</td>
            <td className="px-4 py-3 text-slate-600">
              {p.durationMinutes} min
            </td>
            <td className="px-4 py-3 text-slate-600">{p.owner}</td>
            <td className="px-4 py-3">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  p.status === "Live"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-600",
                )}
              >
                {p.status === "Live" ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <FileEdit className="h-3 w-3" />
                )}
                {p.status}
              </span>
            </td>
            <td className="px-4 py-3 tabular-nums text-slate-600">
              {p.bookingsCount}
              <span className="ml-1 text-[10px] text-slate-400">
                · {p.views} views
              </span>
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => onCopy(p.slug)}
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                  title="Copy public link"
                >
                  <Copy className="h-3 w-3" />
                  {copied === p.slug ? "Copied" : "Copy"}
                </button>
                <Link
                  href={publicBookUrl(p.slug)}
                  target="_blank"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50"
                  title="Open public page"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => onEdit(p.id)}
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-semibold text-violet-700 hover:bg-violet-50"
                >
                  Edit
                </button>
              </div>
            </td>
          </tr>
        ))}
        {pages.length === 0 ? (
          <tr>
            <td
              colSpan={7}
              className="px-4 py-16 text-center text-sm text-slate-400"
            >
              No booking pages match your filters.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

function BookingsTable({ bookings }: { bookings: Booking[] }) {
  const statusStyle: Record<string, string> = {
    Confirmed: "bg-sky-50 text-sky-700",
    Rescheduled: "bg-violet-50 text-violet-700",
    Cancelled: "bg-slate-100 text-slate-600",
    Completed: "bg-emerald-50 text-emerald-700",
  };

  return (
    <table className="w-full min-w-[900px] text-left text-[12px]">
      <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
        <tr>
          <th className="px-4 py-2.5">Guest</th>
          <th className="px-4 py-2.5">Page</th>
          <th className="px-4 py-2.5">When</th>
          <th className="px-4 py-2.5">Type</th>
          <th className="px-4 py-2.5">Status</th>
          <th className="px-4 py-2.5">Lead</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {bookings.map((b) => (
          <tr key={b.id} className="transition-colors hover:bg-violet-50/40">
            <td className="px-4 py-3">
              <p className="font-semibold text-slate-900">{b.guestName}</p>
              <p className="text-[11px] text-slate-400">{b.guestEmail}</p>
            </td>
            <td className="px-4 py-3 text-slate-600">/{b.pageSlug}</td>
            <td className="px-4 py-3 whitespace-nowrap text-slate-600">
              {formatBookingWhen(b.start, b.end)}
            </td>
            <td className="px-4 py-3 text-slate-600">{b.eventType}</td>
            <td className="px-4 py-3">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  statusStyle[b.status],
                )}
              >
                {b.status}
              </span>
            </td>
            <td className="px-4 py-3 text-[11px] text-slate-500">
              {b.createdLead ? "Created" : "—"}
            </td>
          </tr>
        ))}
        {bookings.length === 0 ? (
          <tr>
            <td
              colSpan={6}
              className="px-4 py-16 text-center text-sm text-slate-400"
            >
              No bookings yet.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

function AnalyticsPanel({
  analytics,
  pages,
}: {
  analytics: {
    views: number;
    totalBookings: number;
    live: number;
    cancelRate: number;
  };
  pages: BookingPage[];
}) {
  const stats = [
    { label: "Page views", value: analytics.views, icon: Eye },
    { label: "Bookings", value: analytics.totalBookings, icon: CheckCircle2 },
    { label: "Live pages", value: analytics.live, icon: CalendarClock },
    {
      label: "Cancel rate",
      value: `${analytics.cancelRate}%`,
      icon: MoreHorizontal,
    },
  ];

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
          >
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
              <s.icon className="h-3 w-3" />
              {s.label}
            </div>
            <p className="text-xl font-bold tabular-nums text-slate-900">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
        By page
      </p>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
        {pages.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
          >
            <div>
              <p className="text-[13px] font-semibold text-slate-900">
                {p.title}
              </p>
              <p className="text-[11px] text-slate-400">/{p.slug}</p>
            </div>
            <div className="flex gap-4 text-[11px] text-slate-500">
              <span>
                <span className="font-semibold text-slate-800">{p.views}</span>{" "}
                views
              </span>
              <span>
                <span className="font-semibold text-slate-800">
                  {p.bookingsCount}
                </span>{" "}
                bookings
              </span>
              <span>
                <span className="font-semibold text-slate-800">
                  {p.cancelRate}%
                </span>{" "}
                cancel
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
