import { z } from "zod";

import { defineTool } from "@/lib/ai/toolRegistry";
import { parentService } from "@/lib/services/parentService";
import { studentService } from "@/lib/services/studentService";
import { tutorService } from "@/lib/services/tutorService";

const ROLES = [
  "OWNER",
  "ADMIN",
  "ACADEMIC_MANAGER",
  "TUTOR",
  "AI_AGENT",
] as const;

const parentSummary = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  timezone: z.string().nullable(),
});

const studentSummary = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  grade: z.string().nullable(),
  school: z.string().nullable(),
  subjects: z.array(z.string()),
  isMinor: z.boolean(),
  timezone: z.string().nullable(),
});

const tutorSummary = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  status: z.string(),
  subjects: z.array(z.string()),
  grades: z.array(z.string()),
  hourlyRateCents: z.number().int().nullable(),
});

/**
 * Tool: people.parents.list
 * Read-only list of parents, capped at 50 rows.
 */
export const parentsListTool = defineTool({
  name: "people.parents.list",
  description: "List parents (read-only).",
  category: "read",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(50).optional(),
  }),
  outputSchema: z.object({
    parents: z.array(parentSummary),
  }),
  requiredRole: [...ROLES],
  riskLevel: "LOW",
  handler: async (input) => {
    const rows = await parentService.list({
      limit: input.limit ?? 25,
    });
    return {
      parents: rows.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        email: p.email,
        phone: p.phone ?? null,
        timezone: p.timezone ?? null,
      })),
    };
  },
});

/**
 * Tool: people.students.list
 * Read-only list of students, optionally scoped to a parent.
 */
export const studentsListTool = defineTool({
  name: "people.students.list",
  description: "List students (read-only). Filter by parentId when provided.",
  category: "read",
  inputSchema: z.object({
    parentId: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  outputSchema: z.object({
    students: z.array(studentSummary),
  }),
  requiredRole: [...ROLES],
  riskLevel: "LOW",
  handler: async (input) => {
    if (input.parentId) {
      const rows = await studentService.listForParent(input.parentId);
      return {
        students: rows.map((s) => ({
          id: s.id,
          parentId: s.parentId,
          firstName: s.firstName,
          lastName: s.lastName,
          grade: s.grade ?? null,
          school: s.school ?? null,
          subjects: s.subjects ?? [],
          isMinor: s.isMinor,
          timezone: s.timezone ?? null,
        })),
      };
    }
    const rows = await studentService.list({ limit: input.limit ?? 25 });
    return {
      students: rows.map((s) => ({
        id: s.id,
        parentId: s.parentId,
        firstName: s.firstName,
        lastName: s.lastName,
        grade: s.grade ?? null,
        school: s.school ?? null,
        subjects: s.subjects ?? [],
        isMinor: s.isMinor,
        timezone: s.timezone ?? null,
      })),
    };
  },
});

/**
 * Tool: people.tutors.list
 * Read-only list of tutors.
 */
export const tutorsListTool = defineTool({
  name: "people.tutors.list",
  description: "List tutors (read-only).",
  category: "read",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(50).optional(),
  }),
  outputSchema: z.object({
    tutors: z.array(tutorSummary),
  }),
  requiredRole: [...ROLES],
  riskLevel: "LOW",
  handler: async (input) => {
    const rows = await tutorService.list({ limit: input.limit ?? 25 });
    return {
      tutors: rows.map((t) => ({
        id: t.id,
        fullName: t.fullName,
        email: t.email,
        phone: t.phone ?? null,
        status: t.status,
        subjects: t.subjects ?? [],
        grades: t.grades ?? [],
        hourlyRateCents: t.hourlyRateCents ?? null,
      })),
    };
  },
});
