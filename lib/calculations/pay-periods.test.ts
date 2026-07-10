import { describe, expect, it } from "vitest";
import {
  daysElapsedInPeriod,
  daysRemainingInPeriod,
  paydaysBetween,
  periodFor,
  periodStartFor,
  previousPayday,
  recentPeriods,
} from "./pay-periods";

const ANCHOR = "2026-07-03"; // a known Friday payday

describe("periodStartFor", () => {
  it("returns the anchor when the date is the anchor payday", () => {
    expect(periodStartFor(ANCHOR, ANCHOR)).toBe(ANCHOR);
  });

  it("returns the anchor for dates inside the anchor period", () => {
    expect(periodStartFor("2026-07-10", ANCHOR)).toBe(ANCHOR);
    expect(periodStartFor("2026-07-16", ANCHOR)).toBe(ANCHOR); // last day of period
  });

  it("rolls to the next payday exactly 14 days later", () => {
    expect(periodStartFor("2026-07-17", ANCHOR)).toBe("2026-07-17");
  });

  it("works for dates before the anchor (negative k)", () => {
    expect(periodStartFor("2026-07-02", ANCHOR)).toBe("2026-06-19");
    expect(periodStartFor("2026-06-19", ANCHOR)).toBe("2026-06-19");
    expect(periodStartFor("2026-01-01", ANCHOR)).toBe("2025-12-19");
  });
});

describe("periodFor", () => {
  it("period spans payday through the day before the next payday", () => {
    const p = periodFor("2026-07-09", ANCHOR);
    expect(p.start).toBe("2026-07-03");
    expect(p.end).toBe("2026-07-16");
    expect(p.nextPayday).toBe("2026-07-17");
  });
});

describe("previousPayday", () => {
  it("is 14 days before the current period start", () => {
    expect(previousPayday("2026-07-09", ANCHOR)).toBe("2026-06-19");
  });
});

describe("day counts", () => {
  it("payday today: 14 days remain, 1 elapsed", () => {
    expect(daysRemainingInPeriod(ANCHOR, ANCHOR)).toBe(14);
    expect(daysElapsedInPeriod(ANCHOR, ANCHOR)).toBe(1);
  });

  it("last day of period: 1 day remains, 14 elapsed", () => {
    expect(daysRemainingInPeriod("2026-07-16", ANCHOR)).toBe(1);
    expect(daysElapsedInPeriod("2026-07-16", ANCHOR)).toBe(14);
  });

  it("mid-period", () => {
    expect(daysRemainingInPeriod("2026-07-09", ANCHOR)).toBe(8);
    expect(daysElapsedInPeriod("2026-07-09", ANCHOR)).toBe(7);
  });
});

describe("paydaysBetween", () => {
  it("lists every biweekly payday in a range", () => {
    expect(paydaysBetween("2026-06-01", "2026-08-01", ANCHOR)).toEqual([
      "2026-06-05",
      "2026-06-19",
      "2026-07-03",
      "2026-07-17",
      "2026-07-31",
    ]);
  });

  it("includes range endpoints when they are paydays", () => {
    expect(paydaysBetween(ANCHOR, ANCHOR, ANCHOR)).toEqual([ANCHOR]);
  });
});

describe("recentPeriods", () => {
  it("returns consecutive periods ending with the current one", () => {
    const periods = recentPeriods("2026-07-09", ANCHOR, 3);
    expect(periods.map((p) => p.start)).toEqual(["2026-06-05", "2026-06-19", "2026-07-03"]);
    expect(periods[2].end).toBe("2026-07-16");
  });
});
