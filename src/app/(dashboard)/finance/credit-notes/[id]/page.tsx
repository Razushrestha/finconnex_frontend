import { CreditNoteDetailClient } from "@/components/finance/credit-notes/CreditNoteDetailClient";

export default async function CreditNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CreditNoteDetailClient id={id} />;
}
