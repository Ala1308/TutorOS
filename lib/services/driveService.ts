import { Readable } from "node:stream";

import { google } from "googleapis";

import { db } from "@/lib/db";
import { driveFiles } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { getGoogleClient } from "@/lib/google/client";
import { ExternalServiceError, ValidationError } from "@/lib/utils/errors";

import type { Actor } from "@/lib/auth/types";
import type { OAuth2Client } from "google-auth-library";

import { auditService } from "./auditService";

const FOLDER_MIME = "application/vnd.google-apps.folder";

export type CreateFolderResult = {
  driveFileId: string;
  googleFolderId: string;
  webViewLink: string;
  name: string;
};

export type UploadFileResult = {
  driveFileId: string;
  googleFileId: string;
  webViewLink: string;
  name: string;
  mimeType: string;
};

export type DriveListEntry = {
  googleFileId: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
  modifiedTime: string | null;
  isFolder: boolean;
};

export type ListFilesResult = {
  files: DriveListEntry[];
  nextPageToken: string | null;
};

async function getDriveClient(oauthUserId: string) {
  const g = await getGoogleClient(oauthUserId);
  if (g.unavailable) {
    throw new ExternalServiceError(
      "google",
      g.reason === "google_not_linked"
        ? "Google is not linked for this user"
        : "Google OAuth is not configured",
    );
  }
  return google.drive({ version: "v3", auth: g.oauth2 as OAuth2Client });
}

