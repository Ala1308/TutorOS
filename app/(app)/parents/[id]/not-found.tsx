import Link from "next/link";

import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="p-10">
      <EmptyState
        title="Parent not found"
        description="It may have been archived or the link is stale."
        action={
          <Link href="/parents">
            <Button size="sm">Back to parents</Button>
          </Link>
        }
      />
    </div>
  );
}
