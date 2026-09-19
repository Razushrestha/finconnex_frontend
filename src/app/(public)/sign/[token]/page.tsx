import { PublicSignClient } from "@/components/documents/signature/PublicSignClient";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function PublicSignPage({ params }: PageProps) {
  const { token } = await params;
  let value = token?.trim() ?? "";
  try {
    value = decodeURIComponent(value);
  } catch {
    /* already decoded */
  }
  return <PublicSignClient token={value} />;
}
