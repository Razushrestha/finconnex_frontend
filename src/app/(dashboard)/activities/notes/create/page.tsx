import { CreateNoteForm } from "@/components/activities/notes/CreateNoteForm";

interface CreateNotePageProps {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}

export default async function CreateNotePage({
  searchParams,
}: CreateNotePageProps) {
  const params = await searchParams;
  const layoutId = params.layoutid ?? "standard";
  const redirect = params.redirect === "true";

  return <CreateNoteForm layoutId={layoutId} redirect={redirect} />;
}
