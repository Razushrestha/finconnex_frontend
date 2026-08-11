import { Suspense } from "react";
import { PublicBookClient } from "@/components/booking/PublicBookClient";

interface BookSlugPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BookSlugPage({ params }: BookSlugPageProps) {
  const { slug } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-[13px] text-slate-400">
          Loading…
        </div>
      }
    >
      <PublicBookClient slug={slug} />
    </Suspense>
  );
}
