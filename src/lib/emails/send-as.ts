import { getRulesActor } from "@/lib/rules/actor";

export type SendAsKind = "own" | "send-as" | "shared";

export interface SendAsIdentity {
  email: string;
  name: string;
  kind: SendAsKind;
}

const DEFAULT_OWN: SendAsIdentity = {
  email: "bishnu@nepatronix.com",
  name: "Bishnu",
  kind: "own",
};

const GRANTED: SendAsIdentity[] = [
  {
    email: "john.smith@finconnex.com",
    name: "John Smith",
    kind: "send-as",
  },
  {
    email: "loans@finconnex.com",
    name: "FinConnex Loans",
    kind: "shared",
  },
];

function canSendAsOther() {
  const role = getRulesActor().role ?? "User";
  return role !== "User" && role !== "Read Only";
}

export function listFromIdentities(): SendAsIdentity[] {
  const actor = getRulesActor();
  const own: SendAsIdentity = {
    ...DEFAULT_OWN,
    name: actor.name || DEFAULT_OWN.name,
  };
  if (!canSendAsOther()) return [own];
  const extras = GRANTED.filter(
    (item) => item.email.toLowerCase() !== own.email.toLowerCase(),
  );
  return [own, ...extras];
}

export function canChooseFromAddress() {
  return listFromIdentities().length > 1;
}

export function sendAsLabel(kind: SendAsKind) {
  if (kind === "own") return "Your mailbox";
  if (kind === "shared") return "Shared mailbox";
  return "Send as";
}
