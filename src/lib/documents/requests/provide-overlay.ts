import {
  applyItemChange,
  requestItems,
} from "@/lib/documents/requests/pack";
import type {
  DocumentRequest,
  RequestedDocLine,
} from "@/lib/documents/requests/types";

/** A file the client sent from the public upload page. */
export type ClientProvideFile = {
  itemId: string;
  title: string;
  fileName: string;
  contentType: string;
  uploadedAt: string;
};

/** One document request's client uploads. */
export type ClientProvideBundle = {
  requestId: string;
  requestedCount: number;
  files: ClientProvideFile[];
};

function norm(value: string) {
  return value.trim().toLowerCase();
}

function fileKind(file: ClientProvideFile): RequestedDocLine["fileKind"] {
  if (file.contentType.startsWith("image/") || /\.(png|jpe?g|webp|gif|heic)$/i.test(file.fileName)) {
    return "image";
  }
  if (file.contentType === "application/pdf" || /\.pdf$/i.test(file.fileName)) return "pdf";
  return "other";
}

function stamp(iso: string) {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Keeps a broker Accept or Reject when a fresh CRM row still says Awaiting. */
export function mergeReviewedDocumentItems(
  local: RequestedDocLine[] | undefined,
  remote: RequestedDocLine[] | undefined,
): RequestedDocLine[] | undefined {
  if (!remote?.length) return local;
  if (!local?.length) return remote;
  const localById = new Map(local.map((item) => [item.id, item]));
  const localByTitle = new Map(
    local.map((item) => [norm(item.title), item]),
  );
  return remote.map((item) => {
    const prev =
      localById.get(item.id) ?? localByTitle.get(norm(item.title));
    if (!prev) return item;
    const reviewed =
      (prev.status === "Accepted" || prev.status === "Rejected") &&
      (item.status === "Awaiting" || item.status === "Uploaded");
    if (reviewed) {
      return {
        ...item,
        ...prev,
        fileName: prev.fileName || item.fileName,
        status: prev.status,
      };
    }
    return {
      ...prev,
      ...item,
      fileName: item.fileName || prev.fileName,
    };
  });
}

function uploadedLine(
  item: RequestedDocLine,
  file: ClientProvideFile,
  uploadedBy: string,
): RequestedDocLine {
  if (item.status === "Accepted") {
    return {
      ...item,
      fileName: item.fileName || file.fileName,
      source: item.source ?? "portal",
    };
  }
  return {
    ...item,
    status: "Uploaded",
    fileName: file.fileName,
    fileKind: fileKind(file),
    uploadedAt: stamp(file.uploadedAt),
    uploadedBy,
    source: "portal",
    rejectionReason: undefined,
    rejectedAt: undefined,
  };
}

/** Marks matching request lines Uploaded and moves the request to Review. */
export function applyClientProvideBundles(
  requests: DocumentRequest[],
  bundles: ClientProvideBundle[],
): DocumentRequest[] {
  const byRequest = new Map(
    bundles
      .filter((bundle) => bundle.files.length > 0)
      .map((bundle) => [bundle.requestId, bundle]),
  );
  return requests.map((req) => {
    const bundle = byRequest.get(req.id);
    if (!bundle) return req;
    if (
      req.status === "Approved" ||
      req.status === "Rejected" ||
      req.status === "Expired"
    ) {
      return req;
    }
    const uploadedBy = req.clientName || req.requestedFrom || "Client";
    const items = requestItems(req);
    const used = new Set<number>();
    const take = (item: RequestedDocLine) => {
      const byId = bundle.files.findIndex(
        (file, index) => !used.has(index) && file.itemId === item.id,
      );
      if (byId >= 0) {
        used.add(byId);
        return bundle.files[byId];
      }
      const byTitle = bundle.files.findIndex(
        (file, index) => !used.has(index) && norm(file.title) === norm(item.title),
      );
      if (byTitle >= 0) {
        used.add(byTitle);
        return bundle.files[byTitle];
      }
      return undefined;
    };
    const nextItems = items.length
      ? items.map((item) => {
          const file = take(item);
          return file ? uploadedLine(item, file, uploadedBy) : item;
        })
      : bundle.files.map((file) =>
          uploadedLine(
            {
              id: file.itemId,
              title: file.title,
              status: "Awaiting",
            },
            file,
            uploadedBy,
          ),
        );
    const next = applyItemChange(req, nextItems);
    if (!items.length && bundle.requestedCount > nextItems.length) {
      next.progress = Math.round(
        (nextItems.length / bundle.requestedCount) * 100,
      );
    }
    return next;
  });
}

export function documentPackSignature(requests: DocumentRequest[]) {
  return requests
    .map(
      (req) =>
        `${req.id}:${req.status}:${req.progress}:${(req.items ?? [])
          .map((item) => `${item.id}:${item.status}:${item.fileName ?? ""}`)
          .join(",")}`,
    )
    .join("|");
}

/** null when the inbox could not be loaded. */
export async function fetchClientProvideInbox(): Promise<
  ClientProvideBundle[] | null
> {
  try {
    const res = await fetch("/api/documents/provide/received", {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as {
      bundles?: ClientProvideBundle[];
    };
    return Array.isArray(data.bundles) ? data.bundles : [];
  } catch {
    return null;
  }
}
