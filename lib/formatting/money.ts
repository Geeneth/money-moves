/** All monetary values are stored as integer cents. $12.34 => 1234. */

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Parse a user-entered dollar string ("1,234.56", "$12") into integer cents. Returns null if invalid. */
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

export function formatCents(
  cents: number,
  currency: string = "CAD",
  options?: { showSign?: boolean; compact?: boolean }
): string {
  const formatter = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: options?.compact ? 0 : 2,
    maximumFractionDigits: options?.compact ? 0 : 2,
    signDisplay: options?.showSign ? "exceptZero" : "auto",
  });
  return formatter.format(cents / 100);
}

/** Format basis points as a percentage string. 1050 => "10.5%". */
export function formatBasisPoints(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}

/** Parse a percentage string ("10.5") into basis points (1050). */
export function parsePercentToBasisPoints(input: string): number | null {
  const cleaned = input.replace(/[%\s]/g, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  return Math.round(value * 100);
}
