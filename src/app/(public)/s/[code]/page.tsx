import { redirect } from "next/navigation";
import { openBookingShortLink } from "@/lib/booking/short-link-store";
import { ShortLinkFallback } from "@/app/(public)/s/[code]/ShortLinkFallback";

export default async function ShortBookingLinkPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const target = await openBookingShortLink(code);
  if (target) redirect(target);

  return <ShortLinkFallback code={code} />;
}
