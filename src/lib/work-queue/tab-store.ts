import { getUserTabs, type WorkQueueUserTab } from "@/lib/work-queue/live";

type TabState = {
  tabs: WorkQueueUserTab[];
  scope: string;
};

type Listener = () => void;

function readInitial(): TabState {
  const tabs = getUserTabs();
  return { tabs, scope: tabs[0]?.id ?? "" };
}

let state: TabState = { tabs: [], scope: "" };
let hydrated = false;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function hydrateWorkQueueTabs() {
  if (hydrated) return state;
  state = readInitial();
  hydrated = true;
  return state;
}

export function getWorkQueueTabState(): TabState {
  return hydrated ? state : readInitial();
}

export function subscribeWorkQueueTabs(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setWorkQueueTabs(tabs: WorkQueueUserTab[]) {
  state = { ...state, tabs };
  hydrated = true;
  emit();
}

export function setWorkQueueScope(scope: string) {
  state = { ...state, scope };
  hydrated = true;
  emit();
}

export function mergeWorkQueueTabs(nextTabs: WorkQueueUserTab[]) {
  const ids = new Set(nextTabs.map((tab) => tab.id));
  const merged = [...nextTabs, ...state.tabs.filter((tab) => !ids.has(tab.id))];
  const scope =
    merged.some((tab) => tab.id === state.scope) && state.scope
      ? state.scope
      : (merged[0]?.id ?? "");
  state = { tabs: merged, scope };
  hydrated = true;
  emit();
}
