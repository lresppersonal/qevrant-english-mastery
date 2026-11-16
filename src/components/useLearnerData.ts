"use client";
import { useCallback, useEffect, useState } from "react";
import { useLearner } from "./StoreProvider";
import type { ActivityEvent, Attempt, LastPosition, ResponseRow, ReviewCardRow, SpeakingAttempt, WritingSubmission } from "@/lib/store/types";

export interface LearnerData {
  events: ActivityEvent[];
  responses: ResponseRow[];
  attempts: Attempt[];
  cards: ReviewCardRow[];
  last: LastPosition | null;
  writing: WritingSubmission[];
  speaking: SpeakingAttempt[];
}

export function useLearnerData() {
  const { store, ready } = useLearner();
  const [data, setData] = useState<LearnerData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [events, responses, attempts, cards, last, writing, speaking] = await Promise.all([
        store.listEvents(), store.listResponses(), store.listAttempts(), store.listReviewCards(), store.getLastPosition(), store.listWriting(), store.listSpeaking(),
      ]);
      setData({ events, responses, attempts, cards, last, writing, speaking });
    } catch (e) {
      setError((e as Error).message);
    }
  }, [store]);

  useEffect(() => { if (ready) void load(); }, [ready, load]);
  return { data, error, reload: load };
}
