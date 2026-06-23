import React, { useState, useEffect, useMemo } from "react";
import Avatar from "./Avatar.jsx";
import {
  supabaseConfigured, AFFILIATIONS, AFFILIATION_TYPES,
  signUp, signIn, signOut, getSession, onAuthChange,
  getProfile, createProfile,
  fetchEntries, saveEntry,
  fetchCommunity, fetchCompetitions, createCompetition, joinCompetition, fetchMyCompetitions,
  fetchAdminChallenges, createAdminChallenge, deleteAdminChallenge,
} from "./supabaseClient.js";
import { POINTS, DAILY_MAX, MILESTONES, basePointsForEntry, streakBonus, pointsForEntry, independentShare, streakOf, STREAKS } from "./points.js";

// ── Fresh palette: mint-sage + apricot on bone ───────────────────────────
const C = {
  bone: "#FAF8F3", surface: "#ffffff", line: "#ece7da", lineSoft: "#f0ece2",
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

// ── Balance bars (weekly, with % independent) ─────────────────────────────
function BalanceBars({ entries }) {
  const days = useMemo(() => {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10); const e = entries[k];
      const ind = e?.independentMinutes || 0, ai = e?.aiMinutes || 0, total = ind + ai;
      out.push({ k, ind, ai, total, share: total ? Math.round((ind / total) * 100) : null,
        label: d.toLocaleDateString(undefined, { weekday: "short" }) });
    }
    return out;
  }, [entries]);
  const shares = days.filter((d) => d.share !== null);
  const avg = shares.length ? Math.round(shares.reduce((s, d) => s + d.share, 0) / shares.length) : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
        <div style={{ fontSize: 13, color: C.faint }}>This week's balance</div>
        <div style={{ fontSize: 12, color: C.hint }}>% independent</div>
      </div>
      <div style={{ fontSize: 11, color: C.hint, marginBottom: 16 }}>how much of each day's study was your own effort</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {days.map((d) => {
          const indPct = d.total ? (d.ind / d.total) * 100 : 0;
          const aiPct = d.total ? (d.ai / d.total) * 100 : 0;
          return (
            <div key={d.k} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, color: C.faint, width: 32 }}>{d.label}</span>
              <div style={{ flex: 1, display: "flex", height: 16, borderRadius: 8, overflow: "hidden", background: C.lineSoft }}>
                <div style={{ width: `${indPct}%`, background: C.mintBar }} />
                <div style={{ width: `${aiPct}%`, background: C.apricotSoft }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: d.share === null ? C.hint : C.mintDeep, width: 38, textAlign: "right" }}>
                {d.share === null ? "—" : `${d.share}%`}
              </span>
              <span style={{ fontSize: 11, color: C.hint, width: 66, textAlign: "right" }}>
                {d.total ? `${d.ind} / ${d.total}m` : ""}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `0.5px solid ${C.line}`, marginTop: 16, paddingTop: 14 }}>
        <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.faint }}>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.mintBar, borderRadius: 3, marginRight: 5 }} />Independent</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, background: C.apricotSoft, borderRadius: 3, marginRight: 5 }} />AI</span>
        </div>
        {avg !== null && <div style={{ fontSize: 12, color: C.faint }}>Week average <span style={{ fontWeight: 600, color: C.mintDeep }}>{avg}% independent</span></div>}
      </div>
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
    let weekIndependent = 0, aiToday = entries[todayKey()]?.aiMinutes || 0, tasksToday = entries[todayKey()]?.independentTasks || 0;
    keys.forEach((k) => { if (daysBetween(k, todayKey()) < 7) weekIndependent += entries[k].independentMinutes || 0; });
    const streaks = {
      logging: streakOf(entries, STREAKS.logging.test),
      independent: streakOf(entries, STREAKS.independent.test),
      reflection: streakOf(entries, STREAKS.reflection.test),
    };
    return { totalPoints, streak, weekIndependent, aiToday, tasksToday, streaks };
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
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 600, color: C.mintDeep }}>{stats.totalPoints}</div>
          <div style={lbl}>points</div>
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
            <Tile icon="ti-book" tint={C.mintDeep} label="Independent" value={stats.weekIndependent} unit="min/wk" />
            <Tile icon="ti-robot" tint={C.apricotInk} label="AI today" value={stats.aiToday} unit="min" />
            <Tile icon="ti-checkbox" tint={C.mintDeep} label="Tasks solo" value={stats.tasksToday} unit="" />
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

          <DailyLog existing={today} streak={stats.streak}
            onSave={async (entry) => {
              const pts = pointsForEntry(entry, today ? stats.streak : stats.streak + 1);
              const withPoints = { ...entry, points: pts };
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
  async function submit() {
    setBusy(true); setMsg("");
    try { const p = await createProfile({ userId, alias: alias.trim(), affiliationType: affType, affiliation, participantId: participantId.trim(), consented: consent }); onDone(p); }
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
                <div style={{ fontSize: 11, color: C.hint }}>{r.total_independent_minutes} min independent</div>
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

// ── Daily log ─────────────────────────────────────────────────────────────
function DailyLog({ existing, streak, onSave }) {
  const [aiMinutes, setAi] = useState(existing?.aiMinutes ?? 0);
  const [independentMinutes, setInd] = useState(existing?.independentMinutes ?? 0);
  const [independentTasks, setTasks] = useState(existing?.independentTasks ?? 0);
  const [reflection, setRefl] = useState(existing?.reflection ?? "");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setAi(existing?.aiMinutes ?? 0); setInd(existing?.independentMinutes ?? 0);
    setTasks(existing?.independentTasks ?? 0); setRefl(existing?.reflection ?? "");
  }, [existing]);

  const draft = { aiMinutes, independentMinutes, independentTasks, reflection };
  const base = basePointsForEntry(draft);
  const bonus = streakBonus(existing ? streak : streak + 1);
  const share = independentShare(draft);

  const slider = (label, value, set, color) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 14, color: C.body }}>{label}</span>
        <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, color }}>{value} min</span>
      </div>
      <input type="range" min={0} max={240} step={5} value={value} onChange={(e) => { set(Number(e.target.value)); setSaved(false); }} style={{ width: "100%", accentColor: color }} />
    </div>
  );
  const stepBtn = { width: 40, height: 36, border: `0.5px solid ${C.line}`, background: "#fff", borderRadius: 8, fontSize: 18, cursor: "pointer", color: C.body };

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: C.ink }}>{existing ? "Today's log" : "Log today"}</div>
        {share !== null && <span style={{ fontSize: 12, color: C.mintDeep, fontWeight: 600 }}>{share}% independent</span>}
      </div>
      {slider("Time using AI tools", aiMinutes, setAi, C.apricot)}
      {slider("Independent study time", independentMinutes, setInd, C.mint)}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 14, color: C.body }}>Tasks completed without AI</span>
          <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: C.mint }}>{independentTasks}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setTasks(Math.max(0, independentTasks - 1)); setSaved(false); }} style={stepBtn}>–</button>
          <button onClick={() => { setTasks(independentTasks + 1); setSaved(false); }} style={stepBtn}>+</button>
        </div>
      </div>
      <label style={{ fontSize: 14, color: C.body, display: "block", marginBottom: 6 }}>A note to yourself <span style={{ color: C.hint, fontSize: 12 }}>(+{POINTS.reflection.points} pts, min {POINTS.reflection.minWords} words)</span></label>
      <textarea value={reflection} onChange={(e) => { setRefl(e.target.value); setSaved(false); }}
        placeholder="When did AI help today, and when might you have leaned on it too quickly?"
        style={{ width: "100%", minHeight: 64, padding: 11, border: `1px solid ${C.line}`, borderRadius: 9, fontSize: 13, fontFamily: SANS, resize: "vertical", boxSizing: "border-box", marginBottom: 14, color: C.ink, fontStyle: reflection ? "normal" : "italic" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: C.hint }}>This entry: <span style={{ color: C.mintDeep, fontWeight: 600 }}>{base + bonus} pts</span>{bonus > 0 && <span> ({base} + {bonus} streak)</span>}</span>
        <button onClick={() => { onSave(draft); setSaved(true); }} style={{ padding: "10px 20px", background: C.mintDeep, color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: SANS }}>{saved ? "Saved ✓" : existing ? "Update today" : "Save today"}</button>
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
    </div>
  );
}
