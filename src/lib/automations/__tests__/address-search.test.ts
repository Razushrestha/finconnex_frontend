import { beforeEach, describe, expect, it, vi } from "vitest";

const listCrmWorkspaceMembers = vi.fn();
const listCrmContacts = vi.fn();

vi.mock("@/lib/workspace-members/api", () => ({
  listCrmWorkspaceMembers: () => listCrmWorkspaceMembers(),
}));
vi.mock("@/lib/contacts/api", () => ({
  listCrmContacts: (query: unknown) => listCrmContacts(query),
}));

const { searchEmailAddresses } = await import("@/lib/automations/address-search");

const member = (name: string, email: string) => ({ userId: name, name, email });
const contact = (name: string, email: string) => ({ contact: { id: name, name, email } });

describe("email address search", () => {
  beforeEach(() => {
    listCrmWorkspaceMembers.mockReset();
    listCrmContacts.mockReset();
    listCrmWorkspaceMembers.mockResolvedValue([]);
    listCrmContacts.mockResolvedValue([]);
  });

  it("offers teammates and contacts together, tagged by where they came from", async () => {
    listCrmWorkspaceMembers.mockResolvedValue([member("Ada Lovelace", "ada@team.com")]);
    listCrmContacts.mockResolvedValue([contact("Grace Hopper", "grace@client.com")]);

    expect(await searchEmailAddresses("")).toEqual([
      { name: "Ada Lovelace", email: "ada@team.com", source: "Teammate" },
      { name: "Grace Hopper", email: "grace@client.com", source: "Contact" },
    ]);
  });

  it("filters teammates locally and leaves contact search to the API", async () => {
    // The members endpoint takes no search term, so the whole list comes back
    // and the match happens here; contacts are searched server-side.
    listCrmWorkspaceMembers.mockResolvedValue([
      member("Ada Lovelace", "ada@team.com"),
      member("Alan Turing", "alan@team.com"),
    ]);

    const found = await searchEmailAddresses("ada");
    expect(found.map((row) => row.email)).toEqual(["ada@team.com"]);
    expect(listCrmContacts).toHaveBeenCalledWith({ page: 1, limit: 20, search: "ada" });

    // A match on the address, not just the name, counts too.
    listCrmContacts.mockClear();
    expect((await searchEmailAddresses("alan@")).map((row) => row.email)).toEqual([
      "alan@team.com",
    ]);
  });

  it("drops unusable addresses and never offers the same mailbox twice", async () => {
    listCrmWorkspaceMembers.mockResolvedValue([
      member("No Address", ""),
      member("Ada Lovelace", "ada@team.com"),
    ]);
    listCrmContacts.mockResolvedValue([
      contact("Ada (personal)", "ADA@team.com"),
      contact("Broken", "not-an-address"),
      contact("Grace Hopper", "grace@client.com"),
    ]);

    expect(await searchEmailAddresses("")).toEqual([
      { name: "Ada Lovelace", email: "ada@team.com", source: "Teammate" },
      { name: "Grace Hopper", email: "grace@client.com", source: "Contact" },
    ]);
  });

  it("still suggests from the source that answered when the other fails", async () => {
    listCrmWorkspaceMembers.mockResolvedValue([member("Ada Lovelace", "ada@team.com")]);
    listCrmContacts.mockRejectedValue(new Error("offline"));

    expect((await searchEmailAddresses("")).map((row) => row.source)).toEqual(["Teammate"]);
  });
});
