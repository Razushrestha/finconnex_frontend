"use client";

import { useEffect, useState } from "react";
import {
  isDisplayableImageSrc,
  resolveCrmStorageUrl,
} from "@/lib/storage/api";

/** Image src for a branding value that may be an http URL or a private storage key. */
export function useResolvedImageSrc(value: string): string {
  const immediate =
    value && (isDisplayableImageSrc(value) || value.startsWith("/"))
      ? value
      : "";
  const [src, setSrc] = useState(immediate);

  useEffect(() => {
    const raw = value.trim();
    if (!raw) {
      setSrc("");
      return;
    }
    if (isDisplayableImageSrc(raw) || raw.startsWith("/")) {
      setSrc(raw);
      return;
    }

    let cancelled = false;
    setSrc("");
    void resolveCrmStorageUrl(raw)
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc("");
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  return src;
}
