import { CreateDocumentRequestForm } from "@/components/documents/requests/CreateDocumentRequestForm";

interface PageProps {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}

export default async function CreateDocumentRequestPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  return (
    <CreateDocumentRequestForm
      layoutId={params.layoutid ?? "standard"}
      redirect={params.redirect !== "true"}
    />
  );
}
