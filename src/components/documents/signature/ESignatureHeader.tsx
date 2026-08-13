import Link from "next/link";
import { Plus } from "lucide-react";

export function ESignatureHeader({}: { onNew?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
          E-Signature
        </h1>
      </div>
      <div className="flex items-center gap-1.5">
        <Link
          href="/documents/signature/create?layoutid=standard&redirect=false"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
        >
          <Plus className="h-3.5 w-3.5" />
          New signature
        </Link>
      </div>
    </div>
  );
}
