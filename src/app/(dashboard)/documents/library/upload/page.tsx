"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileUp, X } from "lucide-react";
import { UploadLibraryFileForm } from "@/components/documents/library/UploadLibraryFileForm";
import {
  createCrmDocument,
  toCreateDocumentBody,
} from "@/lib/documents/library/api";
import {
  pushLibraryDoc,
  upsertLibraryDocument,
} from "@/lib/documents/library/types";
import { BOARD_PAGE } from "@/lib/layout";
import { cn } from "@/lib/utils";

export default function UploadLibraryFilePage() {
  return (
    <Suspense
      fallback={
        <div className={`${BOARD_PAGE} text-[13px] text-slate-500`}>
          Loading upload…
        </div>
      }
    >
      <UploadLibraryFilePageInner />
    </Suspense>
  );
}

function UploadLibraryFilePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderParam = searchParams.get("folder")?.trim() || "";
  const defaultFolder =
    folderParam &&
    folderParam !== "All Files" &&
    folderParam !== "My files" &&
    folderParam !== "Recent"
      ? folderParam
      : "Clients";

  function backHref() {
    const folder = searchParams.get("folder");
    return folder
      ? `/documents/library?folder=${encodeURIComponent(folder)}`
      : "/documents/library";
  }

  return (
    <div className={cn(BOARD_PAGE, "bg-slate-100/80")}>
      <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-4 py-6 sm:py-8">
        <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.16)]">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-3.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white">
              <FileUp className="h-4 w-4" />
            </span>
            <h1 className="min-w-0 flex-1 truncate text-[15px] font-bold tracking-tight text-slate-900">
              Upload file
            </h1>
            <Link
              href={backHref()}
              aria-label="Close"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </Link>
          </div>
          <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto overscroll-contain px-5 py-4">
          <UploadLibraryFileForm
            defaultFolder={defaultFolder}
            footer
            onCancel={() => router.push(backHref())}
            onSave={async (doc) => {
              let saved = doc;
              try {
                const remote = await createCrmDocument(toCreateDocumentBody(doc));
                if (remote?.id) {
                  saved = { ...doc, ...remote, id: remote.id };
                }
              } catch {
                /* CRM storage is offline; keep the FinConnex-hosted file. */
              }
              upsertLibraryDocument(saved);
              pushLibraryDoc(saved);
              // Land in the folder the file was filed in, so it's in view.
              const params = new URLSearchParams();
              if (saved.folder) params.set("folder", saved.folder);
              params.set("uploaded", "1");
              router.push(`/documents/library?${params.toString()}`);
            }}
          />
          </div>
        </div>
      </div>
    </div>
  );
}
