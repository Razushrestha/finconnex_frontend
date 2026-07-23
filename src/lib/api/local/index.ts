import type { FinconnexApi } from "@/lib/api/contracts";
import { localAuthApi } from "@/lib/api/local/auth";
import { localLeadsApi } from "@/lib/api/local/leads";
import { localContactsApi } from "@/lib/api/local/contacts";
import { localDealsApi } from "@/lib/api/local/deals";
import { localTasksApi } from "@/lib/api/local/tasks";
import { localTicketsApi } from "@/lib/api/local/tickets";
import { localRulesApi } from "@/lib/api/local/rules";

export function createLocalApi(): FinconnexApi {
  return {
    mode: "local",
    auth: localAuthApi,
    leads: localLeadsApi,
    contacts: localContactsApi,
    deals: localDealsApi,
    tasks: localTasksApi,
    tickets: localTicketsApi,
    rules: localRulesApi,
  };
}