export const driveService = {
  /**
   * Creates a Drive folder via the Drive API v3 and persists metadata to
   * `drive_files`. Requires `drive.file` OAuth scope on `oauthUserId`.
   */
  async createFolder(args: {
    oauthUserId: string;
    name: string;
    parentFolderId?: string | null;
    entityType: string;
    entityId: string;
    folderPath?: string | null;
    actor: Actor;
    agentRunId?: string;
  }): Promise<CreateFolderResult> {
    const trimmed = args.name.trim();
    if (!trimmed) {
      throw new ValidationError("Folder name is required");
    }

    const drive = await getDriveClient(args.oauthUserId);

    const parent =
      args.parentFolderId?.trim() ||
      env.GOOGLE_DRIVE_DEFAULT_PARENT_FOLDER_ID?.trim() ||
      undefined;

    let file: {
      id?: string | null;
      name?: string | null;
      mimeType?: string | null;
      webViewLink?: string | null;
    };

    try {
      const res = await drive.files.create({
        requestBody: {
          name: trimmed,
          mimeType: FOLDER_MIME,
          ...(parent ? { parents: [parent] } : {}),
        },
        fields: "id,name,mimeType,webViewLink",
      });
      file = res.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ExternalServiceError("google", msg);
    }

    const googleFileId = file.id;
    if (!googleFileId) {
      throw new ExternalServiceError(
        "google",
        "Drive API returned no folder id",
      );
    }

    const driveUrl =
      file.webViewLink ??
      `https://drive.google.com/drive/folders/${googleFileId}`;

    return db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(driveFiles)
        .values({
          googleFileId,
          driveUrl,
          name: file.name ?? trimmed,
          mimeType: file.mimeType ?? FOLDER_MIME,
          entityType: args.entityType,
          entityId: args.entityId,
          ...(args.folderPath ? { folderPath: args.folderPath } : {}),
        })
        .returning();

      if (!inserted) throw new Error("Failed to insert drive_files row");

      await auditService.logAuditEvent(
        {
          actorType: args.actor.type,
          actorId: args.actor.id,
          action: "drive.folder.created",
          entityType: "DriveFile",
          entityId: inserted.id,
          ...(args.agentRunId ? { agentRunId: args.agentRunId } : {}),
          metadata: {
            googleFileId,
            entity: { type: args.entityType, id: args.entityId },
            parentFolderId: parent ?? null,
          },
        },
        tx,
      );

      return {
        driveFileId: inserted.id,
        googleFolderId: googleFileId,
        webViewLink: driveUrl,
        name: inserted.name,
      };
    });
  },

  /**
   * Uploads inline content (e.g. agent-generated notes/JSON) into Drive and
   * persists a `drive_files` row. Use for small artifacts (< few MB).
   */
  async uploadFile(args: {
    oauthUserId: string;
    name: string;
    mimeType: string;
    content: string | Buffer;
    parentFolderId?: string | null;
    entityType: string;
    entityId: string;
    folderPath?: string | null;
    actor: Actor;
    agentRunId?: string;
  }): Promise<UploadFileResult> {
    const trimmed = args.name.trim();
    if (!trimmed) {
      throw new ValidationError("File name is required");
    }
    if (!args.mimeType.trim()) {
      throw new ValidationError("mimeType is required");
    }

    const drive = await getDriveClient(args.oauthUserId);

    const parent =
      args.parentFolderId?.trim() ||
      env.GOOGLE_DRIVE_DEFAULT_PARENT_FOLDER_ID?.trim() ||
      undefined;

    const buffer = Buffer.isBuffer(args.content)
      ? args.content
      : Buffer.from(args.content, "utf8");

    let file: {
      id?: string | null;
      name?: string | null;
      mimeType?: string | null;
      webViewLink?: string | null;
    };

    try {
      const res = await drive.files.create({
        requestBody: {
          name: trimmed,
          mimeType: args.mimeType,
          ...(parent ? { parents: [parent] } : {}),
        },
        media: {
          mimeType: args.mimeType,
          body: Readable.from(buffer),
        },
        fields: "id,name,mimeType,webViewLink",
      });
      file = res.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ExternalServiceError("google", msg);
    }

    const googleFileId = file.id;
    if (!googleFileId) {
      throw new ExternalServiceError("google", "Drive API returned no file id");
    }

    const driveUrl =
      file.webViewLink ?? `https://drive.google.com/file/d/${googleFileId}`;

    return db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(driveFiles)
        .values({
          googleFileId,
          driveUrl,
          name: file.name ?? trimmed,
          mimeType: file.mimeType ?? args.mimeType,
          entityType: args.entityType,
          entityId: args.entityId,
          ...(args.folderPath ? { folderPath: args.folderPath } : {}),
        })
        .returning();

      if (!inserted) throw new Error("Failed to insert drive_files row");

      await auditService.logAuditEvent(
        {
          actorType: args.actor.type,
          actorId: args.actor.id,
          action: "drive.file.uploaded",
          entityType: "DriveFile",
          entityId: inserted.id,
          ...(args.agentRunId ? { agentRunId: args.agentRunId } : {}),
          metadata: {
            googleFileId,
            entity: { type: args.entityType, id: args.entityId },
            parentFolderId: parent ?? null,
            mimeType: args.mimeType,
            sizeBytes: buffer.byteLength,
          },
        },
        tx,
      );

      return {
        driveFileId: inserted.id,
        googleFileId,
        webViewLink: driveUrl,
        name: inserted.name,
        mimeType: inserted.mimeType ?? args.mimeType,
      };
    });
  },

  /**
   * Lists non-trashed files under a parent folder. Read-only — no DB writes,
   * no audit row (audit `tool.drive.listFiles` written by the registry).
   */
  async listFiles(args: {
    oauthUserId: string;
    parentFolderId?: string | null;
    pageSize?: number;
    pageToken?: string | null;
  }): Promise<ListFilesResult> {
    const drive = await getDriveClient(args.oauthUserId);

    const parent =
      args.parentFolderId?.trim() ||
      env.GOOGLE_DRIVE_DEFAULT_PARENT_FOLDER_ID?.trim() ||
      undefined;

    const pageSize = Math.min(Math.max(args.pageSize ?? 25, 1), 100);

    const qParts = ["trashed = false"];
    if (parent) qParts.push(`'${parent.replace(/'/g, "\\'")}' in parents`);

    try {
      const res = await drive.files.list({
        q: qParts.join(" and "),
        pageSize,
        ...(args.pageToken ? { pageToken: args.pageToken } : {}),
        fields:
          "nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink)",
      });

      const files: DriveListEntry[] = (res.data.files ?? [])
        .filter((f) => Boolean(f.id && f.name))
        .map((f) => ({
          googleFileId: f.id!,
          name: f.name!,
          mimeType: f.mimeType ?? "application/octet-stream",
          webViewLink: f.webViewLink ?? null,
          modifiedTime: f.modifiedTime ?? null,
          isFolder: f.mimeType === FOLDER_MIME,
        }));

      return {
        files,
        nextPageToken: res.data.nextPageToken ?? null,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ExternalServiceError("google", msg);
    }
  },
};
