/**
 * Centralized Date Utilities for PeoplePulse
 *
 * Application-wide Calendar Week Definition:
 * - Weeks start on Monday at 00:00:00.
 * - Timezone Assumption: Uses local device calendar date converted to the corresponding
 *   ISO Monday (YYYY-MM-DD). The database constraint enforces:
 *   CHECK (extract(isodow from week_start) = 1)
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

