import Link from "next/link";

import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="p-10">
      <EmptyState
        title="Homework not found"
        description="It may have been archived or the link is stale."
        action={
          <Link href="/academics/homework">
            <Button size="sm">Back to homework</Button>
          </Link>
        }
      />
    </div>
  );
}
