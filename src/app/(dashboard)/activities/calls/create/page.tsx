import { CreateCallForm } from "@/components/activities/calls/CreateCallForm";
import { asRelatedKind } from "@/lib/activities/create-defaults";

interface CreateCallPageProps {
  searchParams: Promise<{
    layoutid?: string;
    redirect?: string;
    relatedKind?: string;
    relatedName?: string;
    contact?: string;
    mode?: string;
    date?: string;
    time?: string;
  }>;
}

function asStartTime(date?: string, time?: string): string | undefined {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const clock = time && /^\d{2}:\d{2}$/.test(time) ? time : "09:00";
  return `${date}T${clock}`;
}

export default async function CreateCallPage({
  searchParams,
}: CreateCallPageProps) {
  const params = await searchParams;
  return (
    <CreateCallForm
      layoutId={params.layoutid ?? "standard"}
      redirect={params.redirect === "true"}
      mode={params.mode === "log" ? "log" : "schedule"}
      defaults={{
        relatedKind: asRelatedKind(params.relatedKind),
        relatedName: params.relatedName,
        contact: params.contact,
        startTime: asStartTime(params.date, params.time),
      }}
    />
  );
}
