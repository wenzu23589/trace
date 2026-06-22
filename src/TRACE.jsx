import React, { useState, useEffect, useMemo } from "react";
import {
  supabaseConfigured,
  getLocalParticipant,
  registerParticipant,
  clearLocalParticipant,
  fetchEntries,
  saveEntry,
} from "./supabaseClient.js";

// ── TRACE ──────────────────────────────────────────────────────────────
// Tracking Reliance in AI to Champion academic self-Efficacy
// EASE project, Study 2. Rule-based, no AI components.
// ───────────────────────────────────────────────────────────────────────

const C = {
  ink: "#1b2a2a",
  paper: "#f3efe6",
  card: "#ffffff",
  sage: "#5b8a72",
  sageDeep: "#3f6b56",
  clay: "#c87e5a",
  mist: "#dfe6df",
  line: "#d9d3c4",
  faint: "#8a9590",
};

const FONT = `"Spectral", Georgia, serif`;
const SANS = `"Inter", system-ui, sans-serif`;

const todayKey = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

function pointsForEntry(e) {
  let p = 0;
  p += e.independentMinutes >= 30 ? 20 : Math.round((e.independentMinutes / 30) * 20);
  if (e.independentTasks > 0) p += e.independentTasks * 10;
  if (e.reflection && e.reflection.trim().length > 20) p += 15;
  return Math.max(0, Math.round(p));
}

const MILESTONES = [
  { at: 50, label: "First steps" },
  { at: 150, label: "Building momentum" },
  { at: 300, label: "Independent thinker" },
  { at: 600, label: "Self-directed scholar" },
  { at: 1000, label: "Mastery mindset" },
];

const CHALLENGES = [
  { id: "c1", label: "Log 3 days in a row", test: (s) => s.streak >= 3 },
  { id: "c2", label: "120 min of independent work this week", test: (s) => s.weekIndependent >= 120 },
  { id: "c3", label: "Write 3 reflections", test: (s) => s.reflectionCount >= 3 },
  { id: "c4", label: "A full AI-free study day", test: (s) => s.aiFreeDays >= 1 },
];

function Sparkline({ entries }) {
  const days = useMemo(() => {
    const out = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      const e = entries[k];
      out.push({
        k,
        ai: e ? e.aiMinutes : 0,
        ind: e ? e.independentMinutes : 0,
        label: d.toLocaleDateString(undefined, { day: "numeric" }),
      });
    }
    return out;
  }, [entries]);

  const max = Math.max(60, ...days.map((d) => Math.max(d.ai, d.ind)));

  return (
    <div>
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 120 }}>
        {days.map((d) => (
          <div key={d.k} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 100, width: "100%", justifyContent: "center" }}>
              <div title={`AI: ${d.ai} min`} style={{ width: "42%", height: `${(d.ai / max) * 100}%`, background: C.clay, borderRadius: "2px 2px 0 0", minHeight: d.ai ? 2 : 0 }} />
              <div title={`Independent: ${d.ind} min`} style={{ width: "42%", height: `${(d.ind / max) * 100}%`, background: C.sage, borderRadius: "2px 2px 0 0", minHeight: d.ind ? 2 : 0 }} />
            </div>
            <span style={{ fontSize: 9, color: C.faint, fontFamily: SANS }}>{d.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 18, marginTop: 12, fontFamily: SANS, fontSize: 12, color: C.faint }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.clay, borderRadius: 2, marginRight: 6 }} />AI minutes</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.sage, borderRadius: 2, marginRight: 6 }} />Independent minutes</span>
      </div>
    </div>
  );
}

