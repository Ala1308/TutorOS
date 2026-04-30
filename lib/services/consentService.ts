import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { consents, type Consent } from "@/lib/db/schema";
import { ConsentBlockedError } from "@/lib/utils/errors";

import type { Actor } from "@/lib/auth/types";

import { auditService } from "./auditService";

export type ConsentType =
  | "DATA_PROCESSING"
  | "EMAIL_COMMUNICATION"
  | "SESSION_RECORDING"
  | "SESSION_TRANSCRIPTION"
  | "MARKETING_COMMUNICATION";

export interface SubjectRef {
  type: string;
  id: string;
}

/**
 * Versioned, revocable consent. `check` throws ConsentBlockedError on failure
 * so callers can surface "Action blocked: missing consent" UX uniformly.
 */
export const consentService = {
  async grant(args: {
    subject: SubjectRef;
    consentType: ConsentType;
    version?: number;
    notes?: string;
    actor: Actor;
  }): Promise<Consent> {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .insert(consents)
        .values({
          subjectType: args.subject.type,
          subjectId: args.subject.id,
          consentType: args.consentType,
          version: args.version ?? 1,
          grantedAt: new Date(),
          grantedByActorType: args.actor.type,
          grantedByActorId: args.actor.id,
          ...(args.notes ? { notes: args.notes } : {}),
        })
        .returning();
      if (!row) throw new Error("Failed to insert consent");

      await auditService.logAuditEvent(
        {
          actorType: args.actor.type,
          actorId: args.actor.id,
          action: "consent.granted",
          entityType: "Consent",
          entityId: row.id,
          metadata: {
            subject: args.subject,
            consentType: args.consentType,
            version: row.version,
          },
        },
        tx,
      );
      return row;
    });
  },

  async revoke(args: {
    consentId: string;
    actor: Actor;
    notes?: string;
  }): Promise<void> {
    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(consents)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(eq(consents.id, args.consentId))
        .returning();

      await auditService.logAuditEvent(
        {
          actorType: args.actor.type,
          actorId: args.actor.id,
          action: "consent.revoked",
          entityType: "Consent",
          entityId: args.consentId,
          metadata: {
            notes: args.notes,
            consentType: updated?.consentType,
            subject: updated
              ? { type: updated.subjectType, id: updated.subjectId }
              : undefined,
          },
        },
        tx,
      );
    });
  },

  /** Currently-active grant for a (subject, type), or null. */
  async current(
    subject: SubjectRef,
    type: ConsentType,
  ): Promise<Consent | null> {
    const [row] = await db
      .select()
      .from(consents)
      .where(
        and(
          eq(consents.subjectType, subject.type),
          eq(consents.subjectId, subject.id),
          eq(consents.consentType, type),
          isNull(consents.revokedAt),
        ),
      )
      .orderBy(desc(consents.grantedAt))
      .limit(1);
    return row ?? null;
  },

  async check(
    subject: SubjectRef,
    type: ConsentType,
  ): Promise<{ allowed: true } | never> {
    const c = await this.current(subject, type);
    if (!c || !c.grantedAt) {
      throw new ConsentBlockedError(type);
    }
    return { allowed: true };
  },

  /** Convenience: domain-specific helpers grow here as needed. */
  async checkIntake(_intake: {
    id: string;
  }): Promise<{ allowed: boolean; reason?: string }> {
    // Placeholder — replace with real intake-specific consent rules.
    return { allowed: true };
  },
};
