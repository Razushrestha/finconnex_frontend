import { CreateDocumentRequestForm } from "@/components/documents/requests/CreateDocumentRequestForm";
import { parseDocumentRequestPeople } from "@/lib/leads/convert-actions";

interface PageProps {
  searchParams: Promise<{
    layoutid?: string;
    redirect?: string;
    relatedId?: string;
    relatedKind?: string;
    relatedName?: string;
    applicants?: string;
  }>;
}

export default async function CreateDocumentRequestPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  return (
    <CreateDocumentRequestForm
      layoutId={params.layoutid ?? "standard"}
      redirect={params.redirect !== "true"}
      relatedId={params.relatedId}
      relatedKind={params.relatedKind}
      relatedName={params.relatedName}
      seedApplicants={parseDocumentRequestPeople(params.applicants)}
    />
  );
}
