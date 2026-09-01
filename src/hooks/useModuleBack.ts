"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  moduleBackHref,
  moduleBackLabel,
} from "@/lib/work-queue/navigation";

function fromWindow(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("from");
}

export function useModuleBack(fallbackHref: string, fallbackLabel: string) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [from, setFrom] = useState<string | null>(
    () => searchParams.get("from") ?? fromWindow(),
  );

  useEffect(() => {
    setFrom(searchParams.get("from") ?? fromWindow());
  }, [pathname, searchParams]);

  return {
    href: moduleBackHref(from, fallbackHref),
    label: moduleBackLabel(from, fallbackLabel),
  };
}
