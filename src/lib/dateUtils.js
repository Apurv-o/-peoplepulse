/**
 * Centralized Date Utilities for PeoplePulse
 *
 * Application-wide Calendar Week Definition:
 * - Weeks start on Monday at 00:00:00 for ISO week tracking.
 * - Weekly Engagement Cycles run Saturday to Friday:
 *   Every Saturday at 12:00 AM, the weekly engagement metrics reset to begin tracking the new week.
 */

/**
 * Returns the YYYY-MM-DD string representing Monday of the given date's calendar week.
 *
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} ISO Date string for Monday (e.g. "2026-09-07")
 */
export function getCurrentWeekMonday(date = new Date()) {
  const d = new Date(date);
  // getDay(): 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const day = d.getDay();
  // Monday is day 1. If today is Sunday (0), we step back 6 days. Otherwise step back (day - 1) days.
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${dayOfMonth}`;
}

/**
 * Returns the YYYY-MM-DD string representing the Saturday start of the current engagement cycle.
 * Engagement cycle: Saturday 00:00:00 through Friday 23:59:59.
 *
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} ISO Date string for Saturday (e.g. "2026-09-05")
 */
export function getCurrentWeekSaturday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 is Sun, 1 is Mon, ..., 6 is Sat
  // Saturday is cycle start (0 days diff). Sun is 1 day after Sat, Mon is 2 days after, etc.
  const daysSinceSaturday = (day + 1) % 7;
  d.setDate(d.getDate() - daysSinceSaturday);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${dayOfMonth}`;
}

/**
 * Returns the start Saturday and end Friday of the current weekly cycle.
 *
 * @param {Date|string|number} [date=new Date()]
 * @returns {{ startDate: string, endDate: string, label: string }}
 */
export function getSaturdayCycleRange(date = new Date()) {
  const satStr = getCurrentWeekSaturday(date);
  const [sy, sm, sd] = satStr.split("-").map(Number);
  const satDate = new Date(sy, sm - 1, sd);
  
  const friDate = new Date(satDate);
  friDate.setDate(satDate.getDate() + 6);
  const fy = friDate.getFullYear();
  const fm = String(friDate.getMonth() + 1).padStart(2, "0");
  const fd = String(friDate.getDate()).padStart(2, "0");
  const friStr = `${fy}-${fm}-${fd}`;

  const satLabel = satDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const friLabel = friDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return {
    startDate: satStr,
    endDate: friStr,
    label: `${satLabel} – ${friLabel}`,
  };
}

/**
 * Formats an ISO date string (e.g. "2026-09-07") into a human-readable display.
 * Example: "Sep 7, 2026"
 *
 * @param {string} isoDate
 * @returns {string}
 */
export function formatWeekLabel(isoDate) {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Returns the YYYY-MM-DD string representing today's date.
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} ISO Date string (e.g. "2026-09-05")
 */
export function getTodayDate(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

