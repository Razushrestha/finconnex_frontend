import { CreateNoteForm } from "@/components/activities/notes/CreateNoteForm";
import { asRelatedKind } from "@/lib/activities/create-defaults";

interface PageProps {
  searchParams: Promise<{
    layoutid?: string;
    redirect?: string;
    relatedKind?: string;
    relatedName?: string;
  }>;
}

export default async function CreateNotePage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <CreateNoteForm
      layoutId={params.layoutid ?? "standard"}
      redirect={params.redirect === "true"}
      defaults={{
        relatedKind: asRelatedKind(params.relatedKind),
        relatedName: params.relatedName,
      }}
    />
  );
}
