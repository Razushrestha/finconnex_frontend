import { CreateCallForm } from "@/components/activities/calls/CreateCallForm";

interface CreateCallPageProps {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}

export default async function CreateCallPage({
  searchParams,
}: CreateCallPageProps) {
  const params = await searchParams;
  const layoutId = params.layoutid ?? "standard";
  const redirect = params.redirect === "true";

  return <CreateCallForm layoutId={layoutId} redirect={redirect} />;
}
