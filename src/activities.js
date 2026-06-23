// ════════════════════════════════════════════════════════════════════════
// TRACE v8 — per-activity logging model
//
// A day's log is a list of activities. Each activity has:
//   - name (from the default list, or a custom one the student typed)
//   - reliance: 1..7  (1 = all my own work, 7 = entirely AI)
//   - timeBand: 0..6  (index into TIME_BANDS)
//
// The day's INDEPENDENCE SCORE (0..100) is the time-weighted average of each
// activity's independence, where independence = mapped from reliance, and the
// weight = coarse size derived from the time band. Custom activities fold into
// the same average, so adding more activities can't inflate a total.
// ════════════════════════════════════════════════════════════════════════

export const DEFAULT_ACTIVITIES = [
  "Reading",
  "Writing",
  "Brainstorming",
  "Problem-solving",
  "Revising/editing",
  "Researching a topic",
];

// 7-point reliance scale (independent → AI).
export const RELIANCE_LEVELS = [
  "All my own work",
  "Almost all me",
  "Mostly me",
  "Even mix",
  "Mostly AI",
  "Almost all AI",
  "Entirely AI",
];

// 7 time bands (recorded for richer data).
export const TIME_BANDS = [
  "Under 15 min",
  "15–30 min",
  "30 min – 1 hr",
  "1 – 2 hrs",
  "2 – 3 hrs",
  "3 – 4 hrs",
  "Over 4 hrs",
];

// Coarse weight per time band: short (bands 0-1) = 1, medium (2-3) = 2,
// long (4-6) = 3. Keeps the average from over-trusting fine time recall.
export function bandWeight(bandIndex) {
  if (bandIndex <= 1) return 1;
  if (bandIndex <= 3) return 2;
  return 3;
}

// reliance 1..7  →  independence 100..0 (evenly spaced)
export function relianceToIndependence(reliance) {
  const r = Math.min(7, Math.max(1, reliance));
  return Math.round(((7 - r) / 6) * 100);
}

// Day independence score (0..100) = time-weighted average of independence.
// Returns null if no activities logged.
export function dayIndependence(activities) {
  if (!activities || activities.length === 0) return null;
  let wSum = 0, acc = 0;
  for (const a of activities) {
    const w = bandWeight(a.timeBand ?? 0);
    acc += relianceToIndependence(a.reliance) * w;
    wSum += w;
  }
  if (wSum === 0) return null;
  return Math.round(acc / wSum);
}

// Rough total "effort size" of the day = sum of band weights. Used for the
// companion mood and as a gentle activity signal (not points-inflating since
// points use the independence score, not this).
export function dayEffort(activities) {
  if (!activities) return 0;
  return activities.reduce((s, a) => s + bandWeight(a.timeBand ?? 0), 0);
}
