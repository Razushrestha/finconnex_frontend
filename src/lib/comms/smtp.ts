/**
 * Phase F3 — SMTP settings for demo email gateway.
 */

import {
  readPersistedJson,
  writePersistedJson,
} from "@/lib/persistence/registry";

const KEY = "comms:smtp:v1";

export type SmtpConfig = {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  fromName: string;
  fromEmail: string;
  useTls: boolean;
};

export const DEFAULT_SMTP: SmtpConfig = {
  enabled: true,
  host: "smtp.finconnex.demo",
  port: 587,
  username: "noreply",
  fromName: "FinConnex CRM",
  fromEmail: "noreply@finconnex.demo",
  useTls: true,
};

export function loadSmtpConfig(): SmtpConfig {
  return { ...DEFAULT_SMTP, ...readPersistedJson<Partial<SmtpConfig>>(KEY, {}) };
}

export function saveSmtpConfig(cfg: SmtpConfig) {
  writePersistedJson(KEY, cfg);
  return cfg;
}
