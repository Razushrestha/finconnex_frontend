"use client";

import { use, useEffect, useState } from "react";
import { recordSmartShortClick } from "@/lib/smart-links/short-links";
import { resolvePublicShortLink, trySmartLink } from "@/lib/smart-links/api";

export default function SmartShortLinkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function open() {
      const remote = await trySmartLink(() => resolvePublicShortLink(slug));
      const target = remote ?? recordSmartShortClick(slug);
      if (cancelled) return;
      if (!target) {
        setMissing(true);
        return;
      }
      window.location.replace(target);
    }

    void open();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (missing) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-[15px] font-semibold text-slate-800">Link not found</p>
        <p className="text-[13px] text-slate-500">
          This short link is missing or was created in another browser.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center text-[13px] text-slate-400">
      Opening link…
    </div>
  );
}
