"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Package,
  Trash2,
  Filter,
  LayoutGrid,
  FileText,
  Receipt,
  Banknote,
  CheckCircle2,
  Ban,
  Layers,
  ChevronDown,
} from "lucide-react";
import {
  listProducts,
  upsertProduct,
  deleteProduct,
  type FinanceProduct,
} from "@/lib/finance/products/types";
import {
  deleteCrmProduct,
  isCrmProductId,
  persistRemoteProduct,
  toUpdateProductBody,
  tryCrmProduct,
  updateCrmProduct,
} from "@/lib/finance/products/api";
import { useCrmProducts } from "@/lib/finance/products/use-crm-products";
import { PRODUCT_STATUS_STYLE } from "@/lib/finance/statusStyles";
import { cn } from "@/lib/utils";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { CreateProductForm } from "@/components/finance/products/CreateProductForm";

const MODULE_PILLS = [
  { href: "/finance/products", label: "Items", icon: Package, match: "prefix" as const },
  { href: "/finance/estimates", label: "Estimates", icon: FileText, match: "prefix" as const },
  { href: "/finance/quotations", label: "Quotations", icon: FileText, match: "prefix" as const },
  { href: "/finance/invoices", label: "Invoices", icon: Receipt, match: "prefix" as const },
  { href: "/finance/payments", label: "Payments", icon: Banknote, match: "prefix" as const },
];

