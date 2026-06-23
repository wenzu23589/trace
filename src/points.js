// ════════════════════════════════════════════════════════════════════════
// TRACE points system v8 — derives from per-activity logging.
// Principle unchanged: reward independent effort + reflection; AI use is
// never punished, it simply scores lower than independent work.
// ════════════════════════════════════════════════════════════════════════
import { dayIndependence, dayEffort } from "./activities.js";

export const POINTS = {
  // Independence points: up to this many, scaled by the day's independence %.
  independenceMax: 60,
  // A small bonus per logged activity (engagement), capped — never the main driver.
  perActivity: 3, activityCap: 15,
  // Reflection: flat pts once a day, minimum length.
  reflection: { points: 15, minWords: 20 },
  // Streak: bonus per consecutive logged day, capped.
  streak: { perDay: 2, cap: 20 },
};

export const DAILY_MAX =
  POINTS.independenceMax + POINTS.activityCap + POINTS.reflection.points + POINTS.streak.cap; // 110

export const MILESTONES = [
  { at: 100,  label: "First steps" },
  { at: 300,  label: "Building momentum" },
  { at: 700,  label: "Independent thinker" },
  { at: 1400, label: "Self-directed scholar" },
  { at: 2500, label: "Mastery mindset" },
];

function countWords(s) {
  if (!s) return 0;
  return s.trim().split(/\s+/).filter(Boolean).length;
}

// Base points for a day (excludes streak bonus, which depends on history).
export function basePointsForEntry(e) {
  const indep = dayIndependence(e.activities); // 0..100 or null
  const indepPts = indep === null ? 0 : Math.round((indep / 100) * POINTS.independenceMax);
  const actPts = Math.min(POINTS.activityCap, (e.activities?.length || 0) * POINTS.perActivity);
  const reflPts = countWords(e.reflection) >= POINTS.reflection.minWords ? POINTS.reflection.points : 0;
  return indepPts + actPts + reflPts;
}

export function streakBonus(streakDays) {
  return Math.min(POINTS.streak.cap, Math.max(0, streakDays) * POINTS.streak.perDay);
}

export function pointsForEntry(e, streakDays) {
  return basePointsForEntry(e) + streakBonus(streakDays);
}

// ── Streaks (v5) — generic consecutive-day counter ───────────────────────
export function streakOf(entries, qualifies) {
  const todayK = new Date().toISOString().slice(0, 10);
  let cursor = todayK;
  if (!entries[cursor] || !qualifies(entries[cursor])) {
    const y = new Date(); y.setDate(y.getDate() - 1);
    cursor = y.toISOString().slice(0, 10);
  }
  let n = 0;
  while (entries[cursor] && qualifies(entries[cursor])) {
    n++;
    const d = new Date(cursor); d.setDate(d.getDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }
  return n;
}

export const STREAKS = {
  logging:     { label: "Logging",     icon: "ti-flame",  test: () => true },
  independent: { label: "Independent", icon: "ti-book",   test: (e) => (dayIndependence(e.activities) ?? 0) >= 50 },
  reflection:  { label: "Reflection",  icon: "ti-pencil", test: (e) => countWords(e.reflection) >= POINTS.reflection.minWords },
};
