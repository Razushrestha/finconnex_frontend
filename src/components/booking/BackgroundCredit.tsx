import type { BookingPageBranding } from "@/lib/booking/page-branding";
import { cn } from "@/lib/utils";

/**
 * The small "Photo: … on StockSnap" credit in the bottom-right corner of a
 * booking page whose background is a library photo. Place it inside the
 * element that draws the background; that element must be `relative`.
 */
export function BackgroundCredit({
  branding,
  className,
}: {
  branding: Pick<
    BookingPageBranding,
    "backgroundImageUrl" | "backgroundCredit" | "backgroundCreditUrl"
  >;
  className?: string;
}) {
  if (!branding.backgroundImageUrl || !branding.backgroundCredit) return null;
  const style = cn(
    "absolute right-2 bottom-2 z-10 max-w-[60%] truncate rounded bg-black/35 px-1.5 py-0.5 text-[10px] leading-tight text-white/90 backdrop-blur-[2px]",
    className,
  );
  return branding.backgroundCreditUrl ? (
    <a
      href={branding.backgroundCreditUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(style, "hover:text-white hover:underline")}
    >
      {branding.backgroundCredit}
    </a>
  ) : (
    <span className={style}>{branding.backgroundCredit}</span>
  );
}
