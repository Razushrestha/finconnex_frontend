import Link from "next/link";
import { Download, Home, PenLine, Plus } from "lucide-react";

export function ESignatureHeader({
  onExport,
  onNew,
}: {
  onExport: () => void;
  onNew: () => void;
}) {
  return (
    <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <nav className="flex items-center gap-1 text-[10px] text-slate-400">
          <Link
            href="/"
            className="flex items-center gap-0.5 hover:text-slate-600"
          >
            <Home className="h-3 w-3" />
            Home
          </Link>
          <span>/</span>
          <span className="text-slate-500">Documents</span>
          <span>/</span>
        </nav>
        <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
          E-Signature
        </h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
          <PenLine className="h-2.5 w-2.5" />
          Multi-signer
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onExport}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5" />
          Export log
        </button>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
        >
          <Plus className="h-3.5 w-3.5" />
          New signature
        </button>
      </div>
    </div>
  );
}
