const GIS_SRC = "https://accounts.google.com/gsi/client";
const GAPI_SRC = "https://apis.google.com/js/api.js";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

type PickerDoc = {
  id: string;
  name?: string;
  mimeType?: string;
  sizeBytes?: number;
  lastEditedUtc?: number;
};

type PickerBuilder = {
  enableFeature: (feature: string) => PickerBuilder;
  addView: (view: unknown) => PickerBuilder;
  setOAuthToken: (token: string) => PickerBuilder;
  setDeveloperKey: (key: string) => PickerBuilder;
  setCallback: (cb: (data: { action?: string; docs?: PickerDoc[] }) => void) => PickerBuilder;
  setTitle: (title: string) => PickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
};

type GooglePickerNs = {
  Action: { PICKED: string; CANCEL: string };
  Feature: { MULTISELECT_ENABLED: string };
  ViewId: { DOCS: string };
  DocsView: new (viewId: string) => { setIncludeFolders: (include: boolean) => void };
  PickerBuilder: new () => PickerBuilder;
};

function clientId() {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
}

function apiKey() {
  return process.env.NEXT_PUBLIC_GOOGLE_API_KEY?.trim() ?? "";
}

export function googlePickerConfigured() {
  return Boolean(clientId() && apiKey());
}

export function googleDriveConfigured() {
  return Boolean(clientId());
}

export type DriveEntry = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modified: number;
  folder: boolean;
};

function loadScript(src: string) {
  if (typeof document === "undefined") return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
  if (existing?.dataset.loaded === "1") return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const script = existing ?? document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "1";
      resolve();
    };
    script.onerror = () => reject(new Error("Could not open the Google file picker."));
    if (!existing) document.body.appendChild(script);
  });
}

function googleNs(): { picker: GooglePickerNs } | null {
  const google = (window as unknown as { google?: { picker?: GooglePickerNs } }).google;
  if (!google?.picker) return null;
  return { picker: google.picker };
}

async function accessToken(): Promise<string> {
  await loadScript(GIS_SRC);
  const oauth2 = (
    window as unknown as {
      google?: {
        accounts?: {
          oauth2?: {
            initTokenClient: (config: {
              client_id: string;
              scope: string;
              callback: (token: { access_token?: string; error?: string }) => void;
            }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
          };
        };
      };
    }
  ).google?.accounts?.oauth2;
  if (!oauth2) throw new Error("Could not open the Google file picker.");
  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId(),
      scope: DRIVE_SCOPE,
      callback: (token) => {
        if (token.access_token) resolve(token.access_token);
        else reject(new Error(token.error || "Google sign-in was cancelled."));
      },
    });
    client.requestAccessToken({ prompt: "" });
  });
}

