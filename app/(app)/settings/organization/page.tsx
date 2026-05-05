import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { requireAuth } from "@/lib/auth";
import { ensure } from "@/lib/auth/permissions";
import { orgProfileService } from "@/lib/services/orgProfileService";

import { OrgProfileForm } from "./OrgProfileForm";

export const metadata: Metadata = { title: "Organization" };
export const dynamic = "force-dynamic";

export default async function OrganizationSettingsPage() {
  const actor = await requireAuth(["OWNER", "ADMIN", "ACADEMIC_MANAGER"]);
  ensure(actor, "org.profile.read");

  const profile = await orgProfileService.getOrCreate();

  return (
    <>
      <PageHeader
        title="Organization"
        description="Company-wide context every agent receives at the top of its system prompt."
      />
      <div className="p-6">
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <OrgProfileForm
              initial={{
                companyName: profile.companyName,
                about: profile.about,
                voiceTone: profile.voiceTone,
                brandGuidelines: profile.brandGuidelines,
                businessHours: profile.businessHours,
                defaultCurrency: profile.defaultCurrency,
                defaultTimezone: profile.defaultTimezone,
              }}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
