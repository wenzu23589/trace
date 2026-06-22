import { createClient } from "@supabase/supabase-js";

// ── Configuration ───────────────────────────────────────────────────────
// These come from environment variables at build time (Vite injects any var
// prefixed with VITE_). Set them in a .env file locally and as GitHub Actions
// secrets for deployment. They are SAFE to expose in the browser bundle —
// the anon key only grants what your Row Level Security policies allow.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ── Participant (registration) ──────────────────────────────────────────
// We keep a local pointer to "who is logged in on this device" in
// localStorage, but all entry data lives centrally in Supabase so the
// research team can export and analyse it.

const LOCAL_PARTICIPANT_KEY = "trace:participant";

export function getLocalParticipant() {
  try {
    const raw = localStorage.getItem(LOCAL_PARTICIPANT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setLocalParticipant(p) {
  localStorage.setItem(LOCAL_PARTICIPANT_KEY, JSON.stringify(p));
}

export function clearLocalParticipant() {
  localStorage.removeItem(LOCAL_PARTICIPANT_KEY);
}

// Register or re-attach a participant. participant_id is the study code
// (e.g. "UM-0421"). Upsert means returning participants on a new device
// simply re-link to their existing record.
export async function registerParticipant({ participantId, name }) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("participants")
    .upsert(
      { participant_id: participantId, name, joined_at: new Date().toISOString() },
      { onConflict: "participant_id", ignoreDuplicates: false }
    )
    .select()
    .single();
  if (error) throw error;
  const p = { id: data.participant_id, name: data.name, joined: data.joined_at };
  setLocalParticipant(p);
  return p;
}

// ── Daily entries ─────────────────────────────────────────────────────────
// One row per participant per date. Upsert lets a student update today's log.
export async function fetchEntries(participantId) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("participant_id", participantId);
  if (error) throw error;
  // shape into a { "YYYY-MM-DD": {...} } map the UI expects
  const map = {};
  (data || []).forEach((row) => {
    map[row.entry_date] = {
      aiMinutes: row.ai_minutes,
      independentMinutes: row.independent_minutes,
      independentTasks: row.independent_tasks,
      reflection: row.reflection || "",
      points: row.points,
    };
  });
  return map;
}

export async function saveEntry(participantId, dateKey, entry) {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from("entries").upsert(
    {
      participant_id: participantId,
      entry_date: dateKey,
      ai_minutes: entry.aiMinutes,
      independent_minutes: entry.independentMinutes,
      independent_tasks: entry.independentTasks,
      reflection: entry.reflection,
      points: entry.points,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "participant_id,entry_date" }
  );
  if (error) throw error;
}
