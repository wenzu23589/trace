import React, { useState, useEffect, useMemo } from "react";
import Avatar from "./Avatar.jsx";
import Companion, { COMPANION_VARIANTS, moodFromEntries, MOODS } from "./Companion.jsx";
import {
  supabaseConfigured, AFFILIATIONS, AFFILIATION_TYPES,
  signUp, signIn, signOut, getSession, onAuthChange,
  getProfile, createProfile,
  fetchEntries, saveEntry,
  fetchCommunity, fetchCompetitions, createCompetition, joinCompetition, fetchMyCompetitions,
  fetchAdminChallenges, createAdminChallenge, deleteAdminChallenge,
  fetchNotifications, markNotificationsRead, createNotification, fetchAllNotifications, deleteNotification,
} from "./supabaseClient.js";
import { POINTS, DAILY_MAX, MILESTONES, basePointsForEntry, streakBonus, pointsForEntry, streakOf, STREAKS } from "./points.js";
import { DEFAULT_ACTIVITIES, RELIANCE_LEVELS, TIME_BANDS, relianceToIndependence, dayIndependence, relianceByActivityType, independenceSeries, weeklyAverages, adaptivePrompt } from "./activities.js";

// ── Fresh palette: mint-sage + apricot on bone ───────────────────────────
const C = {
  bone: "#EFF3F2", surface: "#ffffff", line: "#dde4e1", lineSoft: "#e7edeb",
  ink: "#2f4a3e", body: "#4a5a52",
  mint: "#5FB58C", mintDeep: "#3f8f68", mintSoft: "#e4f2ea", mintBar: "#7FC9A4",
  apricot: "#EC9268", apricotSoft: "#F4B892", apricotBg: "#f7e0d3", apricotInk: "#c0764a",
  amber: "#b07d2e", amberBg: "#fbeede",
  faint: "#8a8578", hint: "#b0aa9c", gold: "#c9a86a",
};
const SERIF = `"Spectral", Georgia, serif`;
const SANS = `"Inter", system-ui, sans-serif`;

const todayKey = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const initials = (alias) => (alias || "").trim().slice(0, 2).toUpperCase() || "··";

const card = { background: C.surface, border: `0.5px solid ${C.line}`, borderRadius: 14, padding: "1.25rem 1.4rem" };
const lbl = { fontFamily: SANS, fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: C.hint };
const input = { width: "100%", padding: "11px 13px", border: `1px solid ${C.line}`, borderRadius: 9, fontSize: 14, fontFamily: SANS, boxSizing: "border-box", background: "#fff", color: C.ink };
const primaryBtn = (active) => ({ width: "100%", padding: "12px", background: active ? C.mint : C.lineSoft, color: active ? "#fff" : C.hint, border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: active ? "pointer" : "default", fontFamily: SANS });

// ── Balance bars (weekly independence %) ─────────────────────────────────
function BalanceBars({ entries }) {
  const days = useMemo(() => {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10); const e = entries[k];
      const share = e ? dayIndependence(e.activities) : null;
      const n = e?.activities?.length || 0;
      out.push({ k, share, n, label: d.toLocaleDateString(undefined, { weekday: "short" }) });
    }
    return out;
  }, [entries]);
  const shares = days.filter((d) => d.share !== null);
  const avg = shares.length ? Math.round(shares.reduce((s, d) => s + d.share, 0) / shares.length) : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
        <div style={{ fontSize: 13, color: C.faint }}>This week's independence</div>
        <div style={{ fontSize: 12, color: C.hint }}>% your own work</div>
      </div>
      <div style={{ fontSize: 11, color: C.hint, marginBottom: 16 }}>how independently you worked across your activities</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {days.map((d) => {
          const pct = d.share === null ? 0 : d.share;
          return (
            <div key={d.k} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, color: C.faint, width: 32 }}>{d.label}</span>
              <div style={{ flex: 1, display: "flex", height: 16, borderRadius: 8, overflow: "hidden", background: C.lineSoft }}>
                <div style={{ width: `${pct}%`, background: C.mintBar }} />
                <div style={{ width: `${100 - pct}%`, background: d.share === null ? "transparent" : C.apricotSoft }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: d.share === null ? C.hint : C.mintDeep, width: 38, textAlign: "right" }}>
                {d.share === null ? "—" : `${d.share}%`}
              </span>
              <span style={{ fontSize: 11, color: C.hint, width: 66, textAlign: "right" }}>
                {d.n ? `${d.n} activit${d.n === 1 ? "y" : "ies"}` : ""}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `0.5px solid ${C.line}`, marginTop: 16, paddingTop: 14 }}>
        <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.faint }}>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.mintBar, borderRadius: 3, marginRight: 5 }} />Your own work</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.apricotSoft, borderRadius: 3, marginRight: 5 }} />AI-assisted</span>
        </div>
        {avg !== null && <div style={{ fontSize: 12, color: C.faint }}>Week average <span style={{ fontWeight: 600, color: C.mintDeep }}>{avg}% your own</span></div>}
      </div>
    </div>
  );
}

