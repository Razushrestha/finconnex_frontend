import { CreateMeetingForm } from "@/components/activities/meetings/CreateMeetingForm";

interface CreateMeetingPageProps {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}

export default async function CreateMeetingPage({
  searchParams,
}: CreateMeetingPageProps) {
  const params = await searchParams;
  const layoutId = params.layoutid ?? "standard";
  const redirect = params.redirect === "true";

  return <CreateMeetingForm layoutId={layoutId} redirect={redirect} />;
}
