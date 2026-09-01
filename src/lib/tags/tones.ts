export const TAG_TONES = [
  { id: "violet", chip: "bg-violet-50 text-violet-700 ring-violet-200", dot: "bg-violet-500" },
  { id: "rose", chip: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  { id: "amber", chip: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  { id: "emerald", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  { id: "sky", chip: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" },
  { id: "fuchsia", chip: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200", dot: "bg-fuchsia-500" },
  { id: "orange", chip: "bg-orange-50 text-orange-700 ring-orange-200", dot: "bg-orange-500" },
  { id: "teal", chip: "bg-teal-50 text-teal-700 ring-teal-200", dot: "bg-teal-500" },
] as const;

export type TagToneId = (typeof TAG_TONES)[number]["id"];

export const NAMED_TAG_TONES: Record<string, TagToneId> = {
  "new-lead": "violet",
  new: "emerald",
  hot: "rose",
  priority: "orange",
  proposal: "sky",
  docs: "amber",
  commercial: "teal",
  wholesale: "teal",
  "first home": "sky",
  "first-home": "sky",
  refinance: "amber",
  partner: "fuchsia",
};

const STORAGE_KEY = "crm:tag-colors:v1";
const LEGACY_KEY = "marketing:inbox:tag-colors:v1";

export function uniqueTags(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const tag = raw.trim().replace(/\s+/g, " ");
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

function parseColors(raw: string | null): Record<string, TagToneId> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, TagToneId>;
  } catch {
    return {};
  }
}

export function readTagColors(): Record<string, TagToneId> {
  if (typeof window === "undefined") return {};
  try {
    const local = parseColors(window.localStorage.getItem(STORAGE_KEY));
    const session = parseColors(window.sessionStorage.getItem(LEGACY_KEY));
    return { ...session, ...local };
  } catch {
    return {};
  }
}

export function writeTagColor(tag: string, tone: TagToneId) {
  if (typeof window === "undefined") return;
  const next = { ...readTagColors(), [tag.trim().toLowerCase()]: tone };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

export function hashTagTone(tag: string): TagToneId {
  const key = tag.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return TAG_TONES[hash % TAG_TONES.length]!.id;
}

export function toneForTag(tag: string) {
  const key = tag.trim().toLowerCase();
  const chosen =
    readTagColors()[key] ?? NAMED_TAG_TONES[key] ?? hashTagTone(key);
  return TAG_TONES.find((item) => item.id === chosen) ?? TAG_TONES[0];
}
