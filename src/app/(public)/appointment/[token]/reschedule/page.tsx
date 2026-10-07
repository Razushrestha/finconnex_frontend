import { AppointmentRescheduleForm } from "@/components/meetings/AppointmentRescheduleForm";

export default async function AppointmentReschedulePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <AppointmentRescheduleForm token={token} />;
}
