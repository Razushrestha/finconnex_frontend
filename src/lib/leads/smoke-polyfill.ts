/** Shared browser polyfill for Lead Card smokes / Vitest. */

export function installSmokePolyfill() {
  // Independent of the storage check: Node 26+ ships a native sessionStorage,
  // and returning early there left `window` undefined, so every
  // `typeof window` guard silently skipped storage writes.
  if (typeof globalThis.window === "undefined") {
    Object.defineProperty(globalThis, "window", {
      value: globalThis,
      configurable: true,
    });
  }

  if (typeof globalThis.sessionStorage !== "undefined") return;

  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: () => null as string | null,
    get length() {
      return map.size;
    },
  };

  Object.defineProperty(globalThis, "sessionStorage", {
    value: storage,
    configurable: true,
  });
}

export function smokeFail(msg: string): never {
  throw new Error(msg);
}

export function runAsCli(run: () => void | Promise<void>) {
  if (process.env.VITEST) return;
  void Promise.resolve()
    .then(() => run())
    .catch((err) => {
      console.error("FAIL:", err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
