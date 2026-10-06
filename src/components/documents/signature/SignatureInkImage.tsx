"use client";

import { useEffect, useState } from "react";
import { cropSignatureInk } from "@/lib/documents/signature/crop-signature-ink";

/** Signature image cropped to the strokes and fitted inside the field. */
export function SignatureInkImage({
  src,
  className = "h-full w-full object-contain",
}: {
  src: string;
  className?: string;
}) {
  const [url, setUrl] = useState(src);

  useEffect(() => {
    let live = true;
    cropSignatureInk(src).then((next) => {
      if (live) setUrl(next);
    });
    return () => {
      live = false;
    };
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" draggable={false} className={className} />
  );
}
