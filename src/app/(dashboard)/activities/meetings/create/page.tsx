import { CreateMeetingForm } from "@/components/activities/meetings/CreateMeetingForm";
import { asRelatedKind } from "@/lib/activities/create-defaults";

interface PageProps {
  searchParams: Promise<{
    layoutid?: string;
    redirect?: string;
    relatedKind?: string;
    relatedName?: string;
  }>;
}

export default async function CreateMeetingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <CreateMeetingForm
      layoutId={params.layoutid ?? "standard"}
      redirect={params.redirect === "true"}
      defaults={{
        relatedKind: asRelatedKind(params.relatedKind),
        relatedName: params.relatedName,
      }}
    />
  );
}
