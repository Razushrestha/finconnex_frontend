import { AppointmentCancelForm } from "@/components/meetings/AppointmentCancelForm";

export default async function AppointmentCancelPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <AppointmentCancelForm token={token} />;
}
