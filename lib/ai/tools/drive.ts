import { z } from "zod";

import { defineTool } from "@/lib/ai/toolRegistry";
import { resolveGoogleOAuthSubject } from "@/lib/google/resolveOAuthSubject";
import { WORKFLOW_STEPS } from "@/lib/services/automationService";
import { driveService } from "@/lib/services/driveService";

const ENTITY_TYPE = z.string().min(1).max(80);
const ENTITY_ID = z.string().uuid();
const PARENT_FOLDER_ID = z.string().min(1).max(128);

const ROLES = ["OWNER", "ADMIN", "ACADEMIC_MANAGER", "AI_AGENT"] as const;

/**
 * Creates a folder under the linked Google account (or optional parent id).
 * Workflow / agent callers must set `ctx.googleOAuthUserId` to the operator
 * whose OAuth tokens should be used.
 */
export const driveCreateFolderTool = defineTool({
  name: "drive.createFolder",
  description:
    "Create a folder in Google Drive. Uses env GOOGLE_DRIVE_DEFAULT_PARENT_FOLDER_ID when parentFolderId is omitted.",
  category: "medium",
  inputSchema: z.object({
    name: z.string().min(1).max(255),
    parentFolderId: PARENT_FOLDER_ID.optional(),
    entityType: ENTITY_TYPE,
    entityId: ENTITY_ID,
  }),
  outputSchema: z.object({
    driveFileId: z.string().uuid(),
    googleFolderId: z.string(),
    webViewLink: z.string().url(),
    name: z.string(),
  }),
  requiredRole: [...ROLES],
  riskLevel: "MEDIUM",
  workflowStep: WORKFLOW_STEPS.drive.createFolder,
  buildApprovalDescription: (input) => ({
    title: "Approve Drive folder",
    description: `Agent proposes creating Drive folder "${input.name}" linked to ${input.entityType} ${input.entityId}.`,
    entityType: input.entityType,
    entityId: input.entityId,
  }),
  handler: async (input, ctx) => {
    const oauthUserId = resolveGoogleOAuthSubject(ctx);
    return driveService.createFolder({
      oauthUserId,
      name: input.name,
      ...(input.parentFolderId !== undefined
        ? { parentFolderId: input.parentFolderId }
        : {}),
      entityType: input.entityType,
      entityId: input.entityId,
      actor: ctx.actor,
      ...(ctx.agentRunId ? { agentRunId: ctx.agentRunId } : {}),
    });
  },
});

/**
 * Uploads inline text/binary content to Drive. Encode binary as base64 and set
 * `contentEncoding: "base64"`. Caller is responsible for size — keep small
 * artifacts only (this path buffers in memory).
 */
export const driveUploadFileTool = defineTool({
  name: "drive.uploadFile",
  description:
    "Upload a small inline file (text or base64) to Google Drive. Uses env GOOGLE_DRIVE_DEFAULT_PARENT_FOLDER_ID when parentFolderId is omitted.",
  category: "medium",
  inputSchema: z.object({
    name: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(127),
    content: z.string().min(1).max(2_000_000),
    contentEncoding: z.enum(["utf8", "base64"]).default("utf8"),
    parentFolderId: PARENT_FOLDER_ID.optional(),
    entityType: ENTITY_TYPE,
    entityId: ENTITY_ID,
  }),
  outputSchema: z.object({
    driveFileId: z.string().uuid(),
    googleFileId: z.string(),
    webViewLink: z.string().url(),
    name: z.string(),
    mimeType: z.string(),
  }),
  requiredRole: [...ROLES],
  riskLevel: "MEDIUM",
  workflowStep: WORKFLOW_STEPS.drive.uploadFile,
  buildApprovalDescription: (input) => ({
    title: "Approve Drive upload",
    description: `Agent proposes uploading "${input.name}" (${input.mimeType}) linked to ${input.entityType} ${input.entityId}.`,
    entityType: input.entityType,
    entityId: input.entityId,
  }),
  handler: async (input, ctx) => {
    const oauthUserId = resolveGoogleOAuthSubject(ctx);
    const buffer =
      input.contentEncoding === "base64"
        ? Buffer.from(input.content, "base64")
        : Buffer.from(input.content, "utf8");

    return driveService.uploadFile({
      oauthUserId,
      name: input.name,
      mimeType: input.mimeType,
      content: buffer,
      ...(input.parentFolderId !== undefined
        ? { parentFolderId: input.parentFolderId }
        : {}),
      entityType: input.entityType,
      entityId: input.entityId,
      actor: ctx.actor,
      ...(ctx.agentRunId ? { agentRunId: ctx.agentRunId } : {}),
    });
  },
});

/**
 * Read-only listing of files under a parent folder. Defaults to env-configured
 * parent. Page size capped at 100.
 */
export const driveListFilesTool = defineTool({
  name: "drive.listFiles",
  description:
    "List non-trashed files in a Google Drive folder. Defaults to GOOGLE_DRIVE_DEFAULT_PARENT_FOLDER_ID when parentFolderId is omitted.",
  category: "read",
  inputSchema: z.object({
    parentFolderId: PARENT_FOLDER_ID.optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
    pageToken: z.string().min(1).max(2048).optional(),
  }),
  outputSchema: z.object({
    files: z.array(
      z.object({
        googleFileId: z.string(),
        name: z.string(),
        mimeType: z.string(),
        webViewLink: z.string().url().nullable(),
        modifiedTime: z.string().nullable(),
        isFolder: z.boolean(),
      }),
    ),
    nextPageToken: z.string().nullable(),
  }),
  requiredRole: [...ROLES],
  riskLevel: "LOW",
  handler: async (input, ctx) => {
    const oauthUserId = resolveGoogleOAuthSubject(ctx);
    return driveService.listFiles({
      oauthUserId,
      ...(input.parentFolderId !== undefined
        ? { parentFolderId: input.parentFolderId }
        : {}),
      ...(input.pageSize !== undefined ? { pageSize: input.pageSize } : {}),
      ...(input.pageToken !== undefined ? { pageToken: input.pageToken } : {}),
    });
  },
});
