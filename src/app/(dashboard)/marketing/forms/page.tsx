"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Check,
} from "lucide-react";
import {
  FORM_STATUSES,
  type FormStatus,
  type MarketingForm,
} from "@/lib/marketing/forms/types";
import {
  CampaignHeader,
  MarketingListShell,
  StatusDropdown,
  DataTable,
  type DataTableColumn,
} from "@/components/marketing/index";
import { SearchInput } from "@/components/ui/search-input";
import { CreateFormModal } from "@/components/marketing/forms/CreateFormModal";
import { NameFormModal } from "@/components/marketing/forms/NameFormModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function MarketingFormsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<MarketingForm[]>([]);
  const [statusTab, setStatusTab] = useState<FormStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Load stored forms from localStorage on mount
  useEffect(() => {
    const savedForms = localStorage.getItem("marketing_forms_storage");
    if (savedForms) {
      try {
        setRows(JSON.parse(savedForms));
      } catch (e) {
        console.error("Failed to parse saved forms", e);
      }
    }
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusTab, search]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(FORM_STATUSES.map((s) => [s, 0])) as Record<
      FormStatus,
      number
    >;
    for (const r of rows) map[r.status] += 1;
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    let data = rows;
    if (statusTab !== "All") data = data.filter((r) => r.status === statusTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.formId.toLowerCase().includes(q) ||
          r.embedSlug.toLowerCase().includes(q),
      );
    }
    return data;
  }, [rows, statusTab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const handleDeleteForm = (
    formId: string,
    embedSlug: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this form?")) return;

    setRows((prev) => {
      const updated = prev.filter((r) => r.id !== formId);
      localStorage.setItem("marketing_forms_storage", JSON.stringify(updated));
      return updated;
    });

    // Clean up schema storage
    localStorage.removeItem(`form_schema_${embedSlug}`);
  };

  const handleEditForm = (form: MarketingForm, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(
      `/marketing/forms/create?layoutid=standard&redirect=false&slug=${encodeURIComponent(
        form.embedSlug,
      )}&name=${encodeURIComponent(form.name)}`,
    );
  };

  const handleCopyUrl = (
    embedSlug: string,
    formId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    const fullUrl = `${window.location.origin}/forms/view/${embedSlug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(formId);
    setTimeout(() => {
      setCopiedId((curr) => (curr === formId ? null : curr));
    }, 2000);
  };

  const columns: DataTableColumn<MarketingForm>[] = [
    {
      key: "name",
      header: "Form",
      className: "max-w-[220px]",
      render: (f) => (
        <>
          <p className="truncate text-[13px] font-semibold text-slate-900">
            {f.name}
          </p>
        </>
      ),
    },
    {
      key: "embedSlug",
      header: "Public URL",
      render: (f) => {
        const fullUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}/forms/view/${f.embedSlug}`
            : `/forms/view/${f.embedSlug}`;

        return (
          <Link
            href={`/forms/view/${f.embedSlug}`}
            target="_blank"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 font-mono text-[13px] text-violet-700 hover:underline"
          >
            {fullUrl}
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right w-[100px]",
      render: (f) => (
        <div
          className="flex items-center justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-slate-900"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={(e) => handleCopyUrl(f.embedSlug, f.id, e)}
              >
                {copiedId === f.id ? (
                  <>
                    <Check className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-medium">
                      Copied!
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-3.5 w-3.5" />
                    Copy URL
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleEditForm(f, e)}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={(e) => handleDeleteForm(f.id, f.embedSlug, e)}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const handleConfirmName = (name: string) => {
    const newFormId = crypto.randomUUID();
    const slug = name.toLowerCase().trim().replace(/\s+/g, "-");

    const newEntry: MarketingForm = {
      id: newFormId,
      formId: newFormId.slice(0, 8),
      name,
      embedSlug: slug,
      destination: "Lead",
      status: "Draft",
      fields: 1,
      submissions: 0,
      updatedAt: "Just now",
      fieldDefs: [],
      createdBy: "User",
    };

    // 1. Save list metadata
    setRows((prev) => {
      const updated = [newEntry, ...prev];
      localStorage.setItem("marketing_forms_storage", JSON.stringify(updated));
      return updated;
    });

    // 2. Initialize default schema immediately so public link works right away
    const initialFormSchema = {
      title: name,
      themeId: "default",
      pages: [
        {
          id: crypto.randomUUID(),
          title: "General Information",
          hidden: false,
          fields: [
            {
              id: crypto.randomUUID(),
              type: "text",
              label: "Full Name",
              required: true,
            },
          ],
        },
      ],
    };
    localStorage.setItem(
      `form_schema_${slug}`,
      JSON.stringify(initialFormSchema),
    );

    // Navigate to the builder page
    router.push(
      `/marketing/forms/create?layoutid=standard&redirect=false&slug=${encodeURIComponent(
        slug,
      )}&name=${encodeURIComponent(name)}`,
    );
  };

  return (
    <MarketingListShell>
      <CampaignHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Marketing" },
          { label: "Forms" },
        ]}
        title="Forms"
        totalCount={filtered.length}
        onCreate={() => setCreateModalOpen(true)}
        createLabel="New form"
      />

      <CreateFormModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSelectBlank={() => {
          setCreateModalOpen(false);
          setNameModalOpen(true);
        }}
        onSelectAi={() => {
          setCreateModalOpen(false);
          router.push("/marketing/forms/create?layoutid=ai&redirect=false");
        }}
        onSelectTemplates={() => {
          setCreateModalOpen(false);
          router.push("/marketing/forms/templates");
        }}
      />

      <NameFormModal
        open={nameModalOpen}
        onOpenChange={setNameModalOpen}
        onConfirm={handleConfirmName}
      />

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-1 py-2">
        <StatusDropdown
          statuses={FORM_STATUSES}
          counts={counts}
          totalCount={rows.length}
          value={statusTab}
          onChange={setStatusTab}
        />
        <SearchInput value={search} onChange={setSearch} />
      </div>

      <DataTable
        columns={columns}
        rows={paginated}
        getRowKey={(f) => f.id}
        onRowClick={(f) => router.push(`/marketing/forms/${f.id}`)}
        page={safePage}
        pageSize={pageSize}
        totalCount={filtered.length}
        onPageChange={setPage}
        emptyState={
          <>
            <ClipboardList className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            No forms found.
          </>
        }
      />
    </MarketingListShell>
  );
}
