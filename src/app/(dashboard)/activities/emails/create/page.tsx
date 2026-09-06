import { CreateEmailForm } from "@/components/activities/emails/create/CreateEmailForm";
import { asRelatedKind } from "@/lib/activities/create-defaults";

interface PageProps {
  searchParams: Promise<{
    layoutid?: string;
    redirect?: string;
    relatedKind?: string;
    relatedName?: string;
    relatedId?: string;
    to?: string;
    cc?: string;
    subject?: string;
  }>;
}

export default async function CreateEmailPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <div className="absolute inset-0 flex min-h-0 flex-col overflow-hidden">
      <CreateEmailForm
        layoutId={params.layoutid ?? "standard"}
        redirect={params.redirect === "true"}
        defaults={{
          relatedKind: asRelatedKind(params.relatedKind),
          relatedName: params.relatedName,
          relatedId: params.relatedId,
          to: params.to,
          cc: params.cc,
          subject: params.subject,
        }}
      />
    </div>
  );
}
