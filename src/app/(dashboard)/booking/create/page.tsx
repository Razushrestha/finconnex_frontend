import { BookingPageForm } from "@/components/booking/BookingPageForm";

interface CreateBookingPageProps {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}

export default async function CreateBookingPage({
  searchParams,
}: CreateBookingPageProps) {
  const params = await searchParams;
  const layoutId = params.layoutid ?? "standard";
  const redirect = params.redirect !== "true";

  return <BookingPageForm layoutId={layoutId} redirect={redirect} />;
}
