import React from "react";

// ── TRACE Companion ───────────────────────────────────────────────────────
// A calm, abstract companion with five mood states and gentle idle motion.
// Deliberately NOT a specific animal. Three colourways are pickable at sign-up.
//
// ART-SWAP NOTE: the creature is drawn as inline SVG in `Shape` below. To
// replace it with commissioned/licensed artwork later, swap `Shape` for an
// <img> keyed on (variant, mood) — everything else (moods, animation, picker)
// stays the same.
// ───────────────────────────────────────────────────────────────────────────

export const COMPANION_VARIANTS = [
  { id: "sage",  label: "Sage",  body: "#6FB79A", soft: "#7FC3A7" },
  { id: "tide",  label: "Tide",  body: "#88A0CC", soft: "#9DB2D8" },
  { id: "clay",  label: "Clay",  body: "#C99B94", soft: "#D8B0AA" },
];

// Mood order, brightest → lowest. Each tweaks colour, eyes, mouth, motion.
export const MOODS = {
  thriving: { label: "Thriving", anim: "trace-hop",   dim: 1.0,  glow: true },
  happy:    { label: "Happy",    anim: "trace-breathe-fast", dim: 1.0 },
  content:  { label: "Content",  anim: "trace-breathe", dim: 0.96 },
  sleepy:   { label: "Sleepy",   anim: "trace-breathe-slow", dim: 0.85, sleepy: true },
  drained:  { label: "Drained",  anim: "trace-droop", dim: 0.7,  drained: true },
};

// Inject keyframes once.
const STYLE_ID = "trace-companion-style";
function ensureStyle() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
@keyframes trace-breathe{0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(-2.5px) scaleY(1.02)}}
@keyframes trace-breathe-fast{0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(-2px) scaleY(1.025)}}
@keyframes trace-breathe-slow{0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(-1.5px) scaleY(1.015)}}
@keyframes trace-hop{0%,68%,100%{transform:translateY(0)}80%{transform:translateY(-8px)}90%{transform:translateY(-2px)}}
@keyframes trace-droop{0%,100%{transform:translateY(0)}50%{transform:translateY(2px)}}
@keyframes trace-blink{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(0.08)}}
.trace-hop{animation:trace-hop 3.2s ease-in-out infinite}
.trace-breathe-fast{animation:trace-breathe-fast 2.7s ease-in-out infinite}
.trace-breathe{animation:trace-breathe 3.2s ease-in-out infinite}
.trace-breathe-slow{animation:trace-breathe-slow 4.4s ease-in-out infinite}
.trace-droop{animation:trace-droop 3.6s ease-in-out infinite}
.trace-eye{animation:trace-blink 6s infinite;transform-origin:center}
`;
  document.head.appendChild(s);
}

function Shape({ variant, mood, size }) {
  const v = COMPANION_VARIANTS.find((x) => x.id === variant) || COMPANION_VARIANTS[0];
  const m = MOODS[mood] || MOODS.content;
  const eyeFill = "#243430";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={m.anim}
      style={{ display: "block", transformOrigin: "center bottom", opacity: m.dim, filter: m.drained ? "saturate(0.6)" : "none" }}
      role="img" aria-label={`Your companion is ${m.label.toLowerCase()}`}>
      <ellipse cx="50" cy="95" rx="20" ry="2.5" fill="#000" opacity="0.06" />
      {/* body */}
      <path d="M50 22 C68 22 78 44 78 64 C78 84 66 92 50 92 C34 92 22 84 22 64 C22 44 32 22 50 22 Z" fill={m.drained ? "#B9B0A8" : v.body} />
      <path d="M50 22 C60 22 67 33 71 47 C60 41 40 41 29 47 C33 33 40 22 50 22 Z" fill={v.soft} opacity={m.drained ? 0.2 : 0.55} />
      {/* glow sparkles when thriving */}
      {m.glow && (<>
        <circle cx="24" cy="46" r="2.4" fill="#F0D88A" /><circle cx="78" cy="42" r="1.8" fill="#F0D88A" /><circle cx="74" cy="62" r="2.2" fill="#F0D88A" />
      </>)}
      {/* eyes */}
      {m.sleepy ? (
        <>
          <path d="M38 60 Q42 58 46 60" stroke={eyeFill} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M54 60 Q58 58 62 60" stroke={eyeFill} strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : m.drained ? (
        <>
          <path d="M38 60 L46 62" stroke={eyeFill} strokeWidth="2" strokeLinecap="round" />
          <path d="M54 62 L62 60" stroke={eyeFill} strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <g className="trace-eye"><circle cx="42" cy="62" r="3.2" fill={eyeFill} /><circle cx="58" cy="62" r="3.2" fill={eyeFill} /></g>
      )}
      {/* mouth */}
      {m.drained ? (
        <path d="M45 74 Q50 71 55 74" stroke={eyeFill} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      ) : mood === "content" ? (
        <path d="M45 71 L55 71" stroke={eyeFill} strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M44 71 Q50 75 56 71" stroke={eyeFill} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      )}
      {/* zzz when sleepy */}
      {m.sleepy && <text x="70" y="40" fontFamily="Inter, sans-serif" fontSize="12" fill="#9aa8a2">z</text>}
    </svg>
  );
}

export default function Companion({ variant = "sage", mood = "content", size = 120 }) {
  ensureStyle();
  return <Shape variant={variant} mood={mood} size={size} />;
}

// ── Mood engine ────────────────────────────────────────────────────────────
// Mood is driven by RECENT independent effort and presence — never by AI use.
// Tunable thresholds; tweak freely.
export const MOOD_CONFIG = {
  // look back this many days for "recent" effort
  windowDays: 3,
  // independent minutes over the window:
  thriving: 150,  // >= this → thriving
  happy: 80,      // >= this → happy
  content: 20,    // >= this → content
  // below `content` but logged within windowDays → still content
  // no logging within windowDays → sleepy
  // logged recently but independent effort near zero → drained
  drainedMaxIndependent: 10, // logged but <= this much independent → drained
};

export function moodFromEntries(entries) {
  const cfg = MOOD_CONFIG;
  const today = new Date();
  let recentIndependent = 0;
  let loggedRecently = false;
  for (let i = 0; i < cfg.windowDays; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    const e = entries[k];
    if (e) {
      loggedRecently = true;
      recentIndependent += e.independentMinutes || 0;
    }
  }
  if (!loggedRecently) return "sleepy";
  if (recentIndependent <= cfg.drainedMaxIndependent) return "drained";
  if (recentIndependent >= cfg.thriving) return "thriving";
  if (recentIndependent >= cfg.happy) return "happy";
  return "content";
}
