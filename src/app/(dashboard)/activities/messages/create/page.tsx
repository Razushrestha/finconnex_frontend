import { CreateMessageForm } from "@/components/activities/messages/CreateMessageForm";
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

export default async function CreateMessagePage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <CreateMessageForm
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
