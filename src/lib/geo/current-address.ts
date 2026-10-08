/**
 * The browser's current position as a readable street address, via
 * OpenStreetMap's Nominatim reverse geocoder (no API key).
 *
 * Throws an Error whose message can be shown as-is when the browser has no
 * geolocation or the user blocks it. A failed lookup is not an error: the
 * caller still gets the coordinates, which are better than nothing.
 */

type NominatimAddress = Partial<
  Record<
    | "house_number"
    | "road"
    | "neighbourhood"
    | "suburb"
    | "city_district"
    | "village"
    | "town"
    | "city"
    | "municipality"
    | "state"
    | "postcode"
    | "country",
    string
  >
>;

type NominatimReverse = {
  name?: string;
  display_name?: string;
  address?: NominatimAddress;
};

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Location access is blocked. Allow it for this site and try again."
              : "Could not read your location. Try again.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  });
}

/** "Level 1 Acme House, 100 Pitt Street, Sydney NSW 2000, Australia" style. */
export function formatNominatimAddress(result: NominatimReverse): string {
  const a = result.address ?? {};
  const street = [a.house_number, a.road].filter(Boolean).join(" ");
  const locality =
    a.suburb || a.neighbourhood || a.village || a.town || a.city_district || a.city || a.municipality;
  const region = [a.state, a.postcode].filter(Boolean).join(" ");
  // A named place (a building or business) leads, unless it is just the road.
  const place = result.name && result.name !== a.road ? result.name : "";
  const parts = [place, street, locality, region, a.country].filter(
    (part, i, all): part is string => Boolean(part) && all.indexOf(part) === i,
  );
  return parts.length >= 2 ? parts.join(", ") : (result.display_name ?? "").trim();
}

export async function currentLocationAddress(): Promise<string> {
  const { latitude, longitude } = (await currentPosition()).coords;
  const coords = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  try {
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      format: "jsonv2",
      addressdetails: "1",
    });
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) return coords;
    return formatNominatimAddress((await response.json()) as NominatimReverse) || coords;
  } catch {
    return coords;
  }
}
