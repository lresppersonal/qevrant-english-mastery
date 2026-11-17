"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isDemoMode } from "@/lib/supabase/config";
import { createDemoStore } from "@/lib/store/demo";
import { createSupabaseStore } from "@/lib/store/supabase";
import type { LearnerStore, Profile, SavedItem, SavedType } from "@/lib/store/types";

interface Ctx {
  store: LearnerStore;
  profile: Profile | null;
  saved: SavedItem[];
  ready: boolean;
  refresh: () => Promise<void>;
  isSaved: (type: SavedType, ref: string) => SavedItem | undefined;
  toggleSave: (i: { itemType: SavedType; itemRef: string; label: string; context?: string | null; sourceRef?: string | null }) => Promise<boolean>;
  toast: (msg: string) => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const store = useMemo(() => (isDemoMode ? createDemoStore() : createSupabaseStore()), []);
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
    <StoreCtx.Provider value={{ store, profile, saved, ready, refresh, isSaved, toggleSave, toast }}>
      {children}
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
