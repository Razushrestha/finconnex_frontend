"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Search, Check, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  ZOHO_CATEGORIES,
  ZOHO_TEMPLATES,
  type Template,
} from "@/lib/form-builder/templates";
import type { FormPage } from "@/lib/form-builder/types";

interface TemplateGalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate?: (name: string, pages: FormPage[]) => void;
}

export function TemplateGalleryModal({
  open,
  onOpenChange,
  onSelectTemplate,
}: TemplateGalleryModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  // Filter templates based on sidebar category and search query
  const filteredTemplates = ZOHO_TEMPLATES.filter((template) => {
    const matchesCategory =
      selectedCategory === "All" ||
      template.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Find similar templates for the detailed preview sidebar
  const similarTemplates = previewTemplate
    ? ZOHO_TEMPLATES.filter(
        (t) =>
          t.category.toLowerCase() === previewTemplate.category.toLowerCase() &&
          t.id !== previewTemplate.id,
      )
    : [];

  const handleUseTemplate = (template: Template) => {
    const formPages: FormPage[] = [
      {
        id: crypto.randomUUID(),
        title: template.title,
        hidden: false,
        fields: template.fields.map((f) => ({
          id: crypto.randomUUID(),
          type: f.type as any,
          label: f.label,
          required: f.required ?? false,
          placeholder: f.placeholder,
          options: f.options,
        })),
      },
    ];

    if (onSelectTemplate) {
      onSelectTemplate(template.title, formPages);
    } else {
      const slug = template.title.toLowerCase().trim().replace(/\s+/g, "-");
      const initialSchema = {
        title: template.title,
        themeId: "default",
        pages: formPages,
      };
      localStorage.setItem(
        `form_schema_${slug}`,
        JSON.stringify(initialSchema),
      );
      router.push(
        `/marketing/forms/create?layoutid=standard&redirect=false&slug=${encodeURIComponent(
          slug,
        )}&name=${encodeURIComponent(template.title)}`,
      );
    }
    onOpenChange(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-hidden">
      {/* MAIN GALLERY MODAL CONTAINER */}
      <div className="relative w-full max-w-7xl h-[88vh] bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200 bg-slate-50/50">
          <div className="w-1/4"></div>
          <h2 className="text-xl font-semibold tracking-wide text-center w-2/4 text-slate-800">
            Template Gallery
          </h2>
          <div className="w-1/4 flex justify-end">
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="px-8 py-4 border-b border-slate-200 bg-white flex justify-center">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search across all templates by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors shadow-sm"
            />
          </div>
        </div>

        {/* Modal Body Grid Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Categories */}
          <div className="w-64 border-r border-slate-200 bg-slate-50/70 p-4 overflow-y-auto space-y-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-3">
              Categories
            </h3>
            {ZOHO_CATEGORIES.map((category) => {
              const isActive = selectedCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600 border border-indigo-200/80 shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>

          {/* Template Cards Display Area */}
          <div className="flex-1 p-8 overflow-y-auto bg-slate-50/30">
            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-slate-800">
                    {selectedCategory === "All"
                      ? "All Templates"
                      : selectedCategory}
                  </h3>
                  <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                    {filteredTemplates.length} available
                  </span>
                </div>

                {filteredTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <p className="text-sm font-medium text-slate-600">
                      No templates found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting your search query or choosing another
                      category.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredTemplates.map((template) => (
                      <div
                        key={template.id}
                        onMouseEnter={() => setHoveredCard(template.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                        className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col"
                      >
                        {/* Mockup Preview Thumbnail */}
                        <div className="h-44 bg-slate-100 relative flex items-center justify-center p-4 border-b border-slate-100 overflow-hidden">
                          <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200/60 p-3 flex flex-col justify-between shadow-sm">
                            <div className="w-2/3 h-2.5 bg-slate-300 rounded-full mx-auto mb-2"></div>
                            <div className="space-y-1.5">
                              {template.fields.slice(0, 2).map((field, idx) => (
                                <div
                                  key={idx}
                                  className="w-full h-5 bg-white border border-slate-200 rounded text-[9px] px-2 flex items-center text-slate-400 truncate"
                                >
                                  {field.label}
                                </div>
                              ))}
                            </div>
                            <div className="w-1/3 h-4 bg-indigo-500 rounded mx-auto shadow-sm"></div>
                          </div>

                          {/* Hover Overlay Action Overlay */}
                          {hoveredCard === template.id && (
                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 transition-all animate-in fade-in duration-150">
                              <button
                                onClick={() => setPreviewTemplate(template)}
                                className="w-36 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-full shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95"
                              >
                                <Eye className="w-3.5 h-3.5" /> Preview
                              </button>
                              <button
                                onClick={() => handleUseTemplate(template)}
                                className="w-36 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-full shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95"
                              >
                                <Check className="w-3.5 h-3.5" /> Use Template
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Card Footer Details */}
                        <div className="p-3.5 bg-white flex flex-col gap-1">
                          <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">
                            {template.category}
                          </span>
                          <h4 className="text-sm font-medium text-slate-700 truncate">
                            {template.title}
                          </h4>
                          <p className="text-xs text-slate-400 line-clamp-1">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED PREVIEW MODAL */}
      {previewTemplate && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6">
          <div className="relative w-full max-w-6xl h-[82vh] bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  {previewTemplate.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {previewTemplate.description}
                </p>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left Side: Live Form Mockup Simulation */}
              <div className="flex-1 bg-slate-100/60 p-8 flex items-center justify-center overflow-y-auto">
                <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl p-8 flex flex-col justify-between">
                  <h2 className="text-2xl font-bold text-center mb-6 tracking-wide text-slate-800">
                    {previewTemplate.title}
                  </h2>

                  <div className="space-y-4 mb-8">
                    {previewTemplate.fields.map((field) => (
                      <div key={field.id} className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600">
                          {field.label}
                        </label>
                        <div className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 flex items-center text-sm text-slate-400 shadow-sm">
                          {field.placeholder ||
                            (field.options
                              ? `Select option (${field.options.length} available)...`
                              : "Enter value...")}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-medium shadow-md transition-all">
                    Submit Form
                  </button>
                </div>
              </div>

              {/* Right Side: Related Category Templates */}
              <div className="w-80 border-l border-slate-200 bg-slate-50/70 p-5 overflow-y-auto space-y-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  More in {previewTemplate.category}
                </h4>

                {similarTemplates.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No other templates found in this category.
                  </p>
                ) : (
                  similarTemplates.map((sim) => (
                    <div
                      key={sim.id}
                      onClick={() => setPreviewTemplate(sim)}
                      className="group cursor-pointer bg-white border border-slate-200 hover:border-indigo-400 rounded-xl p-3 shadow-sm transition-all"
                    >
                      <div className="h-16 bg-slate-100 rounded-lg border border-slate-200/60 mb-2 flex items-center justify-center text-xs font-medium text-slate-500 px-2 truncate">
                        {sim.title}
                      </div>
                      <h5 className="text-xs font-medium text-slate-700 group-hover:text-indigo-600 transition-colors truncate">
                        {sim.title}
                      </h5>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="py-4 px-6 bg-slate-50 border-t border-slate-200 flex justify-center">
              <button
                onClick={() => handleUseTemplate(previewTemplate)}
                className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-full shadow-md transition-all"
              >
                Use this template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
