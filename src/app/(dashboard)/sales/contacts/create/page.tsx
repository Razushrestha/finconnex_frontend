import { CreateContactForm } from "@/components/sales/contacts/CreateContactForm";

interface CreateContactPageProps {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}

export default async function CreateContactPage({
  searchParams,
}: CreateContactPageProps) {
  const params = await searchParams;
  const layoutId = params.layoutid ?? "standard";
  const redirect = params.redirect === "true";

  return <CreateContactForm layoutId={layoutId} redirect={redirect} />;
}
