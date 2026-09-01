/** Browser geocoding via Photon (OpenStreetMap), Australia-first. */

export type AddressHit = {
  id: string;
  label: string;
  australia: boolean;
  street: string;
  suburb: string;
  state: string;
  postcode: string;
  lat?: number;
  lon?: number;
};

const AU_CENTER = { lat: -25.2744, lon: 133.7751 };
const AU_BBOX = "113.15,-43.7,153.7,-10.6";

const STATE_MAP: Record<string, string> = {
  "new south wales": "NSW",
  victoria: "VIC",
  queensland: "QLD",
  "western australia": "WA",
  "south australia": "SA",
  tasmania: "TAS",
  "australian capital territory": "ACT",
  "northern territory": "NT",
  nsw: "NSW",
  vic: "VIC",
  qld: "QLD",
  wa: "WA",
  sa: "SA",
  tas: "TAS",
  act: "ACT",
  nt: "NT",
};

export function normalizeAuState(value: string) {
  return STATE_MAP[value.trim().toLowerCase()] ?? value.trim();
}

function isAustralia(properties: Record<string, unknown>) {
  const country = String(properties.country ?? "").toLowerCase();
  const code = String(properties.countrycode ?? "").toUpperCase();
  return code === "AU" || code === "AUS" || country === "australia";
}

function formatPhotonAddress(properties: Record<string, unknown>) {
  const house = String(properties.housenumber ?? "").trim();
  const street = String(properties.street ?? "").trim();
  const name = String(properties.name ?? "").trim();
  const city = String(
    properties.city ?? properties.town ?? properties.village ?? "",
  ).trim();
  const state = normalizeAuState(String(properties.state ?? ""));
  const postcode = String(properties.postcode ?? "").trim();
  const country = String(properties.country ?? "").trim();
  const line1 = [house, street].filter(Boolean).join(" ") || name;
  return [...new Set([line1, city, state, postcode, country].filter(Boolean))].join(
    ", ",
  );
}

function hitFromPhoton(
  feature: {
    properties?: Record<string, unknown>;
    geometry?: { coordinates?: number[] };
  },
  index: number,
): AddressHit | null {
  const properties = feature.properties ?? {};
  const label = formatPhotonAddress(properties);
  if (!label) return null;
  const house = String(properties.housenumber ?? "").trim();
  const streetName = String(properties.street ?? "").trim();
  const coords = feature.geometry?.coordinates;
  return {
    id: `${label}-${index}`,
    label,
    australia: isAustralia(properties),
    street: [house, streetName].filter(Boolean).join(" "),
    suburb: String(
      properties.city ?? properties.town ?? properties.village ?? "",
    ).trim(),
    state: normalizeAuState(String(properties.state ?? "")),
    postcode: String(properties.postcode ?? "").trim(),
    lon: coords?.[0],
    lat: coords?.[1],
  };
}

async function fetchPhoton(query: string, australiaFirst: boolean) {
  const params = new URLSearchParams({
    q: query,
    limit: australiaFirst ? "8" : "6",
    lang: "en",
  });
  if (australiaFirst) {
    params.set("lat", String(AU_CENTER.lat));
    params.set("lon", String(AU_CENTER.lon));
    params.set("bbox", AU_BBOX);
  }
  const res = await fetch(`https://photon.komoot.io/api/?${params.toString()}`);
  if (!res.ok) return [] as AddressHit[];
  const data = (await res.json()) as {
    features?: {
      properties?: Record<string, unknown>;
      geometry?: { coordinates?: number[] };
    }[];
  };
  return (data.features ?? [])
    .map((feature, index) => hitFromPhoton(feature, index))
    .filter((item): item is AddressHit => Boolean(item));
}

export async function searchAddresses(query: string): Promise<AddressHit[]> {
  const australian = await fetchPhoton(query, true);
  const needed = Math.max(0, 6 - australian.length);
  const others =
    needed > 0
      ? (await fetchPhoton(query, false)).filter(
          (hit) =>
            !hit.australia &&
            !australian.some((row) => row.label === hit.label),
        )
      : [];
  return [...australian, ...others].slice(0, 6);
}

export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<AddressHit | null> {
  const res = await fetch(
    `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&lang=en`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    features?: {
      properties?: Record<string, unknown>;
      geometry?: { coordinates?: number[] };
    }[];
  };
  const first = data.features?.[0];
  return first ? hitFromPhoton(first, 0) : null;
}
