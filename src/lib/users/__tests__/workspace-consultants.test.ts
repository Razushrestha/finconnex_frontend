import { beforeEach, describe, expect, it, vi } from "vitest";

const listCrmWorkspaceMembers = vi.fn();
const listCrmWorkspaceMembersAdmin = vi.fn();
const listCrmUsers = vi.fn(() => []);
const listWorkspaceMembers = vi.fn(() => []);
const actorMock = vi.fn(() => ({ id: "", name: "", email: "" }));

vi.mock("@/lib/workspace-members/api", () => ({
  listCrmWorkspaceMembers: () => listCrmWorkspaceMembers(),
}));
vi.mock("@/lib/workspace-operations/api", () => ({
  listCrmWorkspaceMembersAdmin: () => listCrmWorkspaceMembersAdmin(),
}));
vi.mock("@/lib/settings/users-store", () => ({
  listCrmUsers: () => listCrmUsers(),
}));
vi.mock("@/lib/workspace-members/types", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/workspace-members/types")
  >("@/lib/workspace-members/types");
  return {
    ...actual,
    listWorkspaceMembers: () => listWorkspaceMembers(),
  };
});
vi.mock("@/lib/rules/actor", () => ({
  getRulesActor: () => actorMock(),
}));

const { loadWorkspaceConsultants } = await import("@/lib/users/assignable");

describe("loadWorkspaceConsultants", () => {
  beforeEach(() => {
    listCrmWorkspaceMembers.mockReset();
    listCrmWorkspaceMembersAdmin.mockReset();
    listCrmUsers.mockReset();
    listWorkspaceMembers.mockReset();
    actorMock.mockReset();
    actorMock.mockReturnValue({ id: "", name: "", email: "" });
    listCrmUsers.mockReturnValue([]);
    listWorkspaceMembers.mockReturnValue([]);
    actorMock.mockReturnValue({ id: "", name: "", email: "" });
    listCrmWorkspaceMembers.mockResolvedValue([]);
    listCrmWorkspaceMembersAdmin.mockResolvedValue({ items: [] });
  });

  it("lists every workspace member as a consultant, even without a user UUID", async () => {
    listCrmWorkspaceMembers.mockResolvedValue([
      {
        id: "local-1",
        userId: "local-1",
        name: "Ada Lovelace",
        email: "ada@team.com",
        role: "User",
        status: "Active",
        isOwner: false,
      },
      {
        id: "local-2",
        userId: "local-2",
        name: "Grace Hopper",
        email: "grace@team.com",
        role: "User",
        status: "Invited",
        isOwner: false,
      },
    ]);

    const rows = await loadWorkspaceConsultants();
    expect(rows.map((row) => row.name).sort()).toEqual([
      "Ada Lovelace",
      "Grace Hopper",
    ]);
  });
});
