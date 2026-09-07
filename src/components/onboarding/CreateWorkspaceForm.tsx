"use client";

import * as React from "react";
import { Loader2, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

export function CreateWorkspaceForm() {
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugEdited, setSlugEdited] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    setError(null);

    if (!name.trim() || name.trim().length < 2) {
      setError("Workspace name must be at least 2 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/workspace/create", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          (data as { error?: string }).error ??
            "Unable to create your workspace. Please try again.",
        );
        setIsLoading(false);
        return;
      }

      window.location.href = "/";
    } catch {
      setError("Network error. Check your connection and try again.");
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      method="post"
      action="#"
      className="space-y-5"
      noValidate
    >
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Workspace name
        </label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Acme Inc."
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          disabled={isLoading}
          autoFocus
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
          Workspace URL
        </label>
        <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-400 focus-within:border-violet-400 focus-within:bg-white">
          <span className="whitespace-nowrap">app.finconnex.com/</span>
          <input
            id="slug"
            name="slug"
            type="text"
            value={slug}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(slugify(e.target.value));
            }}
            disabled={isLoading}
            className="w-full bg-transparent py-2.5 text-gray-900 outline-none placeholder:text-gray-400"
            placeholder="acme-inc"
          />
        </div>
        <p className="text-xs text-gray-400">
          Lowercase letters, numbers, and hyphens only.
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          "inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 text-sm font-semibold text-white transition-colors hover:bg-violet-700",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating workspace...
          </>
        ) : (
          <>
            <Building2 className="h-4 w-4" />
            Create workspace
          </>
        )}
      </button>
    </form>
  );
}
