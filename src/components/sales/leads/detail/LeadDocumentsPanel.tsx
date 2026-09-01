"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  LayoutList,
  MoreVertical,
  Plus,
  Search,
} from "lucide-react";
import { avatarColor, initials } from "@/lib/activities/shared";
import { relatedMatchesLead } from "@/lib/leads/activity-index";
import { parseFlexibleDate } from "@/lib/leads/activity-dates";
import { leadSendHref } from "@/lib/leads/convert-actions";
import { financeMatchesEntity, namesEqual } from "@/lib/related-entity";
import { onRecordsChange } from "@/lib/records-sync";
import { createAttachment, listAttachments } from "@/lib/attachments/store";
import { DocumentRequestsList } from "@/components/documents/requests/DocumentRequestsList";
import {
  listDocumentRequests,
  type DocumentRequest,
} from "@/lib/documents/requests/types";
import {
  DOCUMENT_DISPLAY_STATUS_FILTERS,
  filterDocumentRequests,
  type DocumentStatusFilter,
} from "@/lib/documents/requests/dashboard";
import { listSignatureRequests } from "@/lib/documents/signature/types";
import { listEstimates } from "@/lib/finance/estimates/types";
import { listQuotations } from "@/lib/finance/quotations/types";
import { listInvoices } from "@/lib/finance/invoices/types";
import { formatAUD } from "@/lib/finance/shared";
import {
  ESTIMATE_STATUS_STYLE,
  INVOICE_STATUS_STYLE,
  QUOTATION_STATUS_STYLE,
} from "@/lib/finance/statusStyles";
import type { LeadCardData } from "@/lib/leads/types";
import { cn } from "@/lib/utils";

const FILE_PAGE_SIZE = 10;

type FileCategory =
  | "Pre-Approval"
  | "Formal Approval"
  | "Property"
  | "Bank Statement"
  | "Income"
  | "ID"
  | "Tax";

type FileRow = {
  id: string;
  name: string;
  detail: string;
  kind: "PDF" | "XLSX" | "JPG";
  category: FileCategory;
  uploadedBy: string;
  uploadedOn: Date;
  size: string;
};

const CATEGORY_TONE: Record<FileCategory, string> = {
  "Pre-Approval": "bg-violet-50 text-violet-700",
  "Formal Approval": "bg-sky-50 text-sky-700",
  Property: "bg-pink-50 text-pink-700",
  "Bank Statement": "bg-cyan-50 text-cyan-700",
  Income: "bg-emerald-50 text-emerald-700",
  ID: "bg-orange-50 text-orange-700",
  Tax: "bg-slate-100 text-slate-600",
};

type DocTab =
  | "requests"
  | "esign"
  | "proposals"
  | "quotes"
  | "invoices"
  | "files";

type EsignStatus = "Pending Signature" | "Signed" | "Viewed" | "Expired";

type EsignRow = {
  id: string;
  name: string;
  kind: "PDF" | "DOCX";
  category: string;
  signed: number;
  total: number;
  warning?: boolean;
  sentOn: Date;
  due: Date;
  status: EsignStatus;
  href?: string | null;
};

const TABS: { id: DocTab; label: string }[] = [
  { id: "requests", label: "Requests" },
  { id: "esign", label: "E-Sign" },
  { id: "proposals", label: "Proposals" },
  { id: "quotes", label: "Quotes" },
  { id: "invoices", label: "Invoices" },
  { id: "files", label: "All Files" },
];

function atOffset(now: Date, days: number) {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(10, 0, 0, 0);
  return d;
}

