import { Suspense } from "react";
import type { Metadata } from "next";
import {
  BarChart3,
  LineChart,
  Shield,
  Users,
} from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { getPublicTenants } from "@/lib/auth/tenants";

const features = [
  {
    icon: BarChart3,
    title: "Unified analytics",
    description: "Track sales, finance, and pipeline metrics in one place.",
  },
  {
    icon: Users,
    title: "Multi-tenant workspaces",
    description: "Each organization gets an isolated, secure environment.",
  },
  {
    icon: LineChart,
    title: "Real-time insights",
    description: "Monitor leads, deals, and revenue as they happen.",
  },
  {
    icon: Shield,
    title: "Enterprise security",
    description: "Role-based access with tenant-scoped authentication.",
  },
];

export const metadata: Metadata = {
  title: "Sign in — FinConnex",
  description: "Sign in to your organization workspace",
};

export default function LoginPage() {
  const tenants = getPublicTenants();

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-[480px] shrink-0 overflow-hidden bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-700 lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(0,0,0,0.15),transparent_50%)]" />

        <div className="relative">
          <div className="mb-2 text-2xl font-bold tracking-tight text-white">
            FinConnex
          </div>
          <p className="text-sm text-violet-100">
            Multi-tenant CRM for modern teams
          </p>
        </div>

        <div className="relative space-y-6">
          <div>
            <h1 className="text-3xl leading-tight font-bold text-white">
              Manage every client relationship, securely.
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-violet-100">
              Sign in to your organization workspace to access dashboards,
              sales pipelines, finance reports, and team tools.
            </p>
          </div>

          <ul className="space-y-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.title} className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {feature.title}
                    </p>
                    <p className="text-xs leading-relaxed text-violet-100">
                      {feature.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="relative text-xs text-violet-200">
          © {new Date().getFullYear()} FinConnex. All rights reserved.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="text-2xl font-bold text-gray-900">FinConnex</div>
            <p className="mt-1 text-sm text-gray-500">
              Sign in to your workspace
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Welcome back
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Enter your organization and credentials to continue
              </p>
            </div>

            <Suspense
              fallback={
                <div className="flex h-40 items-center justify-center text-sm text-gray-400">
                  Loading...
                </div>
              }
            >
              <LoginForm tenants={tenants} />
            </Suspense>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
