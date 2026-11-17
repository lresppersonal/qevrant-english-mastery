/**
 * Drift-free countdown based on wall-clock time, with pause/resume.
 * The UI polls `remainingMs(now)`; nothing depends on setInterval accuracy.
 */
export class Countdown {
  private endAt = 0;
  private pausedRemaining: number | null = null;
  constructor(readonly totalMs: number, now = Date.now()) { this.endAt = now + totalMs; }

  get paused() { return this.pausedRemaining !== null; }
  remainingMs(now = Date.now()) { return Math.max(0, this.pausedRemaining ?? this.endAt - now); }
  elapsedMs(now = Date.now()) { return this.totalMs - this.remainingMs(now); }
  done(now = Date.now()) { return this.remainingMs(now) <= 0; }
  pause(now = Date.now()) { if (this.pausedRemaining === null) this.pausedRemaining = Math.max(0, this.endAt - now); }
  resume(now = Date.now()) { if (this.pausedRemaining !== null) { this.endAt = now + this.pausedRemaining; this.pausedRemaining = null; } }
}

export const fmtClock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
