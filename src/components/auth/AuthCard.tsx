import type { ReactNode } from "react";
import Link from "next/link";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/login" className="mb-8 block text-2xl font-bold text-gray-900">
          FinConnex
        </Link>
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          </div>
          {children}
        </div>
        {footer ? (
          <div className="mt-6 text-center text-sm text-gray-500">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
