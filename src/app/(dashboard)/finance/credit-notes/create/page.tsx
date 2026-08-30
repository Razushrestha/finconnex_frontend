import { CreateCreditNoteForm } from "@/components/finance/credit-notes/CreateCreditNoteForm";

export default async function CreateCreditNotePage({
  searchParams,
}: {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}) {
  const sp = await searchParams;
  return (
    <CreateCreditNoteForm
      layoutId={sp.layoutid ?? "standard"}
      redirect={sp.redirect !== "false"}
    />
  );
}
