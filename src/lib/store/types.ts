import type { Level } from "@/lib/content/schema";

export type Goal = "ielts" | "university" | "professional" | "general";

export interface Profile {
  id: string;
  displayName: string | null;
  email: string | null;
  goals: Goal[];
  selfLevel: Level | null;
  weeklyGoalDays: number;
  audioStorageOptIn: boolean;
  onboardedAt: string | null;
}

export type EventType =
  | "lesson_section_viewed" | "exercise_completed" | "answer_submitted" | "item_saved" | "item_unsaved"
  | "review_completed" | "reading_completed" | "writing_submitted" | "speaking_submitted";

export interface ActivityEvent {
  id: string;
  type: EventType;
  contentType: string | null;
  contentRef: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface Attempt {
  id: string;
  exerciseSlug: string;
  exerciseVersion: number;
  score: number;
  total: number;
  startedAt: string;
  completedAt: string;
}

export interface ResponseRow {
  attemptId: string;
  questionId: string;
  targetRef: string | null;
  response: unknown;
  correct: boolean;
  errorTag: string | null;
  createdAt: string;
}

export type SavedType = "sense" | "custom" | "lesson_section";
export type SavedStatus = "new" | "learning" | "familiar" | "mastered";

export interface SavedItem {
  id: string;
  itemType: SavedType;
  itemRef: string;
  label: string;
  context: string | null;
  sourceRef: string | null;
  status: SavedStatus;
  createdAt: string;
}

export interface ReviewCardRow {
  savedItemId: string;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: string | null;
}

export interface WritingSubmission {
  id: string;
  promptSlug: string;
  body: string;
  wordCount: number;
  secondsSpent: number | null;
  feedback: unknown;
  createdAt: string;
}

export interface SpeakingAttempt {
  id: string;
  promptSlug: string;
  transcript: string;
  durationSeconds: number;
  metrics: Record<string, number>;
  feedback: unknown;
  createdAt: string;
}

export interface LastPosition { href: string; label: string; updatedAt: string }

export interface LearnerStore {
  readonly mode: "supabase" | "demo";
  getProfile(): Promise<Profile | null>;
  updateProfile(patch: Partial<Omit<Profile, "id" | "email">>): Promise<void>;

  logEvent(e: { type: EventType; contentType?: string; contentRef?: string; payload?: Record<string, unknown> }): Promise<void>;
  listEvents(): Promise<ActivityEvent[]>;

  saveAttempt(a: Omit<Attempt, "id" | "completedAt">, responses: Omit<ResponseRow, "attemptId" | "createdAt">[]): Promise<Attempt>;
  listAttempts(): Promise<Attempt[]>;
  listResponses(): Promise<ResponseRow[]>;

  listSaved(): Promise<SavedItem[]>;
  saveItem(i: Pick<SavedItem, "itemType" | "itemRef" | "label"> & Partial<Pick<SavedItem, "context" | "sourceRef">>): Promise<SavedItem>;
  unsaveItem(id: string): Promise<void>;
  setSavedStatus(id: string, status: SavedStatus): Promise<void>;

  listReviewCards(): Promise<ReviewCardRow[]>;
  putReviewCard(c: ReviewCardRow): Promise<void>;
  addReviewLog(l: { savedItemId: string; rating: number; state: number; due: string }): Promise<void>;

  getLastPosition(): Promise<LastPosition | null>;
  setLastPosition(p: { href: string; label: string }): Promise<void>;

  listWriting(): Promise<WritingSubmission[]>;
  listSpeaking(): Promise<SpeakingAttempt[]>;
  /** Demo mode only: in Supabase mode the server route stores submissions. */
  addWritingLocal?(s: Omit<WritingSubmission, "id" | "createdAt">): Promise<WritingSubmission>;
  addSpeakingLocal?(s: Omit<SpeakingAttempt, "id" | "createdAt">): Promise<SpeakingAttempt>;

  exportAll(): Promise<Record<string, unknown>>;
  deleteAccount(): Promise<void>;
  signOut(): Promise<void>;
}
