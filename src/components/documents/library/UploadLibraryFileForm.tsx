"use client";

import { useEffect, useState } from "react";
import { FileText, FolderOpen, Link2, Tag } from "lucide-react";
import {
  ACCESS_LEVELS,
  CRM_DOCUMENT_TYPES,
  LIBRARY_FOLDERS,
  type CrmDocumentType,
  type DocumentAccessLevel,
  type LibraryDocument,
} from "@/lib/documents/library/types";
import { folderToDocumentType } from "@/lib/documents/library/api";
import { uploadCrmStorageFile } from "@/lib/storage/api";
import { isUuid } from "@/lib/activity-timeline/auth";
import { RELATED_ENTITY_KINDS, type RelatedEntityKind } from "@/lib/activities/shared";
import { useCrmRelatedRecords } from "@/lib/activities/use-crm-related-records";
import {
  assignableOwnerLabel,
  defaultAssignableOwnerId,
  listAssignableOwnersLocal,
  loadAssignableOwners,
  type AssignableOwner,
} from "@/lib/users/assignable";
import {
  Field,
  InputShell,
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";
import { defaultActorName } from "@/lib/rules/actor";

export function UploadLibraryFileForm({
  defaultFolder = "Clients",
  onCancel,
  onSave,
  footer,
}: {
  defaultFolder?: string;
  onCancel: () => void;
  onSave: (doc: LibraryDocument) => void | Promise<void>;
  footer?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [folder, setFolder] = useState(defaultFolder);
  const [documentType, setDocumentType] = useState<CrmDocumentType>(
    folderToDocumentType(defaultFolder),
  );
  const [owners, setOwners] = useState<AssignableOwner[]>(
    listAssignableOwnersLocal,
  );
  const [ownerId, setOwnerId] = useState(() =>
    defaultAssignableOwnerId(listAssignableOwnersLocal()) ||
    defaultActorName(),
  );
  const [relatedKind, setRelatedKind] = useState<RelatedEntityKind | "">("");
  const [relatedName, setRelatedName] = useState("");
  const [relatedId, setRelatedId] = useState("");
  const [tags, setTags] = useState("");
  const [accessLevel, setAccessLevel] = useState<DocumentAccessLevel>("Team");
  const [error, setError] = useState("");
  const related = useCrmRelatedRecords(relatedKind);

  useEffect(() => {
    setFolder(defaultFolder);
    setDocumentType(folderToDocumentType(defaultFolder));
  }, [defaultFolder]);

  useEffect(() => {
    void loadAssignableOwners().then((rows) => {
      setOwners(rows);
      setOwnerId((current) =>
        rows.some((row) => row.id === current || row.name === current)
          ? current
          : defaultAssignableOwnerId(rows) || rows[0]?.id || current,
      );
    });
  }, []);

  const ownerName =
    owners.find((row) => row.id === ownerId)?.name ||
    owners.find((row) => row.name === ownerId)?.name ||
    ownerId ||
    defaultActorName();

  async function submit() {
    const name = fileName.trim() || file?.name || "";
    if (!name) {
      setError("Choose a file or enter a file name");
      return;
    }
    if (!file) {
      setError("Choose a file to upload");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Documents can be at most 10 MB");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const stored = await uploadCrmStorageFile(file);
      const today = new Date().toLocaleDateString("en-AU");
      const relatedTo =
        relatedKind && relatedName
          ? `${relatedKind}: ${relatedName}`
          : undefined;
      const relatedIds = {
        leadId: relatedKind === "Lead" && isUuid(relatedId) ? relatedId : undefined,
        contactId:
          relatedKind === "Contact" && isUuid(relatedId) ? relatedId : undefined,
        companyId:
          relatedKind === "Company" && isUuid(relatedId) ? relatedId : undefined,
        dealId: relatedKind === "Deal" && isUuid(relatedId) ? relatedId : undefined,
      };
      const sizeBytes = stored.size || file.size;
      const mimeType =
        stored.contentType || file.type || "application/octet-stream";
      const sizeLabel = `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
      await onSave({
        id: `lib-${Date.now()}`,
        fileName: name,
        folder,
        owner: ownerName,
        relatedTo,
        ...relatedIds,
        version: 1,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        uploadedAt: today,
        accessLevel,
        sizeLabel,
        storageKey: stored.key,
        storageUrl: stored.url,
        documentType,
        mimeType,
        sizeBytes,
        versions: [
          {
            version: 1,
            uploadedAt: today,
            uploadedBy: ownerName,
            sizeLabel,
            note: "Uploaded to CRM storage",
          },
        ],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const actions = (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="h-9 flex-1 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
      >
        Cancel
      </button>
      <button
        type="button"
        disabled={uploading}
        onClick={() => void submit()}
        className="h-9 flex-1 rounded-lg bg-violet-600 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
      >
        {uploading ? "Uploading…" : "Upload"}
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      <Field label="File" required error={error}>
        <input
          type="file"
          onChange={(e) => {
            const next = e.target.files?.[0] ?? null;
            setFile(next);
            if (next) setFileName(next.name);
          }}
          className="block w-full text-[12px] text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-violet-700"
        />
      </Field>
      <Field label="File name" required>
        <InputShell icon={FileText} error={!!error}>
          <input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="Contract.pdf"
            className={elevatedInputClass(true)}
          />
        </InputShell>
      </Field>
      <Field label="Folder">
        <InputShell icon={FolderOpen}>
          <select
            value={folder}
            onChange={(e) => {
              const next = e.target.value;
              setFolder(next);
              setDocumentType(folderToDocumentType(next));
            }}
            className={elevatedSelectClass(true)}
          >
            {LIBRARY_FOLDERS.filter((f) => f !== "All Files").map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Document type" required>
        <InputShell>
          <select
            value={documentType}
            onChange={(e) =>
              setDocumentType(e.target.value as CrmDocumentType)
            }
            className={elevatedSelectClass()}
          >
            {CRM_DOCUMENT_TYPES.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Owner">
        <InputShell>
          <select
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            className={elevatedSelectClass()}
          >
            {owners.length === 0 ? (
              <option value="">{defaultActorName() || "Current user"}</option>
            ) : (
              owners.map((row) => (
                <option key={row.id} value={row.id}>
                  {assignableOwnerLabel(row)}
                </option>
              ))
            )}
          </select>
        </InputShell>
      </Field>
      <Field label="Related kind">
        <InputShell icon={Link2}>
          <select
            value={relatedKind}
            onChange={(e) => {
              setRelatedKind(e.target.value as RelatedEntityKind | "");
              setRelatedName("");
              setRelatedId("");
            }}
            className={elevatedSelectClass(true)}
          >
            <option value="">None</option>
            {RELATED_ENTITY_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Related record">
        <InputShell>
          <select
            value={relatedId || relatedName}
            onChange={(e) => {
              const value = e.target.value;
              const match = related.options.find(
                (row) => (row.id || row.name) === value,
              );
              setRelatedId(match?.id ?? "");
              setRelatedName(match?.name ?? value);
            }}
            disabled={!relatedKind}
            className={elevatedSelectClass()}
          >
            <option value="">
              {related.loading ? "Loading records…" : "Select…"}
            </option>
            {related.options.map((row) => (
              <option key={`${row.kind}-${row.id ?? row.name}`} value={row.id || row.name}>
                {row.name}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Tags">
        <InputShell icon={Tag}>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="legal, kyc (comma separated)"
            className={elevatedInputClass(true)}
          />
        </InputShell>
      </Field>
      <Field label="Access level">
        <InputShell>
          <select
            value={accessLevel}
            onChange={(e) =>
              setAccessLevel(e.target.value as DocumentAccessLevel)
            }
            className={elevatedSelectClass()}
          >
            {ACCESS_LEVELS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      {footer !== false ? <div className="pt-2">{actions}</div> : null}
    </div>
  );
}
