import { silentRequest } from "@/lib/notify/fetch-notifier";
import {
  isAllowedOneDriveDownloadUrl,
  oneDriveDownloadUrl,
} from "@/lib/documents/onedrive/files";

const SDK_URL = "https://js.live.net/v7.2/OneDrive.js";
const ONEDRIVE_HOME = "https://onedrive.live.com/?qt=allmyfiles";

type PickerFile = Record<string, unknown>;

type OneDriveSdk = {
  open: (options: {
    clientId: string;
    action: "download";
    multiSelect: boolean;
    openInNewWindow: boolean;
    advanced: { redirectUri: string };
    success: (files: { value?: PickerFile[] }) => void;
    cancel: () => void;
    error: (error: { message?: string }) => void;
  }) => void;
};

declare global {
  interface Window {
    OneDrive?: OneDriveSdk;
  }
}

function clientId() {
  return process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID?.trim() ?? "";
}

function loadSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.OneDrive) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SDK_URL}"]`,
    );
    const done = () => {
      if (window.OneDrive) resolve();
      else reject(new Error("Could not open OneDrive."));
    };
    if (existing) {
      existing.addEventListener("load", done, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Could not open OneDrive.")),
        { once: true },
      );
      return;
    }
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = done;
    script.onerror = () => reject(new Error("Could not open OneDrive."));
    document.body.appendChild(script);
  });
}

/** Start loading the chooser as soon as the Add document menu is on screen. */
export function preloadOneDrivePicker() {
  if (!clientId()) return;
  void loadSdk().catch(() => undefined);
}

function openOneDriveWindow() {
  const popup = window.open(
    ONEDRIVE_HOME,
    "finconnex-onedrive",
    "popup=yes,width=1100,height=760",
  );
  if (!popup) {
    throw new Error(
      "The browser blocked OneDrive. Allow pop-ups for this site and try again.",
    );
  }
  popup.focus();
}

async function fileFromDownload(url: string, name: string): Promise<File> {
  if (!isAllowedOneDriveDownloadUrl(url)) {
    throw new Error(`${name} could not be downloaded from OneDrive.`);
  }
  let response: Response;
  try {
    response = await fetch(url);
    if (!response.ok) throw new Error("direct download failed");
  } catch {
    response = await fetch(
      "/api/onedrive/file",
      silentRequest({
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, name }),
      }),
    );
  }
  if (!response.ok) throw new Error(`Could not download ${name} from OneDrive.`);
  const blob = await response.blob();
  if (!blob.size) throw new Error(`${name} is empty.`);
  return new File([blob], name, {
    type: blob.type || "application/octet-stream",
  });
}

/**
 * Opens OneDrive so the user can choose files. Called directly from the Cloud
 * click so the browser allows the OneDrive window. With a Microsoft app id the
 * chooser returns those files; otherwise OneDrive itself opens in a window.
 */
export function pickOneDriveFiles(): Promise<File[]> {
  if (typeof window === "undefined") return Promise.resolve([]);
  const id = clientId();
  if (!id) {
    openOneDriveWindow();
    return Promise.reject(
      new Error(
        "OneDrive is open. Choose a file there. To add that file here, connect OneDrive with a Microsoft app id.",
      ),
    );
  }
  if (!window.OneDrive) {
    void loadSdk().catch(() => undefined);
    return Promise.reject(new Error("OneDrive is still loading. Click Cloud again."));
  }
  return new Promise<PickerFile[]>((resolve, reject) => {
    window.OneDrive!.open({
      clientId: id,
      action: "download",
      multiSelect: true,
      openInNewWindow: true,
      advanced: {
        redirectUri: `${window.location.origin}/onedrive/picker`,
      },
      success: (files) => resolve(files.value ?? []),
      cancel: () => resolve([]),
      error: (error) =>
        reject(new Error(error?.message || "Could not open OneDrive.")),
    });
  }).then(async (picked) => {
    const files: File[] = [];
    for (const item of picked) {
      const url = oneDriveDownloadUrl(item);
      const name =
        (typeof item.name === "string" && item.name.trim()) || "onedrive-file";
      if (!url) throw new Error(`${name} has no file to download.`);
      files.push(await fileFromDownload(url, name));
    }
    return files;
  });
}
