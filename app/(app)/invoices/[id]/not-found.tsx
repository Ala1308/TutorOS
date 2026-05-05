import Link from "next/link";

import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="p-10">
      <EmptyState
        title="Invoice not found"
        description="It may have been voided or the link is stale."
        action={
          <Link href="/invoices">
            <Button size="sm">Back to invoices</Button>
          </Link>
        }
      />
    </div>
  );
}
