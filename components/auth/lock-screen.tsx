"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { useLock } from "./lock-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LockScreen(): React.JSX.Element {
  const { unlock } = useLock();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        unlock();
      } else {
        const json = await res.json() as { error?: string };
        setError(json.error ?? "Incorrect password");
        setPassword("");
        inputRef.current?.focus();
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <div className="w-full max-w-sm px-6">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Money Moves</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter your password to unlock</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            ref={inputRef}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="text-center text-base tracking-widest"
            autoComplete="current-password"
          />
          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading || !password}>
            {loading ? "Checking…" : "Unlock"}
          </Button>
        </form>
      </div>
    </div>
  );
}
