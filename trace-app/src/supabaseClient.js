import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// University of Malta academic entities, grouped by type for a two-level picker.
// Source: um.edu.mt/academicentities (Faculties, Schools, Institutes, Centres).
export const AFFILIATIONS = {
  Faculty: [
    "Faculty of Arts",
    "Faculty for the Built Environment",
    "Faculty of Dental Surgery",
    "Faculty of Economics, Management & Accountancy",
    "Faculty of Education",
    "Faculty of Engineering",
    "Faculty of Health Sciences",
    "Faculty of Information & Communication Technology",
    "Faculty of Laws",
    "Faculty of Media & Knowledge Sciences",
    "Faculty of Medicine & Surgery",
    "Faculty of Science",
    "Faculty for Social Wellbeing",
    "Faculty of Theology",
  ],
  School: [
    "Doctoral School",
    "International School for Foundation Studies",
    "School of Performing Arts",
  ],
  Institute: [
    "Institute of Aerospace Technologies",
    "Institute of Anglo-Italian Studies",
    "Institute for Climate Change & Sustainable Development",
    "Confucius Institute",
    "Institute of Digital Games",
    "Institute of Earth Systems",
    "Edward de Bono Institute for Creative Thinking & Innovation",
    "Institute for European Studies",
    "Islands & Small States Institute",
    "Institute of Linguistics & Language Technology",
    "Institute of Maltese Studies",
    "Mediterranean Academy of Diplomatic Studies",
    "Mediterranean Institute",
    "Institute for Physical Education & Sport",
    "Institute of Space Sciences & Astronomy",
    "Institute for Sustainable Energy",
  ],
  Centre: [
    "Centre for Academic Literacies & English Communication Skills",
    "Centre for Biomedical Cybernetics",
    "Centre for Distributed Ledger Technologies",
    "Centre for Entrepreneurship & Business Incubation",
    "Centre for Environmental Education & Research",
    "Centre for Labour Studies",
    "Centre for Liberal Arts & Sciences",
    "Centre for Molecular Medicine & Biobanking",
    "Centre for Resilience & Socio-Emotional Health",
    "Centre for the Study & Practice of Conflict Resolution",
    "Centre for Traditional Chinese Medicine",
    "University Semiconductors Competence Centre",
  ],
};

export const AFFILIATION_TYPES = Object.keys(AFFILIATIONS); // Faculty, School, Institute, Centre

// ── Auth ──────────────────────────────────────────────────────────────────
export async function signUp({ email, password }) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(cb) {
  return supabase.auth.onAuthStateChange((_event, session) => cb(session));
}

// ── Profile ─────────────────────────────────────────────────────────────
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createProfile({ userId, alias, affiliationType, affiliation, participantId, consented, companion }) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, alias, affiliation_type: affiliationType, affiliation, participant_id: participantId, consented, companion },
      { onConflict: "id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Entries ─────────────────────────────────────────────────────────────
export async function fetchEntries(userId) {
  const { data, error } = await supabase.from("entries").select("*").eq("user_id", userId);
  if (error) throw error;
  const map = {};
  (data || []).forEach((row) => {
    map[row.entry_date] = {
      activities: row.activities || [],
      independence: row.independence,
      reflection: row.reflection || "",
      points: row.points,
    };
  });
  return map;
}

export async function saveEntry(userId, dateKey, entry) {
  const { error } = await supabase.from("entries").upsert(
    {
      user_id: userId,
      entry_date: dateKey,
      activities: entry.activities || [],
      independence: entry.independence ?? null,
      reflection: entry.reflection,
      points: entry.points,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,entry_date" }
  );
  if (error) throw error;
}

// ── Community (AI-free; reads the community_scores view only) ─────────────
export async function fetchCommunity() {
  const { data, error } = await supabase
    .from("community_scores")
    .select("*")
    .order("total_points", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ── Competitions ──────────────────────────────────────────────────────────
export async function fetchCompetitions() {
  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .order("ends_on", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createCompetition({ name, metric, startsOn, endsOn, userId }) {
  const { data, error } = await supabase
    .from("competitions")
    .insert({ name, metric, starts_on: startsOn, ends_on: endsOn, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function joinCompetition(competitionId, userId) {
  const { error } = await supabase
    .from("competition_members")
    .upsert({ competition_id: competitionId, user_id: userId }, { onConflict: "competition_id,user_id" });
  if (error) throw error;
}

export async function fetchMyCompetitions(userId) {
  const { data, error } = await supabase
    .from("competition_members")
    .select("competition_id")
    .eq("user_id", userId);
  if (error) throw error;
  return new Set((data || []).map((r) => r.competition_id));
}

// ── Admin challenges (v5) ──────────────────────────────────────────────────
export async function fetchAdminChallenges() {
  const { data, error } = await supabase
    .from("admin_challenges")
    .select("*")
    .order("ends_on", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createAdminChallenge({ title, description, metric, startsOn, endsOn, userId }) {
  const { data, error } = await supabase
    .from("admin_challenges")
    .insert({ title, description, metric, starts_on: startsOn, ends_on: endsOn, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAdminChallenge(id) {
  const { error } = await supabase.from("admin_challenges").delete().eq("id", id);
  if (error) throw error;
}

// ── Notifications (v10) ────────────────────────────────────────────────────
// Returns notifications visible to this user (broadcast OR matching their
// affiliation), each annotated with `read` (bool). Newest first.
export async function fetchNotifications(userId, affiliation) {
  const { data: notes, error } = await supabase
    .from("notifications")
    .select("*")
    .or(`target_affiliation.is.null,target_affiliation.eq.${affiliation}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const { data: reads } = await supabase
    .from("notification_reads")
    .select("notification_id")
    .eq("user_id", userId);
  const readSet = new Set((reads || []).map((r) => r.notification_id));
  return (notes || []).map((n) => ({ ...n, read: readSet.has(n.id) }));
}

export async function markNotificationsRead(userId, ids) {
  if (!ids || ids.length === 0) return;
  const rows = ids.map((id) => ({ notification_id: id, user_id: userId }));
  const { error } = await supabase.from("notification_reads").upsert(rows, { onConflict: "notification_id,user_id" });
  if (error) throw error;
}

export async function createNotification({ title, body, targetAffiliation, userId }) {
  const { data, error } = await supabase
    .from("notifications")
    .insert({ title, body, target_affiliation: targetAffiliation || null, created_by: userId })
    .select().single();
  if (error) throw error;
  return data;
}

export async function fetchAllNotifications() {
  const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function deleteNotification(id) {
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) throw error;
}

// ── Tour (v11) ─────────────────────────────────────────────────────────────
export async function markTourDone(userId) {
  const { error } = await supabase.from("profiles").update({ tour_done: true }).eq("id", userId);
  if (error) throw error;
}
