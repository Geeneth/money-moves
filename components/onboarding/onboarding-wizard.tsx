"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  PiggyBank,
  Receipt,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { CURRENCIES, BILL_FREQUENCIES, BILL_FREQUENCY_LABELS, type BillFrequency } from "@/lib/types";
import { formatBasisPoints, parsePercentToBasisPoints } from "@/lib/formatting/money";
import { todayISO } from "@/lib/formatting/dates";
import { setupInput, type SetupInput } from "@/lib/validation/schemas";

interface WizardBill {
  key: string;
  name: string;
  amount: number | null;
  frequency: BillFrequency;
  nextDueDate: string;
}

const STEPS = ["Currency", "Payday", "Paycheck", "Savings", "Bills", "Finish"];
const TOTAL_STEPS = STEPS.length;

function newBill(): WizardBill {
  return {
    key: crypto.randomUUID(),
    name: "",
    amount: null,
    frequency: "monthly",
    nextDueDate: todayISO(),
  };
}

export function OnboardingWizard(): React.JSX.Element {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);

  const [currency, setCurrency] = React.useState("CAD");
  const [knownPayday, setKnownPayday] = React.useState(todayISO());
  const [defaultPayAmount, setDefaultPayAmount] = React.useState<number | null>(null);
  const [savingsMethod, setSavingsMethod] = React.useState<"fixed" | "percent">("fixed");
  const [defaultSavingsAmount, setDefaultSavingsAmount] = React.useState<number | null>(0);
  const [bills, setBills] = React.useState<WizardBill[]>([]);
  const [useSampleData, setUseSampleData] = React.useState(false);

  function goNext(): void {
    if (!canAdvance()) return;
    setDirection(1);
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  }

  function goBack(): void {
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  }

  function canAdvance(): boolean {
    switch (step) {
      case 0:
        return Boolean(currency);
      case 1:
        return Boolean(knownPayday);
      case 2:
        return defaultPayAmount != null && defaultPayAmount > 0;
      case 3:
        return defaultSavingsAmount != null && defaultSavingsAmount >= 0;
      default:
        return true;
    }
  }

  function updateBill(key: string, patch: Partial<WizardBill>): void {
    setBills((prev) => prev.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  }

  function removeBill(key: string): void {
    setBills((prev) => prev.filter((b) => b.key !== key));
  }

  async function finish(): Promise<void> {
    const payload: SetupInput = {
      currency,
      knownPayday,
      defaultPayAmount: defaultPayAmount ?? 0,
      savingsMethod,
      defaultSavingsAmount: defaultSavingsAmount ?? 0,
      bills: useSampleData
        ? []
        : bills
            .filter((b) => b.name.trim() && b.amount)
            .map((b) => ({
              name: b.name.trim(),
              amount: b.amount ?? 0,
              frequency: b.frequency,
              nextDueDate: b.nextDueDate,
            })),
      useSampleData,
    };

    const parsed = setupInput.safeParse(payload);
    if (!parsed.success) {
      toast.error("Some details look invalid — please double-check the previous steps.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Something went wrong setting up Money Moves.");
        return;
      }
      toast.success("You're all set!");
      router.push("/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 32 : -32, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -32 : 32, opacity: 0 }),
  };

  return (
    <div className="w-full max-w-lg">
      <div className="mb-8 space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <PiggyBank className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to Money Moves</h1>
        <p className="text-sm text-muted-foreground">Let's get your budget set up — it only takes a minute.</p>
      </div>

      <div className="mb-6 flex items-center justify-center gap-2">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`h-1.5 rounded-full transition-all ${
              i === step ? "w-8 bg-primary" : i < step ? "w-4 bg-primary/50" : "w-4 bg-muted"
            }`}
          />
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {step === 0 ? <CurrencyStep currency={currency} onChange={setCurrency} /> : null}
              {step === 1 ? <PaydayStep knownPayday={knownPayday} onChange={setKnownPayday} /> : null}
              {step === 2 ? (
                <PaycheckStep
                  currency={currency}
                  amount={defaultPayAmount}
                  onChange={setDefaultPayAmount}
                />
              ) : null}
              {step === 3 ? (
                <SavingsStep
                  currency={currency}
                  method={savingsMethod}
                  amount={defaultSavingsAmount}
                  onMethodChange={setSavingsMethod}
                  onAmountChange={setDefaultSavingsAmount}
                />
              ) : null}
              {step === 4 ? (
                <BillsStep
                  currency={currency}
                  bills={bills}
                  onAdd={() => setBills((prev) => [...prev, newBill()])}
                  onUpdate={updateBill}
                  onRemove={removeBill}
                />
              ) : null}
              {step === 5 ? (
                <FinishStep useSampleData={useSampleData} onChange={setUseSampleData} />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={goBack} disabled={step === 0 || submitting}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step < TOTAL_STEPS - 1 ? (
          <Button type="button" onClick={goNext} disabled={!canAdvance()}>
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={() => void finish()} disabled={submitting}>
            <CheckCircle2 className="h-4 w-4" /> Finish setup
          </Button>
        )}
      </div>
    </div>
  );
}

function StepHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function CurrencyStep({
  currency,
  onChange,
}: {
  currency: string;
  onChange: (v: string) => void;
}): React.JSX.Element {
  return (
    <div>
      <StepHeading icon={Banknote} title="What currency do you use?" description="This formats every amount in the app." />
      <Select value={currency} onValueChange={onChange}>
        <SelectTrigger>
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
  );
}

function PaydayStep({
  knownPayday,
  onChange,
}: {
  knownPayday: string;
  onChange: (v: string) => void;
}): React.JSX.Element {
  return (
    <div>
      <StepHeading
        icon={CalendarDays}
        title="When's your next (or most recent) payday?"
        description="Money Moves uses this as the anchor for 14-day pay periods."
      />
      <Label htmlFor="known-payday" className="sr-only">
        Known payday
      </Label>
      <DateField id="known-payday" value={knownPayday} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function PaycheckStep({
  currency,
  amount,
  onChange,
}: {
  currency: string;
  amount: number | null;
  onChange: (v: number | null) => void;
}): React.JSX.Element {
  return (
    <div>
      <StepHeading
        icon={Banknote}
        title="How much do you expect each paycheck?"
        description="Your take-home pay per pay period. You can adjust or override this any time."
      />
      <Label htmlFor="pay-amount" className="sr-only">
        Paycheck amount
      </Label>
      <CurrencyInput id="pay-amount" value={amount} onChange={onChange} placeholder={`0.00 ${currency}`} />
    </div>
  );
}

function SavingsStep({
  currency,
  method,
  amount,
  onMethodChange,
  onAmountChange,
}: {
  currency: string;
  method: "fixed" | "percent";
  amount: number | null;
  onMethodChange: (v: "fixed" | "percent") => void;
  onAmountChange: (v: number | null) => void;
}): React.JSX.Element {
  return (
    <div>
      <StepHeading
        icon={PiggyBank}
        title="How much do you want to save each paycheck?"
        description="Choose a fixed dollar amount or a percentage. You can skip this and set it up later."
      />
      <div className="space-y-3">
        <Tabs value={method} onValueChange={(v) => onMethodChange(v as "fixed" | "percent")}>
          <TabsList>
            <TabsTrigger value="fixed">Fixed $</TabsTrigger>
            <TabsTrigger value="percent">Percent %</TabsTrigger>
          </TabsList>
        </Tabs>
        {method === "fixed" ? (
          <CurrencyInput value={amount} onChange={onAmountChange} placeholder={`0.00 ${currency}`} />
        ) : (
          <Input
            inputMode="decimal"
            defaultValue={amount ? formatBasisPoints(amount).replace("%", "") : ""}
            onChange={(e) => {
              const bps = parsePercentToBasisPoints(e.target.value);
              if (bps !== null) onAmountChange(bps);
            }}
            placeholder="10"
          />
        )}
      </div>
    </div>
  );
}

function BillsStep({
  currency,
  bills,
  onAdd,
  onUpdate,
  onRemove,
}: {
  currency: string;
  bills: WizardBill[];
  onAdd: () => void;
  onUpdate: (key: string, patch: Partial<WizardBill>) => void;
  onRemove: (key: string) => void;
}): React.JSX.Element {
  return (
    <div>
      <StepHeading
        icon={Receipt}
        title="Add any recurring bills"
        description="Optional — you can add these later from the Bills page instead."
      />
      <div className="max-h-72 space-y-4 overflow-y-auto pr-1">
        {bills.map((bill) => (
          <div key={bill.key} className="space-y-2 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Bill name"
                value={bill.name}
                onChange={(e) => onUpdate(bill.key, { name: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove bill"
                onClick={() => onRemove(bill.key)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <CurrencyInput
                value={bill.amount}
                onChange={(cents) => onUpdate(bill.key, { amount: cents })}
                placeholder={`0.00 ${currency}`}
              />
              <Select
                value={bill.frequency}
                onValueChange={(v) => onUpdate(bill.key, { frequency: v as BillFrequency })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILL_FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {BILL_FREQUENCY_LABELS[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DateField
                value={bill.nextDueDate}
                onChange={(e) => onUpdate(bill.key, { nextDueDate: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" className="mt-3 w-full" onClick={onAdd}>
        + Add a bill
      </Button>
    </div>
  );
}

function FinishStep({
  useSampleData,
  onChange,
}: {
  useSampleData: boolean;
  onChange: (v: boolean) => void;
}): React.JSX.Element {
  return (
    <div>
      <StepHeading
        icon={Sparkles}
        title="Ready to start?"
        description="Choose to begin with a clean slate or explore with realistic sample data."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`rounded-lg border p-4 text-left transition-colors ${
            !useSampleData ? "border-primary bg-primary/5" : "hover:bg-accent"
          }`}
        >
          <p className="text-sm font-semibold">Start empty</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Begin with just your settings and any bills you added.
          </p>
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded-lg border p-4 text-left transition-colors ${
            useSampleData ? "border-primary bg-primary/5" : "hover:bg-accent"
          }`}
        >
          <p className="text-sm font-semibold">Load sample data</p>
          <p className="mt-1 text-xs text-muted-foreground">
            See Money Moves in action with example transactions and goals.
          </p>
        </button>
      </div>
    </div>
  );
}
