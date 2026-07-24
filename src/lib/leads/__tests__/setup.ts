import { beforeAll } from "vitest";
import { installSmokePolyfill } from "@/lib/leads/smoke-polyfill";
import { enableSessionPersistence } from "@/lib/persistence";

beforeAll(() => {
  installSmokePolyfill();
  enableSessionPersistence();
});
