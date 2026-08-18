import { CreateCallForm } from "@/components/activities/calls/CreateCallForm";
import { asRelatedKind } from "@/lib/activities/create-defaults";

interface CreateCallPageProps {
  searchParams: Promise<{
    layoutid?: string;
    redirect?: string;
    relatedKind?: string;
    relatedName?: string;
    contact?: string;
    mode?: string;
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
      mode={params.mode === "log" ? "log" : "schedule"}
      defaults={{
        relatedKind: asRelatedKind(params.relatedKind),
        relatedName: params.relatedName,
        contact: params.contact,
      }}
    />
  );
}
