import { CreateCallForm } from "@/components/activities/calls/CreateCallForm";
import { asRelatedKind } from "@/lib/activities/create-defaults";

interface CreateCallPageProps {
  searchParams: Promise<{
    layoutid?: string;
    redirect?: string;
    relatedKind?: string;
    relatedName?: string;
    contact?: string;
  }>;
}

export default async function CreateCallPage({
  searchParams,
}: CreateCallPageProps) {
  const params = await searchParams;
  return (
    <CreateCallForm
      layoutId={params.layoutid ?? "standard"}
      redirect={params.redirect === "true"}
      defaults={{
        relatedKind: asRelatedKind(params.relatedKind),
        relatedName: params.relatedName,
        contact: params.contact,
      }}
    />
  );
}
