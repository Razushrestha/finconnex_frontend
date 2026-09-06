export const TAG_TONES = [
  { id: "red", color: "#EF4444", chip: "bg-red-500", dot: "bg-red-500" },
  { id: "orange", color: "#F97316", chip: "bg-orange-500", dot: "bg-orange-500" },
  { id: "amber", color: "#F59E0B", chip: "bg-amber-500", dot: "bg-amber-500" },
  { id: "emerald", color: "#22C55E", chip: "bg-emerald-500", dot: "bg-emerald-500" },
  { id: "sky", color: "#0EA5E9", chip: "bg-sky-500", dot: "bg-sky-500" },
  { id: "blue", color: "#3B82F6", chip: "bg-blue-500", dot: "bg-blue-500" },
  { id: "violet", color: "#7C3AED", chip: "bg-violet-500", dot: "bg-violet-500" },
  { id: "fuchsia", color: "#DB2777", chip: "bg-fuchsia-500", dot: "bg-fuchsia-500" },
  { id: "rose", color: "#F43F5E", chip: "bg-rose-500", dot: "bg-rose-500" },
  { id: "teal", color: "#14B8A6", chip: "bg-teal-500", dot: "bg-teal-500" },
] as const;

export type TagToneId = (typeof TAG_TONES)[number]["id"];

export const NAMED_TAG_TONES: Record<string, TagToneId> = {
  "new-lead": "violet",
  new: "emerald",
  hot: "red",
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

const TONE_IDS = new Set<string>(TAG_TONES.map((tone) => tone.id));

type TagColorListener = () => void;
const colorListeners = new Set<TagColorListener>();

export function onTagColorsChange(listener: TagColorListener) {
  colorListeners.add(listener);
  return () => {
    colorListeners.delete(listener);
  };
}

function emitTagColorsChange() {
  colorListeners.forEach((listener) => listener());
}

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
    const parsed = JSON.parse(raw) as Record<string, string>;
    const out: Record<string, TagToneId> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (TONE_IDS.has(value)) out[key] = value as TagToneId;
    }
    return out;
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
  emitTagColorsChange();
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
