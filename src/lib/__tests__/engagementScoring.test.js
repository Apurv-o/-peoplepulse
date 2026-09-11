import { describe, it, expect } from "vitest";
import { calculateEngagementScore, ENGAGEMENT_FORMULA_VERSION } from "../engagementScoring.js";

describe("Engagement Scoring Formula", () => {
  it("has formula version 1", () => {
    expect(ENGAGEMENT_FORMULA_VERSION).toBe(1);
  });

  it("calculates perfect engagement score of 100 for optimal metrics (5,5,5,5 and stress 1)", () => {
    const score = calculateEngagementScore({
      workload: 5,
      manager_support: 5,
      team_collaboration: 5,
      motivation: 5,
      stress_level: 1, // Inverted: 6 - 1 = 5
    });
    expect(score).toBe(100);
  });

  it("calculates minimum engagement score of 0 for worst-case metrics (1,1,1,1 and stress 5)", () => {
    const score = calculateEngagementScore({
      workload: 1,
      manager_support: 1,
      team_collaboration: 1,
      motivation: 1,
      stress_level: 5, // Inverted: 6 - 5 = 1
    });
    expect(score).toBe(0);
  });

  it("calculates standard engagement score of 80 for balanced metrics (4,4,4,5 and stress 2)", () => {
    const score = calculateEngagementScore({
      workload: 4,
      manager_support: 4,
      team_collaboration: 4,
      motivation: 5,
      stress_level: 2, // Inverted: 6 - 2 = 4 -> raw 4.2 -> (3.2 / 4) * 100 = 80
    });
    expect(score).toBe(80);
  });

  it("accepts shorthand property names (support, collab, stress)", () => {
    const score = calculateEngagementScore({
      workload: 4,
      support: 4,
      collab: 4,
      motivation: 5,
      stress: 2,
    });
    expect(score).toBe(80);
  });

  it("returns 0 if any required metric is missing or falsy", () => {
    expect(calculateEngagementScore({})).toBe(0);
    expect(calculateEngagementScore({ workload: 3, manager_support: 3 })).toBe(0);
  });
});
