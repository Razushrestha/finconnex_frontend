"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface TenantOption {
  id: string;
  slug: string;
  name: string;
}

interface LoginFormProps {
  tenants: TenantOption[];
}

export function LoginForm({ tenants }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [tenantSlug, setTenantSlug] = React.useState(tenants[0]?.slug ?? "");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<
    Record<string, string>
  >({});

  const selectedTenant = tenants.find((t) => t.slug === tenantSlug);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSlug, email, password, rememberMe }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400 && data.error) {
          setError(data.error);
        } else {
          setError(data.error ?? "Unable to sign in. Please try again.");
        }
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="tenant">Organization</Label>
        <div className="relative">
          <Building2 className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            id="tenant"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            className={cn(
              "flex h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white pr-10 pl-10 text-sm text-gray-900 shadow-xs transition-colors outline-none focus-visible:border-violet-500 focus-visible:ring-3 focus-visible:ring-violet-500/20",
              fieldErrors.tenantSlug && "border-red-500",
            )}
          >
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.slug}>
                {tenant.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-xs text-gray-400">
            {selectedTenant?.slug}
          </div>
        </div>
        {fieldErrors.tenantSlug && (
          <p className="text-xs text-red-600">{fieldErrors.tenantSlug}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            aria-invalid={!!fieldErrors.email}
            disabled={isLoading}
          />
        </div>
        {fieldErrors.email && (
          <p className="text-xs text-red-600">{fieldErrors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <button
            type="button"
            className="text-xs font-medium text-violet-600 hover:text-violet-700"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10 pl-10"
            aria-invalid={!!fieldErrors.password}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute top-1/2 right-3.5 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {fieldErrors.password && (
          <p className="text-xs text-red-600">{fieldErrors.password}</p>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
          disabled={isLoading}
        />
        <span className="text-sm text-gray-600">Keep me signed in for 30 days</span>
      </label>

      <Button
        type="submit"
        disabled={isLoading}
        className="h-11 w-full rounded-xl bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            <ShieldCheck className="h-4 w-4" />
            Sign in to workspace
          </>
        )}
      </Button>

      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-3">
        <p className="mb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
          Demo credentials
        </p>
        <p className="text-xs leading-relaxed text-gray-600">
          <span className="font-medium text-gray-800">FinConnex HQ:</span>{" "}
          admin@finconnex.com / Admin@123
        </p>
        <p className="text-xs leading-relaxed text-gray-600">
          <span className="font-medium text-gray-800">Acme Corp:</span>{" "}
          admin@acme.com / Admin@123
        </p>
      </div>
    </form>
  );
}
