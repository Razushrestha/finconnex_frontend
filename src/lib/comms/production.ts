/**
 * Phase 15 — flip upload + send to API mode when CRM URL is configured.
 */

import {
  enableApiUpload,
  enableLocalUpload,
  getUploadAdapter,
} from "@/lib/attachments/upload";
import {
  enableApiSendGateway,
  enableDeviceIntentGateway,
  getSendGateway,
} from "@/lib/comms/send-gateway";
import { fetchAuthBridge } from "@/lib/persistence/auth-bridge";

export type ProductionCommsResult = {
  uploadMode: "local" | "api";
  sendMode: "device" | "api";
  baseUrl: string | null;
};

/**
 * Enable API upload + send gateways when `NEXT_PUBLIC_CRM_API_URL` is set.
 * Otherwise keep local upload + device intents.
 */
export async function enableProductionComms(options?: {
  baseUrl?: string | null;
  fetchImpl?: typeof fetch;
  getAccessToken?: () => string | null | Promise<string | null>;
}): Promise<ProductionCommsResult> {
  const baseUrl =
    options?.baseUrl === null
      ? null
      : options?.baseUrl?.trim() ||
        (typeof process !== "undefined"
          ? process.env.NEXT_PUBLIC_CRM_API_URL?.trim() || null
          : null);

  if (!baseUrl) {
    enableLocalUpload();
    enableDeviceIntentGateway();
    return {
      uploadMode: getUploadAdapter().mode,
      sendMode: getSendGateway().mode,
      baseUrl: null,
    };
  }

  const bridge = await fetchAuthBridge({ fetchImpl: options?.fetchImpl });
  const getAccessToken =
    options?.getAccessToken ?? (async () => bridge.accessToken);

  enableApiUpload({
    baseUrl,
    getAccessToken,
    fetchImpl: options?.fetchImpl,
  });
  enableApiSendGateway({
    baseUrl,
    getAccessToken,
    fetchImpl: options?.fetchImpl,
  });

  return {
    uploadMode: getUploadAdapter().mode,
    sendMode: getSendGateway().mode,
    baseUrl,
  };
}
