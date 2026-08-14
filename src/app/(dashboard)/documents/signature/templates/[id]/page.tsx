"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Send,
  Type,
  Calendar,
  FileSignature,
  CheckSquare,
  Trash2,
  Settings,
  Info,
} from "lucide-react";

interface FormField {
  id: string;
  type: "text" | "signature" | "date" | "checkbox";
  label: string;
  recipient: string;
  required: boolean;
  x: number;
  y: number;
}

export default function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();

  const resolvedParams = use(params);
  const templateId = resolvedParams.id;

  const [templateName, setTemplateName] = useState(
    "Residential Loan Application",
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [fields, setFields] = useState<FormField[]>([
    {
      id: "field-1",
      type: "text",
      label: "Full Legal Name",
      recipient: "Signer 1",
      required: true,
      x: 15,
      y: 25,
    },
    {
      id: "field-2",
      type: "date",
      label: "Date of Birth",
      recipient: "Signer 1",
      required: true,
      x: 15,
      y: 40,
    },
    {
      id: "field-3",
      type: "signature",
      label: "Client Signature",
      recipient: "Signer 1",
      required: true,
      x: 15,
      y: 75,
    },
  ]);

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  const handleAddField = (type: FormField["type"]) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type,
      label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      recipient: "Signer 1",
      required: true,
      x: 30,
      y: 50,
    };
    setFields([...fields, newField]);
    setSelectedFieldId(newField.id);
  };

  const handleUpdateField = (key: keyof FormField, value: any) => {
    if (!selectedFieldId) return;
    setFields(
      fields.map((f) =>
        f.id === selectedFieldId ? { ...f, [key]: value } : f,
      ),
    );
  };

  const handleDeleteField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-zinc-950 overflow-hidden">
      {/* Top Navigation / Header */}
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-900 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-violet-500 focus:outline-none dark:text-white dark:hover:border-zinc-700 text-sm sm:text-base"
            />
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Template ID: {templateId} • Last modified 2 hours ago
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => alert("Template saved successfully!")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </button>
          <button
            onClick={() => router.push("/documents/signature/create")}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-violet-700 transition-all"
          >
            <Send className="h-4 w-4" />
            Use Template
          </button>
        </div>
      </header>

      {/* Workspace Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Document Canvas (Swapped to Left) */}
        <main className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-100/60 dark:bg-zinc-950">
          <div
            onClick={() => setSelectedFieldId(null)}
            className="relative w-full max-w-2xl h-[850px] bg-white rounded-xl shadow-lg border border-slate-200/80 dark:border-zinc-800 dark:bg-zinc-900 p-12"
          >
            <div className="border-b border-slate-100 dark:border-zinc-800 pb-6 mb-8">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                FINCONNEX MORTGAGE SOLUTIONS
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Standard Residential Lending Agreement Form v2.4
              </p>
            </div>

            {fields.map((field) => {
              const isSelected = field.id === selectedFieldId;
              return (
                <div
                  key={field.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFieldId(field.id);
                  }}
                  style={{ top: `${field.y}%`, left: `${field.x}%` }}
                  className={`absolute cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition-all flex items-center gap-2 border shadow-sm ${
                    isSelected
                      ? "border-violet-600 bg-violet-50/90 text-violet-900 ring-2 ring-violet-400/30 dark:bg-violet-950/80 dark:text-violet-200 dark:border-violet-500"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {field.type === "text" && <Type className="h-3.5 w-3.5" />}
                  {field.type === "signature" && (
                    <FileSignature className="h-3.5 w-3.5" />
                  )}
                  {field.type === "date" && (
                    <Calendar className="h-3.5 w-3.5" />
                  )}
                  {field.type === "checkbox" && (
                    <CheckSquare className="h-3.5 w-3.5" />
                  )}
                  <span>{field.label}</span>
                </div>
              );
            })}
          </div>
        </main>

        {/* Right Fixed Inspector & Toolbar Panel (Swapped to Right) */}
        <aside className="w-80 border-l border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 flex flex-col gap-6 shrink-0 overflow-y-auto">
          {/* Dynamic Field Properties Panel (Appears on top when a field is selected) */}
          {selectedField && (
            <div className="space-y-4 text-xs pb-6 border-b border-slate-100 dark:border-zinc-800 bg-violet-50/40 dark:bg-violet-950/20 p-4 rounded-xl border border-violet-100 dark:border-violet-900/50">
              <div className="flex items-center justify-between border-b border-violet-200/60 dark:border-violet-900/40 pb-2">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <h3 className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                    Field Properties
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedFieldId(null)}
                  className="text-slate-400 hover:text-slate-600 text-[10px]"
                >
                  ✕ Close
                </button>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                  Field Label / Placeholder
                </label>
                <input
                  type="text"
                  value={selectedField.label}
                  onChange={(e) => handleUpdateField("label", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                  Assigned Recipient
                </label>
                <select
                  value={selectedField.recipient}
                  onChange={(e) =>
                    handleUpdateField("recipient", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                >
                  <option value="Signer 1">Signer 1 (Client)</option>
                  <option value="Signer 2">Signer 2 (Broker)</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="font-medium text-slate-700 dark:text-zinc-300">
                  Mandatory Field
                </span>
                <input
                  type="checkbox"
                  checked={selectedField.required}
                  onChange={(e) =>
                    handleUpdateField("required", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleDeleteField(selectedField.id)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove Field
                </button>
              </div>
            </div>
          )}

          {/* Standard Fields Palette */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Standard Fields
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAddField("text")}
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-violet-50 hover:border-violet-200 text-slate-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-violet-950/30 transition-all"
              >
                <Type className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span className="text-[11px] font-medium">Text Field</span>
              </button>
              <button
                onClick={() => handleAddField("signature")}
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-violet-50 hover:border-violet-200 text-slate-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-violet-950/30 transition-all"
              >
                <FileSignature className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span className="text-[11px] font-medium">Signature</span>
              </button>
              <button
                onClick={() => handleAddField("date")}
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-violet-50 hover:border-violet-200 text-slate-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-violet-950/30 transition-all"
              >
                <Calendar className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span className="text-[11px] font-medium">Date</span>
              </button>
              <button
                onClick={() => handleAddField("checkbox")}
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-violet-50 hover:border-violet-200 text-slate-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-violet-950/30 transition-all"
              >
                <CheckSquare className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span className="text-[11px] font-medium">Checkbox</span>
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-zinc-800 pt-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Recipients Setup
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-violet-200 bg-violet-50/50 dark:border-violet-900/50 dark:bg-violet-950/20 text-xs">
                <span className="font-medium text-violet-900 dark:text-violet-300">
                  Signer 1 (Client)
                </span>
                <span className="h-2 w-2 rounded-full bg-violet-600" />
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 text-xs text-slate-600 dark:text-zinc-400">
                <span>Signer 2 (Broker)</span>
                <span className="h-2 w-2 rounded-full bg-slate-400" />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
