"use client";

import { useSyncExternalStore } from "react";

function subscribeNever() {
  return () => {};
}

/**
 * True once the component has hydrated on the client. Replaces the classic
 * `useState(false)` + `useEffect(() => setMounted(true), [])` flag — that
 * pattern calls setState synchronously inside an effect body (flagged by
 * react-hooks/set-state-in-effect). `useSyncExternalStore` is the
 * React-documented way to read a value that legitimately differs between
 * server and client snapshots without an effect-driven render.
 */
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}
