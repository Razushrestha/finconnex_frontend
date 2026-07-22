import type { EstimateStatus } from "@/lib/finance/estimates/types";
import type { QuotationStatus } from "@/lib/finance/quotations/types";
import type { InvoiceStatus } from "@/lib/finance/invoices/types";
import type { PaymentStatus } from "@/lib/finance/payments/types";
import type { ProductStatus } from "@/lib/finance/products/types";

export const ESTIMATE_STATUS_STYLE: Record<EstimateStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Sent: "bg-sky-50 text-sky-700",
  Accepted: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-rose-50 text-rose-700",
  Expired: "bg-amber-50 text-amber-800",
  Converted: "bg-violet-50 text-violet-700",
};

export const QUOTATION_STATUS_STYLE: Record<QuotationStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Sent: "bg-sky-50 text-sky-700",
  Accepted: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-rose-50 text-rose-700",
  Expired: "bg-amber-50 text-amber-800",
  Invoiced: "bg-violet-50 text-violet-700",
};

export const INVOICE_STATUS_STYLE: Record<InvoiceStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Sent: "bg-sky-50 text-sky-700",
  "Partially Paid": "bg-amber-50 text-amber-800",
  Paid: "bg-emerald-50 text-emerald-700",
  Overdue: "bg-rose-50 text-rose-700",
  Cancelled: "bg-slate-100 text-slate-500",
  Void: "bg-slate-200 text-slate-600",
};

export const PAYMENT_STATUS_STYLE: Record<PaymentStatus, string> = {
  Pending: "bg-amber-50 text-amber-800",
  Completed: "bg-emerald-50 text-emerald-700",
  Failed: "bg-rose-50 text-rose-700",
  Refunded: "bg-violet-50 text-violet-700",
};

export const PRODUCT_STATUS_STYLE: Record<ProductStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  Inactive: "bg-slate-100 text-slate-500",
};
