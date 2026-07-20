import { CreateEmailForm } from "@/components/activities/emails/CreateEmailForm";

interface CreateEmailPageProps {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}

export default async function CreateEmailPage({
  searchParams,
}: CreateEmailPageProps) {
  const params = await searchParams;
  const layoutId = params.layoutid ?? "standard";
  const redirect = params.redirect === "true";

  return <CreateEmailForm layoutId={layoutId} redirect={redirect} />;
}
