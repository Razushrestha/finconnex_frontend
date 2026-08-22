/** Canonical Lead module routes from multi-crm-backend Swagger. */

export const CRM_LEAD_ENDPOINTS = [
  { key: "create", method: "POST", path: "/v1/leads", client: "createCrmLead" },
  { key: "bulk", method: "POST", path: "/v1/leads/bulk", client: "bulkCrmLeads" },
  { key: "import", method: "POST", path: "/v1/leads/import", client: "importCrmLeads" },
  { key: "kanban", method: "GET", path: "/v1/leads/kanban", client: "fetchLeadKanban" },
  { key: "list", method: "GET", path: "/v1/leads", client: "fetchLeadList" },
  { key: "get", method: "GET", path: "/v1/leads/{id}", client: "fetchLeadById" },
  { key: "update", method: "PATCH", path: "/v1/leads/{id}", client: "updateCrmLead" },
  {
    key: "assignOwner",
    method: "PATCH",
    path: "/v1/leads/{id}/owner",
    client: "assignCrmLeadOwner",
  },
  {
    key: "unassignOwner",
    method: "DELETE",
    path: "/v1/leads/{id}/owner",
    client: "unassignCrmLeadOwner",
  },
  {
    key: "linkCompany",
    method: "PATCH",
    path: "/v1/leads/{id}/company",
    client: "linkCrmLeadCompany",
  },
  {
    key: "unlinkCompany",
    method: "DELETE",
    path: "/v1/leads/{id}/company",
    client: "unlinkCrmLeadCompany",
  },
  {
    key: "changeStatus",
    method: "PATCH",
    path: "/v1/leads/{id}/status",
    client: "changeCrmLeadStatus",
  },
  {
    key: "changeLifecycle",
    method: "PATCH",
    path: "/v1/leads/{id}/lifecycle-stage",
    client: "changeCrmLeadLifecycleStage",
  },
  {
    key: "changeRating",
    method: "PATCH",
    path: "/v1/leads/{id}/rating",
    client: "changeCrmLeadRating",
  },
  {
    key: "changeScore",
    method: "PATCH",
    path: "/v1/leads/{id}/score",
    client: "changeCrmLeadScore",
  },
  {
    key: "convert",
    method: "POST",
    path: "/v1/leads/{id}/convert",
    client: "convertCrmLead",
  },
  {
    key: "softDelete",
    method: "DELETE",
    path: "/v1/leads/{id}",
    client: "softDeleteCrmLead",
  },
] as const;

export type CrmLeadEndpoint = (typeof CRM_LEAD_ENDPOINTS)[number];
