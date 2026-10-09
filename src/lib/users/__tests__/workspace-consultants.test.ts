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
vi.mock("@/lib/booking/api", () => ({
  tryCrmBooking: async (run: () => Promise<unknown>) => {
    try {
      return await run();
    } catch {
      return null;
    }
  },
  listCrmBookingHosts: async () => [],
  listCrmConsultants: async () => [],
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

  it("lists only activated members: invited and not-yet-signed-in users are left out", async () => {
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
      {
        // Added by an admin: Active in the workspace, but has never signed in.
        id: "local-3",
        userId: "local-3",
        name: "Alan Turing",
        email: "alan@team.com",
        role: "User",
        status: "Active",
        isOwner: false,
        mustChangePassword: true,
      },
    ]);

    const rows = await loadWorkspaceConsultants();
    expect(rows.map((row) => row.name)).toEqual(["Ada Lovelace"]);
  });

  it("keeps a not-yet-activated user out even when the browser's directory lists them", async () => {
    listCrmWorkspaceMembers.mockResolvedValue([
      {
        id: "m-3",
        userId: "local-3",
        name: "Alan Turing",
        email: "alan@team.com",
        role: "User",
        status: "Active",
        isOwner: false,
        mustChangePassword: true,
      },
    ]);
    listCrmUsers.mockReturnValue([
      { id: "u-3", name: "Alan Turing", email: "ALAN@team.com", status: "Active" },
    ] as never);

    const rows = await loadWorkspaceConsultants();
    expect(rows.map((row) => row.name)).toEqual([]);
  });
});
