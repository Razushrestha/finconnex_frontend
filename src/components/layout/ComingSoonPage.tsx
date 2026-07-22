import Link from "next/link";
import { Home, Construction } from "lucide-react";

export function ComingSoonPage({
  title,
  section,
  description,
}: {
  title: string;
  section: string;
  description: string;
}) {
  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />
      <div className="relative mx-auto flex max-w-[1400px] flex-col items-start p-2.5 sm:p-3 lg:p-4">
        <nav className="mb-2.5 flex items-center gap-1 text-[10px] text-slate-400">
          <Link href="/" className="flex items-center gap-0.5 hover:text-slate-600">
            <Home className="h-3 w-3" />
            Home
          </Link>
          <span>/</span>
          <span className="text-slate-600">{title}</span>
        </nav>
        <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-slate-100/80 bg-white px-6 py-16 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <Construction className="h-6 w-6" />
          </div>
          <p className="mt-4 text-[10px] font-semibold tracking-widest text-violet-600 uppercase">
            {section}
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="mt-2 max-w-md text-center text-sm text-slate-500">
            {description}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex h-9 items-center rounded-lg bg-violet-600 px-4 text-[12px] font-semibold text-white hover:bg-violet-700"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
