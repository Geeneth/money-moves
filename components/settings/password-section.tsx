"use client";

import { useState, type FormEvent } from "react";
import { Shield, Eye, EyeOff } from "lucide-react";
import { useLock } from "@/components/auth/lock-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "idle" | "set" | "change" | "remove";

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  id: string;
}

function PasswordField({ label, value, onChange, disabled, id }: PasswordFieldProps): React.JSX.Element {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete="off"
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function PasswordSection(): React.JSX.Element {
  const { passwordSet, refreshStatus } = useLock();
  const [mode, setMode] = useState<Mode>("idle");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function reset(): void {
    setMode("idle");
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setError("");
  }

  async function handleSet(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError("");
    if (newPw.length < 4) { setError("Password must be at least 4 characters"); return; }
    if (newPw !== confirmPw) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const body: Record<string, string> = { newPassword: newPw };
      if (mode === "change") body.currentPassword = currentPw;
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) { setError(json.error ?? "Something went wrong"); return; }
      await refreshStatus();
      reset();
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) { setError(json.error ?? "Something went wrong"); return; }
      await refreshStatus();
      reset();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-medium">App Lock</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        {passwordSet
          ? "A password is set. The app will prompt for it on launch."
          : "No password set. Anyone with access to this device can open the app."}
      </p>

      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          {!passwordSet ? (
            <Button variant="outline" size="sm" onClick={() => setMode("set")}>
              Set password
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setMode("change")}>
                Change password
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMode("remove")}>
                Remove password
              </Button>
            </>
          )}
        </div>
      )}

      {(mode === "set" || mode === "change") && (
        <form onSubmit={handleSet} className="space-y-3">
          {mode === "change" && (
            <PasswordField label="Current password" id="cur-pw" value={currentPw} onChange={setCurrentPw} disabled={loading} />
          )}
          <PasswordField label="New password" id="new-pw" value={newPw} onChange={setNewPw} disabled={loading} />
          <PasswordField label="Confirm new password" id="conf-pw" value={confirmPw} onChange={setConfirmPw} disabled={loading} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Saving…" : mode === "set" ? "Set password" : "Update password"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {mode === "remove" && (
        <form onSubmit={handleRemove} className="space-y-3">
          <PasswordField label="Current password" id="rem-pw" value={currentPw} onChange={setCurrentPw} disabled={loading} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="destructive" disabled={loading}>
              {loading ? "Removing…" : "Remove password"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
