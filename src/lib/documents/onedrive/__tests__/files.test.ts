import { describe, expect, it } from "vitest";
import {
  isAllowedOneDriveDownloadUrl,
  oneDriveDownloadUrl,
} from "@/lib/documents/onedrive/files";

describe("OneDrive download links", () => {
  it("reads the download link the chooser returns", () => {
    expect(
      oneDriveDownloadUrl({
        name: "contract.pdf",
        "@microsoft.graph.downloadUrl": "https://contoso-my.sharepoint.com/download.aspx?guid=1",
      }),
    ).toBe("https://contoso-my.sharepoint.com/download.aspx?guid=1");
  });

  it("accepts OneDrive and SharePoint download hosts only", () => {
    expect(
      isAllowedOneDriveDownloadUrl("https://sn3302files.onedrive.live.com/download?x=1"),
    ).toBe(true);
    expect(
      isAllowedOneDriveDownloadUrl("https://contoso.sharepoint.com/personal/a/doc.docx"),
    ).toBe(true);
    expect(isAllowedOneDriveDownloadUrl("http://onedrive.live.com/file")).toBe(false);
    expect(isAllowedOneDriveDownloadUrl("https://example.com/file.pdf")).toBe(false);
  });
});
