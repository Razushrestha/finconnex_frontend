import { CreateTaskForm } from "@/components/activities/tasks/CreateTaskForm";
import { asRelatedKind } from "@/lib/activities/create-defaults";

interface CreateTaskPageProps {
  searchParams: Promise<{
    layoutid?: string;
    redirect?: string;
    relatedKind?: string;
    relatedName?: string;
    due?: string;
  }>;
}

function asDueDate(raw?: string): string | undefined {
  if (!raw) return undefined;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw) ? raw : undefined;
}

export default async function CreateTaskPage({
  searchParams,
}: CreateTaskPageProps) {
  const params = await searchParams;
  return (
    <CreateTaskForm
      layoutId={params.layoutid ?? "standard"}
      redirect={params.redirect === "true"}
      defaults={{
        relatedKind: asRelatedKind(params.relatedKind),
        relatedName: params.relatedName,
        dueDate: asDueDate(params.due),
      }}
    />
  );
}
