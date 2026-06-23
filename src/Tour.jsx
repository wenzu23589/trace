import React, { useState, useEffect, useLayoutEffect, useCallback } from "react";

// ── Guided tour (v11) ───────────────────────────────────────────────────────
// Points at real elements tagged with data-tour="<key>". Renders a dimmed
// backdrop with a "spotlight" hole over the target and a tooltip beside it.
// Steps with target=null are centred intro/outro cards.

const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const MINT = "#3F8F68", INK = "#26312c", BODY = "#46544e";

export const TOUR_STEPS = [
  { target: null, tab: "today", title: "Welcome to TRACE", body: "A quick tour — about 30 seconds. TRACE helps you notice how independently you study, and build the habit of doing your own thinking. You can skip anytime." },
  { target: "log", tab: "today", title: "Log your day here", body: "On the Today tab, add the activities you worked on. For each one, set how much was your own work versus AI, and roughly how long it took. That's the whole daily habit." },
  { target: "companion", tab: "today", title: "Your companion", body: "It responds to your independent effort and brightens as you work on your own. It's never upset by AI use — it just thrives on your own thinking. You'll find it on both tabs." },
  { target: "streaks", tab: "dashboard", title: "Streaks & progress", body: "The Dashboard tab gathers your streaks, points, weekly independence and patterns over time. Small, steady effort is the idea — not perfection." },
  { target: "tabs", tab: "dashboard", title: "Moving around", body: "Today is for logging. Dashboard is for progress. Community shows others (your AI use is always private). Competitions are optional friendly challenges." },
  { target: "bell", tab: "dashboard", title: "Notifications", body: "The research team may send you the occasional note here. That's it — you're ready. You can replay this tour anytime from “How it works”." },
];

export default function Tour({ onClose, setTab }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const step = TOUR_STEPS[i];
  const last = i === TOUR_STEPS.length - 1;

  // switch to the tab this step lives on, before measuring its target
  useEffect(() => { if (step.tab && setTab) setTab(step.tab); }, [i]);

  const measure = useCallback(() => {
    if (!step.target) { setRect(null); return; }
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    } else {
      setRect(null);
    }
  }, [step]);

  useLayoutEffect(() => {
    // small delay so a tab switch can render before we measure
    const t = setTimeout(measure, 120);
    return () => clearTimeout(t);
  }, [measure]);
  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    const t = setTimeout(measure, 250); // re-measure after scroll settles
    return () => { window.removeEventListener("resize", onResize); window.removeEventListener("scroll", onResize, true); clearTimeout(t); };
  }, [measure]);
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pad = 8;
  const spot = rect ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;

  // tooltip position: below the spotlight if room, else above; centred card if no target
  let tip;
  if (!spot) {
    tip = { top: "50%", left: "50%", transform: "translate(-50%,-50%)", maxWidth: 360 };
  } else {
    const below = spot.top + spot.height + 12;
    const roomBelow = window.innerHeight - below > 180;
    tip = roomBelow
      ? { top: below, left: Math.max(12, Math.min(spot.left, window.innerWidth - 332)), maxWidth: 320 }
      : { top: Math.max(12, spot.top - 12 - 160), left: Math.max(12, Math.min(spot.left, window.innerWidth - 332)), maxWidth: 320 };
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000 }}>
      {/* dim backdrop; clicking it advances */}
      <div onClick={() => (last ? onClose() : setI(i + 1))}
        style={{ position: "absolute", inset: 0, background: "rgba(20,30,26,0.55)", transition: "background 0.2s" }} />

      {/* spotlight hole */}
      {spot && (
        <div style={{ position: "absolute", top: spot.top, left: spot.left, width: spot.width, height: spot.height,
          borderRadius: 14, boxShadow: "0 0 0 9999px rgba(20,30,26,0.55)", border: `2px solid ${MINT}`,
          transition: "all 0.25s ease", pointerEvents: "none" }} />
      )}

      {/* tooltip card */}
      <div style={{ position: "absolute", ...tip, background: "#fff", borderRadius: 14, padding: "1.1rem 1.25rem",
        boxShadow: "0 12px 40px rgba(0,0,0,0.25)", fontFamily: SANS }}>
        <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: INK, marginBottom: 6 }}>{step.title}</div>
        <div style={{ fontSize: 13.5, color: BODY, lineHeight: 1.5, marginBottom: 14 }}>{step.body}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 5 }}>
            {TOUR_STEPS.map((_, j) => (
              <span key={j} style={{ width: 7, height: 7, borderRadius: "50%", background: j === i ? MINT : "#d6ded9" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!last && <button onClick={onClose} style={{ background: "none", border: "none", color: "#8a958f", fontSize: 13, cursor: "pointer", fontFamily: SANS }}>Skip</button>}
            <button onClick={() => (last ? onClose() : setI(i + 1))}
              style={{ background: MINT, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: SANS }}>
              {last ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
