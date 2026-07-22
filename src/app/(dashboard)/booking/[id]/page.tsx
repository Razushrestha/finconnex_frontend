import { notFound } from "next/navigation";
import { BookingPageForm } from "@/components/booking/BookingPageForm";
import { getBookingPageById } from "@/lib/booking/types";

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
  const page = getBookingPageById(id);
  if (!page) notFound();

  return (
    <BookingPageForm
      layoutId={sp.layoutid ?? "standard"}
      redirect={sp.redirect !== "true"}
      initial={page}
    />
  );
}
