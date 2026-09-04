/**
 * Deterministic Engagement Scoring Formula (Version 1)
 *
 * Exact Weighting:
 * - Workload: 20% (positive orientation)
 * - Manager Support: 20% (positive orientation)
 * - Team Collaboration: 20% (positive orientation)
 * - Motivation: 20% (positive orientation)
 * - Stress Level: 20% (negative orientation; inverted so 1 -> 5, 5 -> 1)
 *
 * Normalization:
 * - Metric inputs: integers from 1 to 5.
 * - Inverted stress: inverted_stress = 6 - stress_level
 * - Raw score: 0.20 * (workload + support + collab + motivation + inverted_stress)
 * - Engagement index: round(((raw_score - 1) / 4) * 100) -> [0, 100]
 *
 * Examples:
 * - (5, 5, 5, 5, 1) -> inverted stress = 5, raw = 5.0, score = 100
 * - (1, 1, 1, 1, 5) -> inverted stress = 1, raw = 1.0, score = 0
 * - (4, 4, 4, 5, 2) -> inverted stress = 4, raw = 4.2, score = 80
 */

export const ENGAGEMENT_FORMULA_VERSION = 1;

/**
 * Calculates the deterministic engagement score on a 0-100 scale.
 *
 * @param {Object} metrics
 * @param {number} metrics.workload (1-5)
 * @param {number} metrics.manager_support (1-5)
 * @param {number} metrics.team_collaboration (1-5)
 * @param {number} metrics.motivation (1-5)
 * @param {number} metrics.stress_level (1-5)
 * @returns {number} Score from 0 to 100
 */
export function calculateEngagementScore(metrics) {
  const workload = Number(metrics.workload);
  const support = Number(metrics.manager_support ?? metrics.support);
  const collab = Number(metrics.team_collaboration ?? metrics.collab);
  const motivation = Number(metrics.motivation);
  const stress = Number(metrics.stress_level ?? metrics.stress);

  if (!workload || !support || !collab || !motivation || !stress) {
    return 0;
  }

  const invertedStress = 6 - stress;
  const rawScore = 0.20 * (workload + support + collab + motivation + invertedStress);
  const normalized = Math.round(((rawScore - 1.0) / 4.0) * 100);

  return Math.max(0, Math.min(100, normalized));
}
