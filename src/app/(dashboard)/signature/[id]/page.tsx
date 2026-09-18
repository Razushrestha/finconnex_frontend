import { notFound } from "next/navigation";
import { SignatureDetailClient } from "@/components/documents/signature/SignatureDetailClient";

const RESERVED_SIGNATURE_IDS = new Set([
  "create",
  "templates",
  "documents",
  "request",
]);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SignatureDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (RESERVED_SIGNATURE_IDS.has(id)) notFound();
  return <SignatureDetailClient id={id} />;
}