export default function TRACE() {
  const [stage, setStage] = useState("loading"); // loading | register | app | error
  const [participant, setParticipant] = useState(null);
  const [entries, setEntries] = useState({});
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    (async () => {
      if (!supabaseConfigured) {
        setStage("error");
        return;
      }
      const local = getLocalParticipant();
      if (local) {
        try {
          const e = await fetchEntries(local.id);
          setParticipant(local);
          setEntries(e);
          setStage("app");
        } catch {
          setStage("register");
        }
      } else {
        setStage("register");
      }
    })();
  }, []);

  async function handleRegister() {
    if (!name.trim() || !studentId.trim()) return;
    setBusy(true);
    setErrMsg("");
    try {
      const p = await registerParticipant({ participantId: studentId.trim(), name: name.trim() });
      const e = await fetchEntries(p.id);
      setParticipant(p);
      setEntries(e);
      setStage("app");
    } catch (err) {
      setErrMsg("Could not register. Check your connection and try again.");
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  function handleSignOut() {
    clearLocalParticipant();
    setParticipant(null);
    setEntries({});
    setName("");
    setStudentId("");
    setStage("register");
  }

  const stats = useMemo(() => {
    const keys = Object.keys(entries).sort();
    let totalPoints = 0, reflectionCount = 0, aiFreeDays = 0;
    keys.forEach((k) => {
      const e = entries[k];
      totalPoints += e.points || 0;
      if (e.reflection && e.reflection.trim().length > 20) reflectionCount++;
      if (e.aiMinutes === 0 && e.independentMinutes > 0) aiFreeDays++;
    });
    let streak = 0;
    let cursor = todayKey();
    if (!entries[cursor]) {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      cursor = y.toISOString().slice(0, 10);
    }
    while (entries[cursor]) {
      streak++;
      const d = new Date(cursor);
      d.setDate(d.getDate() - 1);
      cursor = d.toISOString().slice(0, 10);
    }
    let weekIndependent = 0;
    keys.forEach((k) => {
      if (daysBetween(k, todayKey()) < 7) weekIndependent += entries[k].independentMinutes || 0;
    });
    return { totalPoints, reflectionCount, aiFreeDays, streak, weekIndependent };
  }, [entries]);

  const nextMilestone = MILESTONES.find((m) => m.at > stats.totalPoints) || null;
  const lastMilestone = [...MILESTONES].reverse().find((m) => m.at <= stats.totalPoints) || null;

  const cardStyle = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 22 };
  const labelStyle = { fontFamily: SANS, fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: C.faint };

  if (stage === "loading") {
    return <div style={{ fontFamily: SANS, padding: 40, color: C.faint }}>Loading TRACE…</div>;
  }

  if (stage === "error") {
    return (
      <div style={{ fontFamily: SANS, background: C.paper, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, color: C.ink }}>
        <div style={{ ...cardStyle, maxWidth: 460 }}>
          <h1 style={{ fontFamily: FONT, fontSize: 22, marginTop: 0 }}>Setup needed</h1>
          <p style={{ color: C.faint, fontSize: 14, lineHeight: 1.6 }}>
            TRACE can't reach its database. The two environment variables
            <code style={{ background: C.mist, padding: "1px 5px", borderRadius: 4, margin: "0 3px" }}>VITE_SUPABASE_URL</code>
            and
            <code style={{ background: C.mist, padding: "1px 5px", borderRadius: 4, margin: "0 3px" }}>VITE_SUPABASE_ANON_KEY</code>
            need to be set at build time. See the README for the one-time setup.
          </p>
        </div>
      </div>
    );
  }

  if (stage === "register") {
    return (
      <div style={{ fontFamily: SANS, background: C.paper, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, color: C.ink }}>
        <div style={{ ...cardStyle, maxWidth: 420, width: "100%" }}>
          <div style={{ ...labelStyle, color: C.sage }}>TRACE</div>
          <h1 style={{ fontFamily: FONT, fontSize: 30, margin: "8px 0 4px", fontWeight: 600, lineHeight: 1.1 }}>Champion your own thinking.</h1>
          <p style={{ color: C.faint, fontSize: 14, lineHeight: 1.5, marginBottom: 22 }}>
            A self-monitoring study companion. Track when you lean on AI and when you work independently — and watch your own effort grow.
          </p>
          <label style={{ ...labelStyle, display: "block", marginBottom: 6 }}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maria Borg"
            style={{ width: "100%", padding: "11px 13px", border: `1px solid ${C.line}`, borderRadius: 9, fontSize: 14, marginBottom: 16, fontFamily: SANS, boxSizing: "border-box" }} />
          <label style={{ ...labelStyle, display: "block", marginBottom: 6 }}>Participant ID</label>
          <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="e.g. UM-0421"
            style={{ width: "100%", padding: "11px 13px", border: `1px solid ${C.line}`, borderRadius: 9, fontSize: 14, marginBottom: 22, fontFamily: SANS, boxSizing: "border-box" }} />
          {errMsg && <div style={{ color: C.clay, fontSize: 13, marginBottom: 14 }}>{errMsg}</div>}
          <button onClick={handleRegister} disabled={!name.trim() || !studentId.trim() || busy}
            style={{ width: "100%", padding: "12px", background: name.trim() && studentId.trim() && !busy ? C.sage : C.mist, color: name.trim() && studentId.trim() && !busy ? "#fff" : C.faint, border: "none", borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: name.trim() && studentId.trim() && !busy ? "pointer" : "default", fontFamily: SANS }}>
            {busy ? "Setting up…" : "Start tracking"}
          </button>
        </div>
      </div>
    );
  }

  const today = entries[todayKey()];
  return (
    <div style={{ fontFamily: SANS, background: C.paper, minHeight: "100vh", padding: 24, color: C.ink }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
          <div>
            <div style={{ ...labelStyle, color: C.sage }}>TRACE</div>
            <h1 style={{ fontFamily: FONT, fontSize: 26, margin: "2px 0 0", fontWeight: 600 }}>Hello, {participant.name.split(" ")[0]}.</h1>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: FONT, fontSize: 34, fontWeight: 600, color: C.sageDeep, lineHeight: 1 }}>{stats.totalPoints}</div>
            <div style={labelStyle}>points</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 14 }}>
          <div style={cardStyle}>
            <div style={labelStyle}>Streak</div>
            <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 600, color: C.clay }}>{stats.streak}<span style={{ fontSize: 14, color: C.faint, marginLeft: 4 }}>days</span></div>
          </div>
          <div style={cardStyle}>
            <div style={labelStyle}>Independent this week</div>
            <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 600, color: C.sage }}>{stats.weekIndependent}<span style={{ fontSize: 14, color: C.faint, marginLeft: 4 }}>min</span></div>
          </div>
          <div style={cardStyle}>
            <div style={labelStyle}>{nextMilestone ? "Next milestone" : "Top milestone"}</div>
            <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 600, color: C.sageDeep, marginTop: 4 }}>{nextMilestone ? nextMilestone.label : lastMilestone?.label}</div>
            {nextMilestone && (
              <div style={{ marginTop: 8 }}>
                <div style={{ height: 6, background: C.mist, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, (stats.totalPoints / nextMilestone.at) * 100)}%`, background: C.sage }} />
                </div>
                <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>{nextMilestone.at - stats.totalPoints} pts to go</div>
              </div>
            )}
          </div>
        </div>

        <DailyLog
          existing={today}
          cardStyle={cardStyle}
          labelStyle={labelStyle}
          onSave={async (entry) => {
            const withPoints = { ...entry, points: pointsForEntry(entry) };
            const next = { ...entries, [todayKey()]: withPoints };
            setEntries(next);
            try {
              await saveEntry(participant.id, todayKey(), withPoints);
            } catch (e) {
              console.error("save failed", e);
            }
          }}
        />

        <div style={{ ...cardStyle, marginTop: 14 }}>
          <div style={{ ...labelStyle, marginBottom: 14 }}>Last 14 days</div>
          <Sparkline entries={entries} />
        </div>

        <div style={{ ...cardStyle, marginTop: 14 }}>
          <div style={{ ...labelStyle, marginBottom: 14 }}>Challenges</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {CHALLENGES.map((c) => {
              const done = c.test(stats);
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9, background: done ? "rgba(91,138,114,0.1)" : C.paper, border: `1px solid ${done ? C.sage : C.line}` }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", background: done ? C.sage : "transparent", border: `2px solid ${done ? C.sage : C.line}`, color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{done ? "✓" : ""}</span>
                  <span style={{ fontSize: 13, color: done ? C.sageDeep : C.ink, fontWeight: done ? 600 : 400 }}>{c.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
          <span style={{ fontSize: 11, color: C.faint }}>Prototype · EASE Study 2 · rule-based, no AI components · participant {participant.id}</span>
          <button onClick={handleSignOut} style={{ background: "none", border: "none", color: C.faint, fontSize: 12, cursor: "pointer", textDecoration: "underline", fontFamily: SANS }}>Sign out</button>
        </div>
      </div>
    </div>
  );
}

function DailyLog({ existing, onSave, cardStyle, labelStyle }) {
  const [aiMinutes, setAiMinutes] = useState(existing?.aiMinutes ?? 0);
  const [independentMinutes, setIndependentMinutes] = useState(existing?.independentMinutes ?? 0);
  const [independentTasks, setIndependentTasks] = useState(existing?.independentTasks ?? 0);
  const [reflection, setReflection] = useState(existing?.reflection ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setAiMinutes(existing?.aiMinutes ?? 0);
    setIndependentMinutes(existing?.independentMinutes ?? 0);
    setIndependentTasks(existing?.independentTasks ?? 0);
    setReflection(existing?.reflection ?? "");
  }, [existing]);

  const sliderRow = (label, value, set, max, color) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: C.ink }}>{label}</span>
        <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color }}>{value} min</span>
      </div>
      <input type="range" min={0} max={max} step={5} value={value} onChange={(e) => { set(Number(e.target.value)); setSaved(false); }}
        style={{ width: "100%", accentColor: color }} />
    </div>
  );

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={labelStyle}>Today's log</div>
        {existing && <span style={{ fontSize: 12, color: C.sage }}>● logged</span>}
      </div>

      {sliderRow("Time using AI tools", aiMinutes, setAiMinutes, 240, C.clay)}
      {sliderRow("Independent study time", independentMinutes, setIndependentMinutes, 240, C.sage)}

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 13 }}>Tasks completed without AI</span>
          <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: C.sage }}>{independentTasks}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setIndependentTasks(Math.max(0, independentTasks - 1)); setSaved(false); }} style={stepBtn}>–</button>
          <button onClick={() => { setIndependentTasks(independentTasks + 1); setSaved(false); }} style={stepBtn}>+</button>
        </div>
      </div>

      <label style={{ ...labelStyle, display: "block", marginBottom: 6 }}>Reflection (optional, +15 pts)</label>
      <textarea value={reflection} onChange={(e) => { setReflection(e.target.value); setSaved(false); }}
        placeholder="What did you work through on your own today? When did AI help, and when might you have leaned on it too quickly?"
        style={{ width: "100%", minHeight: 64, padding: 11, border: `1px solid ${C.line}`, borderRadius: 9, fontSize: 13, fontFamily: SANS, resize: "vertical", boxSizing: "border-box", marginBottom: 14 }} />

      <button onClick={() => { onSave({ aiMinutes, independentMinutes, independentTasks, reflection }); setSaved(true); }}
        style={{ padding: "11px 22px", background: C.sageDeep, color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: SANS }}>
        {saved ? "Saved ✓" : existing ? "Update today's log" : "Save today's log"}
      </button>
    </div>
  );
}

const stepBtn = { width: 40, height: 36, border: `1px solid ${C.line}`, background: "#fff", borderRadius: 8, fontSize: 18, cursor: "pointer", color: C.ink };
