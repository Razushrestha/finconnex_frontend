"use client";

import { Suspense } from "react";
import { BookingsWorkspace } from "@/components/booking/BookingsWorkspace";

export default function BookingPage() {
  return (
    <div className="flex min-h-full min-w-0 flex-1 flex-col">
      <Suspense fallback={null}>
        <BookingsWorkspace />
      </Suspense>
    </div>
  );
}