async function fileFromDrive(token: string, doc: PickerDoc): Promise<File> {
  const name = doc.name?.trim() || "google-drive-file";
  const googleDoc = doc.mimeType?.startsWith("application/vnd.google-apps.");
  const url = googleDoc
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(doc.id)}/export?mimeType=application/pdf`
    : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(doc.id)}?alt=media`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Could not download ${name} from Google Drive.`);
  const blob = await response.blob();
  const fileName = googleDoc && !name.toLowerCase().endsWith(".pdf") ? `${name}.pdf` : name;
  return new File([blob], fileName, {
    type: blob.type || (googleDoc ? "application/pdf" : "application/octet-stream"),
    lastModified: doc.lastEditedUtc || Date.now(),
  });
}

const FOLDER_MIME = "application/vnd.google-apps.folder";
let driveToken = "";

async function driveTokenValue() {
  if (!googleDriveConfigured()) {
    throw new Error(
      "Google Drive is not connected on this app yet, so its folders cannot be listed here.",
    );
  }
  if (driveToken) return driveToken;
  driveToken = await accessToken();
  return driveToken;
}

function asDriveEntry(row: {
  id?: string;
  name?: string;
  mimeType?: string;
  size?: string;
  modifiedTime?: string;
}): DriveEntry | null {
  if (!row.id || !row.name) return null;
  const modified = row.modifiedTime ? Date.parse(row.modifiedTime) : Date.now();
  return {
    id: row.id,
    name: row.name,
    mimeType: row.mimeType || "",
    size: Number(row.size) || 0,
    modified: Number.isNaN(modified) ? Date.now() : modified,
    folder: row.mimeType === FOLDER_MIME,
  };
}

/** Lists folders and files inside the signed-in Google Drive. */
export async function listGoogleDrive(
  mode: "mine" | "shared" | "drives",
  parentId?: string,
): Promise<{ folders: DriveEntry[]; files: DriveEntry[] }> {
  const token = await driveTokenValue();
  if (mode === "drives" && !parentId) {
    const response = await fetch(
      "https://www.googleapis.com/drive/v3/drives?pageSize=100&fields=drives(id,name)",
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (response.status === 401) {
      driveToken = "";
      throw new Error("Google Drive sign-in expired. Open the picker again.");
    }
    if (!response.ok) throw new Error("Could not load shared drives.");
    const body = (await response.json()) as { drives?: { id?: string; name?: string }[] };
    return {
      folders: (body.drives ?? [])
        .filter((row) => row.id && row.name)
        .map((row) => ({
          id: row.id as string,
          name: row.name as string,
          mimeType: FOLDER_MIME,
          size: 0,
          modified: Date.now(),
          folder: true,
        })),
      files: [],
    };
  }
  const parent = parentId || "root";
  const query =
    mode === "shared" && !parentId
      ? "sharedWithMe = true and trashed = false"
      : `'${parent.replace(/'/g, "\\'")}' in parents and trashed = false`;
  const params = new URLSearchParams({
    pageSize: "100",
    orderBy: "folder,name",
    fields: "files(id,name,mimeType,size,modifiedTime)",
    q: query,
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (response.status === 401) {
    driveToken = "";
    throw new Error("Google Drive sign-in expired. Open the picker again.");
  }
  if (!response.ok) throw new Error("Could not load Google Drive files.");
  const body = (await response.json()) as {
    files?: { id?: string; name?: string; mimeType?: string; size?: string; modifiedTime?: string }[];
  };
  const entries = (body.files ?? [])
    .map(asDriveEntry)
    .filter((row): row is DriveEntry => Boolean(row));
  return {
    folders: entries.filter((row) => row.folder),
    files: entries.filter((row) => !row.folder),
  };
}

export async function downloadGoogleDriveFiles(entries: DriveEntry[]): Promise<File[]> {
  const token = await driveTokenValue();
  const files = entries.filter((row) => !row.folder);
  return Promise.all(
    files.map((row) =>
      fileFromDrive(token, {
        id: row.id,
        name: row.name,
        mimeType: row.mimeType,
        sizeBytes: row.size,
        lastEditedUtc: row.modified,
      }),
    ),
  );
}

/** Opens Google's file grid. Resolves with the files the user confirms. */
export function pickGoogleDriveFiles(hooks?: {
  onOpen?: (close: () => void) => void;
}): Promise<File[]> {
  if (!googlePickerConfigured()) {
    return Promise.reject(
      new Error("Google Drive picker is not connected on this app yet."),
    );
  }
  return accessToken().then(
    (token) =>
      new Promise<File[]>((resolve, reject) => {
        void loadScript(GAPI_SRC)
          .then(
            () =>
              new Promise<void>((ready, fail) => {
                const gapi = (window as unknown as { gapi?: { load: (name: string, cb: () => void) => void } }).gapi;
                if (!gapi) {
                  fail(new Error("Could not open the Google file picker."));
                  return;
                }
                gapi.load("picker", () => ready());
              }),
          )
          .then(() => {
            const picker = googleNs()?.picker;
            if (!picker) throw new Error("Could not open the Google file picker.");
            const view = new picker.DocsView(picker.ViewId.DOCS);
            view.setIncludeFolders(true);
            let opened: { setVisible: (visible: boolean) => void } | null = null;
            const built = new picker.PickerBuilder()
              .enableFeature(picker.Feature.MULTISELECT_ENABLED)
              .addView(view)
              .setOAuthToken(token)
              .setDeveloperKey(apiKey())
              .setTitle("Select files")
              .setCallback((data) => {
                if (data.action === picker.Action.CANCEL) {
                  opened?.setVisible(false);
                  resolve([]);
                  return;
                }
                if (data.action !== picker.Action.PICKED) return;
                opened?.setVisible(false);
                void Promise.all((data.docs ?? []).map((doc) => fileFromDrive(token, doc)))
                  .then(resolve)
                  .catch(reject);
              })
              .build();
            opened = built;
            hooks?.onOpen?.(() => built.setVisible(false));
            built.setVisible(true);
          })
          .catch(reject);
      }),
  );
}
