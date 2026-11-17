"use client";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { LearnerStore, Profile, SavedItem, ReviewCardRow } from "./types";

/** Production store: Supabase Postgres with row-level security (each learner sees only their rows). */
export function createSupabaseStore(): LearnerStore {
  const sb = supabaseBrowser();
  const userId = async () => {
    const { data } = await sb.auth.getUser();
    if (!data.user) throw new Error("Not signed in");
    return data.user.id;
  };
  const check = <T,>(r: { data: T; error: { message: string } | null }) => {
    if (r.error) throw new Error(r.error.message);
    return r.data;
  };
  const mapSaved = (r: Record<string, unknown>): SavedItem => ({
    id: r.id as string, itemType: r.item_type as SavedItem["itemType"], itemRef: r.item_ref as string, label: r.label as string,
    context: (r.context as string) ?? null, sourceRef: (r.source_ref as string) ?? null, status: r.status as SavedItem["status"], createdAt: r.created_at as string,
  });

  const mapListening = (r: Record<string, unknown>) => ({
    id: r.id as string, resourceSlug: r.resource_slug as string, episode: (r.episode as string) ?? null, minutes: r.minutes as number,
    comprehension: r.comprehension as number, notes: (r.notes as string) ?? null, createdAt: r.created_at as string,
  });

  return {
    mode: "supabase",
    async getProfile() {
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) return null;
      const p = check(await sb.from("profiles").select("*").eq("id", auth.user.id).maybeSingle()) as Record<string, unknown> | null;
      if (!p) return null;
      return {
        id: auth.user.id, email: auth.user.email ?? null, displayName: (p.display_name as string) ?? null,
        goals: (p.goals as Profile["goals"]) ?? [], selfLevel: (p.self_level as Profile["selfLevel"]) ?? null,
        weeklyGoalDays: p.weekly_goal_days as number, audioStorageOptIn: !!p.audio_storage_opt_in, onboardedAt: (p.onboarded_at as string) ?? null,
        preferences: (p.preferences as Record<string, unknown>) ?? {},
      };
    },
    async updateProfile(patch) {
      const row: Record<string, unknown> = {};
      if (patch.displayName !== undefined) row.display_name = patch.displayName;
      if (patch.goals !== undefined) row.goals = patch.goals;
      if (patch.selfLevel !== undefined) row.self_level = patch.selfLevel;
      if (patch.weeklyGoalDays !== undefined) row.weekly_goal_days = patch.weeklyGoalDays;
      if (patch.audioStorageOptIn !== undefined) row.audio_storage_opt_in = patch.audioStorageOptIn;
      if (patch.onboardedAt !== undefined) row.onboarded_at = patch.onboardedAt;
      if (patch.preferences !== undefined) row.preferences = patch.preferences;
      check(await sb.from("profiles").update(row).eq("id", await userId()));
    },

    async logEvent(e) {
      check(await sb.from("activity_events").insert({ user_id: await userId(), type: e.type, content_type: e.contentType ?? null, content_ref: e.contentRef ?? null, payload: e.payload ?? {} }));
    },
    async listEvents() {
      const rows = check(await sb.from("activity_events").select("*").order("created_at", { ascending: true }).limit(5000)) as Record<string, unknown>[];
      return rows.map((r) => ({ id: r.id as string, type: r.type as never, contentType: r.content_type as string | null, contentRef: r.content_ref as string | null, payload: r.payload as Record<string, unknown>, createdAt: r.created_at as string }));
    },

    async saveAttempt(a, responses) {
      const uidv = await userId();
      const row = check(await sb.from("attempts").insert({ user_id: uidv, exercise_slug: a.exerciseSlug, exercise_version: a.exerciseVersion, score: a.score, total: a.total, started_at: a.startedAt }).select().single()) as Record<string, unknown>;
      if (responses.length)
        check(await sb.from("responses").insert(responses.map((r) => ({ attempt_id: row.id, user_id: uidv, question_id: r.questionId, target_ref: r.targetRef, response: r.response, correct: r.correct, error_tag: r.errorTag }))));
      return { ...a, id: row.id as string, completedAt: row.completed_at as string };
    },
    async listAttempts() {
      const rows = check(await sb.from("attempts").select("*").order("completed_at")) as Record<string, unknown>[];
      return rows.map((r) => ({ id: r.id as string, exerciseSlug: r.exercise_slug as string, exerciseVersion: r.exercise_version as number, score: r.score as number, total: r.total as number, startedAt: r.started_at as string, completedAt: r.completed_at as string }));
    },
    async listResponses() {
      const rows = check(await sb.from("responses").select("*").order("created_at").limit(10000)) as Record<string, unknown>[];
      return rows.map((r) => ({ attemptId: r.attempt_id as string, questionId: r.question_id as string, targetRef: r.target_ref as string | null, response: r.response, correct: r.correct as boolean, errorTag: r.error_tag as string | null, createdAt: r.created_at as string }));
    },

    async listSaved() {
      return (check(await sb.from("saved_items").select("*").order("created_at", { ascending: false })) as Record<string, unknown>[]).map(mapSaved);
    },
    async saveItem(i) {
      const r = check(await sb.from("saved_items").upsert(
        { user_id: await userId(), item_type: i.itemType, item_ref: i.itemRef, label: i.label, context: i.context ?? null, source_ref: i.sourceRef ?? null },
        { onConflict: "user_id,item_type,item_ref", ignoreDuplicates: false },
      ).select().single()) as Record<string, unknown>;
      return mapSaved(r);
    },
    async unsaveItem(id) { check(await sb.from("saved_items").delete().eq("id", id)); },
    async setSavedStatus(id, status) { check(await sb.from("saved_items").update({ status }).eq("id", id)); },

    async listReviewCards() {
      const rows = check(await sb.from("review_cards").select("*")) as Record<string, unknown>[];
      return rows.map((r): ReviewCardRow => ({ savedItemId: r.saved_item_id as string, due: r.due as string, stability: r.stability as number, difficulty: r.difficulty as number, elapsedDays: r.elapsed_days as number, scheduledDays: r.scheduled_days as number, learningSteps: r.learning_steps as number, reps: r.reps as number, lapses: r.lapses as number, state: r.state as number, lastReview: r.last_review as string | null }));
    },
    async putReviewCard(c) {
      check(await sb.from("review_cards").upsert({ saved_item_id: c.savedItemId, user_id: await userId(), due: c.due, stability: c.stability, difficulty: c.difficulty, elapsed_days: c.elapsedDays, scheduled_days: c.scheduledDays, learning_steps: c.learningSteps, reps: c.reps, lapses: c.lapses, state: c.state, last_review: c.lastReview }));
    },
    async addReviewLog(l) {
      check(await sb.from("review_logs").insert({ user_id: await userId(), saved_item_id: l.savedItemId, rating: l.rating, state: l.state, due: l.due }));
    },

    async listReviewLogs() {
      const rows = check(await sb.from("review_logs").select("*").order("reviewed_at").limit(10000)) as Record<string, unknown>[];
      return rows.map((r) => ({ savedItemId: r.saved_item_id as string, rating: r.rating as number, state: r.state as number, due: r.due as string, reviewedAt: (r.reviewed_at ?? r.created_at) as string }));
    },

    async addListening(l) {
      const r = check(await sb.from("listening_logs").insert({ user_id: await userId(), resource_slug: l.resourceSlug, episode: l.episode, minutes: l.minutes, comprehension: l.comprehension, notes: l.notes }).select().single()) as Record<string, unknown>;
      return mapListening(r);
    },
    async listListening() {
      return (check(await sb.from("listening_logs").select("*").order("created_at", { ascending: false })) as Record<string, unknown>[]).map(mapListening);
    },
    async deleteListening(id) { check(await sb.from("listening_logs").delete().eq("id", id)); },

    async saveWeeklyReport(r) {
      check(await sb.from("weekly_reports").upsert({ user_id: await userId(), week_start: r.weekStart, overall: r.overall, report: r.report }, { onConflict: "user_id,week_start" }));
    },
    async listWeeklyReports() {
      const rows = check(await sb.from("weekly_reports").select("*").order("week_start", { ascending: false })) as Record<string, unknown>[];
      return rows.map((r) => ({ id: r.id as string, weekStart: r.week_start as string, overall: r.overall as number | null, report: r.report, createdAt: r.created_at as string }));
    },

    async getLastPosition() {
      const r = check(await sb.from("last_positions").select("*").maybeSingle()) as Record<string, unknown> | null;
      return r ? { href: r.href as string, label: r.label as string, updatedAt: r.updated_at as string } : null;
    },
    async setLastPosition(p) {
      check(await sb.from("last_positions").upsert({ user_id: await userId(), href: p.href, label: p.label, updated_at: new Date().toISOString() }));
    },

    async listWriting() {
      const rows = check(await sb.from("writing_submissions").select("*").order("created_at", { ascending: false })) as Record<string, unknown>[];
      return rows.map((r) => ({ id: r.id as string, promptSlug: r.prompt_slug as string, body: r.body as string, wordCount: r.word_count as number, secondsSpent: r.seconds_spent as number | null, feedback: r.feedback, createdAt: r.created_at as string }));
    },
    async listSpeaking() {
      const rows = check(await sb.from("speaking_attempts").select("*").order("created_at", { ascending: false })) as Record<string, unknown>[];
      return rows.map((r) => ({ id: r.id as string, promptSlug: r.prompt_slug as string, transcript: r.transcript as string, durationSeconds: r.duration_seconds as number, metrics: r.metrics as Record<string, number>, feedback: r.feedback, createdAt: r.created_at as string }));
    },

    async deleteWriting(id) { check(await sb.from("writing_submissions").delete().eq("id", id)); },
    async deleteSpeaking(id) {
      const row = check(await sb.from("speaking_attempts").select("audio_path").eq("id", id).maybeSingle()) as { audio_path: string | null } | null;
      if (row?.audio_path) await sb.storage.from("speaking-audio").remove([row.audio_path]);
      check(await sb.from("speaking_attempts").delete().eq("id", id));
    },

    async exportAll() {
      const tables = ["profiles", "activity_events", "attempts", "responses", "saved_items", "review_cards", "review_logs", "last_positions", "writing_submissions", "speaking_attempts", "listening_logs", "weekly_reports"];
      const out: Record<string, unknown> = { exportedAt: new Date().toISOString() };
      for (const t of tables) out[t] = check(await sb.from(t).select("*"));
      return out;
    },
    async deleteAccount() {
      // Storage files are not removed by the database cascade, so delete recordings first.
      const uidv = await userId();
      const { data: files } = await sb.storage.from("speaking-audio").list(uidv, { limit: 1000 });
      if (files?.length) await sb.storage.from("speaking-audio").remove(files.map((f) => `${uidv}/${f.name}`));
      check(await sb.rpc("delete_my_account"));
      await sb.auth.signOut();
    },
    async signOut() { await sb.auth.signOut(); },
  };
}
