"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateField } from "@/components/ui/date-field";
import { Label } from "@/components/ui/label";

export type ReportPreset = "current_period" | "previous_period" | "month" | "year" | "custom";

export interface ReportRangePickerProps {
  preset: ReportPreset;
  onPresetChange: (preset: ReportPreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
}

const PRESETS: Array<{ value: ReportPreset; label: string }> = [
  { value: "current_period", label: "Current Period" },
  { value: "previous_period", label: "Previous Period" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom" },
];

export function ReportRangePicker({
  preset,
  onPresetChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
}: ReportRangePickerProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Tabs value={preset} onValueChange={(v) => onPresetChange(v as ReportPreset)}>
        <TabsList className="flex-wrap">
          {PRESETS.map((p) => (
            <TabsTrigger key={p.value} value={p.value}>
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {preset === "custom" ? (
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="report-from" className="text-xs text-muted-foreground">
              From
            </Label>
            <DateField
              id="report-from"
              value={customFrom}
              onChange={(e) => onCustomFromChange(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="report-to" className="text-xs text-muted-foreground">
              To
            </Label>
            <DateField id="report-to" value={customTo} onChange={(e) => onCustomToChange(e.target.value)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
