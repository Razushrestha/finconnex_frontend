import { notFound } from "next/navigation";
import { BookingPageForm } from "@/components/booking/BookingPageForm";
import { bookingPages } from "@/lib/booking/types";

const EVENT_TYPE_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface EditBookingPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}

export default async function EditBookingPage({
  params,
  searchParams,
}: EditBookingPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const seed = bookingPages.find((p) => p.id === id || p.crmEventTypeId === id);
  // Client form rehydrates from the session store or the CRM event type.
  // CRM schedules use the event-type UUID, not the local bp- id.
  if (!seed && !id.startsWith("bp-") && !EVENT_TYPE_ID.test(id)) notFound();

  return (
    <BookingPageForm
      layoutId={sp.layoutid ?? "standard"}
      redirect={sp.redirect !== "true"}
      initial={seed}
      pageId={id}
    />
  );
}
