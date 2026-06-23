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

// ── v9 insight helpers ─────────────────────────────────────────────────────

// Average independence per activity-type name across a set of entries.
// `entries` is the {dateKey: {activities,...}} map. Returns sorted array.
export function relianceByActivityType(entries, sinceDays = null) {
  const cutoff = sinceDays ? Date.now() - sinceDays * 864e5 : null;
  const acc = {}; // name -> {wIndep, wSum, count}
  for (const k of Object.keys(entries)) {
    if (cutoff && new Date(k).getTime() < cutoff) continue;
    const e = entries[k];
    for (const a of e.activities || []) {
      const w = bandWeight(a.timeBand ?? 0);
      const ind = relianceToIndependence(a.reliance);
      if (!acc[a.name]) acc[a.name] = { wIndep: 0, wSum: 0, count: 0 };
      acc[a.name].wIndep += ind * w;
      acc[a.name].wSum += w;
      acc[a.name].count += 1;
    }
  }
  return Object.entries(acc)
    .map(([name, v]) => ({ name, independence: v.wSum ? Math.round(v.wIndep / v.wSum) : 0, count: v.count }))
    .sort((a, b) => b.independence - a.independence);
}

// Daily independence series (for the trend), oldest → newest, within window.
export function independenceSeries(entries, sinceDays = null) {
  const cutoff = sinceDays ? Date.now() - sinceDays * 864e5 : null;
  return Object.keys(entries)
    .filter((k) => !cutoff || new Date(k).getTime() >= cutoff)
    .sort()
    .map((k) => ({ date: k, independence: dayIndependence(entries[k].activities) }))
    .filter((d) => d.independence !== null);
}

// Group a daily series into ISO-week averages for a smoother line.
export function weeklyAverages(series) {
  const weeks = {};
  for (const d of series) {
    const dt = new Date(d.date);
    const onejan = new Date(dt.getFullYear(), 0, 1);
    const wk = Math.ceil((((dt - onejan) / 864e5) + onejan.getDay() + 1) / 7);
    const key = `${dt.getFullYear()}-W${String(wk).padStart(2, "0")}`;
    if (!weeks[key]) weeks[key] = { sum: 0, n: 0, days: [] };
    weeks[key].sum += d.independence; weeks[key].n++; weeks[key].days.push(d);
  }
  return Object.entries(weeks).map(([week, v]) => ({ week, avg: Math.round(v.sum / v.n), days: v.days }));
}

// Adaptive reflection prompt from today's logged activities.
export function adaptivePrompt(activities) {
  if (!activities || activities.length === 0) return null;
  const indep = dayIndependence(activities);
  // find the activity leaned on most (lowest independence, weighted by time)
  const ranked = [...activities].sort(
    (a, b) => (relianceToIndependence(a.reliance) - relianceToIndependence(b.reliance))
  );
  const mostAI = ranked[0];
  const mostOwn = ranked[ranked.length - 1];
  const mostAIindep = relianceToIndependence(mostAI.reliance);
  if (indep >= 70) {
    return `You worked largely on your own today. What helped you stay independent — and could it carry over to other work?`;
  }
  if (mostAIindep <= 30 && mostOwn && relianceToIndependence(mostOwn.reliance) >= 60) {
    return `You leaned on AI most for ${mostAI.name.toLowerCase()}, and worked independently on ${mostOwn.name.toLowerCase()}. What's one part of the ${mostAI.name.toLowerCase()} you could try yourself first next time?`;
  }
  if (mostAIindep <= 30) {
    return `You leaned on AI quite a bit for ${mostAI.name.toLowerCase()} today. What drew you to it there — time, difficulty, or habit?`;
  }
  return `A fairly balanced day. Where did AI genuinely help your understanding, and where might it have done the thinking for you?`;
}
