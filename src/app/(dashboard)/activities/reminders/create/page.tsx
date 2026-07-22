import { CreateReminderForm } from "@/components/activities/reminders/CreateReminderForm";

interface CreateReminderPageProps {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}

export default async function CreateReminderPage({
  searchParams,
}: CreateReminderPageProps) {
  const params = await searchParams;
  const layoutId = params.layoutid ?? "standard";
  const redirect = params.redirect === "true";

  return <CreateReminderForm layoutId={layoutId} redirect={redirect} />;
}
