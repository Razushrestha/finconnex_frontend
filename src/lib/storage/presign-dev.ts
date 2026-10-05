import "server-only";

import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type S3Env = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  expiresSec: number;
};

function parseEnvFile(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function s3Env(): S3Env | null {
  const file = parseEnvFile(
    path.join(process.cwd(), "multi-crm-backend-main", ".env"),
  );
  const pick = (name: string) =>
    process.env[name]?.trim() || file[name]?.trim() || "";
  const accessKeyId = pick("AWS_S3_ACCESS_KEY_ID");
  const secretAccessKey = pick("AWS_S3_SECRET_ACCESS_KEY");
  const region = pick("AWS_S3_REGION");
  const bucket = pick("AWS_S3_BUCKET");
  if (!accessKeyId || !secretAccessKey || !region || !bucket) return null;
  const expires = Number(pick("AWS_S3_PRESIGN_LINK_EXPIRES") || "900");
  return {
    accessKeyId,
    secretAccessKey,
    region,
    bucket,
    expiresSec: Number.isFinite(expires) && expires > 0 ? expires : 900,
  };
}

/**
 * Local stand-in for GET /v1/storage/url while that route is not on the
 * hosted API yet. Signs only keys that belong to the caller's workspace.
 */
export async function presignWorkspaceUpload(
  workspaceId: string | null | undefined,
  fileKey: string,
): Promise<string | null> {
  const key = fileKey.trim();
  const workspace = workspaceId?.trim() ?? "";
  if (!workspace || !key.startsWith(`workspaces/${workspace}/`)) return null;

  const env = s3Env();
  const backendPkg = path.join(
    process.cwd(),
    "multi-crm-backend-main",
    "package.json",
  );
  if (!env || !existsSync(backendPkg)) return null;

  try {
    const require = createRequire(backendPkg);
    const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3") as {
      S3Client: new (config: {
        region: string;
        credentials: { accessKeyId: string; secretAccessKey: string };
      }) => object;
      GetObjectCommand: new (input: { Bucket: string; Key: string }) => object;
    };
    const { getSignedUrl } = require("@aws-sdk/s3-request-presigner") as {
      getSignedUrl: (
        client: object,
        command: object,
        options: { expiresIn: number },
      ) => Promise<string>;
    };
    const client = new S3Client({
      region: env.region,
      credentials: {
        accessKeyId: env.accessKeyId,
        secretAccessKey: env.secretAccessKey,
      },
    });
    const url = await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: env.bucket, Key: key }),
      { expiresIn: env.expiresSec },
    );
    return typeof url === "string" && url.startsWith("http") ? url : null;
  } catch {
    return null;
  }
}