// ── Notification bell (v10) ───────────────────────────────────────────────
function Bell({ userId, affiliation }) {
  const [notes, setNotes] = useState([]);
  const [open, setOpen] = useState(false);
  async function load() {
    try { setNotes(await fetchNotifications(userId, affiliation)); } catch (e) { console.error(e); }
  }
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); /* eslint-disable-next-line */ }, []);
  const unread = notes.filter((n) => !n.read);
  async function toggle() {
    const next = !open; setOpen(next);
    if (next && unread.length) {
      try { await markNotificationsRead(userId, unread.map((n) => n.id)); setNotes(notes.map((n) => ({ ...n, read: true }))); } catch (e) { console.error(e); }
    }
  }
  function fmt(ts) { const d = new Date(ts); return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
  return (
    <div style={{ position: "relative" }}>
      <button onClick={toggle} aria-label="Notifications" style={{ position: "relative", background: "none", border: "none", cursor: "pointer", color: C.faint, fontSize: 22, lineHeight: 1, padding: 4 }}>
        <i className="ti ti-bell" aria-hidden="true" />
        {unread.length > 0 && (
          <span style={{ position: "absolute", top: 0, right: 0, minWidth: 16, height: 16, padding: "0 4px", background: C.apricotInk, color: "#fff", borderRadius: 8, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS }}>{unread.length}</span>
        )}
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: 38, width: 300, maxHeight: 360, overflowY: "auto", background: "#fff", border: `0.5px solid ${C.line}`, borderRadius: 12, boxShadow: "0 8px 28px rgba(0,0,0,0.12)", zIndex: 50, padding: 8 }}>
          <div style={{ fontSize: 12, color: C.hint, padding: "6px 10px 10px" }}>Notifications</div>
          {notes.length === 0 && <div style={{ fontSize: 13, color: C.hint, padding: "8px 10px 14px" }}>Nothing yet.</div>}
          {notes.map((n) => (
            <div key={n.id} style={{ padding: "10px 10px", borderTop: `0.5px solid ${C.lineSoft}` }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{n.title}</div>
              <div style={{ fontSize: 12.5, color: C.body, lineHeight: 1.45, marginTop: 2 }}>{n.body}</div>
              <div style={{ fontSize: 10.5, color: C.hint, marginTop: 4 }}>{fmt(n.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Insights: reliance by activity type + independence trend (v9) ─────────
const WINDOWS = [["14d", "14 days", 14], ["30d", "30 days", 30], ["all", "All time", null]];

function Insights({ entries }) {
  const [win, setWin] = useState("30d");
  const days = WINDOWS.find((w) => w[0] === win)[2];
  const byType = useMemo(() => relianceByActivityType(entries, days), [entries, days]);
  const weeks = useMemo(() => weeklyAverages(independenceSeries(entries, days)), [entries, days]);
  const [hover, setHover] = useState(null);

  const hasData = byType.length > 0;

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: C.ink }}>Your patterns</div>
        <div style={{ display: "flex", gap: 4 }}>
          {WINDOWS.map(([id, label]) => (
            <button key={id} onClick={() => setWin(id)} style={{ fontSize: 11, padding: "4px 9px", borderRadius: 7, border: `0.5px solid ${win === id ? C.mintBar : C.line}`, background: win === id ? "#eef6f1" : "#fff", color: win === id ? C.mintDeep : C.hint, cursor: "pointer", fontFamily: SANS }}>{label}</button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <p style={{ fontSize: 13, color: C.hint, padding: "14px 0" }}>Log a few days to see how your independence varies by activity and over time.</p>
      ) : (
        <>
          {/* by activity type */}
          <div style={{ fontSize: 12, color: C.faint, margin: "14px 0 10px" }}>How independently you work, by activity</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {byType.map((t) => (
              <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: C.body, width: 110, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                <div style={{ flex: 1, height: 14, borderRadius: 7, overflow: "hidden", background: C.lineSoft }}>
                  <div style={{ width: `${t.independence}%`, height: "100%", background: t.independence >= 50 ? C.mintBar : C.apricotSoft }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: t.independence >= 50 ? C.mintDeep : C.apricotInk, width: 38, textAlign: "right" }}>{t.independence}%</span>
              </div>
            ))}
          </div>

          {/* trend */}
          {weeks.length >= 2 && (
            <>
              <div style={{ fontSize: 12, color: C.faint, margin: "20px 0 10px" }}>Your independence over time <span style={{ color: C.hint }}>· weekly average, hover for days</span></div>
              <Trend weeks={weeks} hover={hover} setHover={setHover} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function Trend({ weeks, hover, setHover }) {
  const W = 300, H = 96, pad = 8;
  const n = weeks.length;
  const x = (i) => pad + (i * (W - 2 * pad)) / Math.max(1, n - 1);
  const y = (v) => H - pad - (v / 100) * (H - 2 * pad);
  const pts = weeks.map((w, i) => `${x(i)},${y(w.avg)}`).join(" ");
  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <line x1={pad} y1={y(50)} x2={W - pad} y2={y(50)} stroke={C.line} strokeWidth="1" strokeDasharray="3 3" />
        <polyline points={pts} fill="none" stroke={C.mintDeep} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {weeks.map((w, i) => (
          <circle key={w.week} cx={x(i)} cy={y(w.avg)} r={hover === i ? 5 : 3.5} fill={C.mintDeep}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }} />
        ))}
      </svg>
      {hover !== null && (
        <div style={{ fontSize: 11, color: C.body, marginTop: 6, textAlign: "center" }}>
          Week avg <b style={{ color: C.mintDeep }}>{weeks[hover].avg}%</b> · days: {weeks[hover].days.map((d) => `${d.independence}%`).join(", ")}
        </div>
      )}
    </div>
  );
}

export default function TRACE() {
  const [stage, setStage] = useState("loading");
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [entries, setEntries] = useState({});
  const [tab, setTab] = useState("track");

  useEffect(() => {
    if (!supabaseConfigured) { setStage("error"); return; }
    let sub;
    (async () => {
      const s = await getSession();
      await handleSession(s);
      sub = onAuthChange((sess) => handleSession(sess)).data?.subscription;
    })();
    return () => sub?.unsubscribe?.();
    // eslint-disable-next-line
  }, []);

  async function handleSession(s) {
    setSession(s);
    if (!s) { setStage("auth"); return; }
    try {
      const prof = await getProfile(s.user.id);
      if (!prof) { setStage("profile"); return; }
      setProfile(prof);
      setEntries(await fetchEntries(s.user.id));
      setStage("app");
    } catch (e) { console.error(e); setStage("profile"); }
  }

  const stats = useMemo(() => {
    const keys = Object.keys(entries).sort();
    let totalPoints = 0;
    keys.forEach((k) => { totalPoints += entries[k].points || 0; });
    let streak = 0, cursor = todayKey();
    if (!entries[cursor]) { const y = new Date(); y.setDate(y.getDate() - 1); cursor = y.toISOString().slice(0, 10); }
    while (entries[cursor]) { streak++; const d = new Date(cursor); d.setDate(d.getDate() - 1); cursor = d.toISOString().slice(0, 10); }
    let todayIndep = null; const te = entries[todayKey()];
    if (te) todayIndep = dayIndependence(te.activities);
    let weekIndepSum = 0, weekIndepDays = 0;
    keys.forEach((k) => {
      if (daysBetween(k, todayKey()) < 7) {
        const ind = dayIndependence(entries[k].activities);
        if (ind !== null) { weekIndepSum += ind; weekIndepDays++; }
      }
    });
    const weekIndep = weekIndepDays ? Math.round(weekIndepSum / weekIndepDays) : null;
    const todayActivities = te?.activities?.length || 0;
    const streaks = {
      logging: streakOf(entries, STREAKS.logging.test),
      independent: streakOf(entries, STREAKS.independent.test),
      reflection: streakOf(entries, STREAKS.reflection.test),
    };
    return { totalPoints, streak, weekIndep, todayIndep, todayActivities, streaks };
  }, [entries]);

  const next = MILESTONES.find((m) => m.at > stats.totalPoints) || null;
  const last = [...MILESTONES].reverse().find((m) => m.at <= stats.totalPoints) || null;
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; })();

  if (stage === "loading") return <Shell><div style={{ color: C.hint, fontFamily: SANS }}>Loading TRACE…</div></Shell>;
  if (stage === "error") return <Centered><h1 style={{ fontFamily: SERIF, color: C.ink }}>Setup needed</h1><p style={{ color: C.faint, fontSize: 14 }}>TRACE can't reach its database. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY at build time.</p></Centered>;
  if (stage === "auth") return <AuthScreen />;
  if (stage === "profile") return <ProfileScreen userId={session.user.id} onDone={(p) => { setProfile(p); setStage("app"); }} />;

  const today = entries[todayKey()];
  return (
    <Shell>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `0.5px solid ${C.line}`, paddingBottom: "1rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar alias={profile.alias} size={42} highlight />
          <div>
            <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600, color: C.ink }}>{greeting}, {profile.alias}.</div>
            <div style={{ fontSize: 13, color: C.faint, marginTop: 2 }}>{profile.affiliation}{stats.streak > 0 ? ` · day ${stats.streak} of your streak` : ""}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Bell userId={session.user.id} affiliation={profile.affiliation} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 600, color: C.mintDeep }}>{stats.totalPoints}</div>
            <div style={lbl}>points</div>
          </div>
        </div>
      </div>

      {/* tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {[["track", "Track"], ["community", "Community"], ["compete", "Competitions"], ...(profile.is_admin ? [["admin", "Admin"]] : [])].map(([id, t]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: "8px 16px", borderRadius: 9, border: `0.5px solid ${tab === id ? C.mint : C.line}`, background: tab === id ? C.mint : "#fff", color: tab === id ? "#fff" : C.body, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: SANS }}>{t}</button>
        ))}
      </div>

      {tab === "track" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* companion */}
          {(() => {
            const mood = moodFromEntries(entries);
            return (
              <div style={{ ...card, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "1.5rem", paddingBottom: "1.5rem" }}>
                <Companion variant={profile.companion || "sage"} mood={mood} size={120} />
                <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 600, color: C.ink, marginTop: 8 }}>{MOODS[mood].label}</div>
                <div style={{ fontSize: 12, color: C.faint, marginTop: 2, textAlign: "center", maxWidth: 300 }}>
                  {mood === "thriving" && "Thriving on your independent effort — keep it up."}
                  {mood === "happy" && "Happy with your steady, independent work."}
                  {mood === "content" && "Ticking along. A little independent study lifts the mood."}
                  {mood === "sleepy" && "Resting — log a day to wake your companion."}
                  {mood === "drained" && "A bit drained. Some independent work will perk it back up."}
                </div>
              </div>
            );
          })()}

          {/* prominent streaks */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {["logging", "independent", "reflection"].map((key) => {
              const s = STREAKS[key]; const n = stats.streaks[key];
              return (
                <div key={key} style={{ background: n > 0 ? "#eef6f1" : "#fff", border: `0.5px solid ${n > 0 ? C.mintBar : C.line}`, borderRadius: 12, padding: "0.9rem 1rem", textAlign: "center" }}>
                  <div style={{ fontSize: 22, color: n > 0 ? C.mint : C.hint }}><i className={`ti ${s.icon}`} aria-hidden="true" /></div>
                  <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: C.ink, lineHeight: 1.1 }}>{n}</div>
                  <div style={{ fontSize: 11, color: C.faint }}>{s.label} streak</div>
                </div>
              );
            })}
          </div>

          {/* metric tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
            <Tile icon="ti-book" tint={C.mintDeep} label="Independence" value={stats.weekIndep === null ? "—" : stats.weekIndep + "%"} unit="this wk" />
            <Tile icon="ti-checklist" tint={C.apricotInk} label="Today" value={stats.todayIndep === null ? "—" : stats.todayIndep + "%"} unit="your own" />
            <Tile icon="ti-list-check" tint={C.mintDeep} label="Activities" value={stats.todayActivities} unit="today" />
          </div>

          {/* milestone progress */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <span style={{ fontSize: 14, color: C.ink, fontWeight: 600 }}>{last ? last.label : "Just getting started"}</span>
              {next && <span style={{ fontSize: 12, color: C.hint }}>{next.at - stats.totalPoints} pts to {next.label}</span>}
            </div>
            <div style={{ height: 8, background: C.lineSoft, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${next ? Math.min(100, (stats.totalPoints / next.at) * 100) : 100}%`, background: C.mint }} />
            </div>
          </div>

          <div style={card}><BalanceBars entries={entries} /></div>

          <Insights entries={entries} />

          <DailyLog existing={today} streak={stats.streak}
            onSave={async (entry) => {
              const independence = dayIndependence(entry.activities);
              const pts = pointsForEntry(entry, today ? stats.streak : stats.streak + 1);
              const withPoints = { ...entry, independence, points: pts };
              const nextEntries = { ...entries, [todayKey()]: withPoints };
              setEntries(nextEntries);
              try { await saveEntry(session.user.id, todayKey(), withPoints); } catch (e) { console.error(e); }
            }} />
        </div>
      )}

      {tab === "community" && <Community myId={session.user.id} />}
      {tab === "compete" && <Competitions userId={session.user.id} />}
      {tab === "admin" && profile.is_admin && <AdminPanel userId={session.user.id} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
        <span style={{ fontSize: 11, color: C.hint }}>EASE Study 2 · rule-based, no AI components</span>
        <button onClick={async () => { await signOut(); }} style={{ background: "none", border: "none", color: C.hint, fontSize: 12, cursor: "pointer", textDecoration: "underline", fontFamily: SANS }}>Sign out</button>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return <div style={{ fontFamily: SANS, background: C.bone, minHeight: "100vh", padding: 24, color: C.body }}><div style={{ maxWidth: 720, margin: "0 auto" }}>{children}</div></div>;
}
function Centered({ children }) {
  return <div style={{ fontFamily: SANS, background: C.bone, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, color: C.body }}><div style={{ ...card, maxWidth: 440 }}>{children}</div></div>;
}
function Tile({ icon, tint, label, value, unit }) {
  return (
    <div style={{ background: C.surface, border: `0.5px solid ${C.line}`, borderRadius: 12, padding: "0.9rem 1rem" }}>
      <div style={{ fontSize: 13, color: C.faint, display: "flex", alignItems: "center", gap: 6 }}><i className={`ti ${icon}`} style={{ color: tint }} aria-hidden="true" />{label}</div>
      <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 600, color: C.ink, marginTop: 4 }}>{value}{unit && <span style={{ fontSize: 13, color: C.hint, marginLeft: 4, fontFamily: SANS, fontWeight: 400 }}>{unit}</span>}</div>
    </div>
  );
}

// ── Auth ──────────────────────────────────────────────────────────────────
function AuthScreen() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  async function submit() {
    setBusy(true); setMsg("");
    try {
      if (mode === "signup") { await signUp({ email: email.trim(), password }); setMsg("Account created. If email confirmation is on, check your inbox, then sign in."); setMode("signin"); }
      else { await signIn({ email: email.trim(), password }); }
    } catch (err) { setMsg(err.message || "Something went wrong."); } finally { setBusy(false); }
  }
  const ok = email.trim() && password.length >= 6 && !busy;
  return (
    <Centered>
      <div style={{ ...lbl, color: C.mint }}>TRACE</div>
      <h1 style={{ fontFamily: SERIF, fontSize: 28, margin: "8px 0 4px", fontWeight: 600, color: C.ink }}>{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
      <p style={{ color: C.faint, fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>Your email is used only to sign in. Other students never see it — only the alias you choose next.</p>
      <label style={{ ...lbl, display: "block", marginBottom: 6 }}>Email</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" style={{ ...input, marginBottom: 14 }} />
      <label style={{ ...lbl, display: "block", marginBottom: 6 }}>Password</label>
      <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="at least 6 characters" style={{ ...input, marginBottom: msg ? 12 : 20 }} />
      {msg && <div style={{ color: C.apricotInk, fontSize: 13, marginBottom: 16, lineHeight: 1.4 }}>{msg}</div>}
      <button onClick={submit} disabled={!ok} style={primaryBtn(ok)}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
      <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setMsg(""); }} style={{ marginTop: 14, background: "none", border: "none", color: C.mint, fontSize: 13, cursor: "pointer", fontFamily: SANS, width: "100%" }}>
        {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
      </button>
    </Centered>
  );
}

// ── Profile setup ─────────────────────────────────────────────────────────
function ProfileScreen({ userId, onDone }) {
  const [alias, setAlias] = useState(""); const [affType, setAffType] = useState("");
  const [affiliation, setAffiliation] = useState(""); const [participantId, setParticipantId] = useState("");
  const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const [companion, setCompanion] = useState("sage");
  async function submit() {
    setBusy(true); setMsg("");
    try { const p = await createProfile({ userId, alias: alias.trim(), affiliationType: affType, affiliation, participantId: participantId.trim(), consented: consent, companion }); onDone(p); }
    catch (err) { setMsg(err.message || "Could not save profile."); setBusy(false); }
  }
  const ok = alias.trim() && affType && affiliation && consent && !busy;
  return (
    <Centered>
      <div style={{ ...lbl, color: C.mint }}>One more step</div>
      <h1 style={{ fontFamily: SERIF, fontSize: 26, margin: "8px 0 4px", fontWeight: 600, color: C.ink }}>Set up your profile</h1>
      <p style={{ color: C.faint, fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>Your alias and academic entity are the only things other students see. <strong style={{ color: C.ink }}>Please don't use your real name</strong> — pick something playful.</p>
      <label style={{ ...lbl, display: "block", marginBottom: 6 }}>Alias</label>
      <input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="e.g. jojorabbit" style={{ ...input, marginBottom: 14 }} />
      <label style={{ ...lbl, display: "block", marginBottom: 6 }}>Type of academic entity</label>
      <select value={affType} onChange={(e) => { setAffType(e.target.value); setAffiliation(""); }} style={{ ...input, marginBottom: 14 }}>
        <option value="">Select…</option>
        {AFFILIATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      {affType && (
        <>
          <label style={{ ...lbl, display: "block", marginBottom: 6 }}>Your {affType.toLowerCase()}</label>
          <select value={affiliation} onChange={(e) => setAffiliation(e.target.value)} style={{ ...input, marginBottom: 14 }}>
            <option value="">Select…</option>
            {AFFILIATIONS[affType].map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </>
      )}
      <label style={{ ...lbl, display: "block", marginBottom: 6 }}>Participant ID (optional)</label>
      <input value={participantId} onChange={(e) => setParticipantId(e.target.value)} placeholder="study code, if you were given one" style={{ ...input, marginBottom: 16 }} />
      <label style={{ ...lbl, display: "block", marginBottom: 8 }}>Choose your companion</label>
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        {COMPANION_VARIANTS.map((v) => (
          <button key={v.id} onClick={() => setCompanion(v.id)} type="button"
            style={{ flex: 1, padding: "10px 4px", borderRadius: 12, cursor: "pointer", background: companion === v.id ? "#eef6f1" : "#fff", border: `1.5px solid ${companion === v.id ? C.mintBar : C.line}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontFamily: SANS }}>
            <Companion variant={v.id} mood="happy" size={56} />
            <span style={{ fontSize: 12, color: C.body }}>{v.label}</span>
          </button>
        ))}
      </div>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 18, fontSize: 13, color: C.body, lineHeight: 1.45 }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
        <span>I agree to take part in the EASE study and understand my logged data will be used for research. My AI-use figures are never shown to other students.</span>
      </label>
      {msg && <div style={{ color: C.apricotInk, fontSize: 13, marginBottom: 14 }}>{msg}</div>}
      <button onClick={submit} disabled={!ok} style={primaryBtn(ok)}>{busy ? "Saving…" : "Enter TRACE"}</button>
    </Centered>
  );
}

