"use client";

import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { usePortalContext } from "@/components/portals/public/PortalShell";
import type { PortalModule } from "@/lib/portals/types";
import { isModuleEnabled } from "@/lib/portals/types";

export function PortalModuleGuard({
  slug,
  module,
  children,
}: {
  slug: string;
  module: PortalModule;
  children: React.ReactNode;
}) {
  const { portal } = usePortalContext(slug);

  if (!portal) return null;

  if (!isModuleEnabled(portal, module)) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <ShieldOff className="mx-auto h-8 w-8 text-slate-300" />
        <h2 className="mt-3 text-[15px] font-bold text-slate-900">
          {module} not available
        </h2>
        <p className="mt-1 text-[12px] text-slate-500">
          This module is not enabled for your portal.
        </p>
        <Link
          href={`/p/${slug}`}
          className="mt-4 inline-flex h-8 items-center rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
