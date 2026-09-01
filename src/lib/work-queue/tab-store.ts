import { getUserTabs, type WorkQueueUserTab } from "@/lib/work-queue/live";

const STORAGE_KEY = "finconnex.work-queue.person-tabs";

type TabState = {
  tabs: WorkQueueUserTab[];
  scope: string;
  removedIds: string[];
};

type Listener = () => void;

function defaultState(): TabState {
  const tabs = getUserTabs();
  return { tabs, scope: tabs[0]?.id ?? "", removedIds: [] };
}

function readStored(): TabState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TabState>;
    if (!Array.isArray(parsed.tabs)) return null;
    return {
      tabs: parsed.tabs,
      scope: typeof parsed.scope === "string" ? parsed.scope : "",
      removedIds: Array.isArray(parsed.removedIds)
        ? parsed.removedIds.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return null;
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tabs: state.tabs,
        scope: state.scope,
        removedIds: state.removedIds,
      }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

let state: TabState = { tabs: [], scope: "", removedIds: [] };
let hydrated = false;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

function commit(next: TabState) {
  state = next;
  hydrated = true;
  persist();
  emit();
}

export function hydrateWorkQueueTabs() {
  if (hydrated) return state;
  const stored = readStored();
  if (stored) {
    const scope =
      stored.scope && stored.tabs.some((tab) => tab.id === stored.scope)
        ? stored.scope
        : (stored.tabs[0]?.id ?? "");
    state = { ...stored, scope };
  } else {
    state = defaultState();
  }
  hydrated = true;
  persist();
  return state;
}

export function getWorkQueueTabState(): TabState {
  return hydrated ? state : (readStored() ?? defaultState());
}

export function subscribeWorkQueueTabs(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setWorkQueueTabs(tabs: WorkQueueUserTab[]) {
  const keep = new Set(tabs.map((tab) => tab.id));
  commit({
    ...state,
    tabs,
    removedIds: state.removedIds.filter((id) => !keep.has(id)),
  });
}

export function setWorkQueueScope(scope: string) {
  commit({ ...state, scope });
}

export function removeWorkQueueTab(id: string) {
  const tabs = state.tabs.filter((tab) => tab.id !== id);
  const removedIds = state.removedIds.includes(id)
    ? state.removedIds
    : [...state.removedIds, id];
  const scope = state.scope === id ? (tabs[0]?.id ?? "") : state.scope;
  commit({ tabs, scope, removedIds });
}

export function mergeWorkQueueTabs(nextTabs: WorkQueueUserTab[]) {
  const removed = new Set(state.removedIds);
  const merged = [...state.tabs];
  for (const tab of nextTabs) {
    if (removed.has(tab.id)) continue;
    if (merged.some((existing) => existing.id === tab.id || existing.name === tab.name)) {
      continue;
    }
    merged.push(tab);
  }
  const scope =
    merged.some((tab) => tab.id === state.scope) && state.scope
      ? state.scope
      : (merged[0]?.id ?? "");
  commit({ ...state, tabs: merged, scope });
}
