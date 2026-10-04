import { beforeEach, describe, expect, it } from "vitest";
import {
  listLibraryDocuments,
  pushLibraryDoc,
  removeLibraryDocument,
  replaceLibraryDocuments,
  upsertLibraryDocument,
  type LibraryDocument,
} from "@/lib/documents/library/types";

const upload = {
  id: "lib-local-1",
  fileName: "passport.pdf",
  folder: "Clients",
  owner: "Me",
  version: 1,
  tags: [],
  uploadedAt: "2026-10-04",
  accessLevel: "Private",
  sizeLabel: "14 KB",
} as unknown as LibraryDocument;

const memory = new Map<string, string>();
const storage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => void memory.set(key, value),
  clear: () => memory.clear(),
};
Object.assign(globalThis, { window: globalThis, sessionStorage: storage });

// The library reloads by replacing its list with what the CRM returned;
// files that only exist locally must keep their edits through that.
describe("local library uploads", () => {
  beforeEach(() => sessionStorage.clear());

  it("keeps a moved file in its new folder after the library reloads", () => {
    pushLibraryDoc(upload);
    replaceLibraryDocuments([]);
    upsertLibraryDocument({ ...upload, folder: "Deals" });
    replaceLibraryDocuments([]);
    expect(listLibraryDocuments().map((d) => d.folder)).toEqual(["Deals"]);
  });

  it("refiles a file that was moved into a view such as Recent", () => {
    pushLibraryDoc({ ...upload, folder: "Recent" });
    replaceLibraryDocuments([]);
    expect(listLibraryDocuments().map((d) => d.folder)).toEqual(["Clients"]);
  });

  it("keeps a deleted file gone after the library reloads", () => {
    pushLibraryDoc(upload);
    replaceLibraryDocuments([]);
    removeLibraryDocument(upload.id);
    replaceLibraryDocuments([]);
    expect(listLibraryDocuments()).toEqual([]);
  });
});
