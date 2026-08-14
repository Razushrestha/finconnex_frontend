import Link from "next/link";
import { Send, PenTool } from "lucide-react";

export function ESignatureHeader({
  name = "Mohit",
}: {
  name?: string;
  onNew?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Good afternoon {name} 👋
        </h1>
        <p className="text-sm text-slate-500">
          Manage your documents and signatures in one place.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/signature/create?layoutid=standard&redirect=false&type=send"
          className="inline-flex h-9 items-center gap-2 rounded-sm bg-primary px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary/90"
        >
          <Send className="h-3.5 w-3.5" />
          Send for Signature
        </Link>
        <Link
          href="/signature/create?layoutid=standard&redirect=false&type=self"
          className="inline-flex h-9 items-center gap-2 rounded-sm border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <PenTool className="h-3.5 w-3.5 text-slate-700" />
          Sign Yourself
        </Link>
      </div>
    </div>
  );
}
