"use client";

import { useEffect, useState } from "react";
import { consumeOnceLink, resolveShortLink } from "@/lib/booking/short-links";

export function ShortLinkFallback({ code }: { code: string }) {
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const target = consumeOnceLink(code) ?? resolveShortLink(code);
    if (!target || !target.startsWith("/book/")) {
      setMissing(true);
      return;
    }
    window.location.replace(target);
  }, [code]);

  if (!missing) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[13px] text-slate-400">
        Opening booking page…
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-[15px] font-semibold text-slate-800">Link not found</p>
      <p className="max-w-sm text-[13px] text-slate-500">
        This one-time link was already opened, or it is missing. Generate a
        new one from the consultation share window.
      </p>
    </div>
  );
}
