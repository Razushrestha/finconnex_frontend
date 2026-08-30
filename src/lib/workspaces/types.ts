/** Swagger workspaces — mine / get / create / update / soft-delete */

export type CrmWorkspaceRecord = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

const STORE_KEY = "workspaces:mine:v1";

const SEED: CrmWorkspaceRecord[] = [
  {
    id: "ws-demo-1",
    name: "FinConnex HQ",
    slug: "finconnex-hq",
    status: "Active",
    plan: "Growth",
    memberCount: 4,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
  },
];

function readStore(): CrmWorkspaceRecord[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as CrmWorkspaceRecord[]) : null;
  } catch {
    return null;
  }
}

function writeStore(list: CrmWorkspaceRecord[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function listStoredWorkspaces(): CrmWorkspaceRecord[] {
  return readStore() ?? SEED.map((row) => ({ ...row }));
}

export function upsertStoredWorkspace(row: CrmWorkspaceRecord) {
  const list = listStoredWorkspaces();
  const i = list.findIndex((x) => x.id === row.id);
  if (i >= 0) list[i] = row;
  else list.unshift(row);
  writeStore(list);
  return row;
}

export function replaceCrmWorkspaces(remote: CrmWorkspaceRecord[]) {
  writeStore(remote.map((row) => ({ ...row })));
}

export function deleteStoredWorkspace(id: string) {
  writeStore(listStoredWorkspaces().filter((row) => row.id !== id));
}
