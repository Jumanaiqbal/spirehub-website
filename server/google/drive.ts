/**
 * Google Drive upload via a service account (no SDK dependency).
 *
 * Setup (one-time, in Google Cloud Console):
 * 1. Create a project, enable the Google Drive API.
 * 2. Create a service account and a JSON key.
 * 3. Share the target Drive folder with the service account's email.
 * 4. Set GOOGLE_SA_EMAIL, GOOGLE_SA_PRIVATE_KEY, and GDRIVE_FOLDER_ID.
 */

import { createSign } from "node:crypto";

export interface DriveEnv {
  saEmail: string;
  privateKey: string;
  folderId: string;
}

export function getDriveEnv(env: Record<string, string>): DriveEnv {
  return {
    saEmail: env.GOOGLE_SA_EMAIL ?? "",
    // Env vars often store the PEM with literal "\n" — restore real newlines.
    privateKey: (env.GOOGLE_SA_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    folderId: env.GDRIVE_FOLDER_ID ?? "",
  };
}

export function isDriveConfigured(env: Record<string, string>): boolean {
  const d = getDriveEnv(env);
  return Boolean(d.saEmail && d.privateKey && d.folderId);
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

async function getAccessToken(drive: DriveEnv): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: drive.saEmail,
      scope: "https://www.googleapis.com/auth/drive.file",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(drive.privateKey).toString("base64url");
  const assertion = `${header}.${claims}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });

  const data = (await response.json()) as {
    access_token?: string;
    error_description?: string;
  };
  if (!data.access_token) {
    throw new Error(data.error_description ?? "Google auth failed.");
  }
  return data.access_token;
}

export interface DriveUpload {
  fileName: string;
  mimeType: string;
  base64Data: string;
}

export async function uploadToDrive(
  drive: DriveEnv,
  file: DriveUpload
): Promise<{ id: string; webViewLink: string }> {
  const token = await getAccessToken(drive);

  const boundary = `spirehub${Date.now()}`;
  const metadata = JSON.stringify({
    name: file.fileName,
    parents: [drive.folderId],
  });

  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${file.mimeType}\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n` +
    `${file.base64Data}\r\n` +
    `--${boundary}--`;

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  const data = (await response.json()) as {
    id?: string;
    webViewLink?: string;
    error?: { message?: string };
  };
  if (!data.id) {
    throw new Error(data.error?.message ?? "Google Drive upload failed.");
  }

  return { id: data.id, webViewLink: data.webViewLink ?? "" };
}
