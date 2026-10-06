/** SRS §9.1 Document Library */

export type DocumentAccessLevel = "Private" | "Team" | "Organization";

export const ACCESS_LEVELS: DocumentAccessLevel[] = [
  "Private",
  "Team",
  "Organization",
];

export interface DocumentVersion {
  version: number;
  uploadedAt: string;
  uploadedBy: string;
  sizeLabel: string;
  note?: string;
}

export const CRM_DOCUMENT_TYPES = [
  "CONTRACT",
  "PROPOSAL",
  "ID_PROOF",
  "FINANCIAL",
  "LEGAL",
  "OTHER",
] as const;
export type CrmDocumentType = (typeof CRM_DOCUMENT_TYPES)[number];

export interface LibraryDocument {
  id: string;
  fileName: string;
  folder: string;
  owner: string;
  relatedTo?: string;
  version: number;
  tags: string[];
  uploadedAt: string;
  accessLevel: DocumentAccessLevel;
  sizeLabel: string;
  versions: DocumentVersion[];
  storageKey?: string;
  storageUrl?: string;
  documentType?: CrmDocumentType;
  mimeType?: string;
  sizeBytes?: number;
  description?: string;
  /** CRM user id for the uploader, when the list does not include a name. */
  ownerId?: string;
  leadId?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
}

export const LIBRARY_FOLDERS = [
  "All Files",
  "My files",
  "Recent",
  "Clients",
  "Deals",
  "Templates",
  "Signed",
] as const;

export type LibraryFolder = (typeof LIBRARY_FOLDERS)[number];

/** Sidebar entries that list files by rule; a file can't be filed in one. */
export const LIBRARY_VIEWS: readonly string[] = ["All Files", "My files", "Recent"];

export function isLibraryView(folder: string): boolean {
  return LIBRARY_VIEWS.includes(folder);
}

/** Files once moved into a view show up nowhere but All Files; refile them. */
function withRealFolder(doc: LibraryDocument): LibraryDocument {
  return isLibraryView(doc.folder) ? { ...doc, folder: "Clients" } : { ...doc };
}

export const libraryDocuments: LibraryDocument[] = [];

const STORE_KEY = "documents:library:v2";

function readStore(): LibraryDocument[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LibraryDocument[];
  } catch {
    return null;
  }
}

function writeStore(list: LibraryDocument[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

/** Session-backed extras from approved document requests */
export function readExtraLibraryDocs(): LibraryDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem("library:extras");
    return raw ? (JSON.parse(raw) as LibraryDocument[]) : [];
  } catch {
    return [];
  }
}

function writeExtraLibraryDocs(list: LibraryDocument[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("library:extras", JSON.stringify(list));
}

/**
 * Local-only files (not saved to the CRM) live in the extras list, which
 * replaceLibraryDocuments re-reads on every library load, so an edit made to
 * one has to land there too or it reverts on the next load.
 */
function patchExtraLibraryDoc(id: string, doc: LibraryDocument | null) {
  const extras = readExtraLibraryDocs();
  const i = extras.findIndex((d) => d.id === id);
  if (i < 0) return;
  if (doc) extras[i] = { ...doc };
  else extras.splice(i, 1);
  writeExtraLibraryDocs(extras);
}

export function listLibraryDocuments(): LibraryDocument[] {
  const stored = readStore();
  if (stored) return stored.map(withRealFolder);
  const extras = readExtraLibraryDocs();
  const seed = libraryDocuments.map(withRealFolder);
  if (!extras.length) return seed;
  const ids = new Set(seed.map((d) => d.id));
  return [...extras.filter((e) => !ids.has(e.id)).map(withRealFolder), ...seed];
}

export function replaceLibraryDocuments(list: LibraryDocument[]) {
  const extras = readExtraLibraryDocs();
  const ids = new Set(list.map((doc) => doc.id));
  writeStore([
    ...extras.filter((doc) => !ids.has(doc.id)),
    ...list.map((doc) => ({ ...doc })),
  ]);
}

export function upsertLibraryDocument(doc: LibraryDocument) {
  const list = listLibraryDocuments();
  const i = list.findIndex((d) => d.id === doc.id);
  if (i >= 0) list[i] = { ...doc };
  else list.unshift({ ...doc });
  writeStore(list);
  patchExtraLibraryDoc(doc.id, doc);
  return doc;
}

export function removeLibraryDocument(id: string): LibraryDocument | null {
  const list = listLibraryDocuments();
  const found = list.find((d) => d.id === id) ?? null;
  if (!found) return null;
  writeStore(list.filter((d) => d.id !== id));
  patchExtraLibraryDoc(id, null);
  return found;
}

export function pushLibraryDoc(doc: LibraryDocument) {
  if (typeof window === "undefined") return;
  const extras = readExtraLibraryDocs();
  extras.unshift(doc);
  writeExtraLibraryDocs(extras);
  if (readStore()) upsertLibraryDocument(doc);
}