// ── Community ───────────────────────────────────────────────────────────
function Community({ myId }) {
  const [rows, setRows] = useState(null); const [err, setErr] = useState("");
  useEffect(() => { (async () => { try { setRows(await fetchCommunity()); } catch { setErr("Could not load the community right now."); } })(); }, []);
  if (err) return <div style={card}><p style={{ color: C.apricotInk, fontSize: 14 }}>{err}</p></div>;
  if (!rows) return <div style={card}><p style={{ color: C.hint, fontSize: 14 }}>Loading community…</p></div>;
  const rankTint = (i) => (i === 0 ? C.gold : i === 1 ? "#cdb184" : i === 2 ? C.mintDeep : C.hint);
  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
        <div style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 600, color: C.ink }}>Community</div>
      </div>
      <div style={{ fontSize: 11, color: C.hint, marginBottom: 18 }}>independent effort only · AI use stays private to each person</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((r, i) => {
          const mine = r.user_id === myId;
          return (
            <div key={r.user_id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 14px", borderRadius: 10, background: mine ? "#eef6f1" : "#fff", border: mine ? `1.5px solid ${C.mintBar}` : `0.5px solid ${C.line}` }}>
              <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: rankTint(i), width: 22 }}>{i + 1}</span>
              <Avatar alias={r.alias} size={34} highlight={mine} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{r.alias}{mine && <span style={{ fontWeight: 400, color: C.mint }}> · you</span>}</div>
                <div style={{ fontSize: 11, color: C.hint }}>{r.affiliation_display}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.mintDeep }}>{r.total_points} pts</div>
                <div style={{ fontSize: 11, color: C.hint }}>{r.avg_independence}% your own work</div>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <p style={{ fontSize: 13, color: C.hint }}>No one has logged anything yet. Be the first.</p>}
      </div>
      <div style={{ fontSize: 11, color: C.hint, textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>Independent effort only — your AI use stays private.</div>
    </div>
  );
}

