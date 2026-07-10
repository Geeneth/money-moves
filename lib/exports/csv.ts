function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null>>): string {
  const lines = [headers.map(escapeCsvField).join(",")];
  for (const row of rows) {
    lines.push(
      row
        .map((cell) => (cell === null || cell === undefined ? "" : escapeCsvField(String(cell))))
        .join(",")
    );
  }
  return lines.join("\r\n") + "\r\n";
}

/** Format cents as a plain decimal string for CSV ("12.34"). */
export function centsToCsvAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}