function formatDate(at: Date) {
  return at.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function dueLabel(due: Date, now: Date) {
  const dueDay = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
  const nowDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((dueDay - nowDay) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1) return `In ${days} Days`;
  return "Expired";
}

function statusTone(status: EsignStatus) {
  if (status === "Signed") return "bg-emerald-50 text-emerald-700";
  if (status === "Viewed") return "bg-sky-50 text-sky-700";
  if (status === "Expired") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

function actionFor(status: EsignStatus) {
  if (status === "Signed") return "View";
  if (status === "Expired") return "Resend";
  if (status === "Viewed") return "Remind";
  return "Remind";
}

function isEsignCompleted(status: EsignStatus) {
  return status === "Signed";
}

function pendingUrgency(row: EsignRow) {
  if (row.status === "Expired") return 0;
  if (row.status === "Pending Signature") return 1;
  if (row.status === "Viewed") return 2;
  return 3;
}

function seedEsign(card: LeadCardData, now: Date): EsignRow[] {
  return [
    {
      id: `${card.id}-es-1`,
      name: "Authority to Act",
      kind: "PDF",
      category: "Application",
      signed: 1,
      total: 2,
      sentOn: atOffset(now, -4),
      due: atOffset(now, 2),
      status: "Pending Signature",
    },
    {
      id: `${card.id}-es-2`,
      name: "Privacy Collection Statement",
      kind: "PDF",
      category: "Compliance",
      signed: 2,
      total: 2,
      sentOn: atOffset(now, -5),
      due: atOffset(now, 1),
      status: "Signed",
    },
    {
      id: `${card.id}-es-3`,
      name: "Loan Application Form",
      kind: "DOCX",
      category: "Application",
      signed: 1,
      total: 2,
      sentOn: atOffset(now, -3),
      due: atOffset(now, 0),
      status: "Viewed",
    },
    {
      id: `${card.id}-es-4`,
      name: "Credit Guide",
      kind: "PDF",
      category: "Application",
      signed: 2,
      total: 2,
      sentOn: atOffset(now, -6),
      due: atOffset(now, -1),
      status: "Pending Signature",
    },
    {
      id: `${card.id}-es-5`,
      name: "Client Consent",
      kind: "PDF",
      category: "Compliance",
      signed: 2,
      total: 2,
      warning: true,
      sentOn: atOffset(now, -10),
      due: atOffset(now, -6),
      status: "Expired",
    },
    {
      id: `${card.id}-es-6`,
      name: "Credit Proposal Acknowledgement",
      kind: "PDF",
      category: "Application",
      signed: 2,
      total: 2,
      sentOn: atOffset(now, -14),
      due: atOffset(now, -7),
      status: "Signed",
    },
  ];
}

function seedFiles(card: LeadCardData, now: Date): FileRow[] {
  const owner = card.owner;
  const client = card.name;
  return [
    { id: `${card.id}-f1`, name: "Pre-approval letter.pdf", detail: "From Westpac", kind: "PDF", category: "Pre-Approval", uploadedBy: owner, uploadedOn: atOffset(now, -7), size: "245 KB" },
    { id: `${card.id}-f2`, name: "Conditional approval.pdf", detail: "Lender conditions attached", kind: "PDF", category: "Formal Approval", uploadedBy: owner, uploadedOn: atOffset(now, -6), size: "312 KB" },
    { id: `${card.id}-f3`, name: "Contract of sale.pdf", detail: "Property purchase contract", kind: "PDF", category: "Property", uploadedBy: owner, uploadedOn: atOffset(now, -6), size: "1.8 MB" },
    { id: `${card.id}-f4`, name: "Bank statement - Jun.pdf", detail: "From Westpac", kind: "PDF", category: "Bank Statement", uploadedBy: client, uploadedOn: atOffset(now, -5), size: "890 KB" },
    { id: `${card.id}-f5`, name: "Bank statement - May.pdf", detail: "From Westpac", kind: "PDF", category: "Bank Statement", uploadedBy: client, uploadedOn: atOffset(now, -5), size: "874 KB" },
    { id: `${card.id}-f6`, name: "Payslip - July.pdf", detail: "Most recent pay cycle", kind: "PDF", category: "Income", uploadedBy: client, uploadedOn: atOffset(now, -4), size: "210 KB" },
    { id: `${card.id}-f7`, name: "Payslip - June.pdf", detail: "PAYG income evidence", kind: "PDF", category: "Income", uploadedBy: client, uploadedOn: atOffset(now, -4), size: "198 KB" },
    { id: `${card.id}-f8`, name: "Drivers licence.jpg", detail: "Primary photo ID", kind: "JPG", category: "ID", uploadedBy: client, uploadedOn: atOffset(now, -3), size: "1.2 MB" },
    { id: `${card.id}-f9`, name: "Passport bio page.pdf", detail: "Secondary ID", kind: "PDF", category: "ID", uploadedBy: client, uploadedOn: atOffset(now, -3), size: "640 KB" },
    { id: `${card.id}-f10`, name: "Notice of assessment.pdf", detail: "ATO assessment", kind: "PDF", category: "Tax", uploadedBy: owner, uploadedOn: atOffset(now, -2), size: "420 KB" },
    { id: `${card.id}-f11`, name: "Servicing worksheet.xlsx", detail: "Internal capacity calc", kind: "XLSX", category: "Income", uploadedBy: owner, uploadedOn: atOffset(now, -2), size: "156 KB" },
    { id: `${card.id}-f12`, name: "Council rates notice.pdf", detail: "Property rates", kind: "PDF", category: "Property", uploadedBy: owner, uploadedOn: atOffset(now, -1), size: "380 KB" },
  ];
}

function formatDateTime(at: Date) {
  return `${formatDate(at)} ${at.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}`;
}

function kindBadge(kind: FileRow["kind"]) {
  if (kind === "XLSX") return "bg-emerald-50 text-emerald-700";
  if (kind === "JPG") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-600";
}

function formatRequestDisplayDate(d: Date) {
  return d
    .toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(/ (\d{4})$/, ", $1");
}

function formatRequestDueDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function seedLeadRequests(card: LeadCardData, now: Date): DocumentRequest[] {
  const start = atOffset(now, -8);
  const dueSoon = atOffset(now, 3);
  const duePast = atOffset(now, -2);
  return [
    {
      id: `${card.id}-dr-1`,
      requestId: "BR-23891011",
      title: `ID + income proof — ${card.name}`,
      requestedFrom: card.name,
      relatedTo: `Lead: ${card.name}`,
      documentType: "ID Proof",
      status: "Pending",
      dueDate: formatRequestDueDate(dueSoon),
      requestedBy: card.owner,
      requestedDate: formatRequestDisplayDate(start),
      lastUpdated: formatRequestDisplayDate(atOffset(now, -1)),
      progress: 32,
      priority: "Normal",
      notes: "Need passport or driver licence + last 2 payslips.",
      items: [
        { id: `${card.id}-dr-1-id`, title: "Photo ID", status: "Uploaded", fileName: "Drivers licence.jpg", uploadedBy: card.name, source: "portal" },
        { id: `${card.id}-dr-1-pay`, title: "Payslips", status: "Awaiting", description: "Last 2 pay cycles" },
        { id: `${card.id}-dr-1-bank`, title: "Bank statements", status: "Awaiting", description: "Last 3 months" },
      ],
    },
    {
      id: `${card.id}-dr-2`,
      requestId: "BN-89971022",
      title: `Bank statements — ${card.name}`,
      requestedFrom: card.name,
      relatedTo: `Lead: ${card.name}`,
      documentType: "Financial",
      status: "Requested",
      dueDate: formatRequestDueDate(atOffset(now, 5)),
      requestedBy: card.owner,
      requestedDate: formatRequestDisplayDate(atOffset(now, -3)),
      lastUpdated: formatRequestDisplayDate(atOffset(now, -3)),
      progress: 0,
      priority: "High",
      items: [
        { id: `${card.id}-dr-2-1`, title: "Bank statements — month 1", status: "Awaiting" },
        { id: `${card.id}-dr-2-2`, title: "Bank statements — month 2", status: "Awaiting" },
        { id: `${card.id}-dr-2-3`, title: "Bank statements — month 3", status: "Awaiting" },
      ],
    },
    {
      id: `${card.id}-dr-3`,
      requestId: "BR-44121033",
      title: `Property pack — ${card.name}`,
      requestedFrom: card.name,
      relatedTo: `Lead: ${card.name}`,
      documentType: "Property purchase",
      status: "Received",
      dueDate: formatRequestDueDate(duePast),
      requestedBy: card.owner,
      requestedDate: formatRequestDisplayDate(atOffset(now, -12)),
      lastUpdated: formatRequestDisplayDate(now),
      progress: 86,
      priority: "Normal",
      items: [
        { id: `${card.id}-dr-3-1`, title: "Contract of sale", status: "Uploaded", fileName: "Contract of sale.pdf", uploadedBy: card.owner, source: "manual" },
        { id: `${card.id}-dr-3-2`, title: "Council rates notice", status: "Uploaded", fileName: "Council rates notice.pdf", uploadedBy: card.owner, source: "manual" },
      ],
    },
  ];
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function guessFileCategory(name: string): FileCategory {
  const n = name.toLowerCase();
  if (/pre-?approval/.test(n)) return "Pre-Approval";
  if (/approval/.test(n)) return "Formal Approval";
  if (/contract|rates|property|sale/.test(n)) return "Property";
  if (/bank|statement/.test(n)) return "Bank Statement";
  if (/payslip|income|pay/.test(n)) return "Income";
  if (/tax|ato|assessment/.test(n)) return "Tax";
  return "ID";
}

function guessAttachmentKind(fileName: string) {
  const lower = fileName.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|heic)$/.test(lower)) return "Image" as const;
  if (/\.(xlsx?|csv)$/.test(lower)) return "Spreadsheet" as const;
  if (/\.(pdf|docx?|txt)$/.test(lower)) return "Document" as const;
  return "Other" as const;
}

type FinanceDocRow = {
  id: string;
  title: string;
  ref: string;
  status: string;
  statusClass: string;
  amount: string;
  date: Date;
  href: string;
};

function leadEntity(card: LeadCardData) {
  return {
    kind: "Lead",
    name: card.name,
    id: card.id,
    email: card.email,
  };
}

function requestMatchesLead(req: DocumentRequest, card: LeadCardData) {
  if (relatedMatchesLead(req.relatedTo, card.name)) return true;
  if (namesEqual(req.clientName, card.name)) return true;
  if (namesEqual(req.requestedFrom, card.name)) return true;
  return Boolean(card.email && namesEqual(req.clientEmail, card.email));
}

function liveEsign(card: LeadCardData): EsignRow[] {
  return listSignatureRequests().flatMap((req) => {
    const related = relatedMatchesLead(req.relatedTo, card.name);
    const signer =
      req.signers.some((s) => namesEqual(s.name, card.name)) ||
      Boolean(card.email && req.signers.some((s) => namesEqual(s.email, card.email))) ||
      namesEqual(req.signer, card.name);
    if (!related && !signer) return [];
    const due = parseFlexibleDate(req.expiryDate) ?? new Date();
    const sent = parseFlexibleDate(req.sentDate) ?? due;
    const signed = req.signers.filter((s) => s.status === "Signed").length;
    const total = req.signers.length || 1;
    const fullySigned = total > 0 && signed === total;
    const status: EsignStatus =
      req.status === "Signed" || fullySigned
        ? "Signed"
        : req.status === "Expired"
          ? "Expired"
          : req.status === "Viewed"
            ? "Viewed"
            : "Pending Signature";
    return [
      {
        id: req.id,
        name: req.documentName,
        kind: req.documentFile?.toLowerCase().endsWith(".docx") ? "DOCX" : "PDF",
        category: "Application",
        signed,
        total,
        sentOn: sent,
        due,
        status,
        href: `/signature/documents/details/${req.id}`,
      },
    ];
  });
}

function liveProposals(card: LeadCardData): FinanceDocRow[] {
  const entity = leadEntity(card);
  return listEstimates()
    .filter((row) => financeMatchesEntity(row, entity))
    .map((row) => ({
      id: row.id,
      title: row.title,
      ref: row.estimateId,
      status: row.status,
      statusClass: ESTIMATE_STATUS_STYLE[row.status],
      amount: formatAUD(row.total),
      date: parseFlexibleDate(row.sentAt) ?? parseFlexibleDate(row.createdAt) ?? new Date(),
      href: `/finance/estimates/${row.id}`,
    }));
}

function liveQuotes(card: LeadCardData): FinanceDocRow[] {
  const entity = leadEntity(card);
  return listQuotations()
    .filter((row) => financeMatchesEntity(row, entity))
    .map((row) => ({
      id: row.id,
      title: row.title,
      ref: row.quotationId,
      status: row.status,
      statusClass: QUOTATION_STATUS_STYLE[row.status],
      amount: formatAUD(row.total),
      date: parseFlexibleDate(row.sentAt) ?? parseFlexibleDate(row.createdAt) ?? new Date(),
      href: `/finance/quotations/${row.id}`,
    }));
}

function liveInvoices(card: LeadCardData): FinanceDocRow[] {
  const entity = leadEntity(card);
  return listInvoices()
    .filter((row) => financeMatchesEntity(row, entity))
    .map((row) => ({
      id: row.id,
      title: row.title,
      ref: row.invoiceId,
      status: row.status,
      statusClass: INVOICE_STATUS_STYLE[row.status],
      amount: formatAUD(row.total),
      date: parseFlexibleDate(row.sentAt) ?? parseFlexibleDate(row.createdAt) ?? new Date(),
      href: `/finance/invoices/${row.id}`,
    }));
}

export function LeadDocumentsPanel({ card }: { card: LeadCardData }) {
  const router = useRouter();
  const now = useMemo(() => new Date(), []);
  const [tab, setTab] = useState<DocTab>("requests");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [flash, setFlash] = useState<string | null>(null);
  const [fileCategory, setFileCategory] = useState<FileCategory | "all">("all");
  const [fileFilterOpen, setFileFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [requestTick, setRequestTick] = useState(0);
  const [fileTick, setFileTick] = useState(0);
  const [recordsTick, setRecordsTick] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [requestStatus, setRequestStatus] = useState<DocumentStatusFilter>("All");
  const [requestFilterOpen, setRequestFilterOpen] = useState(false);

  useEffect(() => onRecordsChange(() => setRecordsTick((n) => n + 1)), []);

  const esignRows = useMemo(() => {
    void recordsTick;
    const live = liveEsign(card);
    if (live.length) return live;
    return seedEsign(card, now);
  }, [card, now, recordsTick]);

  const requests = useMemo(() => {
    void recordsTick;
    const live = listDocumentRequests().filter((req) =>
      requestMatchesLead(req, card),
    );
    if (live.length) return live;
    return seedLeadRequests(card, now);
  }, [card, now, requestTick, recordsTick]);

  const proposalRows = useMemo(() => {
    void recordsTick;
    return liveProposals(card);
  }, [card, recordsTick]);

  const quoteRows = useMemo(() => {
    void recordsTick;
    return liveQuotes(card);
  }, [card, recordsTick]);

  const invoiceRows = useMemo(() => {
    void recordsTick;
    return liveInvoices(card);
  }, [card, recordsTick]);

  const files = useMemo(() => {
    void fileTick;
    return listAttachments().filter((file) =>
      relatedMatchesLead(file.relatedTo, card.name),
    );
  }, [card.name, fileTick]);

  const fileRows = useMemo(() => {
    const live: FileRow[] = files.map((file) => ({
      id: file.id,
      name: file.fileName,
      detail: file.notes || file.kind,
      kind: file.fileName.toLowerCase().endsWith(".xlsx")
        ? "XLSX"
        : file.fileName.toLowerCase().match(/\.(jpg|jpeg|png)$/)
          ? "JPG"
          : "PDF",
      category: guessFileCategory(file.fileName),
      uploadedBy: file.uploadedBy,
      uploadedOn: parseFlexibleDate(file.uploadedAt) ?? now,
      size: file.sizeLabel ?? "—",
    }));
    const extras = seedFiles(card, now).filter(
      (row) => !live.some((item) => item.name === row.name),
    );
    return [...live, ...extras];
  }, [card, files, now]);

  const filteredFiles = fileRows
    .filter((row) => {
      const q = query.trim().toLowerCase();
      if (fileCategory !== "all" && row.category !== fileCategory) return false;
      if (!q) return true;
      return `${row.name} ${row.detail} ${row.category} ${row.uploadedBy}`
        .toLowerCase()
        .includes(q);
    })
    .sort((a, b) =>
      sort === "newest"
        ? b.uploadedOn.getTime() - a.uploadedOn.getTime()
        : a.uploadedOn.getTime() - b.uploadedOn.getTime(),
    );

  const filePageSize = FILE_PAGE_SIZE;
  const filePageCount = Math.max(1, Math.ceil(filteredFiles.length / filePageSize));
  const shownFiles = filteredFiles.slice(
    (page - 1) * filePageSize,
    page * filePageSize,
  );

  const filteredEsign = esignRows
    .filter((row) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return `${row.name} ${row.category} ${row.status}`.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const group =
        Number(isEsignCompleted(a.status)) - Number(isEsignCompleted(b.status));
      if (group !== 0) return group;
      if (!isEsignCompleted(a.status)) {
        const urgency = pendingUrgency(a) - pendingUrgency(b);
        if (urgency !== 0) return urgency;
      }
      return sort === "newest"
        ? b.sentOn.getTime() - a.sentOn.getTime()
        : a.sentOn.getTime() - b.sentOn.getTime();
    });

  const pendingEsign = filteredEsign.filter((row) => !isEsignCompleted(row.status));
  const completedEsign = filteredEsign.filter((row) => isEsignCompleted(row.status));
  const esignGroups: { label: string; rows: EsignRow[] }[] = [
    { label: "Pending", rows: pendingEsign },
    { label: "Completed", rows: completedEsign },
  ].filter((group) => group.rows.length > 0);

  const financeRows =
    tab === "proposals" ? proposalRows : tab === "quotes" ? quoteRows : invoiceRows;
  const filteredFinance = financeRows
    .filter((row) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return `${row.title} ${row.ref} ${row.status}`.toLowerCase().includes(q);
    })
    .sort((a, b) =>
      sort === "newest"
        ? b.date.getTime() - a.date.getTime()
        : a.date.getTime() - b.date.getTime(),
    );

  function notify(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 2200);
  }

  function toggleFile(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const pageSelected =
    shownFiles.length > 0 && shownFiles.every((row) => selectedIds.has(row.id));

  const filteredRequests = useMemo(
    () =>
      filterDocumentRequests(requests, {
        statusFilter: requestStatus,
        search: query,
        sort: sort === "newest" ? "updated-desc" : "updated-asc",
      }),
    [requests, requestStatus, query, sort],
  );

  const requestPageCount = Math.max(
    1,
    Math.ceil(filteredRequests.length / FILE_PAGE_SIZE),
  );
  const shownRequests = filteredRequests.slice(
    (page - 1) * FILE_PAGE_SIZE,
    page * FILE_PAGE_SIZE,
  );

  function refreshRequests() {
    setRequestTick((n) => n + 1);
  }

  function addLeadFiles(list: FileList | null) {
    if (!list?.length) return;
    const filesToAdd = Array.from(list);
    for (const file of filesToAdd) {
      createAttachment({
        fileName: file.name,
        kind: guessAttachmentKind(file.name),
        relatedTo: `Lead: ${card.name}`,
        uploadedBy: card.owner,
        notes: "Uploaded from All Files",
        sizeLabel: formatFileSize(file.size),
        contentType: file.type || undefined,
        byteSize: file.size,
      });
    }
    setFileTick((n) => n + 1);
    setPage(1);
    notify(
      filesToAdd.length === 1
        ? `Added ${filesToAdd[0]!.name}`
        : `Added ${filesToAdd.length} documents`,
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap gap-1 border-b border-slate-100 px-4">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              setPage(1);
              setQuery("");
              setSelectedIds(new Set());
              setRequestFilterOpen(false);
              setFileFilterOpen(false);
            }}
            className={cn(
              "relative h-9 px-2.5 text-[12px] font-semibold",
              tab === item.id ? "text-[#5A32A3]" : "text-slate-500 hover:text-slate-700",
            )}
          >
            {item.label}
            {tab === item.id ? (
              <span className="absolute inset-x-1 bottom-0 h-0.5 bg-[#5A32A3]" />
            ) : null}
          </button>
        ))}
      </div>

      {tab === "files" ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-[15px] font-semibold text-slate-900">
                All Files ({filteredFiles.length})
              </h3>
              <p className="text-[12px] text-slate-500">
                All files uploaded to this lead.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative w-52">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search files..."
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-8 text-[12px] outline-none focus:ring-1 focus:ring-violet-500"
                />
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setFileFilterOpen((v) => !v)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[12px] font-medium text-slate-600"
                >
                  <Filter className="h-3.5 w-3.5" />
                  {fileCategory === "all" ? "Filter" : fileCategory}
                </button>
                {fileFilterOpen ? (
                  <div className="absolute top-9 right-0 z-20 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    {(["all", ...Object.keys(CATEGORY_TONE)] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setFileCategory(
                            item === "all" ? "all" : (item as FileCategory),
                          );
                          setFileFilterOpen(false);
                          setPage(1);
                        }}
                        className={cn(
                          "flex w-full px-3 py-1.5 text-left text-[12px]",
                          fileCategory === item
                            ? "font-semibold text-[#5A32A3]"
                            : "text-slate-700 hover:bg-slate-50",
                        )}
                      >
                        {item === "all" ? "All categories" : item}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] font-medium text-slate-600 outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400">
                <LayoutList className="h-3.5 w-3.5" />
              </span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  addLeadFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-white"
                style={{ backgroundColor: "#5A32A3" }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Document
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[960px] text-left text-[12px]">
              <thead className="sticky top-0 bg-[#FAF9FC] text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={pageSelected}
                      onChange={() => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (pageSelected) {
                            shownFiles.forEach((row) => next.delete(row.id));
                          } else {
                            shownFiles.forEach((row) => next.add(row.id));
                          }
                          return next;
                        });
                      }}
                      aria-label="Select all files on this page"
                      className="h-3.5 w-3.5 accent-[#5A32A3]"
                    />
                  </th>
                  <th className="px-4 py-2.5">File Name</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5">Uploaded By</th>
                  <th className="px-3 py-2.5">Uploaded On</th>
                  <th className="px-3 py-2.5">Size</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shownFiles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      No files in this view.
                    </td>
                  </tr>
                ) : (
                  shownFiles.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-t border-slate-100",
                        selectedIds.has(row.id) && "bg-violet-50/60",
                      )}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleFile(row.id)}
                          aria-label={`Select ${row.name}`}
                          className="h-3.5 w-3.5 accent-[#5A32A3]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2.5">
                          <span
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-bold",
                              kindBadge(row.kind),
                            )}
                          >
                            {row.kind === "XLSX" ? (
                              <FileSpreadsheet className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </span>
                          <span>
                            <span className="block font-semibold text-slate-900">
                              {row.name}
                            </span>
                            <span className="text-[11px] text-slate-400">{row.detail}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            CATEGORY_TONE[row.category],
                          )}
                        >
                          {row.category}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold",
                              avatarColor(row.uploadedBy),
                            )}
                          >
                            {initials(row.uploadedBy)}
                          </span>
                          <span className="text-slate-700">{row.uploadedBy}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {formatDateTime(row.uploadedOn)}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{row.size}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => notify(`Preview ${row.name}`)}
                            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#5A32A3] hover:underline"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Preview
                          </button>
                          <button
                            type="button"
                            aria-label={`Download ${row.name}`}
                            onClick={() => notify(`Downloading ${row.name}`)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="More actions"
                            className="text-slate-300 hover:text-slate-500"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-[12px] text-slate-500">
            <span>
              Showing {(page - 1) * filePageSize + (shownFiles.length ? 1 : 0)} to{" "}
              {(page - 1) * filePageSize + shownFiles.length} of {filteredFiles.length}{" "}
              files
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((n) => Math.max(1, n - 1))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {Array.from({ length: filePageCount }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={cn(
                      "inline-flex h-7 min-w-7 items-center justify-center rounded-md px-1.5",
                      page === n
                        ? "bg-[#5A32A3] font-semibold text-white"
                        : "border border-slate-200 text-slate-600",
                    )}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={page >= filePageCount}
                  onClick={() => setPage((n) => Math.min(filePageCount, n + 1))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </span>
              <span>10 / page</span>
            </span>
          </div>
        </>
      ) : tab === "requests" ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-[15px] font-semibold text-slate-900">
                Requests ({filteredRequests.length})
              </h3>
              <p className="text-[12px] text-slate-500">
                Document requests sent to this lead.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative w-52">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search requests..."
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-8 text-[12px] outline-none focus:ring-1 focus:ring-violet-500"
                />
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setRequestFilterOpen((v) => !v)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[12px] font-medium text-slate-600"
                >
                  <Filter className="h-3.5 w-3.5" />
                  {requestStatus === "All"
                    ? "Filter"
                    : DOCUMENT_DISPLAY_STATUS_FILTERS.find(
                        (item) => item.value === requestStatus,
                      )?.label}
                </button>
                {requestFilterOpen ? (
                  <div className="absolute top-9 right-0 z-20 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    {DOCUMENT_DISPLAY_STATUS_FILTERS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          setRequestStatus(item.value);
                          setRequestFilterOpen(false);
                          setPage(1);
                        }}
                        className={cn(
                          "flex w-full px-3 py-1.5 text-left text-[12px]",
                          requestStatus === item.value
                            ? "font-semibold text-[#5A32A3]"
                            : "text-slate-700 hover:bg-slate-50",
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] font-medium text-slate-600 outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    leadSendHref(
                      "/documents/requests/create?layoutid=standard&redirect=false",
                      card,
                    ),
                  )
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-white"
                style={{ backgroundColor: "#5A32A3" }}
              >
                <Plus className="h-3.5 w-3.5" />
                Request Document
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <DocumentRequestsList
              data={shownRequests}
              framed={false}
              showSelect={false}
              showRelatedTo={false}
              onRefresh={refreshRequests}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-[12px] text-slate-500">
            <span>
              Showing {(page - 1) * FILE_PAGE_SIZE + (shownRequests.length ? 1 : 0)}{" "}
              to {(page - 1) * FILE_PAGE_SIZE + shownRequests.length} of{" "}
              {filteredRequests.length} requests
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((n) => Math.max(1, n - 1))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {Array.from({ length: requestPageCount }, (_, i) => i + 1).map(
                  (n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={cn(
                        "inline-flex h-7 min-w-7 items-center justify-center rounded-md px-1.5",
                        page === n
                          ? "bg-[#5A32A3] font-semibold text-white"
                          : "border border-slate-200 text-slate-600",
                      )}
                    >
                      {n}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  disabled={page >= requestPageCount}
                  onClick={() => setPage((n) => Math.min(requestPageCount, n + 1))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </span>
              <span>10 / page</span>
            </span>
          </div>
        </>
      ) : tab === "esign" ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-[15px] font-semibold text-slate-900">
                E-Sign ({filteredEsign.length})
              </h3>
              <p className="text-[12px] text-slate-500">
                {pendingEsign.length} pending · {completedEsign.length} completed
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative w-52">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search e-sign..."
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-8 text-[12px] outline-none focus:ring-1 focus:ring-violet-500"
                />
              </label>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[12px] font-medium text-slate-600"
            >
              <Filter className="h-3.5 w-3.5" />
              Filter
            </button>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] font-medium text-slate-600 outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400">
              <LayoutList className="h-3.5 w-3.5" />
            </span>
            <button
              type="button"
              onClick={() =>
                router.push(leadSendHref("/signature/create", card))
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-white"
              style={{ backgroundColor: "#5A32A3" }}
            >
              <Plus className="h-3.5 w-3.5" />
              Request E-Sign
            </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[860px] text-left text-[12px]">
              <thead className="sticky top-0 bg-[#FAF9FC] text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Document Name</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5">Signers</th>
                  <th className="px-3 py-2.5">Sent On</th>
                  <th className="px-3 py-2.5">Due Date</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEsign.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      No e-sign documents in this view.
                    </td>
                  </tr>
                ) : (
                  esignGroups.flatMap((group) => [
                    <tr key={`${group.label}-head`}>
                      <td
                        colSpan={7}
                        className="bg-[#FAF9FC] px-4 py-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase"
                      >
                        {group.label}
                        <span className="ml-1.5 font-medium text-slate-400">
                          {group.rows.length}
                        </span>
                      </td>
                    </tr>,
                    ...group.rows.map((row) => {
                      const due = dueLabel(new Date(row.due), now);
                      const action = actionFor(row.status);
                      return (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-2">
                              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-[10px] font-bold text-rose-600">
                                {row.kind}
                              </span>
                              <span>
                                <span className="block font-semibold text-slate-900">
                                  {row.name}
                                </span>
                                <span className="text-[11px] text-slate-400">{row.kind}</span>
                              </span>
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-600">{row.category}</td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1 text-slate-700">
                              {row.warning ? (
                                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                              ) : null}
                              {row.signed} of {row.total}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-600">{formatDate(row.sentOn)}</td>
                          <td className="px-3 py-3">
                            <span className="block text-slate-700">{formatDate(row.due)}</span>
                            <span
                              className={cn(
                                "text-[11px]",
                                due === "Expired" || due === "Yesterday"
                                  ? "text-rose-500"
                                  : due === "Today"
                                    ? "text-amber-600"
                                    : "text-slate-400",
                              )}
                            >
                              {due}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                statusTone(row.status),
                              )}
                            >
                              {isEsignCompleted(row.status) ? "Completed" : row.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {row.href && action === "View" ? (
                              <Link
                                href={row.href}
                                className="text-[12px] font-semibold text-[#5A32A3] hover:underline"
                              >
                                View
                              </Link>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  notify(
                                    action === "View"
                                      ? `Opened ${row.name}`
                                      : `${action} sent for ${row.name}`,
                                  )
                                }
                                className="text-[12px] font-semibold text-[#5A32A3] hover:underline"
                              >
                                {action}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }),
                  ])
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[12px] text-slate-500">
            <span>
              {pendingEsign.length} pending · {completedEsign.length} completed
            </span>
            <span>
              {filteredEsign.length} document{filteredEsign.length === 1 ? "" : "s"}
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-[15px] font-semibold text-slate-900">
                {tab === "proposals"
                  ? `Proposals (${filteredFinance.length})`
                  : tab === "quotes"
                    ? `Quotes (${filteredFinance.length})`
                    : `Invoices (${filteredFinance.length})`}
              </h3>
              <p className="text-[12px] text-slate-500">
                {tab === "proposals"
                  ? "Estimates sent from this lead."
                  : tab === "quotes"
                    ? "Quotations sent from this lead."
                    : "Invoices created for this lead."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative w-52">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder={
                    tab === "proposals"
                      ? "Search proposals..."
                      : tab === "quotes"
                        ? "Search quotes..."
                        : "Search invoices..."
                  }
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-8 text-[12px] outline-none focus:ring-1 focus:ring-violet-500"
                />
              </label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] font-medium text-slate-600 outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    leadSendHref(
                      tab === "proposals"
                        ? "/finance/estimates/create"
                        : tab === "quotes"
                          ? "/finance/quotations/create"
                          : "/finance/invoices/create?layoutid=standard&redirect=false",
                      card,
                    ),
                  )
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-white"
                style={{ backgroundColor: "#5A32A3" }}
              >
                <Plus className="h-3.5 w-3.5" />
                {tab === "proposals"
                  ? "Send Proposal"
                  : tab === "quotes"
                    ? "Send Quote"
                    : "Create Invoice"}
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {filteredFinance.length === 0 ? (
              <Empty
                title={
                  tab === "proposals"
                    ? "No proposals yet"
                    : tab === "quotes"
                      ? "No quotes yet"
                      : "No invoices yet"
                }
                body={
                  tab === "proposals"
                    ? "Proposals created from this lead will appear here and in Estimates."
                    : tab === "quotes"
                      ? "Quotes created from this lead will appear here and in Quotations."
                      : "Invoices created from this lead will appear here and in Invoices."
                }
              />
            ) : (
              <table className="w-full min-w-[720px] text-left text-[12px]">
                <thead className="sticky top-0 bg-[#FAF9FC] text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Title</th>
                    <th className="px-3 py-2.5">Reference</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Amount</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFinance.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {row.title}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{row.ref}</td>
                      <td className="px-3 py-3 text-slate-600">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-3 py-3 text-slate-700">{row.amount}</td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            row.statusClass,
                          )}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={row.href}
                          className="text-[12px] font-semibold text-[#5A32A3] hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {flash ? (
        <div className="fixed right-5 bottom-16 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] text-white shadow-lg">
          {flash}
        </div>
      ) : null}
    </section>
  );
}

function Empty({
  title,
  body,
  href,
  action,
  onClick,
}: {
  title: string;
  body: string;
  href?: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-[14px] font-semibold text-slate-800">{title}</p>
      <p className="mt-1 max-w-sm text-[12px] text-slate-500">{body}</p>
      {href && action ? (
        <Link
          href={href}
          className="mt-3 text-[12px] font-semibold text-[#5A32A3] hover:underline"
        >
          {action}
        </Link>
      ) : onClick && action ? (
        <button
          type="button"
          onClick={onClick}
          className="mt-3 text-[12px] font-semibold text-[#5A32A3] hover:underline"
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}
