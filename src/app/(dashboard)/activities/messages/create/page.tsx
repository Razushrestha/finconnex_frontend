import { CreateMessageForm } from "@/components/activities/messages/CreateMessageForm";

interface CreateMessagePageProps {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}

export default async function CreateMessagePage({
  searchParams,
}: CreateMessagePageProps) {
  const params = await searchParams;
  const layoutId = params.layoutid ?? "standard";
  const redirect = params.redirect === "true";

  return <CreateMessageForm layoutId={layoutId} redirect={redirect} />;
}
