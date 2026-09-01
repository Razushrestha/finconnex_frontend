"use client";

import { Suspense } from "react";
import { BookingsWorkspace } from "@/components/booking/BookingsWorkspace";

export default function BookingPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto xl:h-full xl:overflow-hidden">
      <Suspense fallback={null}>
        <BookingsWorkspace />
      </Suspense>
    </div>
  );
}
