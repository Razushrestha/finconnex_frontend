import { CreateTaskForm } from "@/components/activities/tasks/CreateTaskForm";

interface CreateTaskPageProps {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}

export default async function CreateTaskPage({
  searchParams,
}: CreateTaskPageProps) {
  const params = await searchParams;
  const layoutId = params.layoutid ?? "standard";
  const redirect = params.redirect === "true";

  return <CreateTaskForm layoutId={layoutId} redirect={redirect} />;
}
