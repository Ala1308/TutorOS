"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  COMM_DIRECTION_VALUES,
  COMM_ENTITY_TYPE_VALUES,
} from "@/lib/schemas/comms";

import { logEmailAction, type CommMutationResult } from "./actions";

interface Values {
  direction: (typeof COMM_DIRECTION_VALUES)[number];
  subject: string;
  fromEmail: string;
  toEmails: string;
  ccEmails: string;
  bccEmails: string;
  bodyPreview: string;
  sentAt: string;
  entityType: string;
  entityId: string;
}

const EMPTY: Values = {
  direction: "OUTBOUND",
  subject: "",
  fromEmail: "",
  toEmails: "",
  ccEmails: "",
  bccEmails: "",
  bodyPreview: "",
  sentAt: "",
  entityType: "",
  entityId: "",
};

function splitCsvEmails(s: string): string[] {
  return Array.from(
    new Set(
      s
        .split(/[,\s;]+/)
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  );
}

function localToIso(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function EmailLogForm({ initial = EMPTY }: { initial?: Values }) {
  const [values, setValues] = useState<Values>(initial);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CommMutationResult | null>(null);
  const router = useRouter();

  function set<K extends keyof Values>(k: K, v: Values[K]) {
    setValues((prev) => ({ ...prev, [k]: v }));
    setResult(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      direction: values.direction,
      subject: values.subject.trim(),
      fromEmail: values.fromEmail.trim(),
      toEmails: splitCsvEmails(values.toEmails),
      ccEmails: splitCsvEmails(values.ccEmails),
      bccEmails: splitCsvEmails(values.bccEmails),
      bodyPreview: values.bodyPreview.trim() || undefined,
      sentAt: localToIso(values.sentAt) || undefined,
      entityType: values.entityType || undefined,
      entityId: values.entityId.trim() || undefined,
    };
    startTransition(async () => {
      const r = await logEmailAction(payload);
      setResult(r);
      if (r.ok) router.push("/communications");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label>Direction</Label>
          <Select
            value={values.direction}
            onChange={(e) =>
              set("direction", e.target.value as Values["direction"])
            }
          >
            {COMM_DIRECTION_VALUES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="sentAt">Sent at (optional)</Label>
          <Input
            id="sentAt"
            type="datetime-local"
            value={values.sentAt}
            onChange={(e) => set("sentAt", e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="subject">Subject *</Label>
        <Input
          id="subject"
          value={values.subject}
          onChange={(e) => set("subject", e.target.value)}
          maxLength={300}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="fromEmail">From *</Label>
          <Input
            id="fromEmail"
            type="email"
            value={values.fromEmail}
            onChange={(e) => set("fromEmail", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="toEmails">To (comma separated) *</Label>
          <Input
            id="toEmails"
            value={values.toEmails}
            onChange={(e) => set("toEmails", e.target.value)}
            placeholder="parent@example.com, other@example.com"
            required
          />
        </div>
        <div>
          <Label htmlFor="ccEmails">CC</Label>
          <Input
            id="ccEmails"
            value={values.ccEmails}
            onChange={(e) => set("ccEmails", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="bccEmails">BCC</Label>
          <Input
            id="bccEmails"
            value={values.bccEmails}
            onChange={(e) => set("bccEmails", e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="bodyPreview">Body preview / summary</Label>
        <Textarea
          id="bodyPreview"
          value={values.bodyPreview}
          onChange={(e) => set("bodyPreview", e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="What did you say? (no need to paste the whole email)"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label>Linked entity (optional)</Label>
          <Select
            value={values.entityType}
            onChange={(e) => set("entityType", e.target.value)}
          >
            <option value="">— None —</option>
            {COMM_ENTITY_TYPE_VALUES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="entityId">Entity ID</Label>
          <Input
            id="entityId"
            value={values.entityId}
            onChange={(e) => set("entityId", e.target.value)}
            placeholder="UUID of the linked record"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Log email"}
        </Button>
        {result && !result.ok ? (
          <span className="text-xs text-destructive">{result.error}</span>
        ) : null}
      </div>
    </form>
  );
}
