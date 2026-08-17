"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { consumeOnceLink, resolveShortLink } from "@/lib/booking/short-links";

export default function ShortBookingLinkPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();

  useEffect(() => {
    const once = consumeOnceLink(code);
    const target = once ?? resolveShortLink(code);
    router.replace(target || "/booking");
  }, [code, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center text-[13px] text-slate-400">
      Opening booking page…
    </div>
  );
}
