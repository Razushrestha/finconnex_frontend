"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  getBookingByToken,
  getBookingPageBySlug,
  formatBookingWhen,
  publicBookUrl,
  type Booking,
} from "@/lib/booking/types";
import { CheckCircle2, XCircle, Calendar } from "lucide-react";

function resolveBooking(token: string): Booking | undefined {
  const fromSeed = getBookingByToken(token);
  if (fromSeed) return fromSeed;
  try {
    const raw = sessionStorage.getItem(`booking:${token}`);
    if (raw) return JSON.parse(raw) as Booking;
  } catch {
    /* ignore */
  }
  return undefined;
}

export function ManageBookingClient({
  slug,
  token,
}: {
  slug: string;
  token: string;
}) {
  const booking = useMemo(() => resolveBooking(token), [token]);
  const page = getBookingPageBySlug(slug);
  const [status, setStatus] = useState(booking?.status ?? "Confirmed");
  const [done, setDone] = useState<"reschedule" | "cancel" | null>(null);

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

  if (done === "cancel" || status === "Cancelled") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <XCircle className="mb-3 h-12 w-12 text-slate-400" />
        <h1 className="text-xl font-bold text-slate-900">Booking cancelled</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          {booking.guestName} · {page.title}
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
          Pick a new time on the booking page.
        </p>
        <Link
          href={publicBookUrl(slug)}
          className="mt-6 inline-flex h-10 items-center rounded-xl bg-violet-600 px-4 text-[12px] font-semibold text-white hover:bg-violet-700"
        >
          Choose new time
        </Link>
      </div>
    );
  }

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
        <p className="mt-3 inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
          {status}
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setStatus("Rescheduled");
              setDone("reschedule");
            }}
            className="h-10 rounded-xl bg-violet-600 text-[13px] font-semibold text-white hover:bg-violet-700"
          >
            Reschedule
          </button>
          <button
            type="button"
            onClick={() => {
              setStatus("Cancelled");
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
