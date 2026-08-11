import { notFound } from "next/navigation";
import { BookingPageForm } from "@/components/booking/BookingPageForm";
import { bookingPages } from "@/lib/booking/types";

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
  const seed = bookingPages.find((p) => p.id === id);
  // Client form rehydrates from session store; seed covers SSR for known demos.
  if (!seed && !id.startsWith("bp-")) notFound();

  return (
    <BookingPageForm
      layoutId={sp.layoutid ?? "standard"}
      redirect={sp.redirect !== "true"}
      initial={seed}
      pageId={id}
    />
  );
}