// ── Competitions ─────────────────────────────────────────────────────────
function Competitions({ userId }) {
  const [comps, setComps] = useState(null); const [mine, setMine] = useState(new Set());
  const [adminChallenges, setAdminChallenges] = useState([]);
  const [name, setName] = useState(""); const [metric, setMetric] = useState("independent_minutes");
  const [days, setDays] = useState(7); const [creating, setCreating] = useState(false); const [err, setErr] = useState("");
  async function load() {
    try {
      setComps(await fetchCompetitions());
      setMine(await fetchMyCompetitions(userId));
      setAdminChallenges(await fetchAdminChallenges());
    } catch { setErr("Could not load competitions."); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  async function create() {
    if (!name.trim()) return; setCreating(true); setErr("");
    try { const starts = todayKey(); const end = new Date(); end.setDate(end.getDate() + Number(days));
      await createCompetition({ name: name.trim(), metric, startsOn: starts, endsOn: end.toISOString().slice(0, 10), userId });
      setName(""); await load();
    } catch (e) { setErr(e.message || "Could not create."); } finally { setCreating(false); }
  }
  async function join(id) { try { await joinCompetition(id, userId); await load(); } catch { setErr("Could not join."); } }
  if (err) return <div style={card}><p style={{ color: C.apricotInk, fontSize: 14 }}>{err}</p></div>;
  if (!comps) return <div style={card}><p style={{ color: C.hint, fontSize: 14 }}>Loading competitions…</p></div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {adminChallenges.length > 0 && (
        <div style={{ background: "#eef6f1", border: `1.5px solid ${C.mintBar}`, borderRadius: 14, padding: "1.25rem 1.4rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <i className="ti ti-star" style={{ color: C.mintDeep }} aria-hidden="true" />
            <span style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: C.ink }}>Featured challenges</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {adminChallenges.map((c) => (
              <div key={c.id} style={{ background: "#fff", border: `0.5px solid ${C.mintBar}`, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{c.title}</div>
                {c.description && <div style={{ fontSize: 12, color: C.body, marginTop: 3, lineHeight: 1.45 }}>{c.description}</div>}
                <div style={{ fontSize: 11, color: C.hint, marginTop: 6 }}>{c.metric === "points" ? "Most points" : "Most independent study"} · ends {c.ends_on}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={card}>
        <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: C.ink, marginBottom: 2 }}>Start a competition</div>
        <p style={{ fontSize: 12, color: C.hint, marginTop: 0, marginBottom: 14 }}>Friendly, opt-in and anonymised — ranked by alias on independent effort or points.</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Library Week Sprint" style={{ ...input, marginBottom: 10 }} />
        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <select value={metric} onChange={(e) => setMetric(e.target.value)} style={{ ...input, width: "auto", flex: 1 }}>
            <option value="independent_minutes">Most independent study</option>
            <option value="points">Most points</option>
          </select>
          <select value={days} onChange={(e) => setDays(e.target.value)} style={{ ...input, width: "auto", flex: 1 }}>
            <option value={7}>1 week</option><option value={14}>2 weeks</option><option value={30}>1 month</option>
          </select>
        </div>
        <button onClick={create} disabled={!name.trim() || creating} style={{ ...primaryBtn(!!name.trim() && !creating), width: "auto", padding: "10px 20px" }}>{creating ? "Creating…" : "Create"}</button>
      </div>
      <div style={card}>
        <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: C.ink, marginBottom: 14 }}>Active competitions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {comps.map((c) => {
            const joined = mine.has(c.id);
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, background: C.bone, border: `0.5px solid ${C.line}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: C.hint }}>{c.metric === "points" ? "Most points" : "Most independent study"} · ends {c.ends_on}</div>
                </div>
                <button onClick={() => join(c.id)} disabled={joined}
                  style={{ padding: "8px 16px", borderRadius: 8, border: `0.5px solid ${joined ? C.mint : C.line}`, background: joined ? "#eef6f1" : "#fff", color: joined ? C.mintDeep : C.body, fontSize: 13, fontWeight: 600, cursor: joined ? "default" : "pointer", fontFamily: SANS }}>{joined ? "Joined ✓" : "Join"}</button>
              </div>
            );
          })}
          {comps.length === 0 && <p style={{ fontSize: 13, color: C.hint }}>No competitions yet. Start one above.</p>}
        </div>
      </div>
    </div>
  );
}

// ── Daily log (per-activity) ───────────────────────────────────────────────
function DailyLog({ existing, streak, onSave }) {
  const [activities, setActivities] = useState(existing?.activities ?? []);
  const [reflection, setRefl] = useState(existing?.reflection ?? "");
  const [customName, setCustomName] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setActivities(existing?.activities ?? []);
    setRefl(existing?.reflection ?? "");
  }, [existing]);

  const draft = { activities, reflection };
  const base = basePointsForEntry(draft);
  const bonus = streakBonus(existing ? streak : streak + 1);
  const indep = dayIndependence(activities);

  function addActivity(name) {
    if (!name) return;
    if (activities.some((a) => a.name.toLowerCase() === name.toLowerCase())) return;
    setActivities([...activities, { name, reliance: 1, timeBand: 2 }]);
    setSaved(false);
  }
  function updateActivity(i, patch) {
    setActivities(activities.map((a, j) => (j === i ? { ...a, ...patch } : a)));
    setSaved(false);
  }
  function removeActivity(i) { setActivities(activities.filter((_, j) => j !== i)); setSaved(false); }

  const used = new Set(activities.map((a) => a.name));
  const remaining = DEFAULT_ACTIVITIES.filter((n) => !used.has(n));

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: C.ink }}>{existing ? "Today's activities" : "Log today"}</div>
        {indep !== null && <span style={{ fontSize: 12, color: C.mintDeep, fontWeight: 600 }}>{indep}% your own work</span>}
      </div>
      <p style={{ fontSize: 12, color: C.hint, marginTop: 0, marginBottom: 14 }}>Add what you worked on, then set how much was your own work and how long it took.</p>

      {/* activity chips to add */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {remaining.map((n) => (
          <button key={n} onClick={() => addActivity(n)} style={{ padding: "7px 12px", borderRadius: 20, border: `0.5px solid ${C.line}`, background: "#fff", color: C.body, fontSize: 13, cursor: "pointer", fontFamily: SANS }}>+ {n}</button>
        ))}
      </div>

      {/* add custom */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Add your own activity…" style={{ ...input, flex: 1 }} />
        <button onClick={() => { addActivity(customName.trim()); setCustomName(""); }} disabled={!customName.trim()} style={{ padding: "0 16px", borderRadius: 9, border: "none", background: customName.trim() ? C.mintDeep : C.lineSoft, color: customName.trim() ? "#fff" : C.hint, fontSize: 14, fontWeight: 600, cursor: customName.trim() ? "pointer" : "default", fontFamily: SANS }}>Add</button>
      </div>

      {/* logged activities */}
      {activities.length === 0 && <p style={{ fontSize: 13, color: C.hint, textAlign: "center", padding: "8px 0 16px" }}>No activities yet — add one above.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: activities.length ? 18 : 0 }}>
        {activities.map((a, i) => {
          const aiPct = 100 - relianceToIndependence(a.reliance);
          return (
            <div key={a.name + i} style={{ border: `0.5px solid ${C.line}`, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{a.name}</span>
                <button onClick={() => removeActivity(i)} aria-label="Remove" style={{ background: "none", border: "none", color: C.hint, cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
              {/* reliance */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: C.body }}>How much was your own work?</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: aiPct > 50 ? C.apricotInk : C.mintDeep }}>{RELIANCE_LEVELS[a.reliance - 1]}</span>
              </div>
              <input type="range" min={1} max={7} step={1} value={a.reliance} onChange={(e) => updateActivity(i, { reliance: Number(e.target.value) })} style={{ width: "100%", accentColor: aiPct > 50 ? C.apricot : C.mint, marginBottom: 12 }} />
              {/* time band */}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: C.body }}>Roughly how long?</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.faint }}>{TIME_BANDS[a.timeBand]}</span>
              </div>
              <input type="range" min={0} max={6} step={1} value={a.timeBand} onChange={(e) => updateActivity(i, { timeBand: Number(e.target.value) })} style={{ width: "100%", accentColor: C.faint }} />
            </div>
          );
        })}
      </div>

      <label style={{ fontSize: 14, color: C.body, display: "block", marginBottom: 6 }}>A note to yourself <span style={{ color: C.hint, fontSize: 12 }}>(+{POINTS.reflection.points} pts, min {POINTS.reflection.minWords} words)</span></label>
      {(() => {
        const hint = adaptivePrompt(activities);
        return hint ? (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#eef6f1", border: `0.5px solid ${C.mintBar}`, borderRadius: 9, padding: "9px 12px", marginBottom: 8 }}>
            <i className="ti ti-bulb" style={{ color: C.mintDeep, fontSize: 15, marginTop: 1 }} aria-hidden="true" />
            <span style={{ fontSize: 12.5, color: C.body, lineHeight: 1.45, fontStyle: "italic" }}>{hint}</span>
          </div>
        ) : null;
      })()}
      <textarea value={reflection} onChange={(e) => { setRefl(e.target.value); setSaved(false); }}
        placeholder="Write a few words reflecting on your day…"
        style={{ width: "100%", minHeight: 64, padding: 11, border: `1px solid ${C.line}`, borderRadius: 9, fontSize: 13, fontFamily: SANS, resize: "vertical", boxSizing: "border-box", marginBottom: 14, color: C.ink }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: C.hint }}>This entry: <span style={{ color: C.mintDeep, fontWeight: 600 }}>{base + bonus} pts</span>{bonus > 0 && <span> ({base} + {bonus} streak)</span>}</span>
        <button onClick={() => { onSave(draft); setSaved(true); }} disabled={activities.length === 0}
          style={{ padding: "10px 20px", background: activities.length ? C.mintDeep : C.lineSoft, color: activities.length ? "#fff" : C.hint, border: "none", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: activities.length ? "pointer" : "default", fontFamily: SANS }}>
          {saved ? "Saved ✓" : existing ? "Update today" : "Save today"}
        </button>
      </div>
    </div>
  );
}

// ── Admin panel (v5) ──────────────────────────────────────────────────────
function AdminPanel({ userId }) {
  const [challenges, setChallenges] = useState(null);
  const [title, setTitle] = useState(""); const [description, setDescription] = useState("");
  const [metric, setMetric] = useState("independent_minutes"); const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  async function load() { try { setChallenges(await fetchAdminChallenges()); } catch { setErr("Could not load challenges."); } }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  async function publish() {
    if (!title.trim()) return; setBusy(true); setErr("");
    try {
      const starts = todayKey(); const end = new Date(); end.setDate(end.getDate() + Number(days));
      await createAdminChallenge({ title: title.trim(), description: description.trim(), metric, startsOn: starts, endsOn: end.toISOString().slice(0, 10), userId });
      setTitle(""); setDescription(""); await load();
    } catch (e) { setErr(e.message || "Could not publish."); } finally { setBusy(false); }
  }
  async function remove(id) { try { await deleteAdminChallenge(id); await load(); } catch { setErr("Could not delete."); } }

  // notifications (v10)
  const [notes, setNotes] = useState(null);
  const [nTitle, setNTitle] = useState(""); const [nBody, setNBody] = useState("");
  const [nTarget, setNTarget] = useState(""); const [nType, setNType] = useState(AFFILIATION_TYPES[0]);
  const [nBusy, setNBusy] = useState(false);
  async function loadNotes() { try { setNotes(await fetchAllNotifications()); } catch (e) { console.error(e); } }
  useEffect(() => { loadNotes(); /* eslint-disable-next-line */ }, []);
  async function sendNote() {
    if (!nTitle.trim() || !nBody.trim()) return; setNBusy(true);
    try {
      await createNotification({ title: nTitle.trim(), body: nBody.trim(), targetAffiliation: nTarget || null, userId });
      setNTitle(""); setNBody(""); setNTarget(""); await loadNotes();
    } catch (e) { setErr(e.message || "Could not send."); } finally { setNBusy(false); }
  }
  async function removeNote(id) { try { await deleteNotification(id); await loadNotes(); } catch { setErr("Could not delete notification."); } }

  if (err) return <div style={card}><p style={{ color: C.apricotInk, fontSize: 14 }}>{err}</p></div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={card}>
        <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: C.ink, marginBottom: 2 }}>Publish a challenge</div>
        <p style={{ fontSize: 12, color: C.hint, marginTop: 0, marginBottom: 14 }}>Featured at the top of every student's Competitions tab, shown to everyone.</p>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Challenge title — e.g. AI-free Friday" style={{ ...input, marginBottom: 10 }} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description (optional)" style={{ ...input, minHeight: 56, marginBottom: 10, resize: "vertical" }} />
        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <select value={metric} onChange={(e) => setMetric(e.target.value)} style={{ ...input, width: "auto", flex: 1 }}>
            <option value="independent_minutes">Most independent study</option>
            <option value="points">Most points</option>
          </select>
          <select value={days} onChange={(e) => setDays(e.target.value)} style={{ ...input, width: "auto", flex: 1 }}>
            <option value={7}>1 week</option><option value={14}>2 weeks</option><option value={30}>1 month</option>
          </select>
        </div>
        <button onClick={publish} disabled={!title.trim() || busy} style={{ ...primaryBtn(!!title.trim() && !busy), width: "auto", padding: "10px 20px" }}>{busy ? "Publishing…" : "Publish to everyone"}</button>
      </div>
      <div style={card}>
        <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: C.ink, marginBottom: 14 }}>Published challenges</div>
        {!challenges ? <p style={{ fontSize: 13, color: C.hint }}>Loading…</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {challenges.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, background: C.bone, border: `0.5px solid ${C.line}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: C.hint }}>{c.metric === "points" ? "Most points" : "Most independent study"} · ends {c.ends_on}</div>
                </div>
                <button onClick={() => remove(c.id)} style={{ padding: "8px 14px", borderRadius: 8, border: `0.5px solid ${C.line}`, background: "#fff", color: C.apricotInk, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: SANS }}>Delete</button>
              </div>
            ))}
            {challenges.length === 0 && <p style={{ fontSize: 13, color: C.hint }}>No challenges published yet.</p>}
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: C.ink, marginBottom: 2 }}>Send a notification</div>
        <p style={{ fontSize: 12, color: C.hint, marginTop: 0, marginBottom: 14 }}>Appears in the bell for students. Leave the target as “Everyone” to broadcast.</p>
        <input value={nTitle} onChange={(e) => setNTitle(e.target.value)} placeholder="Notification title" style={{ ...input, marginBottom: 10 }} />
        <textarea value={nBody} onChange={(e) => setNBody(e.target.value)} placeholder="Message" style={{ ...input, minHeight: 60, marginBottom: 10, resize: "vertical" }} />
        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <select value={nTarget ? "targeted" : "all"} onChange={(e) => { if (e.target.value === "all") setNTarget(""); else setNTarget(AFFILIATIONS[nType][0]); }} style={{ ...input, width: "auto", flex: 1 }}>
            <option value="all">Everyone</option>
            <option value="targeted">A specific affiliation</option>
          </select>
          {nTarget && (
            <>
              <select value={nType} onChange={(e) => { setNType(e.target.value); setNTarget(AFFILIATIONS[e.target.value][0]); }} style={{ ...input, width: "auto", flex: 1 }}>
                {AFFILIATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={nTarget} onChange={(e) => setNTarget(e.target.value)} style={{ ...input, width: "100%" }}>
                {AFFILIATIONS[nType].map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </>
          )}
        </div>
        <button onClick={sendNote} disabled={!nTitle.trim() || !nBody.trim() || nBusy} style={{ ...primaryBtn(!!nTitle.trim() && !!nBody.trim() && !nBusy), width: "auto", padding: "10px 20px" }}>{nBusy ? "Sending…" : nTarget ? "Send to affiliation" : "Send to everyone"}</button>
      </div>

      <div style={card}>
        <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: C.ink, marginBottom: 14 }}>Sent notifications</div>
        {!notes ? <p style={{ fontSize: 13, color: C.hint }}>Loading…</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {notes.map((n) => (
              <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, background: C.bone, border: `0.5px solid ${C.line}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: C.body, lineHeight: 1.4 }}>{n.body}</div>
                  <div style={{ fontSize: 11, color: C.hint, marginTop: 3 }}>{n.target_affiliation ? `→ ${n.target_affiliation}` : "→ Everyone"}</div>
                </div>
                <button onClick={() => removeNote(n.id)} style={{ padding: "8px 14px", borderRadius: 8, border: `0.5px solid ${C.line}`, background: "#fff", color: C.apricotInk, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: SANS }}>Delete</button>
              </div>
            ))}
            {notes.length === 0 && <p style={{ fontSize: 13, color: C.hint }}>No notifications sent yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
