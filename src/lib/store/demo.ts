"use client";
import type {
  LearnerStore, Profile, ActivityEvent, Attempt, ResponseRow, SavedItem, ReviewCardRow,
  WritingSubmission, SpeakingAttempt, LastPosition, ListeningLog, WeeklyReportRow, EssayDraft,
} from "./types";

/**
 * Demo mode store: used only when Supabase is not configured. All data stays in this
 * browser's localStorage. The UI shows a persistent "Demo mode" banner whenever it is active.
 */
const KEY = "qevrant.em.demo.v1";

interface DemoDb {
  profile: Profile;
  events: ActivityEvent[];
  attempts: Attempt[];
  responses: ResponseRow[];
  saved: SavedItem[];
  cards: ReviewCardRow[];
  logs: { savedItemId: string; rating: number; state: number; due: string; reviewedAt: string }[];
  last: LastPosition | null;
  writing: WritingSubmission[];
  speaking: SpeakingAttempt[];
  listening: ListeningLog[];
  reports: WeeklyReportRow[];
  drafts?: Record<string, EssayDraft>;
}

const fresh = (): DemoDb => ({
  profile: { id: "demo-learner", displayName: null, email: null, goals: [], selfLevel: null, weeklyGoalDays: 4, audioStorageOptIn: false, onboardedAt: null, preferences: {} },
  events: [], attempts: [], responses: [], saved: [], cards: [], logs: [], last: null, writing: [], speaking: [], listening: [], reports: [],
});

function load(): DemoDb {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...fresh(), ...JSON.parse(raw) } : fresh();
  } catch {
    return fresh();
  }
}
function save(db: DemoDb) {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage full or blocked */ }
}
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export function createDemoStore(): LearnerStore {
  const mutate = <T,>(fn: (db: DemoDb) => T): T => { const db = load(); const r = fn(db); save(db); return r; };
  return {
    mode: "demo",
    async getProfile() { return load().profile; },
    async updateProfile(patch) { mutate((db) => { db.profile = { ...db.profile, ...patch }; }); },

    async logEvent(e) {
      mutate((db) => { db.events.push({ id: uid(), type: e.type, contentType: e.contentType ?? null, contentRef: e.contentRef ?? null, payload: e.payload ?? {}, createdAt: now() }); });
    },
    async listEvents() { return load().events; },

    async saveAttempt(a, responses) {
      return mutate((db) => {
        const attempt: Attempt = { ...a, id: uid(), completedAt: now() };
        db.attempts.push(attempt);
        for (const r of responses) db.responses.push({ ...r, attemptId: attempt.id, createdAt: attempt.completedAt });
        return attempt;
      });
    },
    async listAttempts() { return load().attempts; },
    async listResponses() { return load().responses; },

    async listSaved() { return load().saved; },
    async saveItem(i) {
      return mutate((db) => {
        const existing = db.saved.find((s) => s.itemType === i.itemType && s.itemRef === i.itemRef);
        if (existing) return existing;
        const item: SavedItem = { id: uid(), itemType: i.itemType, itemRef: i.itemRef, label: i.label, context: i.context ?? null, sourceRef: i.sourceRef ?? null, status: "new", createdAt: now() };
        db.saved.push(item);
        return item;
      });
    },
    async unsaveItem(id) { mutate((db) => { db.saved = db.saved.filter((s) => s.id !== id); db.cards = db.cards.filter((c) => c.savedItemId !== id); }); },
    async setSavedStatus(id, status) { mutate((db) => { const s = db.saved.find((x) => x.id === id); if (s) s.status = status; }); },

    async listReviewCards() { return load().cards; },
    async putReviewCard(c) { mutate((db) => { db.cards = db.cards.filter((x) => x.savedItemId !== c.savedItemId); db.cards.push(c); }); },
    async addReviewLog(l) { mutate((db) => { db.logs.push({ ...l, reviewedAt: now() }); }); },
    async listReviewLogs() { return load().logs; },

    async addListening(l) { return mutate((db) => { const row: ListeningLog = { ...l, id: uid(), createdAt: now() }; db.listening.push(row); return row; }); },
    async listListening() { return [...load().listening].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
    async deleteListening(id) { mutate((db) => { db.listening = db.listening.filter((x) => x.id !== id); }); },

    async saveWeeklyReport(r) {
      mutate((db) => {
        db.reports = db.reports.filter((x) => x.weekStart !== r.weekStart);
        db.reports.push({ id: uid(), weekStart: r.weekStart, overall: r.overall, report: r.report, createdAt: now() });
      });
    },
    async listWeeklyReports() { return [...load().reports].sort((a, b) => b.weekStart.localeCompare(a.weekStart)); },

    async getLastPosition() { return load().last; },
    async setLastPosition(p) { mutate((db) => { db.last = { ...p, updatedAt: now() }; }); },

    async listWriting() { return load().writing; },
    async listSpeaking() { return load().speaking; },
    async addWritingLocal(s) { return mutate((db) => { const row = { ...s, id: uid(), createdAt: now() }; db.writing.push(row); return row; }); },
    async addSpeakingLocal(s) { return mutate((db) => { const row = { ...s, id: uid(), createdAt: now() }; db.speaking.push(row); return row; }); },

    async updateWritingLocal(id, patch) { mutate((db) => { const w = db.writing.find((x) => x.id === id); if (w) Object.assign(w, patch); }); },
    async getDraft(slug) { return load().drafts?.[slug] ?? null; },
    async saveDraft(slug, body) { mutate((db) => { db.drafts = { ...(db.drafts ?? {}), [slug]: { promptSlug: slug, body, updatedAt: now() } }; }); },
    async listDrafts() { return Object.values(load().drafts ?? {}).filter((d) => d.body.trim()); },
    async deleteWriting(id) { mutate((db) => { db.writing = db.writing.filter((x) => x.id !== id); }); },
    async deleteSpeaking(id) { mutate((db) => { db.speaking = db.speaking.filter((x) => x.id !== id); }); },

    async exportAll() { return { exportedAt: now(), mode: "demo", ...load() }; },
    async deleteAccount() { localStorage.removeItem(KEY); },
    async signOut() { /* nothing to do in demo mode */ },
  };
}
