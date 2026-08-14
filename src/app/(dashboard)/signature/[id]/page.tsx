import { SignatureDetailClient } from "@/components/documents/signature/SignatureDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SignatureDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <SignatureDetailClient id={id} />;
}
