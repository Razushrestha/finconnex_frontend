"use client";

import { useState } from "react";
import {
  Filter,
  Plus,
  User,
  CalendarDays,
  FileText,
  Grid3x3,
  Mic,
  Receipt,
  ShieldCheck,
  Play,
  Camera,
} from "lucide-react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "All Templates",
  "Advisor Profiles",
  "Event Registration",
  "Resource Lists",
  "Social Bio",
];

const TEMPLATES = [
  {
    id: "executive-portrait",
    badge: "Advisor",
    category: "Advisor Profiles",
    title: "Executive Portrait",
    description:
      "A clean, professional layout ideal for wealth managers and consultants.",
    preview: <ExecutivePortraitPreview />,
    heroClass: "from-indigo-100 via-indigo-50 to-white",
  },
  {
    id: "webinar-landing",
    badge: "Event",
    category: "Event Registration",
    title: "Webinar Landing",
    description:
      "Capture registrations for your upcoming market update or client webinar.",
    preview: <WebinarLandingPreview />,
    heroClass: "from-violet-200 via-violet-50 to-white",
  },
  {
    id: "client-documents",
    badge: "Resources",
    category: "Resource Lists",
    title: "Client Documents",
    description:
      "Organize tax forms, quarterly reports, and important disclosures.",
    preview: <ClientDocumentsPreview />,
    heroClass: "from-amber-100 via-orange-50 to-white",
  },
  {
    id: "social-grid",
    badge: "Social",
    category: "Social Bio",
    title: "Social Grid",
    description:
      "Visual-first layout perfect for Instagram or LinkedIn bio links.",
    preview: <SocialGridPreview />,
    heroClass: "from-rose-100 via-pink-50 to-white",
  },
];

export default function TemplateLibrary() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("All Templates");

  const visibleTemplates =
    activeCategory === "All Templates"
      ? TEMPLATES
      : TEMPLATES.filter((t) => t.category === activeCategory);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full px-6 py-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div />

          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Filter className="h-4 w-4" />
              Filter
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-2 py-1.5 text-xs font-medium text-white hover:bg-indigo-800"
            >
              <Plus className="h-4 w-4" />
              Create blank
            </button>
          </div>
        </div>

        {/* Category filter pills */}
        <div className="mt-6 flex flex-wrap gap-2">
          {CATEGORIES.map((category) => {
            const isActive = category === activeCategory;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Template grid */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {visibleTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={() =>
                router.push(`/smart-link/templates/${template.id}`)
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface Template {
  id: string;
  badge: string;
  category: string;
  title: string;
  description: string;
  preview: React.ReactNode;
  heroClass: string;
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: Template;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/60"
    >
      <div
        className={`relative h-56 w-full overflow-hidden bg-gradient-to-b p-4 ${template.heroClass}`}
      >
        <span className="absolute left-3 top-3 z-10 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 shadow-sm backdrop-blur">
          {template.badge}
        </span>
        <div className="h-full w-full transition-transform duration-300 ease-out group-hover:scale-[1.03]">
          {template.preview}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 border-t border-slate-100 p-4">
        <h3 className="truncate text-sm font-semibold text-slate-900">
          {template.title}
        </h3>
        <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
          {template.description}
        </p>
      </div>
    </button>
  );
}
/* --- Preview illustrations for each template card --- */

function ExecutivePortraitPreview() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-3">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-md shadow-indigo-300/50 ring-4 ring-white">
        <User className="h-7 w-7 text-white" strokeWidth={1.75} />
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <div className="h-2.5 w-28 rounded-full bg-slate-700/80" />
        <div className="h-2 w-20 rounded-full bg-slate-400/60" />
      </div>
      <div className="mt-1 flex w-full flex-col gap-1.5">
        <div className="h-7 w-full rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 shadow-sm shadow-indigo-300/60" />
        <div className="h-7 w-full rounded-lg border border-slate-200 bg-white/70" />
      </div>
    </div>
  );
}

function WebinarLandingPreview() {
  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="relative flex h-20 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm">
        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-2 h-14 w-14 rounded-full bg-white/10" />
        <Mic className="h-7 w-7 text-white/90" strokeWidth={1.75} />
      </div>
      <div className="flex items-center gap-1.5 text-violet-700">
        <CalendarDays className="h-3.5 w-3.5" />
        <div className="h-2 w-24 rounded-full bg-violet-300/70" />
      </div>
      <div className="h-2 w-3/4 rounded-full bg-slate-300/70" />
      <div className="mt-auto h-7 w-full rounded-lg bg-gradient-to-r from-indigo-700 to-violet-600 shadow-sm shadow-violet-300/60" />
    </div>
  );
}

function ClientDocumentsPreview() {
  const rows = [
    { icon: Receipt, tint: "bg-rose-100 text-rose-500" },
    { icon: FileText, tint: "bg-slate-200 text-slate-500" },
    { icon: ShieldCheck, tint: "bg-amber-100 text-amber-600" },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <div className="mb-1 h-2 w-16 rounded-full bg-slate-300/70" />
      {rows.map(({ icon: Icon, tint }, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 rounded-lg bg-white/90 p-2 shadow-sm ring-1 ring-slate-100"
        >
          <span
            className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md ${tint}`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          <span className="h-2 w-full rounded-full bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

function SocialGridPreview() {
  const tiles = [
    "from-rose-300 to-pink-400",
    "from-orange-200 to-rose-300",
    "from-pink-300 to-fuchsia-300",
    "from-rose-200 to-orange-200",
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2.5 px-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-pink-500 shadow-sm ring-2 ring-white">
        <Camera className="h-4 w-4 text-white" strokeWidth={1.75} />
      </div>
      <div className="grid w-full grid-cols-2 gap-1.5">
        {tiles.map((tint, i) => (
          <div
            key={i}
            className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-md bg-gradient-to-br ${tint}`}
          >
            {i === 0 && (
              <Play
                className="h-3.5 w-3.5 fill-white/90 text-white/90"
                strokeWidth={0}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
