"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import type { FormPage } from "@/lib/form-builder/types";
import { FORM_THEMES } from "@/lib/form-builder/themes";
import { FormViewer } from "@/components/marketing/forms/builder/FormViewer";

interface PublicFormResponse {
  title: string;
  pages: FormPage[];
  themeId?: string;
}

export default function PublicFormPage() {
  const params = useParams();
  const rawSlug = (params?.slug as string) || "";

  // Normalize slug to match how it's saved in localStorage (lowercase, spaces to hyphens)
  const slug = decodeURIComponent(rawSlug)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");

  const [form, setForm] = useState<PublicFormResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    // Check specific slug storage first, then fallback to latest session
    const cachedData =
      localStorage.getItem(`form_schema_${slug}`) ||
      sessionStorage.getItem(`preview_form_${slug}`) ||
      sessionStorage.getItem(`latest_preview_form`);

    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setForm({
          ...parsed,
          title: parsed.title || slug.replace(/-/g, " "),
        });
        setLoading(false);
        return;
      } catch (e) {
        console.error("Failed to parse cached form data", e);
      }
    }

    setLoading(false);
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">Loading form...</p>
      </div>
    );
  }

  if (!form) {
    notFound();
  }

  const currentTheme =
    FORM_THEMES.find((t) => t.id === form.themeId) ?? FORM_THEMES[0];

  return (
    <div
      className="min-h-screen py-10 transition-colors duration-300"
      style={{ background: currentTheme.gradient || "hsl(var(--muted)/0.3)" }}
    >
      <FormViewer title={form.title} pages={form.pages} />
    </div>
  );
}
