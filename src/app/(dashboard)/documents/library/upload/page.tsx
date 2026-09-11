"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <Link
          href={backHref()}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Library
        </Link>
        <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
          Upload file
        </h1>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-xl px-4 py-5 pb-8">
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
              const folder = searchParams.get("folder");
              const params = new URLSearchParams();
              if (folder) params.set("folder", folder);
              params.set("uploaded", "1");
              router.push(`/documents/library?${params.toString()}`);
            }}
          />
        </div>
      </div>
    </div>
  );
}
