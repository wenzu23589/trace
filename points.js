// ════════════════════════════════════════════════════════════════════════
// TRACE points system — single tunable config.
// Principle: reward independent effort and reflection; never score AI use
// (up or down). All thresholds live here so they can be adjusted without
// touching app logic.
// ════════════════════════════════════════════════════════════════════════

export const POINTS = {
  // Independent study: 1 pt per N minutes, capped per day.
  independent: { minutesPerPoint: 3, dailyCap: 60 },     // 60 pts = 180 min
  // Tasks done without AI: flat pts each, capped count per day.
  tasks:       { perTask: 10, maxPerDay: 3 },            // up to 30
  // Reflection: flat pts once a day, requires a minimum length.
  reflection:  { points: 15, minWords: 20 },             // 15
  // Streak: bonus per consecutive logged day, capped.
  streak:      { perDay: 2, cap: 20 },                   // up to 20
  // AI use is never scored. Listed for clarity; value is always 0.
  ai:          { points: 0 },
};

// Max earnable in a single day (used for UI hints): 60 + 30 + 15 + 20 = 125.
export const DAILY_MAX =
  POINTS.independent.dailyCap +
  POINTS.tasks.perTask * POINTS.tasks.maxPerDay +
  POINTS.reflection.points +
  POINTS.streak.cap;

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

// Points for a single day's entry, EXCLUDING the streak bonus (streak depends
// on history, so it's added separately in the daily total below).
export function basePointsForEntry(e) {
  const ind = Math.min(
    POINTS.independent.dailyCap,
    Math.floor((e.independentMinutes || 0) / POINTS.independent.minutesPerPoint)
  );
  const tasks = Math.min(POINTS.tasks.maxPerDay, Math.max(0, e.independentTasks || 0)) * POINTS.tasks.perTask;
  const refl = countWords(e.reflection) >= POINTS.reflection.minWords ? POINTS.reflection.points : 0;
  return ind + tasks + refl;
}

export function streakBonus(streakDays) {
  return Math.min(POINTS.streak.cap, Math.max(0, streakDays) * POINTS.streak.perDay);
}

// Full points stored for an entry = base + that day's streak bonus.
export function pointsForEntry(e, streakDays) {
  return basePointsForEntry(e) + streakBonus(streakDays);
}

// Independent share of logged time, 0–100, or null if nothing logged.
export function independentShare(e) {
  const total = (e.independentMinutes || 0) + (e.aiMinutes || 0);
  if (total === 0) return null;
  return Math.round(((e.independentMinutes || 0) / total) * 100);
}
