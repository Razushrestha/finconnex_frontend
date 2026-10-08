import { describe, expect, it } from "vitest";

import {
  backgroundSizedUrl,
  isLinkedImage,
  libraryImageCredit,
  libraryImagesFrom,
} from "@/lib/booking/background-library";

describe("free background photos", () => {
  it("keeps only https photos, so none is blocked on the https booking page", () => {
    const images = libraryImagesFrom({
      results: [
        { id: "a", title: "Beach", url: "https://cdn.stocksnap.io/img-thumbs/960w/A.jpg", thumbnail: "https://api.openverse.org/v1/images/a/thumb/", width: 960, height: 640 },
        { id: "b", title: "Old", url: "http://example.com/b.jpg", thumbnail: "https://api.openverse.org/v1/images/b/thumb/" },
      ],
    });
    expect(images.map((image) => image.id)).toEqual(["a"]);
    expect(images[0].imageUrl).toBe("https://cdn.stocksnap.io/img-thumbs/960w/A.jpg");
  });

  it("asks Wikimedia for its 1920px rendition of a large original", () => {
    expect(
      backgroundSizedUrl("https://upload.wikimedia.org/wikipedia/commons/7/78/Lookout_mountain_TN.JPG", 3456),
    ).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Lookout_mountain_TN.JPG/1920px-Lookout_mountain_TN.JPG",
    );
    // Already small enough, or not Wikimedia: unchanged.
    expect(backgroundSizedUrl("https://upload.wikimedia.org/wikipedia/commons/7/78/x.jpg", 1200)).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/7/78/x.jpg",
    );
  });

  it("tells a linked photo from an uploaded one", () => {
    expect(isLinkedImage("https://cdn.stocksnap.io/a.jpg")).toBe(true);
    expect(isLinkedImage("data:image/webp;base64,AAAA")).toBe(false);
    expect(isLinkedImage(null)).toBe(false);
  });

  it("keeps the photographer and the photo's StockSnap page for the credit", () => {
    const [image] = libraryImagesFrom({
      results: [
        {
          id: "s",
          url: "https://cdn.stocksnap.io/img-thumbs/960w/I3QWA2OLLM.jpg",
          thumbnail: "https://api.openverse.org/v1/images/s/thumb/",
          creator: "Ian Schneider",
          foreign_landing_url: "https://stocksnap.io/photo/beach-shore-I3QWA2OLLM",
        },
      ],
    });
    expect(libraryImageCredit(image)).toBe("Photo: Ian Schneider on StockSnap");
    expect(image.landingUrl).toBe("https://stocksnap.io/photo/beach-shore-I3QWA2OLLM");
    expect(libraryImageCredit({ creator: "" })).toBe("Photo: StockSnap");
  });
});
