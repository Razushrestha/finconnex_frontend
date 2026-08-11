"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  cancelPublicBooking,
  markBookingRescheduleIntent,
} from "@/lib/booking/actions";
import {
  getBookingByToken,
  getBookingPageBySlug,
  formatBookingWhen,
  publicBookUrl,
  publicRescheduleUrl,
  bookingLocationLabel,
  buildBookingIcs,
  downloadBookingIcs,
  googleCalendarUrl,
  outlookCalendarUrl,
  type Booking,
  type BookingPage,
} from "@/lib/booking/types";
import { CheckCircle2, XCircle, Calendar, Download, ExternalLink } from "lucide-react";

export function ManageBookingClient({
  slug,
  token,
}: {
  slug: string;
  token: string;
}) {
  const [booking, setBooking] = useState<Booking | null | undefined>(undefined);
  const [page, setPage] = useState<BookingPage | null>(null);
  const [done, setDone] = useState<"reschedule" | "cancel" | null>(null);

  useEffect(() => {
    const b = getBookingByToken(token) ?? null;
    setBooking(b);
    setPage(getBookingPageBySlug(slug) ?? null);
  }, [slug, token]);

  if (booking === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[13px] text-slate-400">
        Loading…
      </div>
    );
  }

  if (!booking || booking.pageSlug !== slug || !page) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <Calendar className="mb-3 h-10 w-10 text-slate-300" />
        <h1 className="text-lg font-bold text-slate-900">Link invalid</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          This manage link is expired or incorrect.
        </p>
      </div>
    );
  }

  if (done === "cancel" || booking.status === "Cancelled") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <XCircle className="mb-3 h-12 w-12 text-slate-400" />
        <h1 className="text-xl font-bold text-slate-900">Booking cancelled</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          {booking.guestName} · {page.title}
        </p>
        <p className="mt-2 text-[12px] text-slate-400">
          The slot is free again. Lead &amp; meeting updated in CRM.
        </p>
        <Link
          href={publicBookUrl(slug)}
          className="mt-6 text-[12px] font-semibold text-violet-700 hover:underline"
        >
          Book again
        </Link>
      </div>
    );
  }

  if (done === "reschedule") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-500" />
        <h1 className="text-xl font-bold text-slate-900">Ready to reschedule</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Your previous slot is released. Pick a new time - your details stay
          filled in.
        </p>
        <Link
          href={publicRescheduleUrl(slug, token)}
          className="mt-6 inline-flex h-10 items-center rounded-xl bg-violet-600 px-4 text-[12px] font-semibold text-white hover:bg-violet-700"
        >
          Choose new time
        </Link>
      </div>
    );
  }

  const location = bookingLocationLabel(page);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-semibold tracking-wide text-violet-600 uppercase">
          Manage booking
        </p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">{page.title}</h1>
        <p className="mt-2 text-[13px] text-slate-600">
          {formatBookingWhen(booking.start, booking.end)}
        </p>
        <p className="mt-1 text-[12px] text-slate-400">
          {booking.guestName} · {booking.guestEmail}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">{location}</p>
        <p className="mt-3 inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
          {booking.status}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <a
            href={googleCalendarUrl({
              title: page.title,
              details: booking.confirmationMessage || page.description,
              location,
              start: booking.start,
              end: booking.end,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            <ExternalLink className="h-3 w-3" />
            Google
          </a>
          <a
            href={outlookCalendarUrl({
              title: page.title,
              details: booking.confirmationMessage || page.description,
              location,
              start: booking.start,
              end: booking.end,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            <ExternalLink className="h-3 w-3" />
            Outlook
          </a>
          <button
            type="button"
            onClick={() =>
              downloadBookingIcs(
                `${page.slug}.ics`,
                buildBookingIcs({
                  title: page.title,
                  description: booking.confirmationMessage || page.description,
                  location,
                  start: booking.start,
                  end: booking.end,
                  guestEmail: booking.guestEmail,
                }),
              )
            }
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Download className="h-3 w-3" />
            .ics
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              markBookingRescheduleIntent(token);
              setDone("reschedule");
            }}
            className="h-10 rounded-xl bg-violet-600 text-[13px] font-semibold text-white hover:bg-violet-700"
          >
            Reschedule
          </button>
          <button
            type="button"
            onClick={() => {
              const cancelled = cancelPublicBooking(token);
              if (cancelled) setBooking(cancelled);
              setDone("cancel");
            }}
            className="h-10 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel booking
          </button>
        </div>
      </div>
    </div>
  );
}
