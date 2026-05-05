import { describe, expect, it } from "vitest";

import {
  driveCreateFolderTool,
  driveListFilesTool,
  driveUploadFileTool,
} from "@/lib/ai/tools/drive";

describe("drive tool definitions", () => {
  it("createFolder is medium risk and allows AI_AGENT", () => {
    expect(driveCreateFolderTool.category).toBe("medium");
    expect(driveCreateFolderTool.riskLevel).toBe("MEDIUM");
    expect(driveCreateFolderTool.requiredRole).toContain("AI_AGENT");
    expect(driveCreateFolderTool.requiredRole).toContain("OWNER");
  });

  it("uploadFile rejects empty name and bad uuid", () => {
    const r = driveUploadFileTool.inputSchema.safeParse({
      name: "",
      mimeType: "text/plain",
      content: "hello",
      entityType: "Lead",
      entityId: "not-a-uuid",
    });
    expect(r.success).toBe(false);
  });

  it("uploadFile defaults contentEncoding to utf8", () => {
    const r = driveUploadFileTool.inputSchema.parse({
      name: "notes.txt",
      mimeType: "text/plain",
      content: "hello",
      entityType: "Lead",
      entityId: "11111111-1111-4111-8111-111111111111",
    });
    expect(r.contentEncoding).toBe("utf8");
  });

  it("uploadFile accepts base64 + parentFolderId", () => {
    const r = driveUploadFileTool.inputSchema.parse({
      name: "x.bin",
      mimeType: "application/octet-stream",
      content: Buffer.from("hi").toString("base64"),
      contentEncoding: "base64",
      parentFolderId: "abc123",
      entityType: "Lead",
      entityId: "11111111-1111-4111-8111-111111111111",
    });
    expect(r.contentEncoding).toBe("base64");
    expect(r.parentFolderId).toBe("abc123");
  });

  it("listFiles is read-only with no required entity", () => {
    expect(driveListFilesTool.category).toBe("read");
    expect(driveListFilesTool.riskLevel).toBe("LOW");
    const r = driveListFilesTool.inputSchema.parse({});
    expect(r.parentFolderId).toBeUndefined();
  });

  it("listFiles rejects pageSize > 100", () => {
    const r = driveListFilesTool.inputSchema.safeParse({ pageSize: 200 });
    expect(r.success).toBe(false);
  });

  it("listFiles output schema accepts null fields", () => {
    const r = driveListFilesTool.outputSchema.safeParse({
      files: [
        {
          googleFileId: "abc",
          name: "doc",
          mimeType: "text/plain",
          webViewLink: null,
          modifiedTime: null,
          isFolder: false,
        },
      ],
      nextPageToken: null,
    });
    expect(r.success).toBe(true);
  });
});
