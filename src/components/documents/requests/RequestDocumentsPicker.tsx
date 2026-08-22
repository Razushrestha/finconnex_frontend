"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, MinusCircle, Pencil, Plus } from "lucide-react";
import {
  REQUEST_DOC_CATEGORIES,
  REQUEST_DOC_TEMPLATES,
  readCatalogDescriptionOverrides,
  writeCatalogDescriptionOverride,
  type RequestDocItem,
} from "@/lib/documents/requests/catalog";
import { cn } from "@/lib/utils";
import { EditDocumentModal } from "@/components/documents/requests/EditDocumentModal";

type Slot = 1 | 2;

export function firstNameOf(full: string, fallback: string) {
  const part = full.trim().split(/\s+/)[0];
  return part || fallback;
}

function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border",
        checked
          ? "border-[#5A32A3] bg-[#5A32A3] text-white"
          : "border-slate-300 bg-white",
      )}
    >
      {checked ? (
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
          <path
            d="M2.5 6.2 5 8.7 9.5 3.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </button>
  );
}

interface RequestDocumentsPickerProps {
  applicant1: string;
  applicant2: string;
  twoApplicants: boolean;
  selected: Record<Slot, string[]>;
  onChange: (next: Record<Slot, string[]>) => void;
  extras: Record<string, RequestDocItem[]>;
  onExtrasChange: (next: Record<string, RequestDocItem[]>) => void;
  descriptionOverrides?: Record<string, string>;
  onDescriptionOverridesChange?: (next: Record<string, string>) => void;
  template?: string;
  onTemplateChange?: (template: string) => void;
  error?: string;
}

