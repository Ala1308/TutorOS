import Link from "next/link";

import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="p-10">
      <EmptyState
        title="Session not found"
        description="It may have been canceled or the link is stale."
        action={
          <Link href="/sessions">
            <Button size="sm">Back to sessions</Button>
          </Link>
        }
      />
    </div>
  );
}
