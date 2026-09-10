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

export function listLibraryDocuments(): LibraryDocument[] {
  const stored = readStore();
  if (stored) return stored.map((doc) => ({ ...doc }));
  const extras = readExtraLibraryDocs();
  const seed = libraryDocuments.map((doc) => ({ ...doc }));
  if (!extras.length) return seed;
  const ids = new Set(seed.map((d) => d.id));
  return [...extras.filter((e) => !ids.has(e.id)), ...seed];
}

export function replaceLibraryDocuments(list: LibraryDocument[]) {
  writeStore(list.map((doc) => ({ ...doc })));
}

export function upsertLibraryDocument(doc: LibraryDocument) {
  const list = listLibraryDocuments();
  const i = list.findIndex((d) => d.id === doc.id);
  if (i >= 0) list[i] = { ...doc };
  else list.unshift({ ...doc });
  writeStore(list);
  return doc;
}

export function removeLibraryDocument(id: string): LibraryDocument | null {
  const list = listLibraryDocuments();
  const found = list.find((d) => d.id === id) ?? null;
  if (!found) return null;
  writeStore(list.filter((d) => d.id !== id));
  return found;
}

export function pushLibraryDoc(doc: LibraryDocument) {
  if (typeof window === "undefined") return;
  const extras = readExtraLibraryDocs();
  extras.unshift(doc);
  sessionStorage.setItem("library:extras", JSON.stringify(extras));
  if (readStore()) upsertLibraryDocument(doc);
}