export function RequestDocumentsPicker({
  applicant1,
  applicant2,
  twoApplicants,
  selected,
  onChange,
  extras,
  onExtrasChange,
  descriptionOverrides,
  onDescriptionOverridesChange,
  template: templateProp,
  onTemplateChange,
  error,
}: RequestDocumentsPickerProps) {
  const [openId, setOpenId] = useState<string | null>("identification");
  const [internalTemplate, setInternalTemplate] = useState("");
  const template = templateProp ?? internalTemplate;
  const [templateQ, setTemplateQ] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [globalDescs, setGlobalDescs] = useState<Record<string, string>>({});
  const [internalLocalDescs, setInternalLocalDescs] = useState<
    Record<string, string>
  >({});
  const localDescs = descriptionOverrides ?? internalLocalDescs;

  function setLocalDescs(next: Record<string, string>) {
    if (onDescriptionOverridesChange) onDescriptionOverridesChange(next);
    else setInternalLocalDescs(next);
  }
  const [editing, setEditing] = useState<{
    catId: string;
    item: RequestDocItem;
  } | null>(null);

  const name1 = firstNameOf(applicant1, "Applicant");
  const name2 = firstNameOf(applicant2, "Applicant 2");
  const requestFrom = twoApplicants ? `${name1} and ${name2}` : name1;

  const templates = useMemo(() => {
    const q = templateQ.trim().toLowerCase();
    if (!q) return REQUEST_DOC_TEMPLATES;
    return REQUEST_DOC_TEMPLATES.filter((t) => t.toLowerCase().includes(q));
  }, [templateQ]);

  useEffect(() => {
    setGlobalDescs(readCatalogDescriptionOverrides());
  }, []);

  useEffect(() => {
    if (!templateOpen) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-template-menu]")) return;
      setTemplateOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setTemplateOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [templateOpen]);

  function resolveDescription(item: RequestDocItem) {
    return localDescs[item.id] ?? globalDescs[item.id] ?? item.description;
  }

  function itemsFor(catId: string, base: RequestDocItem[]) {
    return [...base, ...(extras[catId] ?? [])].map((item) => ({
      ...item,
      description: resolveDescription(item),
    }));
  }

  function isOn(slot: Slot, id: string) {
    return selected[slot].includes(id);
  }

  function toggle(slot: Slot, id: string) {
    const next = { ...selected, [slot]: [...selected[slot]] };
    next[slot] = next[slot].includes(id)
      ? next[slot].filter((x) => x !== id)
      : [...next[slot], id];
    onChange(next);
  }

  function countForCategory(catId: string, base: RequestDocItem[], slot: Slot) {
    const ids = new Set(itemsFor(catId, base).map((i) => i.id));
    return selected[slot].filter((id) => ids.has(id)).length;
  }

  function clearCategory(catId: string, base: RequestDocItem[]) {
    const ids = new Set(itemsFor(catId, base).map((i) => i.id));
    onChange({
      1: selected[1].filter((id) => !ids.has(id)),
      2: selected[2].filter((id) => !ids.has(id)),
    });
  }

  function setTemplate(name: string) {
    if (onTemplateChange) onTemplateChange(name);
    else setInternalTemplate(name);
  }

  function applyTemplate(name: string) {
    setTemplate(name);
    const pick: string[] = [];
    if (name.includes("PAYG")) {
      pick.push("id-licence", "payg-payslips", "payg-salary-credits", "other-living");
    } else if (name.includes("Asset")) {
      pick.push("id-licence", "asset-contract", "asset-funds", "other-living");
    } else if (name.includes("refinance")) {
      pick.push(
        "id-licence",
        "payg-payslips",
        "liab-home",
        "prop-rates",
        "other-living",
      );
    } else {
      pick.push(
        "id-licence",
        "payg-payslips",
        "prop-contract",
        "other-living",
      );
    }
    onChange({ 1: pick, 2: twoApplicants ? pick : [] });
  }

  function addDocument(catId: string) {
    const title = newTitle.trim();
    if (!title) return;
    const item: RequestDocItem = {
      id: `custom-${catId}-${Date.now()}`,
      title,
      description: "Custom document request",
    };
    onExtrasChange({ ...extras, [catId]: [...(extras[catId] ?? []), item] });
    setNewTitle("");
    setAddingFor(null);
  }

  function saveEdit(
    catId: string,
    id: string,
    description: string,
    applyToTemplates: boolean,
  ) {
    const nextDesc = description.trim();
    const list = extras[catId] ?? [];
    if (list.some((i) => i.id === id)) {
      onExtrasChange({
        ...extras,
        [catId]: list.map((i) =>
          i.id === id ? { ...i, description: nextDesc } : i,
        ),
      });
    }
    if (applyToTemplates) {
      writeCatalogDescriptionOverride(id, nextDesc);
      setGlobalDescs((prev) => ({ ...prev, [id]: nextDesc }));
      const copy = { ...localDescs };
      delete copy[id];
      setLocalDescs(copy);
    } else {
      setLocalDescs({ ...localDescs, [id]: nextDesc });
    }
    setEditing(null);
  }

  const slots: Slot[] = twoApplicants ? [1, 2] : [1];

  return (
    <section className="mt-5">
      <h2 className="text-[18px] font-bold text-slate-900">Request documents</h2>
      <p className="mt-1 text-[13px] text-slate-500">
        Select which documents to request from {requestFrom}
      </p>

      <div className="relative mt-4" data-template-menu="">
        <label className="mb-1 block text-[12px] font-medium text-slate-600">
          Select a template (optional)
        </label>
        <div className="relative">
          <input
            value={templateQ || template}
            onFocus={() => setTemplateOpen(true)}
            onClick={() => setTemplateOpen(true)}
            onChange={(e) => {
              setTemplateQ(e.target.value);
              setTemplate("");
              setTemplateOpen(true);
            }}
            placeholder="Search..."
            className={cn(
              "h-10 w-full rounded-lg border bg-white pr-11 pl-3 text-[13px] outline-none",
              templateOpen
                ? "border-[#5A32A3] bg-[#F3ECFB]"
                : "border-slate-200 focus:border-[#5A32A3]/45 focus:ring-2 focus:ring-[#5A32A3]/12",
            )}
          />
          <button
            type="button"
            aria-label={templateOpen ? "Close templates" : "Open templates"}
            onClick={() => setTemplateOpen((v) => !v)}
            className={cn(
              "absolute top-1/2 right-1.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md",
              templateOpen ? "bg-[#EDE4FB] text-[#5A32A3]" : "text-slate-400",
            )}
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5", templateOpen && "rotate-180")}
            />
          </button>
        </div>
        {templateOpen ? (
          <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {templates.length === 0 ? (
              <p className="px-3 py-2 text-[12px] text-slate-400">No templates</p>
            ) : (
              templates.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    applyTemplate(t);
                    setTemplateQ("");
                    setTemplateOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-[13px] text-slate-800 hover:bg-[#F3ECFB]"
                >
                  {t}
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-3 space-y-2">
        {REQUEST_DOC_CATEGORIES.map((cat) => {
          const open = openId === cat.id;
          const items = itemsFor(cat.id, cat.items);
          const count1 = countForCategory(cat.id, cat.items, 1);
          const count2 = countForCategory(cat.id, cat.items, 2);
          const total = count1 + (twoApplicants ? count2 : 0);

          return (
            <div key={cat.id}>
              {cat.separated ? (
                <div className="my-3 border-t border-slate-200" />
              ) : null}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : cat.id)}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left"
                >
                  <span className="min-w-0 flex-1 text-[14px] font-bold text-slate-900">
                    {cat.label}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[13px] font-semibold text-[#5A32A3]">
                      {twoApplicants ? `${name1} / ${name2}` : name1}
                    </span>
                    <span className="flex items-center justify-end gap-1 text-[11px] text-slate-400">
                      {total} selected
                      {total > 0 ? (
                        <MinusCircle
                          className="h-3.5 w-3.5 text-rose-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearCategory(cat.id, cat.items);
                          }}
                        />
                      ) : null}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-[#5A32A3] transition-transform",
                      open && "rotate-180",
                    )}
                  />
                </button>

                {open ? (
                  cat.id === "external" ? (
                    <div className="border-t border-slate-100 px-3 py-2.5">
                      <div className="flex items-start gap-2.5 rounded-lg bg-slate-100 px-3 py-2">
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[13px]"
                          aria-hidden
                        >
                          ☝️
                        </span>
                        <p className="text-[13px] leading-snug text-slate-600">
                          {twoApplicants
                            ? `${name1} and ${name2} need to provide their bank statement link before you can request this.`
                            : `${name1} needs to provide their bank statement link before you can request this.`}
                        </p>
                      </div>
                    </div>
                  ) : (
                  <div className="border-t border-slate-100 px-3 pb-3">
                    {items.map((item) => {
                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-2 border-b border-slate-100 py-1.5 last:border-b-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold leading-tight text-[#3d246e]">
                              {item.title}
                            </p>
                            <p className="mt-px text-[12px] leading-snug text-slate-500">
                              {item.description}
                            </p>
                          </div>
                          <button
                            type="button"
                            aria-label={`Edit ${item.title}`}
                            onClick={() => setEditing({ catId: cat.id, item })}
                            className="mt-0.5 shrink-0 text-[#5A32A3]/70 hover:text-[#5A32A3]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <div className="mt-0.5 flex shrink-0 gap-2">
                            {slots.map((slot) => (
                              <div key={slot} className="flex flex-col items-center gap-0.5">
                                {twoApplicants ? (
                                  <span className="text-[9px] font-medium text-slate-400">
                                    {slot === 1 ? name1 : name2}
                                  </span>
                                ) : null}
                                <Checkbox
                                  checked={isOn(slot, item.id)}
                                  onChange={() => toggle(slot, item.id)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {addingFor === cat.id ? (
                      <div className="mt-2 flex gap-2">
                        <input
                          autoFocus
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="Document name"
                          className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-[#5A32A3]/45"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addDocument(cat.id);
                            if (e.key === "Escape") setAddingFor(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => addDocument(cat.id)}
                          className="h-9 rounded-lg bg-[#5A32A3] px-3 text-[12px] font-semibold text-white"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingFor(cat.id)}
                        className="mt-1.5 flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#5A32A3] text-[13px] font-semibold text-slate-800 hover:bg-[#F3ECFB]"
                      >
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#5A32A3] text-white">
                          <Plus className="h-2.5 w-2.5" strokeWidth={3} />
                        </span>
                        Add new document
                      </button>
                    )}
                  </div>
                  )
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {error ? (
        <p className="mt-2 text-[12px] font-medium text-rose-500">{error}</p>
      ) : null}

      {editing ? (
        <EditDocumentModal
          title={editing.item.title}
          description={editing.item.description}
          onClose={() => setEditing(null)}
          onConfirm={(description, applyToTemplates) =>
            saveEdit(editing.catId, editing.item.id, description, applyToTemplates)
          }
        />
      ) : null}
    </section>
  );
}
