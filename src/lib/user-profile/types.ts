export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userName: string;
  displayName: string;
  phone: string;
  jobTitle: string;
  avatar: string;
  globalRole: string;
  isVerified: boolean;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: "",
  email: "",
  firstName: "",
  lastName: "",
  userName: "",
  displayName: "",
  phone: "",
  jobTitle: "",
  avatar: "",
  globalRole: "",
  isVerified: false,
};

const STORE_KEY = "user-profile:v1";

function readStore(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function writeStore(profile: UserProfile) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(profile));
}

export function loadUserProfile(): UserProfile {
  return readStore() ?? { ...DEFAULT_USER_PROFILE };
}

export function saveUserProfile(profile: UserProfile) {
  writeStore({ ...profile });
  return profile;
}

export function replaceCrmUserProfile(remote: UserProfile) {
  writeStore({ ...remote });
  return remote;
}
