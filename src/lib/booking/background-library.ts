/**
 * Free background photos for booking pages: StockSnap's photos, searched
 * through Openverse (api.openverse.org). StockSnap is a curated site whose
 * every photo is CC0, so commercial use needs no permission; the page still
 * shows a small credit to the photographer as a courtesy.
 *
 * The browser searches Openverse directly — it allows any origin — and a
 * chosen photo is kept only as its web address. Nothing is downloaded to or
 * proxied through FinConnex: the booking page asks the photo's own host for
 * it each time it loads, and shows plain white if that host cannot be
 * reached.
 */

const SEARCH_URL = "https://api.openverse.org/v1/images/";

export type LibraryImage = {
  id: string;
  title: string;
  /** Small preview for the picker. */
  thumbnailUrl: string;
  /** What the page background loads: the photo itself, at most ~1920px wide. */
  imageUrl: string;
  source: string;
  width: number;
  height: number;
  /** Photographer's name, when StockSnap gives one. */
  creator: string;
  /** The photo's page on StockSnap, which the page credit links to. */
  landingUrl: string | null;
};

type OpenverseResult = {
  id?: unknown;
  title?: unknown;
  url?: unknown;
  thumbnail?: unknown;
  source?: unknown;
  creator?: unknown;
  foreign_landing_url?: unknown;
  width?: unknown;
  height?: unknown;
};

const str = (value: unknown) => (typeof value === "string" ? value : "");
const num = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

/**
 * A large Wikimedia original as its 1920px rendition, which Wikimedia serves
 * from the same host. Other hosts' URLs are kept as they are.
 */
export function backgroundSizedUrl(url: string, width: number): string {
  const match = url.match(
    /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([0-9a-f])\/([0-9a-f]{2})\/([^/?#]+)$/,
  );
  if (!match || width <= 1920 || /\.(svg|tiff?)$/i.test(match[3])) return url;
  const [, a, ab, name] = match;
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${a}/${ab}/${name}/1920px-${name}`;
}

export function libraryImagesFrom(data: unknown): LibraryImage[] {
  const results =
    data &&
    typeof data === "object" &&
    Array.isArray((data as { results?: unknown }).results)
      ? (data as { results: OpenverseResult[] }).results
      : [];
  const images: LibraryImage[] = [];
  for (const row of results) {
    const url = str(row.url);
    const thumbnailUrl = str(row.thumbnail);
    // An http:// photo would be blocked on the https booking page.
    if (!url.startsWith("https://") || !thumbnailUrl.startsWith("https://"))
      continue;
    const width = num(row.width);
    images.push({
      id: str(row.id) || url,
      title: str(row.title) || "Untitled photo",
      thumbnailUrl,
      imageUrl: backgroundSizedUrl(url, width),
      source: str(row.source),
      creator: str(row.creator).trim(),
      landingUrl: str(row.foreign_landing_url).startsWith("https://")
        ? str(row.foreign_landing_url)
        : null,
      width,
      height: num(row.height),
    });
  }
  return images;
}

export async function searchLibraryImages(
  query: string,
  page = 1,
  signal?: AbortSignal,
): Promise<{ images: LibraryImage[]; hasMore: boolean }> {
  const q = query.trim();
  if (!q) return { images: [], hasMore: false };
  const params = new URLSearchParams({
    q,
    // StockSnap only: curated, and all CC0. Open-upload sources (Wikimedia,
    // Flickr) occasionally carry a wrong licence label.
    license: "cc0",
    source: "stocksnap",
    aspect_ratio: "wide",
    size: "large",
    mature: "false",
    page_size: "20",
    page: String(page),
  });
  const res = await fetch(`${SEARCH_URL}?${params}`, { signal });
  if (res.status === 429) {
    throw new Error("Too many searches for now. Wait a minute and try again.");
  }
  if (!res.ok) throw new Error("The image library could not be reached.");
  const data = (await res.json()) as { page_count?: unknown };
  return {
    images: libraryImagesFrom(data),
    hasMore: num(data.page_count) > page,
  };
}

/** True for a photo kept as a web address rather than an uploaded image. */
export function isLinkedImage(value: string | null | undefined): boolean {
  return !!value && /^https:\/\//i.test(value);
}

/** The page credit for a library photo, e.g. "Photo: Ian Schneider on StockSnap". */
export function libraryImageCredit(image: Pick<LibraryImage, "creator">): string {
  return image.creator ? `Photo: ${image.creator} on StockSnap` : "Photo: StockSnap";
}
