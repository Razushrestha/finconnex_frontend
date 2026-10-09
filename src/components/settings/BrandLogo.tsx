"use client";

import { logoFrameStyle, type LogoFrame } from "@/lib/settings/logo-frame";
import { useResolvedImageSrc } from "@/lib/storage/use-resolved-image";
import { cn } from "@/lib/utils";

export function BrandLogo({
  src,
  frame,
  className,
}: {
  src: string;
  frame: LogoFrame;
  className?: string;
}) {
  const resolved = useResolvedImageSrc(src);
  if (!resolved) return null;
  return (
    <span className={cn("relative block overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolved}
        alt=""
        draggable={false}
        className="pointer-events-none absolute max-w-none object-contain"
        style={logoFrameStyle(frame)}
      />
    </span>
  );
}
