"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { isDemoMode } from "@/lib/supabase/config";
import { createDemoStore } from "@/lib/store/demo";
import { createSupabaseStore } from "@/lib/store/supabase";
import type { ActivityEvent, LearnerStore, Profile, SavedItem, SavedType } from "@/lib/store/types";
import { streakState, DEFAULT_DAILY_GOAL, type StreakState } from "@/lib/streak";
import { StreakCelebration } from "./StreakCelebration";

interface Ctx {
  store: LearnerStore;
  profile: Profile | null;
  saved: SavedItem[];
  ready: boolean;
  refresh: () => Promise<void>;
  isSaved: (type: SavedType, ref: string) => SavedItem | undefined;
  toggleSave: (i: { itemType: SavedType; itemRef: string; label: string; context?: string | null; sourceRef?: string | null }) => Promise<boolean>;
  toast: (msg: string) => void;
  /** Streak and today's goal, recomputed after every logged activity. Null until loaded. */
  streak: StreakState | null;
}

export const dailyGoalOf = (p: Profile | null) => {
  const g = Number((p?.preferences as { dailyGoal?: unknown } | undefined)?.dailyGoal);
  return Number.isFinite(g) && g >= 1 && g <= 20 ? g : DEFAULT_DAILY_GOAL;
};

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const raw = useMemo(() => (isDemoMode ? createDemoStore() : createSupabaseStore()), []);
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const loadEvents = useCallback(() => raw.listEvents().then((list) => setEvents([...list])).catch(() => {}), [raw]);
  // Every logged activity refreshes the streak, wherever in the app it happens.
  const store = useMemo(() => new Proxy(raw, {
    get(target, prop, receiver) {
      const v = Reflect.get(target, prop, receiver);
      if (prop === "logEvent") return async (...args: Parameters<LearnerStore["logEvent"]>) => { const r = await (v as LearnerStore["logEvent"]).apply(target, args); void loadEvents(); return r; };
      return typeof v === "function" ? v.bind(target) : v;
    },
  }) as LearnerStore, [raw, loadEvents]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([store.getProfile(), store.listSaved()]);
      setProfile(p);
      setSaved(s);
    } catch {
      setProfile(null);
      setSaved([]);
    } finally {
      setReady(true);
    }
  }, [store]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (ready && profile) void loadEvents(); }, [ready, profile, loadEvents]);

  const goal = dailyGoalOf(profile);
  const streak = useMemo(() => (events ? streakState(events, goal) : null), [events, goal]);
  // Celebrate only a change seen in this session (first activity of the day, or daily goal reached), never on page load.
  const prev = useRef<StreakState | null>(null);
  const [celebration, setCelebration] = useState<{ kind: "extended" | "goal"; s: StreakState } | null>(null);
  useEffect(() => {
    const p = prev.current;
    prev.current = streak;
    if (!p || !streak) return;
    if (!p.studiedToday && streak.studiedToday) setCelebration({ kind: "extended", s: streak });
    else if (!p.goalMet && streak.goalMet) setCelebration({ kind: "goal", s: streak });
  }, [streak]);

  const toast = useCallback((msg: string) => {
    setMessage(msg);
    window.setTimeout(() => setMessage((m) => (m === msg ? null : m)), 2600);
  }, []);

  const isSaved = useCallback((type: SavedType, ref: string) => saved.find((s) => s.itemType === type && s.itemRef === ref), [saved]);

  const toggleSave: Ctx["toggleSave"] = useCallback(async (i) => {
    const existing = saved.find((s) => s.itemType === i.itemType && s.itemRef === i.itemRef);
    try {
      if (existing) {
        await store.unsaveItem(existing.id);
        await store.logEvent({ type: "item_unsaved", contentType: i.itemType, contentRef: i.itemRef });
        setSaved((list) => list.filter((s) => s.id !== existing.id));
        toast(`Removed “${i.label}” from your library`);
        return false;
      }
      const item = await store.saveItem(i);
      await store.logEvent({ type: "item_saved", contentType: i.itemType, contentRef: i.itemRef, payload: { source: i.sourceRef ?? null } });
      setSaved((list) => [item, ...list.filter((s) => s.id !== item.id)]);
      toast(`Saved “${i.label}” to Personal Vocabulary`);
      return true;
    } catch (e) {
      toast(`Couldn't save: ${(e as Error).message}`);
      return !!existing;
    }
  }, [saved, store, toast]);

  return (
    <StoreCtx.Provider value={{ store, profile, saved, ready, refresh, isSaved, toggleSave, toast, streak }}>
      {children}
      {celebration && <StreakCelebration key={`${celebration.kind}-${celebration.s.streak}`} kind={celebration.kind} s={celebration.s} onDone={() => setCelebration(null)} />}
      <div aria-live="polite" className="toast-pos pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4">
        {message && <div key={message} className="anim-toast pointer-events-auto rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-bg shadow-[var(--shadow-lift)]">{message}</div>}
      </div>
    </StoreCtx.Provider>
  );
}

export function useLearner() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useLearner must be used inside StoreProvider");
  return ctx;
}
