import { describe, expect, it } from "vitest";

import { addTags } from "@/components/shared/tags/TagListInput";

describe("addTags", () => {
  it("adds each comma-separated tag, trimmed", () => {
    expect(addTags([], "legal, kyc ,")).toEqual(["legal", "kyc"]);
  });

  it("skips empty parts and duplicates, ignoring case", () => {
    expect(addTags(["Legal"], " , legal, LEGAL, kyc")).toEqual(["Legal", "kyc"]);
  });
});
