import { PublicBookClient } from "@/components/booking/PublicBookClient";

interface BookSlugPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BookSlugPage({ params }: BookSlugPageProps) {
  const { slug } = await params;
  return <PublicBookClient slug={slug} />;
}
