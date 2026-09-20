import { ProvideDocumentsClient } from "@/components/documents/requests/ProvideDocumentsClient";
import { openPublicProvideSession } from "@/lib/documents/requests/public-provide";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ProvideDocumentsPage({ params }: PageProps) {
  const { token: raw } = await params;
  let token = raw?.trim() ?? "";
  try {
    token = decodeURIComponent(token);
  } catch {
    /* already decoded */
  }

  const session = openPublicProvideSession(token);
  if (!session) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg items-center px-4">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">
            Link unavailable
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            This document request link is invalid or has expired. Ask your
            broker to send a new one.
          </p>
        </div>
      </div>
    );
  }

  return <ProvideDocumentsClient token={token} session={session} />;
}
