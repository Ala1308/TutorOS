import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { orgProfile, type OrgProfile } from "@/lib/db/schema";

import type { Actor } from "@/lib/auth/types";

import { auditService } from "./auditService";

const ORG_ID = "default";

export const orgProfileSchema = z.object({
  companyName: z.string().min(0).max(200).default(""),
  about: z.string().min(0).max(4000).default(""),
  voiceTone: z.string().min(0).max(2000).default(""),
  brandGuidelines: z.string().min(0).max(4000).default(""),
  businessHours: z.string().min(0).max(500).default(""),
  defaultCurrency: z.string().min(0).max(8).default("CAD"),
  defaultTimezone: z.string().min(0).max(64).default("America/Montreal"),
});
export type OrgProfileInput = z.infer<typeof orgProfileSchema>;

const EMPTY: OrgProfileInput = {
  companyName: "",
  about: "",
  voiceTone: "",
  brandGuidelines: "",
  businessHours: "",
  defaultCurrency: "CAD",
  defaultTimezone: "America/Montreal",
};

export const orgProfileService = {
  /** Returns the org profile, creating an empty row on first read. */
  async getOrCreate(): Promise<OrgProfile> {
    const [existing] = await db
      .select()
      .from(orgProfile)
      .where(eq(orgProfile.id, ORG_ID))
      .limit(1);
    if (existing) return existing;

    const [inserted] = await db
      .insert(orgProfile)
      .values({ id: ORG_ID, ...EMPTY })
      .returning();
    if (!inserted) throw new Error("Failed to insert org_profile");
    return inserted;
  },

  async update(
    input: OrgProfileInput,
    opts: { actor: Actor },
  ): Promise<OrgProfile> {
    const validated = orgProfileSchema.parse(input);

    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(orgProfile)
        .where(eq(orgProfile.id, ORG_ID))
        .limit(1);

      let row: OrgProfile;
      if (existing) {
        const [updated] = await tx
          .update(orgProfile)
          .set({ ...validated, updatedAt: new Date() })
          .where(eq(orgProfile.id, ORG_ID))
          .returning();
        if (!updated) throw new Error("Failed to update org_profile");
        row = updated;
      } else {
        const [inserted] = await tx
          .insert(orgProfile)
          .values({ id: ORG_ID, ...validated })
          .returning();
        if (!inserted) throw new Error("Failed to insert org_profile");
        row = inserted;
      }

      await auditService.logAuditEvent(
        {
          actorType: opts.actor.type,
          actorId: opts.actor.id,
          action: "org_profile.updated",
          entityType: "OrgProfile",
          entityId: ORG_ID,
        },
        tx,
      );

      return row;
    });
  },
};
