"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signInAction, type SignInResult } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SignInResult | null>(null);

  function onSubmit(formData: FormData) {
    if (next) formData.set("next", next);
    setResult(null);
    startTransition(async () => {
      const r = await signInAction(formData);
      setResult(r);
    });
  }

  return (
    <form action={onSubmit} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Sending..." : "Send magic link"}
      </Button>
      {result ? (
        <p
          className={
            result.ok ? "text-sm text-success" : "text-sm text-destructive"
          }
        >
          {result.message}
        </p>
      ) : null}
    </form>
  );
}
