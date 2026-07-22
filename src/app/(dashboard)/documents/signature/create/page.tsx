import { CreateSignatureForm } from "@/components/documents/signature/CreateSignatureForm";

interface PageProps {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}

export default async function CreateSignaturePage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <CreateSignatureForm
      layoutId={params.layoutid ?? "standard"}
      redirect={params.redirect !== "true"}
    />
  );
}
