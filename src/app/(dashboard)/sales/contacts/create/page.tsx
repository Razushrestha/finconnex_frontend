import { redirect } from "next/navigation";

interface CreateContactPageProps {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}

export default async function CreateContactPage({
  searchParams,
}: CreateContactPageProps) {
  void (await searchParams);
  redirect("/sales/contacts?create=1");
}
