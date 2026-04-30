import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfidenceBadge, RiskBadge } from "@/components/common/StatusBadge";
import { JsonViewer } from "@/components/common/JsonViewer";
import { formatRelative } from "@/lib/utils/dates";

import type { RiskLevel } from "@/lib/ai/types";

interface DraftCardProps {
  agentName: string;
  generatedAt: Date | string;
  confidence: number;
  riskLevel: RiskLevel;
  reasoning?: string;
  payload: unknown;
  onApprove?: () => void;
  onEdit?: () => void;
  onDiscard?: () => void;
  approveLabel?: string;
}

export function DraftCard({
  agentName,
  generatedAt,
  confidence,
  riskLevel,
  reasoning,
  payload,
  onApprove,
  onEdit,
  onDiscard,
  approveLabel = "Approve & Send",
}: DraftCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{agentName}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Generated {formatRelative(generatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceBadge value={confidence} />
          <RiskBadge level={riskLevel} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {reasoning ? (
          <p className="text-sm text-muted-foreground">{reasoning}</p>
        ) : null}
        <JsonViewer value={payload} />
      </CardContent>
      <CardFooter className="gap-2">
        {onApprove ? (
          <Button onClick={onApprove} variant="success" size="sm">
            {approveLabel}
          </Button>
        ) : null}
        {onEdit ? (
          <Button onClick={onEdit} variant="outline" size="sm">
            Edit
          </Button>
        ) : null}
        {onDiscard ? (
          <Button onClick={onDiscard} variant="ghost" size="sm">
            Discard
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
