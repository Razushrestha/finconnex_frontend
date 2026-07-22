import { DocumentRequestDetailClient } from "@/components/documents/requests/DocumentRequestDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentRequestDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <DocumentRequestDetailClient id={id} />;
}
