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
  "Clients",
  "Deals",
  "Templates",
  "Signed",
] as const;

export type LibraryFolder = (typeof LIBRARY_FOLDERS)[number];

export const libraryDocuments: LibraryDocument[] = [
  {
    id: "lib1",
    fileName: "Anderson_Engagement_Letter_v2.pdf",
    folder: "Clients",
    owner: "John Smith",
    relatedTo: "Lead: William Anderson",
    version: 2,
    tags: ["engagement", "legal"],
    uploadedAt: "18/07/2026",
    accessLevel: "Team",
    sizeLabel: "245 KB",
    versions: [
      {
        version: 1,
        uploadedAt: "10/07/2026",
        uploadedBy: "John Smith",
        sizeLabel: "230 KB",
        note: "Initial draft",
      },
      {
        version: 2,
        uploadedAt: "18/07/2026",
        uploadedBy: "John Smith",
        sizeLabel: "245 KB",
        note: "Client feedback applied",
      },
    ],
  },
  {
    id: "lib2",
    fileName: "Greystone_Proposal.pdf",
    folder: "Deals",
    owner: "Tejas Gokhe",
    relatedTo: "Deal: Greystone Realty",
    version: 1,
    tags: ["proposal"],
    uploadedAt: "15/07/2026",
    accessLevel: "Organization",
    sizeLabel: "1.2 MB",
    versions: [
      {
        version: 1,
        uploadedAt: "15/07/2026",
        uploadedBy: "Tejas Gokhe",
        sizeLabel: "1.2 MB",
      },
    ],
  },
  {
    id: "lib3",
    fileName: "Standard_NDA_Template.docx",
    folder: "Templates",
    owner: "Roshna Abraham",
    version: 3,
    tags: ["template", "nda"],
    uploadedAt: "01/07/2026",
    accessLevel: "Organization",
    sizeLabel: "88 KB",
    versions: [
      {
        version: 1,
        uploadedAt: "01/05/2026",
        uploadedBy: "Roshna Abraham",
        sizeLabel: "72 KB",
      },
      {
        version: 2,
        uploadedAt: "12/06/2026",
        uploadedBy: "Roshna Abraham",
        sizeLabel: "80 KB",
      },
      {
        version: 3,
        uploadedAt: "01/07/2026",
        uploadedBy: "Roshna Abraham",
        sizeLabel: "88 KB",
        note: "Updated indemnity clause",
      },
    ],
  },
  {
    id: "lib4",
    fileName: "Chloe_Bank_Statements_Q2.pdf",
    folder: "Clients",
    owner: "Shiva Kadhka",
    relatedTo: "Lead: Chloe Ramirez",
    version: 1,
    tags: ["financial", "kyc"],
    uploadedAt: "19/07/2026",
    accessLevel: "Private",
    sizeLabel: "3.4 MB",
    versions: [
      {
        version: 1,
        uploadedAt: "19/07/2026",
        uploadedBy: "Shiva Kadhka",
        sizeLabel: "3.4 MB",
      },
    ],
  },
  {
    id: "lib5",
    fileName: "Greystone_Signed_Acceptance.pdf",
    folder: "Signed",
    owner: "Tejas Gokhe",
    relatedTo: "Deal: Greystone Realty",
    version: 1,
    tags: ["signed", "proposal"],
    uploadedAt: "12/07/2026",
    accessLevel: "Team",
    sizeLabel: "410 KB",
    versions: [
      {
        version: 1,
        uploadedAt: "12/07/2026",
        uploadedBy: "System",
        sizeLabel: "410 KB",
        note: "From e-signature",
      },
    ],
  },
];

const STORE_KEY = "documents:library:v1";

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
