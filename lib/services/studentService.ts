import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  parents,
  students,
  type NewStudent,
  type Student,
} from "@/lib/db/schema";
import {
  studentCreateSchema,
  studentUpdateSchema,
  type StudentCreateInput,
  type StudentUpdateInput,
} from "@/lib/schemas/people";
import { NotFoundError, ValidationError } from "@/lib/utils/errors";

import type { Actor } from "@/lib/auth/types";

import { auditService } from "./auditService";

export interface StudentWithParent extends Student {
  parentName: string;
  parentEmail: string;
}

export const studentService = {
  async list(
    args: { limit?: number; offset?: number } = {},
  ): Promise<StudentWithParent[]> {
    const limit = Math.min(args.limit ?? 50, 100);
    const offset = args.offset ?? 0;
    const rows = await db
      .select({
        student: students,
        parentName: parents.fullName,
        parentEmail: parents.email,
      })
      .from(students)
      .innerJoin(parents, eq(students.parentId, parents.id))
      .where(isNull(students.deletedAt))
      .orderBy(desc(students.createdAt))
      .limit(limit)
      .offset(offset);
    return rows.map((r) => ({
      ...r.student,
      parentName: r.parentName,
      parentEmail: r.parentEmail,
    }));
  },

  async listForParent(parentId: string): Promise<Student[]> {
    return db
      .select()
      .from(students)
      .where(and(eq(students.parentId, parentId), isNull(students.deletedAt)))
      .orderBy(students.lastName, students.firstName);
  },

  async get(id: string): Promise<Student | null> {
    const [row] = await db
      .select()
      .from(students)
      .where(and(eq(students.id, id), isNull(students.deletedAt)))
      .limit(1);
    return row ?? null;
  },

  async getOrThrow(id: string): Promise<Student> {
    const row = await this.get(id);
    if (!row) throw new NotFoundError("Student not found");
    return row;
  },

  async create(
    input: StudentCreateInput,
    opts: { actor: Actor },
  ): Promise<Student> {
    const validated = studentCreateSchema.parse(input);

    return db.transaction(async (tx) => {
      const [parent] = await tx
        .select({ id: parents.id })
        .from(parents)
        .where(
          and(eq(parents.id, validated.parentId), isNull(parents.deletedAt)),
        )
        .limit(1);
      if (!parent) {
        throw new ValidationError("Parent does not exist");
      }

      const row: NewStudent = {
        parentId: validated.parentId,
        firstName: validated.firstName,
        lastName: validated.lastName,
        ...(validated.grade ? { grade: validated.grade } : {}),
        ...(validated.school ? { school: validated.school } : {}),
        subjects: validated.subjects ?? [],
        isMinor: validated.isMinor,
        ...(validated.timezone ? { timezone: validated.timezone } : {}),
        ...(validated.notes ? { notes: validated.notes } : {}),
      };

      const [inserted] = await tx.insert(students).values(row).returning();
      if (!inserted) throw new Error("Failed to insert student");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "student.created",
          entityType: "Student",
          entityId: inserted.id,
          metadata: {
            parentId: inserted.parentId,
            isMinor: inserted.isMinor,
          },
        },
        tx,
      );

      return inserted;
    });
  },

  async update(
    id: string,
    input: StudentUpdateInput,
    opts: { actor: Actor },
  ): Promise<Student> {
    const validated = studentUpdateSchema.parse(input);
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(validated)) {
      if (v !== undefined) updates[k] = v;
    }

    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(students)
        .where(and(eq(students.id, id), isNull(students.deletedAt)))
        .limit(1);
      if (!existing) throw new NotFoundError("Student not found");

      const [updated] = await tx
        .update(students)
        .set(updates)
        .where(eq(students.id, id))
        .returning();
      if (!updated) throw new Error("Failed to update student");

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "student.updated",
          entityType: "Student",
          entityId: id,
          metadata: {
            changed: Object.keys(updates).filter((k) => k !== "updatedAt"),
          },
        },
        tx,
      );

      return updated;
    });
  },

  async softDelete(id: string, opts: { actor: Actor }): Promise<void> {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(students)
        .where(and(eq(students.id, id), isNull(students.deletedAt)))
        .limit(1);
      if (!existing) throw new NotFoundError("Student not found");

      await tx
        .update(students)
        .set({ deletedAt: new Date() })
        .where(eq(students.id, id));

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "student.deleted",
          entityType: "Student",
          entityId: id,
        },
        tx,
      );
    });
  },
};
