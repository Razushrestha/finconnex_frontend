import { PublicLinktreeClient } from "@/components/marketing/linktree/PublicLinktreeClient";

export default async function PublicLinktreePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PublicLinktreeClient slug={slug} />;
}
