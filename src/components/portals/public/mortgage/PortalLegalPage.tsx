import Link from "next/link";
import { PortalBrand } from "@/components/portals/public/mortgage/PortalBrand";

export function PortalLegalPage({
  slug,
  title,
  body,
}: {
  slug: string;
  title: string;
  body: string[];
}) {
  return (
    <div className="min-h-dvh bg-[#F7F6F9] px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <PortalBrand />
        <h1 className="mt-6 text-[24px] font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {body.map((p) => (
          <p key={p} className="mt-3 text-[14px] leading-relaxed text-slate-600">
            {p}
          </p>
        ))}
        <Link
          href={`/p/${slug}/login`}
          className="mt-6 inline-flex h-9 items-center rounded-lg bg-[#5A32A3] px-3 text-[12px] font-semibold text-white"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