export default function ProductsPage() {
  const router = useRouter();
  const crm = useCrmProducts();
  const [rows, setRows] = useState<FinanceProduct[]>([]);
  const [search, setSearch] = useState("");
  const [listFilter, setListFilter] = useState<"all" | "Product" | "Service" | "Active" | "Inactive">(
    "all",
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);

  function refresh() {
    setRows(listProducts());
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("create") !== "1") return;
    setCreateOpen(true);
    router.replace("/finance/products", { scroll: false });
  }, [router]);

  useEffect(() => {
    if (crm.loading) return;
    refresh();
  }, [crm.source, crm.loading]);

  const filtered = useMemo(() => {
    let data = rows;
    if (listFilter === "Product" || listFilter === "Service") {
      data = data.filter((r) => r.type === listFilter);
    }
    if (listFilter === "Active" || listFilter === "Inactive") {
      data = data.filter((r) => r.status === listFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q) ||
          r.unit.toLowerCase().includes(q),
      );
    }
    return data;
  }, [rows, listFilter, search]);

  useEffect(() => {
    setPage(1);
  }, [search, listFilter]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const activeCount = rows.filter((r) => r.status === "Active").length;
  const inactiveCount = rows.filter((r) => r.status === "Inactive").length;
  const categoryCount = new Set(rows.map((r) => r.type)).size;

  const allVisibleSelected =
    paginated.length > 0 && paginated.every((r) => selected.includes(r.id));

  function toggleStatus(p: FinanceProduct) {
    const nextStatus = p.status === "Active" ? "Inactive" : "Active";
    const updated: FinanceProduct = { ...p, status: nextStatus };
    upsertProduct(updated);
    refresh();
    if (isCrmProductId(p.id)) {
      void tryCrmProduct(() =>
        updateCrmProduct(p.id, toUpdateProductBody({ status: nextStatus })),
      ).then((remote) => {
        if (remote) persistRemoteProduct(remote);
      });
    }
  }

  function onDeleteItem(e: React.MouseEvent, p: FinanceProduct) {
    e.stopPropagation();
    if (!window.confirm(`Delete ${p.name}?`)) return;
    deleteProduct(p.id);
    setSelected((ids) => ids.filter((id) => id !== p.id));
    refresh();
    if (isCrmProductId(p.id)) {
      void tryCrmProduct(() => deleteCrmProduct(p.id));
    }
  }

  function goCreate() {
    setCreateOpen(true);
  }

  return (
    <div className="min-h-full w-full bg-[#F4F7FB] p-4 sm:p-6 lg:p-8 text-slate-900">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-bold tracking-tight text-slate-900">Items / Services</h1>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                crm.source === "api"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-600",
              )}
            >
              {crm.source === "api" ? "Live CRM" : crm.loading ? "Connecting…" : "Demo"}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-slate-400">
            Manage your catalogue of items, services, taxes and more.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search catalogue..."
              className="h-10 w-full rounded-full border border-slate-200 bg-white pr-4 pl-9 text-sm outline-none focus:border-violet-400"
            />
          </div>
          <button
            type="button"
            onClick={goCreate}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#6D5AE6] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/20 hover:bg-[#5B4BD4]"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {MODULE_PILLS.map((item) => {
            const active = item.href === "/finance/products";
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold",
                  active
                    ? "bg-[#6D5AE6] text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <KpiChip
            icon={Package}
            label="Total Items"
            value={rows.length}
            tone="violet"
          />
          <KpiChip icon={CheckCircle2} label="Active" value={activeCount} tone="emerald" />
          <KpiChip icon={Ban} label="Inactive" value={inactiveCount} tone="rose" />
          <KpiChip icon={Layers} label="Categories" value={categoryCount} tone="sky" hint="Product / Service types" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                <Package className="h-3.5 w-3.5" />
              </span>
              Items List
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-400">
              View and manage all your items and services in one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
              <Filter className="h-3.5 w-3.5 text-violet-500" />
              Filter
            </span>
            <label className="relative">
              <select
                value={listFilter}
                onChange={(e) =>
                  setListFilter(e.target.value as typeof listFilter)
                }
                className="appearance-none rounded-full border border-slate-200 bg-white py-2 pr-8 pl-3 text-xs font-semibold text-slate-700"
              >
                <option value="all">All Items</option>
                <option value="Product">Products</option>
                <option value="Service">Services</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </label>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400">
              <LayoutGrid className="h-4 w-4" />
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-[#F7F5FF] text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                <th className="px-5 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelected((ids) => [
                          ...new Set([...ids, ...paginated.map((r) => r.id)]),
                        ]);
                      } else {
                        const hide = new Set(paginated.map((r) => r.id));
                        setSelected((ids) => ids.filter((id) => !hide.has(id)));
                      }
                    }}
                    className="rounded border-slate-300"
                    aria-label="Select all visible items"
                  />
                </th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Tax</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
                      <Package className="h-7 w-7" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No catalogue items found</p>
                    <p className="mt-1 text-[12px] text-slate-400">
                      Start by adding your first item or service to your catalogue.
                    </p>
                    <button
                      type="button"
                      onClick={goCreate}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#6D5AE6] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5B4BD4]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Item
                    </button>
                  </td>
                </tr>
              ) : (
                paginated.map((r) => (
                  <tr key={r.id} className="border-t border-slate-50 hover:bg-violet-50/40">
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(r.id)}
                        onChange={(e) => {
                          setSelected((ids) =>
                            e.target.checked ? [...ids, r.id] : ids.filter((id) => id !== r.id),
                          );
                        }}
                        className="rounded border-slate-300"
                        aria-label={`Select ${r.name}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{r.name}</div>
                      <div className="text-[11px] text-slate-400">{r.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{r.type}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{r.unit}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{r.taxRate}%</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleStatus(r)}
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                          PRODUCT_STATUS_STYLE[r.status],
                        )}
                        title="Toggle active"
                      >
                        {r.status}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => onDeleteItem(e, r)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                        title="Delete item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar
          page={safePage}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          entriesLabel="items"
        />
      </div>

      <CreateProductForm
        variant="modal"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => refresh()}
      />
    </div>
  );
}

function KpiChip({
  icon: Icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: typeof Package;
  label: string;
  value: number;
  tone: "violet" | "emerald" | "rose" | "sky";
  hint?: string;
}) {
  const tones = {
    violet: "bg-violet-50 text-violet-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    sky: "bg-sky-50 text-sky-700",
  };
  const iconBox = {
    violet: "bg-violet-100 text-violet-600",
    emerald: "bg-emerald-100 text-emerald-600",
    rose: "bg-rose-100 text-rose-600",
    sky: "bg-sky-100 text-sky-600",
  };
  return (
    <div className={cn("flex min-w-[120px] items-center gap-2 rounded-2xl px-3 py-2", tones[tone])}>
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", iconBox[tone])}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
        <p className="text-lg font-bold leading-tight">{value}</p>
        {hint ? <p className="text-[9px] font-medium opacity-70">{hint}</p> : null}
      </div>
    </div>
  );
}
