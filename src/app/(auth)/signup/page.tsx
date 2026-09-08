import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  LineChart,
  Shield,
  Users,
} from "lucide-react";
import { SignupForm } from "@/components/auth/SignupForm";

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
  title: "Sign up: FinConnex",
  description: "Create your FinConnex account",
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-[480px] shrink-0 overflow-hidden bg-slate-900 lg:flex lg:flex-col lg:justify-between lg:p-10">
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
              Create your own workspace in minutes.
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-violet-100">
              Sign up, verify your email, and set up a workspace only your
              team can see.
            </p>
          </div>

          <ul className="space-y-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.title} className="flex gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-200" />
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
              Create your FinConnex account
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Create your account
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                You&apos;ll set up your own workspace after verifying your
                email
              </p>
            </div>

            <SignupForm />

            <p className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-violet-600 hover:text-violet-700"
              >
                Sign in
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            By signing up, you agree to our Terms of Service and Privacy
            Policy
          </p>
        </div>
      </div>
    </div>
  );
}
