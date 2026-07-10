"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateField } from "@/components/ui/date-field";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { settingsInput, type SettingsInput } from "@/lib/validation/schemas";
import { CURRENCIES, SAVINGS_METHODS } from "@/lib/types";
import { formatBasisPoints, parsePercentToBasisPoints } from "@/lib/formatting/money";
import type { SettingsRow } from "@/lib/database/schema";

export interface PaySettingsSectionProps {
  settings: SettingsRow;
}

async function saveSettings(input: Partial<SettingsInput>): Promise<void> {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to save settings");
  }
}

export function PaySettingsSection({ settings }: PaySettingsSectionProps): React.JSX.Element {
  const queryClient = useQueryClient();

  const form = useForm<SettingsInput>({
    resolver: zodResolver(settingsInput),
    defaultValues: {
      currency: settings.currency,
      defaultPayAmount: settings.defaultPayAmount,
      knownPayday: settings.knownPayday,
      payFrequencyDays: settings.payFrequencyDays,
      savingsMethod: settings.savingsMethod as SettingsInput["savingsMethod"],
      defaultSavingsAmount: settings.defaultSavingsAmount,
      weekStartDay: settings.weekStartDay,
      theme: settings.theme as SettingsInput["theme"],
    },
  });

  const mutation = useMutation({
    mutationFn: (input: SettingsInput) => saveSettings(input),
    onSuccess: () => {
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const savingsMethod = form.watch("savingsMethod");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pay & Savings</CardTitle>
        <CardDescription>
          Your anchor payday, frequency, and default amounts drive every pay-period calculation in the app.
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Select value={form.watch("currency")} onValueChange={(v) => form.setValue("currency", v)}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="defaultPayAmount">Default paycheck amount</Label>
              <CurrencyInput
                id="defaultPayAmount"
                value={form.watch("defaultPayAmount")}
                onChange={(cents) => form.setValue("defaultPayAmount", cents ?? 0, { shouldValidate: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="knownPayday">Known payday</Label>
              <DateField id="knownPayday" {...form.register("knownPayday")} />
              {form.formState.errors.knownPayday ? (
                <p className="text-xs text-destructive">{form.formState.errors.knownPayday.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payFrequencyDays">Pay frequency (days)</Label>
              <Input
                id="payFrequencyDays"
                type="number"
                min={7}
                max={31}
                {...form.register("payFrequencyDays", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">Money Moves is designed around 14-day (biweekly) pay periods.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="savingsMethod">Default savings method</Label>
              <Select
                value={savingsMethod}
                onValueChange={(v) => form.setValue("savingsMethod", v as SettingsInput["savingsMethod"])}
              >
                <SelectTrigger id="savingsMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAVINGS_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m === "fixed" ? "Fixed amount" : "Percent of paycheck"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="defaultSavingsAmount">
                {savingsMethod === "fixed" ? "Default amount per paycheck" : "Default percent per paycheck"}
              </Label>
              {savingsMethod === "fixed" ? (
                <CurrencyInput
                  id="defaultSavingsAmount"
                  value={form.watch("defaultSavingsAmount")}
                  onChange={(cents) =>
                    form.setValue("defaultSavingsAmount", cents ?? 0, { shouldValidate: true })
                  }
                />
              ) : (
                <Input
                  id="defaultSavingsAmount"
                  inputMode="decimal"
                  defaultValue={formatBasisPoints(form.getValues("defaultSavingsAmount")).replace("%", "")}
                  onChange={(e) => {
                    const bps = parsePercentToBasisPoints(e.target.value);
                    if (bps !== null) form.setValue("defaultSavingsAmount", bps, { shouldValidate: true });
                  }}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="weekStartDay">Week starts on</Label>
              <Select
                value={String(form.watch("weekStartDay"))}
                onValueChange={(v) => form.setValue("weekStartDay", Number(v))}
              >
                <SelectTrigger id="weekStartDay">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <Label htmlFor="theme-toggle">Dark theme</Label>
                <p className="text-xs text-muted-foreground">Switches the interface color scheme.</p>
              </div>
              <Switch
                id="theme-toggle"
                checked={form.watch("theme") === "dark"}
                onCheckedChange={(checked) => {
                  const theme = checked ? "dark" : "light";
                  form.setValue("theme", theme);
                  document.documentElement.classList.toggle("dark", checked);
                  window.localStorage.setItem("money-moves-theme", theme);
                }}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            Save changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
