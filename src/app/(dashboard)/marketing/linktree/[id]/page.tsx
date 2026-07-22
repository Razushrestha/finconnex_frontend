import { LinktreeDetailClient } from "@/components/marketing/linktree/LinktreeDetailClient";

export default async function LinktreeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LinktreeDetailClient id={id} />;
}
