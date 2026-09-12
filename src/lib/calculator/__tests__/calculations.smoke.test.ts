import { describe, it } from "vitest";
import {
  smokeCalculationsMock,
  smokeCalculationsWiring,
} from "@/lib/calculator/smoke";

describe("Calculations API smoke (CI)", () => {
  it("wires client, catalog, BFF, and calculator UI", () => {
    smokeCalculationsWiring();
  });

  it("mocks GET list/get, POST save, DELETE soft-delete", async () => {
    await smokeCalculationsMock();
  });
});
