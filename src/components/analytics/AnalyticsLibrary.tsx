"use client";

import Link from "next/link";
import {
  Building2,
  FileStack,
  Handshake,
  Megaphone,
  Sparkles,
  Trophy,
  UserRound,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { ANALYTICS_SECTIONS } from "@/lib/analytics/library";

const ICONS = {
  building: Building2,
  users: Users,
  handshake: Handshake,
  megaphone: Megaphone,
  zap: Zap,
  trophy: Trophy,
  wallet: Wallet,
  file: FileStack,
  user: UserRound,
  sparkles: Sparkles,
};

export function AnalyticsLibrary() {
  return (
    <div className="min-h-full bg-[#F4F6F9]">
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-4 p-4 lg:px-6 2xl:px-8 2xl:py-5">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900">Analytics</h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Open a section to view that area of the business.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {ANALYTICS_SECTIONS.map((section) => {
            const Icon = ICONS[section.icon as keyof typeof ICONS] ?? Users;
            return (
              <Link
                key={section.id}
                href={`/analytics/${section.id}`}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-violet-200 hover:shadow-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-[#5A32A3]">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="mt-3 text-[14px] font-semibold text-slate-900">{section.name}</h3>
                <p className="mt-1 min-h-[40px] text-[12px] leading-5 text-slate-500">
                  {section.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
