const STORAGE_KEY = "finconnex.esign.sender-profile.v1";

export type SavedSenderProfile = {
  signature: string;
  initial: string;
  company: string;
  jobTitle: string;
  stamp: string;
};

export const EMPTY_SENDER_PROFILE: SavedSenderProfile = {
  signature: "",
  initial: "",
  company: "",
  jobTitle: "",
  stamp: "",
};

export function loadSavedSenderProfile(): SavedSenderProfile {
  if (typeof window === "undefined") return { ...EMPTY_SENDER_PROFILE };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_SENDER_PROFILE };
    const parsed = JSON.parse(raw) as Partial<SavedSenderProfile>;
    return {
      signature: String(parsed.signature ?? ""),
      initial: String(parsed.initial ?? ""),
      company: String(parsed.company ?? ""),
      jobTitle: String(parsed.jobTitle ?? ""),
      stamp: String(parsed.stamp ?? ""),
    };
  } catch {
    return { ...EMPTY_SENDER_PROFILE };
  }
}

export function saveSavedSenderProfile(profile: SavedSenderProfile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore quota */
  }
}

export function senderProfileHasSignature(profile: SavedSenderProfile) {
  return Boolean(profile.signature.trim());
}
