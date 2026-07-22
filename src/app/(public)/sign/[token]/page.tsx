import { PublicSignClient } from "@/components/documents/signature/PublicSignClient";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function PublicSignPage({ params }: PageProps) {
  const { token } = await params;
  return <PublicSignClient token={token} />;
}
