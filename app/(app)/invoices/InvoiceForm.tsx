"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  INVOICE_CURRENCY_VALUES,
  type InvoiceLineItemInput,
} from "@/lib/schemas/invoices";
import { formatMoney, type Currency } from "@/lib/utils/money";

import {
  createInvoiceAction,
  updateInvoiceAction,
  type InvoiceMutationResult,
} from "./actions";

interface LineItemRow {
  key: string;
  description: string;
  quantity: string;
  unitDollars: string;
  sessionId?: string;
}

export interface InvoiceFormValues {
  parentId: string;
  studentId: string;
  currency: Currency;
  issuedAt: string;
  dueAt: string;
  taxDollars: string;
  notes: string;
  lineItems: LineItemRow[];
}

interface PersonOption {
  id: string;
  label: string;
}

interface Props {
  mode: "create" | "edit";
  invoiceId?: string;
  initial: InvoiceFormValues;
  parentOptions?: PersonOption[];
  studentOptions?: PersonOption[];
  /** Lock the parent picker (e.g. when invoicing from a parent profile) */
  lockParent?: boolean;
}

function dollarsToCents(s: string): number {
  if (!s) return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function quantityFromString(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) && n >= 1 ? Math.round(n) : 0;
}

function dateInputToIso(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function dateToDateInput(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

let _rowCounter = 0;
function rowKey(): string {
  _rowCounter += 1;
  return `li_${Date.now().toString(36)}_${_rowCounter}`;
}

export function InvoiceForm({
  mode,
  invoiceId,
  initial,
  parentOptions = [],
  studentOptions = [],
  lockParent = false,
}: Props) {
  const [values, setValues] = useState<InvoiceFormValues>({
    ...initial,
    issuedAt: dateToDateInput(initial.issuedAt),
    dueAt: dateToDateInput(initial.dueAt),
  });
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<InvoiceMutationResult | null>(null);
  const router = useRouter();

  const subtotalCents = useMemo(
    () =>
      values.lineItems.reduce(
        (sum, li) =>
          sum +
          quantityFromString(li.quantity) * dollarsToCents(li.unitDollars),
        0,
      ),
    [values.lineItems],
  );
  const taxCents = dollarsToCents(values.taxDollars);
  const totalCents = subtotalCents + taxCents;

  function set<K extends keyof InvoiceFormValues>(
    k: K,
    v: InvoiceFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [k]: v }));
    setResult(null);
  }

  function updateLine(idx: number, patch: Partial<LineItemRow>) {
    setValues((prev) => {
      const lineItems = [...prev.lineItems];
      const existing = lineItems[idx];
      if (!existing) return prev;
      lineItems[idx] = { ...existing, ...patch };
      return { ...prev, lineItems };
    });
  }

  function addLine() {
    setValues((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          key: rowKey(),
          description: "",
          quantity: "1",
          unitDollars: "",
        },
      ],
    }));
  }

  function removeLine(idx: number) {
    setValues((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== idx),
    }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const lineItems: InvoiceLineItemInput[] = values.lineItems
      .map((li) => ({
        description: li.description.trim(),
        quantity: quantityFromString(li.quantity),
        unitCents: dollarsToCents(li.unitDollars),
        ...(li.sessionId ? { sessionId: li.sessionId } : {}),
      }))
      .filter((li) => li.description.length > 0 && li.quantity > 0);

    const payload =
      mode === "create"
        ? {
            parentId: values.parentId,
            studentId: values.studentId || undefined,
            currency: values.currency,
            issuedAt: dateInputToIso(values.issuedAt) || undefined,
            dueAt: dateInputToIso(values.dueAt) || undefined,
            taxCents,
            notes: values.notes.trim() || undefined,
            lineItems,
          }
        : {
            studentId: values.studentId || undefined,
            issuedAt: dateInputToIso(values.issuedAt) || undefined,
            dueAt: dateInputToIso(values.dueAt) || undefined,
            taxCents,
            notes: values.notes.trim() || undefined,
            lineItems,
          };

    startTransition(async () => {
      const r =
        mode === "create"
          ? await createInvoiceAction(payload)
          : await updateInvoiceAction(invoiceId, payload);
      setResult(r);
      if (r.ok && mode === "create" && r.id) {
        router.push(`/invoices/${r.id}`);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {mode === "create" && !lockParent ? (
          <div>
            <Label>Parent (payer) *</Label>
            <Select
              value={values.parentId}
              onChange={(e) => set("parentId", e.target.value)}
              required
            >
              <option value="">Choose a parent</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        <div>
          <Label>Student</Label>
          <Select
            value={values.studentId}
            onChange={(e) => set("studentId", e.target.value)}
          >
            <option value="">— None —</option>
            {studentOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>

        {mode === "create" ? (
          <div>
            <Label>Currency</Label>
            <Select
              value={values.currency}
              onChange={(e) => set("currency", e.target.value as Currency)}
            >
              {INVOICE_CURRENCY_VALUES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="issuedAt">Issued</Label>
          <Input
            id="issuedAt"
            type="date"
            value={values.issuedAt}
            onChange={(e) => set("issuedAt", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="dueAt">Due</Label>
          <Input
            id="dueAt"
            type="date"
            value={values.dueAt}
            onChange={(e) => set("dueAt", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Line items</Label>
          <Button type="button" size="sm" variant="outline" onClick={addLine}>
            Add line
          </Button>
        </div>
        {values.lineItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Add at least one line item.
          </p>
        ) : null}
        {values.lineItems.map((li, idx) => {
          const lineTotal =
            quantityFromString(li.quantity) * dollarsToCents(li.unitDollars);
          return (
            <div
              key={li.key}
              className="grid grid-cols-12 items-end gap-2 rounded-md border p-3"
            >
              <div className="col-span-12 md:col-span-6">
                <Label>Description</Label>
                <Input
                  value={li.description}
                  onChange={(e) =>
                    updateLine(idx, { description: e.target.value })
                  }
                  maxLength={500}
                  placeholder="e.g. 1h math tutoring · 2026-04-30"
                />
              </div>
              <div className="col-span-3 md:col-span-2">
                <Label>Qty</Label>
                <Input
                  type="number"
                  min={1}
                  value={li.quantity}
                  onChange={(e) =>
                    updateLine(idx, { quantity: e.target.value })
                  }
                />
              </div>
              <div className="col-span-5 md:col-span-2">
                <Label>Unit ({values.currency})</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={li.unitDollars}
                  onChange={(e) =>
                    updateLine(idx, { unitDollars: e.target.value })
                  }
                />
              </div>
              <div className="col-span-3 text-sm md:col-span-1">
                <Label>Total</Label>
                <p className="px-1 text-muted-foreground">
                  {formatMoney(lineTotal, values.currency)}
                </p>
              </div>
              <div className="col-span-1 text-right md:col-span-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeLine(idx)}
                >
                  ×
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="taxDollars">Tax ({values.currency})</Label>
          <Input
            id="taxDollars"
            type="number"
            min={0}
            step="0.01"
            value={values.taxDollars}
            onChange={(e) => set("taxDollars", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(subtotalCents, values.currency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatMoney(taxCents, values.currency)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t pt-1 font-medium">
              <span>Total</span>
              <span>{formatMoney(totalCents, values.currency)}</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          maxLength={8000}
          placeholder="Anything the parent should know."
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Saving..."
            : mode === "create"
              ? "Create invoice"
              : "Save changes"}
        </Button>
        {result?.ok && mode === "edit" ? (
          <span className="text-xs text-muted-foreground">Saved.</span>
        ) : null}
        {result && !result.ok ? (
          <span className="text-xs text-destructive">{result.error}</span>
        ) : null}
      </div>
    </form>
  );
}
