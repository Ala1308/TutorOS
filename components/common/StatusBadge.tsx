import { Badge } from "@/components/ui/badge";

import type { RiskLevel } from "@/lib/ai/types";

/**
 * Centralised mapping from semantic states to badge variants.
 * Color is never the only signal — the label itself is informative.
 */

type Variant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "info";

const RISK: Record<RiskLevel, Variant> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "destructive",
  CRITICAL: "destructive",
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <Badge variant={RISK[level]}>{level}</Badge>;
}

export function ConfidenceBadge({ value }: { value: number }) {
  const v: Variant =
    value >= 0.8 ? "success" : value >= 0.6 ? "info" : "warning";
  return <Badge variant={v}>conf {value.toFixed(2)}</Badge>;
}

const STATUS_VARIANT: Record<string, Variant> = {
  // Lead
  NEW: "secondary",
  CONTACTED: "info",
  QUALIFIED: "success",
  DISQUALIFIED: "destructive",
  CONVERTED: "success",
  ARCHIVED: "outline",
  // Approvals
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  CHANGES_REQUESTED: "info",
  EXPIRED: "outline",
  // Agent run
  RUNNING: "info",
  COMPLETED: "success",
  FAILED: "destructive",
  TIMEOUT: "destructive",
  AWAITING_APPROVAL: "warning",
  // Sessions
  SCHEDULED: "info",
  IN_PROGRESS: "info",
  CANCELED: "outline",
  NO_SHOW: "destructive",
  // Tutors
  APPLIED: "secondary",
  SCREENING: "info",
  TEST_SENT: "info",
  INTERVIEW: "info",
  ACTIVE: "success",
  INACTIVE: "outline",
  // Homework
  ASSIGNED: "info",
  SUBMITTED: "warning",
  REVIEWED: "success",
  MISSED: "destructive",
  // Learning plans / assessments
  DRAFT: "secondary",
  DIAGNOSTIC: "info",
  PROGRESS: "info",
  FINAL: "success",
  OTHER: "secondary",
  // Invoices
  SENT: "info",
  PAID: "success",
  OVERDUE: "destructive",
  VOID: "outline",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>{status}</Badge>
  );
}
