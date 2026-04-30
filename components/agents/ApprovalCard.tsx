import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DiffViewer } from "@/components/common/DiffViewer";
import { RiskBadge, StatusBadge } from "@/components/common/StatusBadge";
import { formatRelative } from "@/lib/utils/dates";

import type { ApprovalRequest } from "@/lib/db/schema";

interface ApprovalCardProps {
  approval: ApprovalRequest;
  onApprove?: () => void;
  onReject?: () => void;
  onRequestChanges?: () => void;
}

export function ApprovalCard({
  approval,
  onApprove,
  onReject,
  onRequestChanges,
}: ApprovalCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{approval.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {approval.description}
          </p>
          <p className="text-xs text-muted-foreground">
            {approval.entityType} #{approval.entityId.slice(0, 8)} ·{" "}
            {formatRelative(approval.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={approval.status} />
          <RiskBadge level={approval.riskLevel} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Action: {approval.proposedAction}
        </p>
        <DiffViewer
          current={approval.currentState}
          proposed={approval.proposedPayload}
        />
      </CardContent>
      {approval.status === "PENDING" ? (
        <CardFooter className="gap-2">
          {onApprove ? (
            <Button onClick={onApprove} variant="success" size="sm">
              Approve
            </Button>
          ) : null}
          {onReject ? (
            <Button onClick={onReject} variant="destructive" size="sm">
              Reject
            </Button>
          ) : null}
          {onRequestChanges ? (
            <Button onClick={onRequestChanges} variant="outline" size="sm">
              Request changes
            </Button>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}
