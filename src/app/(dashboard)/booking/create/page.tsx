import { BookingPageForm } from "@/components/booking/BookingPageForm";
import {
  BOOKING_EVENT_TYPES,
  CONSULTATION_MODES,
  type BookingEventType,
  type ConsultationMode,
} from "@/lib/booking/types";

interface CreateBookingPageProps {
  searchParams: Promise<{
    layoutid?: string;
    redirect?: string;
    eventType?: string;
    mode?: string;
    title?: string;
    duration?: string;
    price?: string;
    via?: string;
    platform?: string;
  }>;
}

export default async function CreateBookingPage({
  searchParams,
}: CreateBookingPageProps) {
  const params = await searchParams;
  const layoutId = params.layoutid ?? "standard";
  const redirect = params.redirect !== "true";
  const eventType = BOOKING_EVENT_TYPES.includes(
    params.eventType as BookingEventType,
  )
    ? (params.eventType as BookingEventType)
    : undefined;
  const consultationMode = CONSULTATION_MODES.includes(
    params.mode as ConsultationMode,
  )
    ? (params.mode as ConsultationMode)
    : undefined;

  const duration = Number(params.duration);
  const price = Number(params.price);
  const via =
    params.via === "video" ||
    params.via === "phone" ||
    params.via === "in_person" ||
    params.via === "custom"
      ? params.via
      : undefined;

  return (
    <BookingPageForm
      layoutId={layoutId}
      redirect={redirect}
      defaultEventType={eventType}
      defaultConsultationMode={consultationMode}
      defaultTitle={params.title}
      defaultDurationMinutes={
        Number.isFinite(duration) && duration > 0 ? duration : undefined
      }
      defaultPrice={Number.isFinite(price) ? price : undefined}
      defaultMeetingVia={via}
      defaultMeetingViaDetail={params.platform}
    />
  );
}
