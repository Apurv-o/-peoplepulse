import { describe, it, expect } from "vitest";
import {
  getCurrentWeekMonday,
  getCurrentWeekSaturday,
  getSaturdayCycleRange,
  getTodayDate,
} from "../dateUtils.js";

describe("Date Utilities & Reset Cycles", () => {
  it("computes ISO date string for today", () => {
    const today = getTodayDate();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("resolves Monday for any date in a calendar week", () => {
    // 2026-09-11 is a Friday
    const monday = getCurrentWeekMonday(new Date("2026-09-11T12:00:00Z"));
    expect(monday).toBe("2026-09-07");
  });

  it("resolves Saturday engagement cycle start date", () => {
    // 2026-09-11 (Friday) belongs to cycle starting Saturday 2026-09-05
    const sat = getCurrentWeekSaturday(new Date("2026-09-11T12:00:00Z"));
    expect(sat).toBe("2026-09-05");
  });

  it("computes cycle range from Saturday to Friday", () => {
    const cycle = getSaturdayCycleRange(new Date("2026-09-11T12:00:00Z"));
    expect(cycle.startDate).toBe("2026-09-05");
    expect(cycle.endDate).toBe("2026-09-11");
    expect(cycle.label).toBe("Sep 5 – Sep 11");
  });
});
