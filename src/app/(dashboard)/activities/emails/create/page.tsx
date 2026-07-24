import { CreateEmailForm } from "@/components/activities/emails/CreateEmailForm";
import { asRelatedKind } from "@/lib/activities/create-defaults";

interface PageProps {
  searchParams: Promise<{
    layoutid?: string;
    redirect?: string;
    relatedKind?: string;
    relatedName?: string;
    to?: string;
  }>;
}

export default async function CreateEmailPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <CreateEmailForm
      layoutId={params.layoutid ?? "standard"}
      redirect={params.redirect === "true"}
      defaults={{
        relatedKind: asRelatedKind(params.relatedKind),
        relatedName: params.relatedName,
        to: params.to,
      }}
    />
  );
}
